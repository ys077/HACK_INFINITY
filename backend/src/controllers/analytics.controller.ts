import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { AttendanceAnalyticsService } from '../services/attendanceAnalytics.service.js';

// --- STUDENT ---

export const getStudentSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const summary = await AttendanceAnalyticsService.getStudentSummary(student.id);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentSubjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const data = await AttendanceAnalyticsService.getStudentSubjects(student.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const { from, to } = req.query;
    const data = await AttendanceAnalyticsService.getStudentTrends(student.id, from as string, to as string);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- FACULTY ---

export const getFacultyClassSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const { classId } = req.params;
    const data = await AttendanceAnalyticsService.getFacultyClassSummary(faculty.id, classId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFacultyStudentBreakdown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const { classId } = req.params;
    const data = await AttendanceAnalyticsService.getFacultyStudentBreakdown(faculty.id, classId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- ADMIN ---

export const getAdminOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await AttendanceAnalyticsService.getAdminOverview();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminDepartments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await AttendanceAnalyticsService.getAdminDepartments();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
