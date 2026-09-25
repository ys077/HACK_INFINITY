import { Router } from 'express';
import { getFacultyClasses, getFacultyClassById } from '../controllers/class.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('FACULTY'));

router.get('/', getFacultyClasses);
router.get('/:classId', getFacultyClassById);

export default router;
