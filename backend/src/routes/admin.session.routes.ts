import { Router } from 'express';
import { getAdminSessions, getAdminSessionById } from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', getAdminSessions);
router.get('/:sessionId', getAdminSessionById);

export default router;
