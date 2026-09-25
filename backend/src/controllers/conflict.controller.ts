import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { ConflictService } from '../services/conflict.service.js';

export const getSessionConflicts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // RBAC logic depending on user role
    if (req.user!.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
      if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

      const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
      if (!session || session.facultyId !== faculty.id) {
        res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return;
      }
    }

    const conflicts = await prisma.attendanceConflict.findMany({
      where: { sessionId },
      orderBy: { detectedAt: 'desc' }
    });

    // Parse the description back to object for the frontend
    const mappedConflicts = conflicts.map(c => ({
      id: c.id,
      sessionId: c.sessionId,
      studentId: c.studentId,
      type: c.type,
      severity: c.severity,
      detectedAt: c.detectedAt,
      resolvedAt: c.resolvedAt,
      resolvedBy: c.resolvedBy,
      resolution: c.resolution,
      evidence: JSON.parse(c.description)
    }));

    res.json({ success: true, data: mappedConflicts });
  } catch (error) {
    console.error('getSessionConflicts Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getStudentConflicts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, studentId } = req.params;

    if (req.user!.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
      if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

      const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
      if (!session || session.facultyId !== faculty.id) {
        res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return;
      }
    }

    const conflicts = await prisma.attendanceConflict.findMany({
      where: { sessionId, studentId },
      orderBy: { detectedAt: 'desc' }
    });

    const mappedConflicts = conflicts.map(c => ({
      id: c.id,
      sessionId: c.sessionId,
      studentId: c.studentId,
      type: c.type,
      severity: c.severity,
      detectedAt: c.detectedAt,
      resolvedAt: c.resolvedAt,
      resolvedBy: c.resolvedBy,
      resolution: c.resolution,
      evidence: JSON.parse(c.description)
    }));

    res.json({ success: true, data: mappedConflicts });
  } catch (error) {
    console.error('getStudentConflicts Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const scanSessionConflicts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (req.user!.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
      if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

      const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
      if (!session || session.facultyId !== faculty.id) {
        res.status(403).json({ success: false, message: 'Forbidden: Not your session' }); return;
      }
    }

    await ConflictService.detectSessionConflicts(sessionId);

    res.json({ success: true, message: 'Scan complete' });
  } catch (error) {
    console.error('scanSessionConflicts Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAdminConflicts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const conflicts = await prisma.attendanceConflict.findMany({
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        session: {
          include: {
            class: {
              include: {
                subject: true,
                section: true
              }
            }
          }
        }
      },
      orderBy: {
        detectedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: conflicts
    });
  } catch (error) {
    console.error('Error fetching admin conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conflicts'
    });
  }
};
