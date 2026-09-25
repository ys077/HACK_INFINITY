import { Router } from 'express';
import { getStudentClasses, getStudentClassById } from '../controllers/class.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('STUDENT'));

router.get('/', getStudentClasses);
router.get('/:classId', getStudentClassById);

export default router;
