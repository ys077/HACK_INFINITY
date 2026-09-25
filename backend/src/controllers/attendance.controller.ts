import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { AttendanceService } from '../services/attendance.service.js';

// --- FACULTY ---

export const getSessionAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: req.params.sessionId },
      include: { class: { include: { enrollments: true } } }
    });

    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    const enrolledStudentIds = session.class.enrollments
      .filter(e => e.status === 'ACTIVE')
      .map(e => e.studentId);

    const students = [];
    for (const studentId of enrolledStudentIds) {
      const calculation = await AttendanceService.calculateStudentAttendance(session.id, studentId);
      students.push({
        studentId: calculation.studentId,
        name: calculation.name,
        status: calculation.status,
        verifiedSeconds: calculation.verifiedSeconds,
        attendancePercentage: calculation.attendancePercentage
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        students
      }
    });
  } catch (error) {
    console.error('getSessionAttendance Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getStudentSessionAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    if (session.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return; }

    const calculation = await AttendanceService.calculateStudentAttendance(session.id, req.params.studentId);
    
    res.json({ success: true, data: calculation });
  } catch (error) {
    console.error('getStudentSessionAttendance Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- STUDENT ---

export const getMySessionAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const calculation = await AttendanceService.calculateStudentAttendance(session.id, student.id);
    
    res.json({ success: true, data: calculation });
  } catch (error) {
    console.error('getMySessionAttendance Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
