import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PresenceService } from '../services/presence.service.js';
import { AuditService } from '../services/audit.service.js';

// --- STUDENT ENDPOINTS ---

import { DeviceChallengeService } from '../services/device-challenge.service.js';

export const joinPresence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, deviceId } = req.body;
    if (!sessionId) { res.status(400).json({ success: false, message: 'sessionId is required' }); return; }
    if (!deviceId) { res.status(400).json({ success: false, message: 'deviceId is required' }); return; }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const isValid = await DeviceChallengeService.validateRecentVerification(
      student.id,
      deviceId,
      sessionId,
      'PRESENCE_JOIN'
    );
    if (!isValid) {
      res.status(401).json({ success: false, message: 'DEVICE_NOT_VERIFIED' });
      return;
    }

    const state = await PresenceService.join(sessionId, student.id, deviceId);
    
    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'PRESENCE_JOINED',
      entityType: 'AttendanceSession',
      entityId: sessionId,
      metadata: { studentId: student.id, deviceId }
    });

    res.json({ success: true, message: 'Joined successfully', data: state });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

import { StepUpVerificationService } from '../services/stepup.service.js';

export const secureJoinSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, deviceId, stepUpSessionId, joinChallengeId } = req.body;
    
    if (!sessionId || !deviceId || !stepUpSessionId || !joinChallengeId) { 
      res.status(400).json({ success: false, message: 'Missing required secure join parameters' }); return; 
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    // 1. Verify Passkey Step-Up
    const stepUpValid = await StepUpVerificationService.validateStepUpSession(stepUpSessionId, req.user!.id, 'SECURE_ATTENDANCE_JOIN');
    if (!stepUpValid) {
      await AuditService.createAuditLog({ actorId: req.user!.id, action: 'SECURE_JOIN_FAILED', entityType: 'AttendanceSession', entityId: sessionId, metadata: { reason: 'Invalid StepUp' } });
      res.status(401).json({ success: false, message: 'Passkey step-up required' });
      return;
    }
    await StepUpVerificationService.consumeStepUpSession(stepUpSessionId);

    // 2. Verify Trusted Device Challenge 
    // (Client must have called /api/device/verify immediately prior with purpose PRESENCE_JOIN)
    const deviceValid = await DeviceChallengeService.validateRecentVerification(
      student.id,
      deviceId,
      sessionId,
      'PRESENCE_JOIN'
    );
    if (!deviceValid) {
      await AuditService.createAuditLog({ actorId: req.user!.id, action: 'SECURE_JOIN_FAILED', entityType: 'AttendanceSession', entityId: sessionId, metadata: { reason: 'Device verification failed' } });
      res.status(401).json({ success: false, message: 'DEVICE_NOT_VERIFIED' });
      return;
    }

    // 3. Verify Face + Liveness (JoinChallenge)
    const challenge = await prisma.joinChallenge.findUnique({ where: { id: joinChallengeId } });
    if (!challenge || challenge.studentId !== student.id || challenge.sessionId !== sessionId) {
      await AuditService.createAuditLog({ actorId: req.user!.id, action: 'SECURE_JOIN_FAILED', entityType: 'AttendanceSession', entityId: sessionId, metadata: { reason: 'Invalid face challenge' } });
      res.status(400).json({ success: false, message: 'Invalid face verification challenge' });
      return;
    }

    if (challenge.status !== 'VERIFICATION_IN_PROGRESS') {
      await AuditService.createAuditLog({ actorId: req.user!.id, action: 'SECURE_JOIN_FAILED', entityType: 'AttendanceSession', entityId: sessionId, metadata: { reason: 'Face/Liveness not verified' } });
      res.status(401).json({ success: false, message: 'Face verification and liveness checks not passed' });
      return;
    }

    // Atomically consume JoinChallenge
    try {
      await prisma.joinChallenge.update({
        where: { id: challenge.id, status: 'VERIFICATION_IN_PROGRESS' },
        data: { status: 'CONSUMED', consumedAt: new Date() }
      });
    } catch (e) {
      res.status(400).json({ success: false, message: 'Join challenge already consumed' });
      return;
    }

    // 4. Everything valid, create presence state
    const state = await PresenceService.join(sessionId, student.id, deviceId);
    
    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'SECURE_JOIN_SUCCEEDED',
      entityType: 'AttendanceSession',
      entityId: sessionId,
      metadata: { studentId: student.id, deviceId, joinChallengeId }
    });

    res.json({ success: true, message: 'Securely joined successfully', data: state });
  } catch (error: any) {
    console.error('Secure Join Error:', error);
    await AuditService.createAuditLog({ actorId: req.user?.id, action: 'SECURE_JOIN_FAILED', entityType: 'AttendanceSession', entityId: req.body.sessionId || 'unknown', metadata: { error: error.message } });
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const heartbeatPresence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, deviceId } = req.body;
    if (!sessionId) { res.status(400).json({ success: false, message: 'sessionId is required' }); return; }
    if (!deviceId) { res.status(400).json({ success: false, message: 'deviceId is required' }); return; }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const isValid = await DeviceChallengeService.validateRecentVerification(
      student.id,
      deviceId,
      sessionId,
      'PRESENCE_HEARTBEAT'
    );
    if (!isValid) {
      res.status(401).json({ success: false, message: 'DEVICE_NOT_VERIFIED' });
      return;
    }

    const state = await PresenceService.heartbeat(sessionId, student.id);
    res.json({ success: true, message: 'Heartbeat acknowledged', data: state });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const leavePresence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) { res.status(400).json({ success: false, message: 'sessionId is required' }); return; }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const state = await PresenceService.leave(sessionId, student.id);
    
    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'PRESENCE_LEFT',
      entityType: 'AttendanceSession',
      entityId: sessionId,
      metadata: { studentId: student.id }
    });

    res.json({ success: true, message: 'Left successfully', data: state });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const rejoinPresence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, deviceId } = req.body;
    if (!sessionId) { res.status(400).json({ success: false, message: 'sessionId is required' }); return; }
    if (!deviceId) { res.status(400).json({ success: false, message: 'deviceId is required' }); return; }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const currentState = await PresenceService.getStudentState(sessionId, student.id);
    if (currentState.status === 'TIMEOUT') {
      res.status(401).json({ 
        success: false, 
        message: 'TIMEOUT_REQUIRES_FULL_REJOIN', 
        policy: 'TIMEOUT state requires full secure join (/api/join/secure) including passkey and face verification.' 
      });
      return;
    }

    const isValid = await DeviceChallengeService.validateRecentVerification(
      student.id,
      deviceId,
      sessionId,
      'PRESENCE_REJOIN'
    );
    if (!isValid) {
      res.status(401).json({ success: false, message: 'DEVICE_NOT_VERIFIED' });
      return;
    }

    const state = await PresenceService.rejoin(sessionId, student.id, deviceId);
    
    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'PRESENCE_REJOINED',
      entityType: 'AttendanceSession',
      entityId: sessionId,
      metadata: { studentId: student.id, deviceId }
    });

    res.json({ success: true, message: 'Rejoined successfully', data: state });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const state = await PresenceService.getStudentState(req.params.sessionId, student.id);
    res.json({ success: true, data: { sessionId: req.params.sessionId, ...state } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    // Lazy evaluate timeouts first
    await PresenceService.getStudentState(req.params.sessionId, student.id);

    const timeline = await prisma.presenceEvent.findMany({
      where: { sessionId: req.params.sessionId, studentId: student.id },
      orderBy: { timestamp: 'asc' },
      select: { eventType: true, timestamp: true }
    });
    res.json({ success: true, data: timeline });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// --- FACULTY ENDPOINTS ---

export const getFacultySessionPresence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    // Get all enrollments for this class
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: session.classId, status: 'ACTIVE' },
      include: { student: { select: { id: true, name: true, studentId: true } } }
    });

    const results = [];
    for (const enrollment of enrollments) {
      const state = await PresenceService.getStudentState(session.id, enrollment.student.id);
      results.push({
        student: enrollment.student,
        status: state.status,
        lastVerifiedAt: state.lastVerifiedAt
      });
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultyStudentTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    const { studentId } = req.params;

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({ where: { studentId_classId: { studentId, classId: session.classId } } });
    if (!enrollment) { res.status(404).json({ success: false, message: 'Student not enrolled in this class' }); return; }

    // Lazy evaluate timeout
    await PresenceService.getStudentState(session.id, studentId);

    const timeline = await prisma.presenceEvent.findMany({
      where: { sessionId: session.id, studentId },
      orderBy: { timestamp: 'asc' },
      select: { eventType: true, timestamp: true }
    });
    res.json({ success: true, data: timeline });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
