import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

import {
  getStudentTimeline,
  getStudentHistory,
  getFacultyStudentTimeline,
  getFacultySessionSummary,
  getFacultyStudentHistory,
  getAdminSessionTimeline
} from '../controllers/timeline.controller.js';

const router = Router();

// --- STUDENT ROUTES ---
router.get('/student/sessions/:sessionId/timeline', requireAuth, requireRole('STUDENT'), getStudentTimeline);
router.get('/student/attendance/history', requireAuth, requireRole('STUDENT'), getStudentHistory);

// --- FACULTY ROUTES ---
router.get('/faculty/sessions/:sessionId/timeline/summary', requireAuth, requireRole('FACULTY', 'ADMIN'), getFacultySessionSummary);
router.get('/faculty/sessions/:sessionId/students/:studentId/timeline', requireAuth, requireRole('FACULTY', 'ADMIN'), getFacultyStudentTimeline);
router.get('/faculty/students/:studentId/attendance/history', requireAuth, requireRole('FACULTY', 'ADMIN'), getFacultyStudentHistory);

// --- ADMIN ROUTES ---
router.get('/admin/sessions/:sessionId/timeline', requireAuth, requireRole('ADMIN'), getAdminSessionTimeline);

export default router;
