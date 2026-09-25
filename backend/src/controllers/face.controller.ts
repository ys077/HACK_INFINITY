import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { AuditService } from '../services/audit.service.js';
import { StepUpVerificationService } from '../services/stepup.service.js';
import { FaceApiProvider } from '../services/face-api.provider.js';
import { MockFaceVerificationProvider } from '../services/mock-face.provider.js';
import { LivenessService } from '../services/liveness.service.js';
import crypto from 'crypto';

const faceProvider = process.env.NODE_ENV === 'production' 
  ? new FaceApiProvider() 
  : new MockFaceVerificationProvider();

export const enrollFace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { stepUpSessionId, template } = req.body;

    if (!stepUpSessionId || !template) {
      return res.status(400).json({ success: false, message: 'Missing stepUpSessionId or template' });
    }

    // Must be student
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student) {
      return res.status(403).json({ success: false, message: 'Only students can enroll face' });
    }

    // 1. Validate StepUp
    const stepUpValid = await StepUpVerificationService.validateStepUpSession(stepUpSessionId, user.id, 'FACE_ENROLLMENT');
    if (!stepUpValid) {
      await AuditService.createAuditLog({ actorId: user.id, action: 'FACE_ENROLLMENT_FAILED', entityType: 'User', entityId: user.id, metadata: { reason: 'Invalid or expired StepUp session' } });
      return res.status(401).json({ success: false, message: 'Passkey step-up required for face enrollment' });
    }
    await StepUpVerificationService.consumeStepUpSession(stepUpSessionId);

    // 2. Validate template format via provider
    if (!faceProvider.validateTemplate(template)) {
      await AuditService.createAuditLog({ actorId: user.id, action: 'FACE_ENROLLMENT_FAILED', entityType: 'User', entityId: user.id, metadata: { reason: 'Invalid template format' } });
      return res.status(400).json({ success: false, message: 'Invalid face template format' });
    }

    // 3. Upsert Face Enrollment
    const enrollment = await prisma.faceEnrollment.upsert({
      where: { studentId: student.id },
      update: {
        template,
        templateVersion: 'v1',
        provider: faceProvider.getProviderId(),
        status: 'ACTIVE',
        updatedAt: new Date()
      },
      create: {
        studentId: student.id,
        template,
        templateVersion: 'v1',
        provider: faceProvider.getProviderId()
      }
    });

    await AuditService.createAuditLog({
      actorId: user.id,
      action: 'FACE_ENROLLMENT_SUCCEEDED',
      entityType: 'FaceEnrollment',
      entityId: enrollment.id
    });

    res.json({ success: true, message: 'Face enrolled successfully' });
  } catch (error: any) {
    console.error('Face enrollment error:', error);
    await AuditService.createAuditLog({ actorId: req.user?.id, action: 'FACE_ENROLLMENT_FAILED', entityType: 'User', entityId: req.user?.id || 'unknown', metadata: { reason: error.message } });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const startVerification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { sessionId, deviceId } = req.body;

    if (!sessionId || !deviceId) {
      return res.status(400).json({ success: false, message: 'Missing sessionId or deviceId' });
    }

    const student = await prisma.student.findUnique({ where: { userId: user.id }, include: { faceEnrollment: true } });
    if (!student || !student.faceEnrollment || student.faceEnrollment.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'No active face enrollment found' });
    }

    // Verify session
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Session is not active' });
    }

    // Create JoinChallenge (cryptographically secure nonce)
    const nonce = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

    const joinChallenge = await prisma.joinChallenge.create({
      data: {
        sessionId,
        studentId: student.id,
        nonce,
        expiresAt,
        status: 'CREATED'
      }
    });

    // Create Liveness Attempt
    const livenessAttempt = await LivenessService.generateAttempt(joinChallenge.id);

    await AuditService.createAuditLog({ actorId: user.id, action: 'FACE_VERIFICATION_STARTED', entityType: 'JoinChallenge', entityId: joinChallenge.id });

    res.json({ 
      success: true, 
      data: { 
        joinChallengeId: joinChallenge.id, 
        nonce: joinChallenge.nonce,
        livenessAttemptId: livenessAttempt.id,
        challengeSequence: livenessAttempt.challengeSequence
      } 
    });
  } catch (error: any) {
    console.error('Start verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const verifyFaceAndLiveness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { joinChallengeId, livenessAttemptId, template, observedActions, actionTimestamps } = req.body;

    const student = await prisma.student.findUnique({ where: { userId: user.id }, include: { faceEnrollment: true } });
    if (!student || !student.faceEnrollment) {
      return res.status(400).json({ success: false, message: 'No active face enrollment found' });
    }

    const challenge = await prisma.joinChallenge.findUnique({ where: { id: joinChallengeId } });
    if (!challenge || challenge.studentId !== student.id || challenge.status !== 'CREATED') {
      return res.status(400).json({ success: false, message: 'Invalid or already consumed join challenge' });
    }

    if (challenge.expiresAt < new Date()) {
      await prisma.joinChallenge.update({ where: { id: challenge.id }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ success: false, message: 'Challenge expired' });
    }

    const attempt = await prisma.livenessAttempt.findUnique({ where: { id: livenessAttemptId } });
    if (!attempt || attempt.joinChallengeId !== challenge.id) {
      return res.status(400).json({ success: false, message: 'Invalid liveness attempt' });
    }

    // 1. Verify Liveness Structured Evidence
    const expectedSequence = attempt.challengeSequence as string[];
    
    if (!Array.isArray(observedActions) || !Array.isArray(actionTimestamps)) {
      return res.status(400).json({ success: false, message: 'Invalid liveness evidence format' });
    }

    if (observedActions.length !== expectedSequence.length || actionTimestamps.length !== expectedSequence.length) {
      await LivenessService.recordResult(attempt.id, false, 0, 'Action sequence length mismatch');
      await prisma.joinChallenge.update({ where: { id: challenge.id }, data: { status: 'FAILED' } });
      await AuditService.createAuditLog({ actorId: user.id, action: 'LIVENESS_FAILED', entityType: 'JoinChallenge', entityId: challenge.id });
      return res.status(400).json({ success: false, message: 'Liveness challenge failed: sequence mismatch' });
    }

    // Verify exact sequence match
    for (let i = 0; i < expectedSequence.length; i++) {
      if (expectedSequence[i] !== observedActions[i]) {
        await LivenessService.recordResult(attempt.id, false, 0, `Action mismatch at step ${i}`);
        await prisma.joinChallenge.update({ where: { id: challenge.id }, data: { status: 'FAILED' } });
        await AuditService.createAuditLog({ actorId: user.id, action: 'LIVENESS_FAILED', entityType: 'JoinChallenge', entityId: challenge.id });
        return res.status(400).json({ success: false, message: 'Liveness challenge failed: wrong action' });
      }
    }

    // Verify timing logic
    // Minimum 100ms per action, and all actions must have occurred after the challenge was started
    for (let i = 0; i < actionTimestamps.length; i++) {
      if (i > 0) {
        const timeDiff = actionTimestamps[i] - actionTimestamps[i - 1];
        if (timeDiff < 100) { // Unrealistic timing
          await LivenessService.recordResult(attempt.id, false, 0, 'Unrealistic action timing');
          await prisma.joinChallenge.update({ where: { id: challenge.id }, data: { status: 'FAILED' } });
          await AuditService.createAuditLog({ actorId: user.id, action: 'LIVENESS_FAILED', entityType: 'JoinChallenge', entityId: challenge.id });
          return res.status(400).json({ success: false, message: 'Liveness challenge failed: impossible timing' });
        }
      }
      
      const actionTime = new Date(actionTimestamps[i]);
      if (actionTime < attempt.startedAt || actionTime > new Date()) {
        await LivenessService.recordResult(attempt.id, false, 0, 'Action timestamp out of bounds');
        await prisma.joinChallenge.update({ where: { id: challenge.id }, data: { status: 'FAILED' } });
        await AuditService.createAuditLog({ actorId: user.id, action: 'LIVENESS_FAILED', entityType: 'JoinChallenge', entityId: challenge.id });
        return res.status(400).json({ success: false, message: 'Liveness challenge failed: timing out of bounds' });
      }
    }

    // 1. Verify Face Identity
    const enrolledTemplate = student.faceEnrollment.template as number[];
    const { match, confidence } = await faceProvider.compareIdentity(enrolledTemplate, template);
    
    if (!match) {
      await LivenessService.recordResult(attempt.id, false, 0, 'Face mismatch');
      await prisma.joinChallenge.update({ where: { id: challenge.id }, data: { status: 'FAILED' } });
      await AuditService.createAuditLog({ actorId: user.id, action: 'FACE_VERIFICATION_FAILED', entityType: 'JoinChallenge', entityId: challenge.id, metadata: { confidence } });
      return res.status(400).json({ success: false, message: 'Face identity verification failed' });
    }

    // 2. Mark Liveness as Passed
    await LivenessService.recordResult(attempt.id, true, confidence, 'Verified');
    
    // 3. Update Challenge as Verified
    await prisma.joinChallenge.update({
      where: { id: challenge.id },
      data: { status: 'VERIFICATION_IN_PROGRESS' } // It is verified, now ready for secure join
    });

    await AuditService.createAuditLog({ actorId: user.id, action: 'FACE_VERIFICATION_SUCCEEDED', entityType: 'JoinChallenge', entityId: challenge.id, metadata: { confidence } });
    await AuditService.createAuditLog({ actorId: user.id, action: 'LIVENESS_PASSED', entityType: 'LivenessAttempt', entityId: attempt.id });

    res.json({ success: true, message: 'Verification successful', joinChallengeId: challenge.id });
  } catch (error: any) {
    console.error('Verify face error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
