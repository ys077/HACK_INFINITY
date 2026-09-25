import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createSessionSchema } from '../schemas/session.schema.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PresenceService } from '../services/presence.service.js';
import { RealtimeService } from '../services/realtime.service.js';
import { AttendanceService } from '../services/attendance.service.js';
import { ConflictService } from '../services/conflict.service.js';
import { AuditService } from '../services/audit.service.js';

// --- FACULTY ---

export const createSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = createSessionSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }

    const { classId, expectedEndAt, subjectId, classroomId, departmentId } = parse.data;

    // Resolve faculty
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    // Verify class ownership
    const cls = await prisma.class.findUnique({ 
      where: { id: classId },
      include: { section: { include: { course: true } } }
    });
    if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
    if (cls.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your class' }); return; }

    // Subject validation
    if (subjectId && cls.subjectId !== subjectId) {
      res.status(400).json({ success: false, message: 'Invalid subject for this class' }); return;
    }
    // Classroom validation
    if (classroomId && cls.classroomId !== classroomId) {
      res.status(400).json({ success: false, message: 'Invalid classroom for this class' }); return;
    }
    // Department validation
    if (departmentId && cls.section.course.departmentId !== departmentId) {
      res.status(400).json({ success: false, message: 'Invalid department for this class' }); return;
    }

    // Check for existing IN_PROGRESS session
    const existingSession = await prisma.attendanceSession.findFirst({
      where: { classId, status: 'IN_PROGRESS' }
    });

    if (existingSession) {
      res.status(409).json({ success: false, message: 'An active attendance session already exists for this class' });
      return;
    }

    // Create session (transactionally safe if we add proper constraints, but Prisma findFirst then create is mostly okay here since faculty shouldn't double click heavily. To be perfectly safe against race conditions we can just rely on the above check and the fact that a single faculty is initiating it).
    const session = await prisma.attendanceSession.create({
      data: {
        classId,
        facultyId: faculty.id,
        expectedEndAt: new Date(expectedEndAt),
        startedAt: new Date(),
        status: 'IN_PROGRESS'
      },
      include: {
        class: {
          include: {
            subject: true,
            section: true,
            classroom: true
          }
        }
      }
    });

    RealtimeService.broadcastSessionStarted(session.id, {
      sessionId: session.id,
      classId: session.classId,
      status: session.status,
      startedAt: session.startedAt,
      expectedEndAt: session.expectedEndAt
    });

    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'SESSION_STARTED',
      entityType: 'AttendanceSession',
      entityId: session.id,
      metadata: { classId: session.classId }
    });

    res.status(201).json({ success: true, message: 'Attendance session started', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const endSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: (req.params.sessionId as string) } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    if (session.status !== 'IN_PROGRESS') {
      res.status(409).json({ success: false, message: 'Attendance session is no longer active' });
      return;
    }

    const updated = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: 'ENDED',
        endedAt: new Date()
      }
    });

    // Close out active presence states
    await PresenceService.handleSessionEnd(session.id);

    // Finalize attendance records
    await AttendanceService.finalizeSessionAttendance(session.id);

    // Run conflict detection on the completed session
    await ConflictService.detectSessionConflicts(session.id);

    RealtimeService.broadcastSessionEnded(session.id, {
      sessionId: session.id,
      status: 'ENDED',
      endedAt: updated.endedAt
    });

    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'SESSION_ENDED',
      entityType: 'AttendanceSession',
      entityId: session.id,
      metadata: { method: 'MANUAL' }
    });

    res.json({ success: true, message: 'Attendance session ended', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultySessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const { status, classId } = req.query;
    const where: any = { facultyId: faculty.id };
    if (status) where.status = status;
    if (classId) where.classId = classId;

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { class: { include: { subject: true, section: true } } }
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultySessionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: (req.params.sessionId as string) },
      include: {
        class: {
          include: {
            subject: true,
            section: true,
            classroom: true
          }
        },
        faculty: {
          select: { employeeId: true, name: true }
        }
      }
    });

    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    // Session Expiration Logic handling (read-time expiration check)
    if (session.status === 'IN_PROGRESS' && session.expectedEndAt < new Date()) {
       const updated = await prisma.attendanceSession.update({
         where: { id: session.id },
         data: { status: 'ENDED', endedAt: session.expectedEndAt }
       });
       await PresenceService.handleSessionEnd(session.id);
       await AttendanceService.finalizeSessionAttendance(session.id);
       await ConflictService.detectSessionConflicts(session.id);
       RealtimeService.broadcastSessionEnded(session.id, {
         sessionId: session.id,
         status: 'ENDED',
         endedAt: updated.endedAt
       });
       await AuditService.createAuditLog({
         actorId: req.user!.id,
         action: 'SESSION_ENDED',
         entityType: 'AttendanceSession',
         entityId: session.id,
         metadata: { method: 'AUTO_EXPIRE_READ' }
       });
       res.json({ success: true, data: { ...session, ...updated } });
       return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- STUDENT ---

export const getStudentActiveSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    // Enrolled classes
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      select: { classId: true }
    });
    const classIds = enrollments.map(e => e.classId);

    // Active sessions for those classes
    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        classId: { in: classIds },
        status: 'IN_PROGRESS'
      },
      include: {
        class: {
          include: { subject: true, section: true, faculty: { select: { name: true } }, classroom: true }
        }
      }
    });

    // Check expiration lazily
    const validSessions = [];
    const now = new Date();
    for (const session of activeSessions) {
      if (session.expectedEndAt < now) {
        const updated = await prisma.attendanceSession.update({
          where: { id: session.id },
          data: { status: 'ENDED', endedAt: session.expectedEndAt }
        });
        await PresenceService.handleSessionEnd(session.id);
        await AttendanceService.finalizeSessionAttendance(session.id);
        await ConflictService.detectSessionConflicts(session.id);
        RealtimeService.broadcastSessionEnded(session.id, {
          sessionId: session.id,
          status: 'ENDED',
          endedAt: updated.endedAt
        });
        await AuditService.createAuditLog({
          actorId: req.user!.id,
          action: 'SESSION_ENDED',
          entityType: 'AttendanceSession',
          entityId: session.id,
          metadata: { method: 'AUTO_EXPIRE_READ_STUDENT' }
        });
      } else {
        validSessions.push(session);
      }
    }

    res.json({ success: true, data: validSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getStudentSessionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id }, // Any enrollment history
      select: { classId: true }
    });
    const classIds = enrollments.map(e => e.classId);

    const history = await prisma.attendanceSession.findMany({
      where: { classId: { in: classIds } },
      orderBy: { createdAt: 'desc' },
      include: { class: { include: { subject: true, faculty: { select: { name: true } } } } }
    });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- ADMIN ---

export const getAdminSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, classId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (classId) where.classId = classId;

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { class: { include: { subject: true, section: true } }, faculty: { select: { name: true, employeeId: true } } }
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAdminSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: (req.params.sessionId as string) },
      include: { class: { include: { subject: true, section: true, classroom: true } }, faculty: true }
    });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
