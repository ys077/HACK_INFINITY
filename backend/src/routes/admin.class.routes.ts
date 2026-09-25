import { Router } from 'express';
import { getClasses, getClassById, createClass, updateClass } from '../controllers/class.controller.js';
import { getEnrollments, createEnrollment, deleteEnrollment, bulkEnrollment } from '../controllers/enrollment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', getClasses);
router.get('/:id', getClassById);
router.post('/', createClass);
router.put('/:id', updateClass);

router.get('/:classId/enrollments', getEnrollments);
router.post('/:classId/enrollments', createEnrollment);
router.delete('/:classId/enrollments/:studentId', deleteEnrollment);
router.post('/:classId/enrollments/bulk', bulkEnrollment);

export default router;
