import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { DeviceChallengeService } from '../services/device-challenge.service.js';
import { z } from 'zod';
import { ChallengePurpose } from '@prisma/client';

const challengeSchema = z.object({
  deviceId: z.string().uuid(),
  sessionId: z.string().uuid(),
  purpose: z.enum(['PRESENCE_JOIN', 'PRESENCE_REJOIN', 'PRESENCE_HEARTBEAT'])
});

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  signature: z.string().min(10)
});

export const requestChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = challengeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid request data' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(403).json({ success: false, message: 'STUDENT_PROFILE_REQUIRED' });
      return;
    }

    const { deviceId, sessionId, purpose } = parsed.data;

    const challenge = await DeviceChallengeService.generateChallenge(
      student.id,
      deviceId,
      sessionId,
      purpose as ChallengePurpose
    );

    res.status(201).json({
      success: true,
      data: {
        challengeId: challenge.id,
        challenge: challenge.challenge,
        deviceId: challenge.deviceId,
        sessionId: challenge.sessionId,
        purpose: challenge.purpose,
        expiresAt: challenge.expiresAt
      }
    });

  } catch (error: any) {
    const msg = error.message;
    if (['SESSION_NOT_ACTIVE', 'NOT_ENROLLED', 'DEVICE_NOT_FOUND', 'DEVICE_NOT_OWNED', 'DEVICE_REVOKED'].includes(msg)) {
      res.status(400).json({ success: false, message: msg });
    } else {
      console.error('requestChallenge Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
};

export const verifyChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid request data' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(403).json({ success: false, message: 'STUDENT_PROFILE_REQUIRED' });
      return;
    }

    const { challengeId, signature } = parsed.data;

    const result = await DeviceChallengeService.verifyChallenge(
      student.id,
      challengeId,
      signature
    );

    if (!result.verified || !result.verifiedChallenge) {
      res.status(400).json({ 
        success: false, 
        message: 'DEVICE_VERIFICATION_FAILED' 
      });
      return;
    }

    const verifiedChallenge = result.verifiedChallenge;

    res.json({
      success: true,
      data: {
        verified: true,
        deviceId: verifiedChallenge.deviceId,
        sessionId: verifiedChallenge.sessionId,
        purpose: verifiedChallenge.purpose,
        verifiedAt: verifiedChallenge.usedAt
      }
    });

  } catch (error: any) {
    console.error('verifyChallenge Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
