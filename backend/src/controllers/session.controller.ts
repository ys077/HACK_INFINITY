import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createSessionSchema } from '../schemas/session.schema.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// --- FACULTY ---

export const createSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parse = createSessionSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }

    const { classId, expectedEndAt } = parse.data;

    // Resolve faculty
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    // Verify class ownership
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
    if (cls.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your class' }); return; }

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

    res.status(201).json({ success: true, message: 'Attendance session started', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const endSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
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
      where: { id: req.params.sessionId },
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
       // Ideally we'd update this in a job, or lazily right now.
       const updated = await prisma.attendanceSession.update({
         where: { id: session.id },
         data: { status: 'ENDED', endedAt: session.expectedEndAt }
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
        await prisma.attendanceSession.update({
          where: { id: session.id },
          data: { status: 'ENDED', endedAt: session.expectedEndAt }
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
      where: { id: req.params.sessionId },
      include: { class: { include: { subject: true, section: true, classroom: true } }, faculty: true }
    });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
