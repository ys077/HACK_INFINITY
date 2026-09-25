import { Router } from 'express';
import { getStudents, getStudentById, createStudent, updateStudent, updateStudentStatus } from '../controllers/student.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.patch('/:id/status', updateStudentStatus);

export default router;
