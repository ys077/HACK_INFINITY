import { Router } from 'express';
import { createSession, endSession, getFacultySessions, getFacultySessionById } from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('FACULTY'));

router.get('/', getFacultySessions);
router.post('/', createSession);
router.get('/:sessionId', getFacultySessionById);
router.post('/:sessionId/end', endSession);

export default router;
