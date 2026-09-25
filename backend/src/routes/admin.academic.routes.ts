import { Router } from 'express';
import { 
  getDepartments, getDepartmentById, createDepartment, updateDepartment,
  getCourses, getCourseById, createCourse, updateCourse,
  getSections, getSectionById, createSection, updateSection,

  getClassrooms, getClassroomById, createClassroom, updateClassroom
} from '../controllers/academic.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/departments', getDepartments);
router.get('/departments/:id', getDepartmentById);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);

router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);

router.get('/sections', getSections);
router.get('/sections/:id', getSectionById);
router.post('/sections', createSection);
router.put('/sections/:id', updateSection);



router.get('/classrooms', getClassrooms);
router.get('/classrooms/:id', getClassroomById);
router.post('/classrooms', createClassroom);
router.put('/classrooms/:id', updateClassroom);

export default router;
