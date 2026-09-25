import { Router } from 'express';
import { getStudentActiveSessions, getStudentSessionHistory } from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('STUDENT'));

router.get('/active', getStudentActiveSessions);
router.get('/history', getStudentSessionHistory);

export default router;
