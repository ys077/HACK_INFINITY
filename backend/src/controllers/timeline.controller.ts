import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { TimelineService } from '../services/timeline.service.js';

// --- STUDENT ---

export const getStudentTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: student.id, classId: session.classId } }
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Forbidden: Not enrolled in this class' }); 
      return;
    }

    const timeline = await TimelineService.getStudentTimeline(session.id, student.id);
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('getStudentTimeline Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getStudentHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        session: {
          include: {
            class: {
              include: { subject: true }
            }
          }
        }
      },
      orderBy: { session: { startedAt: 'desc' } }
    });

    const sessions = records.map((r: any) => ({
      sessionId: r.sessionId,
      subject: r.session.class.subject.name,
      date: r.session.startedAt,
      verifiedMinutes: Math.floor(r.totalPresentSeconds / 60),
      attendancePercentage: r.presencePercentage,
      status: r.status
    }));

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    console.error('getStudentHistory Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- FACULTY ---

export const getFacultyStudentTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    const timeline = await TimelineService.getStudentTimeline(session.id, req.params.studentId);
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('getFacultyStudentTimeline Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultySessionSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    const summary = await TimelineService.getSessionSummary(session.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('getFacultySessionSummary Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultyStudentHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const { studentId } = req.params;

    // Faculty can only view students who are enrolled in AT LEAST ONE of their classes
    const classes = await prisma.class.findMany({ where: { facultyId: faculty.id } });
    const classIds = classes.map(c => c.id);

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        classId: { in: classIds }
      }
    });

    if (!enrollment) {
      res.status(403).json({ success: false, message: 'Forbidden: Student not in your classes' });
      return;
    }

    // Return history ONLY for sessions belonging to this faculty's classes
    const records = await prisma.attendanceRecord.findMany({
      where: { 
        studentId,
        session: { classId: { in: classIds } }
      },
      include: {
        session: {
          include: { class: { include: { subject: true } } }
        }
      },
      orderBy: { session: { startedAt: 'desc' } }
    });

    const sessions = records.map((r: any) => ({
      sessionId: r.sessionId,
      subject: r.session.class.subject.name,
      date: r.session.startedAt,
      verifiedMinutes: Math.floor(r.totalPresentSeconds / 60),
      attendancePercentage: r.presencePercentage,
      status: r.status
    }));

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    console.error('getFacultyStudentHistory Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- ADMIN ---

export const getAdminSessionTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }

    const summary = await TimelineService.getSessionSummary(session.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('getAdminSessionTimeline Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
