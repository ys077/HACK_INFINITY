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

export const heartbeatPresence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) { res.status(400).json({ success: false, message: 'sessionId is required' }); return; }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

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
