import { Router } from 'express';
import { getOwnFacultyProfile, updateOwnFacultyProfile } from '../controllers/faculty.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('FACULTY'));

router.get('/profile', getOwnFacultyProfile);
router.patch('/profile', updateOwnFacultyProfile);

export default router;
