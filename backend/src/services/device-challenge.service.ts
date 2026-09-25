import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';
import { verifySignature, buildCanonicalPayload } from '../utils/deviceCrypto.js';
import { ChallengePurpose, DeviceChallenge } from '@prisma/client';

const CHALLENGE_TTL_SECONDS = parseInt(process.env.DEVICE_CHALLENGE_TTL_SECONDS || '60', 10);
const VERIFICATION_TTL_SECONDS = parseInt(process.env.DEVICE_VERIFICATION_TTL_SECONDS || '60', 10);

export class DeviceChallengeService {
  /**
   * Generates a new cryptographic challenge.
   */
  static async generateChallenge(
    studentId: string,
    deviceId: string,
    sessionId: string,
    purpose: ChallengePurpose
  ): Promise<DeviceChallenge> {
    
    // 1. Validate Session
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { enrollments: true } } }
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      throw new Error('SESSION_NOT_ACTIVE');
    }

    // 2. Validate Enrollment
    const isEnrolled = session.class.enrollments.some(e => e.studentId === studentId && e.status === 'ACTIVE');
    if (!isEnrolled) {
      throw new Error('NOT_ENROLLED');
    }

    // 3. Validate Device
    const device = await prisma.studentDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      throw new Error('DEVICE_NOT_FOUND');
    }

    if (device.studentId !== studentId) {
      throw new Error('DEVICE_NOT_OWNED');
    }

    if (device.status !== 'ACTIVE') {
      throw new Error('DEVICE_REVOKED');
    }

    // 4. Generate Challenge
    const randomBytes = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);

    return prisma.deviceChallenge.create({
      data: {
        challenge: randomBytes,
        deviceId,
        sessionId,
        purpose,
        expiresAt
      }
    });
  }

  /**
   * Verifies the cryptographic signature against a challenge.
   */
  static async verifyChallenge(
    studentId: string,
    challengeId: string,
    signatureBase64: string
  ): Promise<{ verified: boolean, error?: string, verifiedChallenge?: DeviceChallenge }> {
    
    // 1. Fetch Challenge
    const challenge = await prisma.deviceChallenge.findUnique({
      where: { id: challengeId },
      include: { device: true }
    });

    if (!challenge) {
      return { verified: false, error: 'CHALLENGE_NOT_FOUND' };
    }

    if (challenge.device.studentId !== studentId) {
      return { verified: false, error: 'CHALLENGE_NOT_OWNED' }; // Student trying to verify another student's challenge
    }

    if (challenge.usedAt) {
      return { verified: false, error: 'CHALLENGE_ALREADY_USED' };
    }

    if (challenge.expiresAt < new Date()) {
      return { verified: false, error: 'CHALLENGE_EXPIRED' };
    }

    if (challenge.device.status !== 'ACTIVE') {
      return { verified: false, error: 'DEVICE_REVOKED' };
    }

    // 2. Verify Signature
    const canonicalPayload = buildCanonicalPayload(
      challenge.id,
      challenge.challenge,
      challenge.deviceId,
      studentId,
      challenge.sessionId,
      challenge.purpose
    );

    const isValid = verifySignature(
      challenge.device.devicePublicKey,
      canonicalPayload,
      signatureBase64
    );

    if (!isValid) {
      return { verified: false, error: 'INVALID_SIGNATURE' };
    }

    // 3. Mark as Used (Atomically)
    try {
      const updatedChallenge = await prisma.deviceChallenge.update({
        where: { 
          id: challenge.id,
          usedAt: null // ensures atomicity
        },
        data: {
          usedAt: new Date()
        }
      });
      return { verified: true, verifiedChallenge: updatedChallenge };
    } catch (error) {
      // If update fails due to where clause (e.g. usedAt is not null suddenly), someone else used it race condition
      return { verified: false, error: 'CHALLENGE_ALREADY_USED' };
    }
  }

  /**
   * Helper to execute a presence operation ONLY if verification holds
   * Approach B: This checks if a challenge was successfully used recently for the specific purpose.
   */
  static async validateRecentVerification(
    studentId: string,
    deviceId: string,
    sessionId: string,
    purpose: ChallengePurpose
  ): Promise<boolean> {
    const validTimeWindow = new Date(Date.now() - VERIFICATION_TTL_SECONDS * 1000);

    const recentChallenge = await prisma.deviceChallenge.findFirst({
      where: {
        deviceId,
        sessionId,
        purpose,
        usedAt: {
          gte: validTimeWindow,
          not: null
        },
        device: {
          studentId: studentId
        }
      },
      orderBy: {
        usedAt: 'desc'
      }
    });

    return !!recentChallenge;
  }
}
