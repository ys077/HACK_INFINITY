import { Response } from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { StepUpVerificationService } from '../services/stepup.service.js';
import { AuditService } from '../services/audit.service.js';

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = process.env.WEBAUTHN_RP_NAME || 'PRESENZA';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

export const generateRegistration = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { student: true, faculty: true, admin: true } });
    if (!dbUser) return res.status(404).json({ success: false, message: 'User not found' });
    
    let username = dbUser.email;
    if (dbUser.student) username = dbUser.student.name;
    else if (dbUser.faculty) username = dbUser.faculty.name;
    else if (dbUser.admin) username = dbUser.admin.name;

    const userPasskeys = await prisma.passkeyCredential.findMany({
      where: { userId: user.id, status: 'ACTIVE' }
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      excludeCredentials: userPasskeys.map(passkey => ({
        id: passkey.credentialId,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await StepUpVerificationService.createChallenge(user.id, options.challenge, expiresAt);

    res.json({ success: true, options });
  } catch (error: any) {
    console.error('Registration options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyRegistration = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body = req.body;

    const expectedChallengeObj = await StepUpVerificationService.getChallenge(body.challengeRequestId, user.id);
    if (!expectedChallengeObj) {
      return res.status(400).json({ success: false, message: 'Challenge expired or not found' });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.data,
        expectedChallenge: expectedChallengeObj.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      await prisma.passkeyCredential.create({
        data: {
          userId: user.id,
          credentialId: Buffer.from(credentialID).toString('base64'),
          publicKey: Buffer.from(credentialPublicKey),
          counter: BigInt(counter),
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: body.data.response.transports ? body.data.response.transports.join(',') : null
        }
      });

      await StepUpVerificationService.deleteChallenge(expectedChallengeObj.challenge);
      
      await AuditService.createAuditLog({
        actorId: user.id,
        action: 'PASSKEY_REGISTERED',
        entityType: 'User',
        entityId: user.id
      });

      res.json({ success: true, verified: true });
    } else {
      res.status(400).json({ success: false, message: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('Registration verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateAuth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    
    const userPasskeys = await prisma.passkeyCredential.findMany({
      where: { userId: user.id, status: 'ACTIVE' }
    });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map(passkey => ({
        id: passkey.credentialId,
        type: 'public-key',
      })),
      userVerification: 'preferred',
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await StepUpVerificationService.createChallenge(user.id, options.challenge, expiresAt);

    res.json({ success: true, options });
  } catch (error: any) {
    console.error('Auth options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAuth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body = req.body;
    
    const expectedChallengeObj = await StepUpVerificationService.getChallenge(body.challengeRequestId, user.id);
    if (!expectedChallengeObj) {
      return res.status(400).json({ success: false, message: 'Challenge expired or not found' });
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credentialId: body.data.id }
    });

    if (!passkey || passkey.userId !== user.id || passkey.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Credential not found or revoked' });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.data,
        expectedChallenge: expectedChallengeObj.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
        }
      });
    } catch (error: any) {
      await AuditService.createAuditLog({
        actorId: user.id,
        action: 'PASSKEY_AUTH_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: error.message }
      });
      return res.status(400).json({ success: false, message: error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      await prisma.passkeyCredential.update({
        where: { id: passkey.id },
        data: {
          counter: BigInt(authenticationInfo.newCounter),
          lastUsedAt: new Date()
        }
      });

      await StepUpVerificationService.deleteChallenge(expectedChallengeObj.challenge);

      // Create StepUp Session
      const stepUp = await StepUpVerificationService.createStepUpSession(user.id, 'SECURE_ATTENDANCE_JOIN');
      
      await AuditService.createAuditLog({
        actorId: user.id,
        action: 'PASSKEY_AUTH_SUCCEEDED',
        entityType: 'User',
        entityId: user.id
      });
      
      await AuditService.createAuditLog({
        actorId: user.id,
        action: 'STEP_UP_CREATED',
        entityType: 'StepUpSession',
        entityId: stepUp.id
      });

      res.json({ success: true, verified: true, stepUpSessionId: stepUp.id });
    } else {
      res.status(400).json({ success: false, message: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('Auth verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokeCredential = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { credentialId } = req.body;

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credentialId }
    });

    if (!passkey || passkey.userId !== user.id) {
      return res.status(404).json({ success: false, message: 'Credential not found' });
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date()
      }
    });

    await AuditService.createAuditLog({
      actorId: user.id,
      action: 'PASSKEY_REVOKED',
      entityType: 'PasskeyCredential',
      entityId: passkey.id
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Revoke error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPasskeys = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const passkeys = await prisma.passkeyCredential.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        credentialId: true,
        deviceType: true,
        status: true,
        createdAt: true,
        lastUsedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: passkeys });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
