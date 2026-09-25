import { Router } from 'express';
import { getFaculty, getFacultyById, createFaculty, updateFaculty, updateFacultyStatus } from '../controllers/faculty.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', getFaculty);
router.get('/:id', getFacultyById);
router.post('/', createFaculty);
router.put('/:id', updateFaculty);
router.patch('/:id/status', updateFacultyStatus);

export default router;
