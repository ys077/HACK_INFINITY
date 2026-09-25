import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getStudentSummary,
  getStudentSubjects,
  getStudentTrends,
  getFacultyClassSummary,
  getFacultyStudentBreakdown,
  getAdminOverview,
  getAdminDepartments
} from '../controllers/analytics.controller.js';

const router = Router();

router.use(requireAuth);

// --- STUDENT ANALYTICS ---
router.get('/student/analytics/summary', requireRole('STUDENT'), getStudentSummary);
router.get('/student/analytics/subjects', requireRole('STUDENT'), getStudentSubjects);
router.get('/student/analytics/trends', requireRole('STUDENT'), getStudentTrends);

// --- FACULTY ANALYTICS ---
router.get('/faculty/classes/:classId/analytics/summary', requireRole('FACULTY', 'ADMIN'), getFacultyClassSummary);
router.get('/faculty/classes/:classId/analytics/students', requireRole('FACULTY', 'ADMIN'), getFacultyStudentBreakdown);

// --- ADMIN ANALYTICS ---
router.get('/admin/analytics/overview', requireRole('ADMIN'), getAdminOverview);
router.get('/admin/analytics/departments', requireRole('ADMIN'), getAdminDepartments);

export default router;
