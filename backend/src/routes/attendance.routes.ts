import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { getSessionAttendance, getStudentSessionAttendance, getMySessionAttendance } from '../controllers/attendance.controller.js';

const router = Router();

// --- FACULTY ROUTES ---
router.get('/faculty/sessions/:sessionId/attendance', requireAuth, requireRole('FACULTY', 'ADMIN'), getSessionAttendance);
router.get('/faculty/sessions/:sessionId/attendance/:studentId', requireAuth, requireRole('FACULTY', 'ADMIN'), getStudentSessionAttendance);

// --- STUDENT ROUTES ---
router.get('/student/sessions/:sessionId/attendance', requireAuth, requireRole('STUDENT'), getMySessionAttendance);

export default router;
