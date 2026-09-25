import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { getSessionConflicts, getStudentConflicts, scanSessionConflicts, getAdminConflicts } from '../controllers/conflict.controller.js';

const router = Router();

// --- FACULTY ROUTES ---
router.get('/faculty/sessions/:sessionId/conflicts', requireAuth, requireRole('FACULTY', 'ADMIN'), getSessionConflicts);
router.get('/faculty/sessions/:sessionId/students/:studentId/conflicts', requireAuth, requireRole('FACULTY', 'ADMIN'), getStudentConflicts);
router.post('/faculty/sessions/:sessionId/conflicts/scan', requireAuth, requireRole('FACULTY', 'ADMIN'), scanSessionConflicts);

// --- ADMIN ROUTES ---
router.get('/admin/conflicts', requireAuth, requireRole('ADMIN'), getAdminConflicts);
router.get('/admin/sessions/:sessionId/conflicts', requireAuth, requireRole('ADMIN'), getSessionConflicts);
router.post('/admin/sessions/:sessionId/conflicts/scan', requireAuth, requireRole('ADMIN'), scanSessionConflicts);

export default router;
