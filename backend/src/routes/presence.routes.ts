import { Router } from 'express';
import { 
  joinPresence, secureJoinSession, heartbeatPresence, leavePresence, rejoinPresence, 
  getStudentStatus, getStudentTimeline,
  getFacultySessionPresence, getFacultyStudentTimeline
} from '../controllers/presence.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(requireAuth);

// Student Presence Mutators
router.post('/join', requireRole('STUDENT'), joinPresence);
router.post('/join/secure', requireRole('STUDENT'), secureJoinSession);
router.post('/heartbeat', requireRole('STUDENT'), heartbeatPresence);
router.post('/leave', requireRole('STUDENT'), leavePresence);
router.post('/rejoin', requireRole('STUDENT'), rejoinPresence);

// Student Views
router.get('/:sessionId/status', requireRole('STUDENT'), getStudentStatus);
router.get('/:sessionId/timeline', requireRole('STUDENT'), getStudentTimeline);

// Faculty Views
router.get('/session/:sessionId', requireRole('FACULTY'), getFacultySessionPresence);
router.get('/session/:sessionId/student/:studentId/timeline', requireRole('FACULTY'), getFacultyStudentTimeline);

export default router;
