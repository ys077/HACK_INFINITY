import { Router } from 'express';
import { getOwnProfile, updateOwnProfile } from '../controllers/student.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('STUDENT'));

router.get('/profile', getOwnProfile);
router.patch('/profile', updateOwnProfile);

export default router;
