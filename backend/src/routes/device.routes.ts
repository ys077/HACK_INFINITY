import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { 
  registerDevice, 
  listDevices, 
  getDeviceDetails, 
  revokeDevice,
  getStudentDevicesForAdmin
} from '../controllers/device.controller.js';
import { requestChallenge, verifyChallenge } from '../controllers/device-challenge.controller.js';
import { deviceVerificationLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// --- STUDENT ROUTES ---
router.post('/student/devices/register', requireAuth, requireRole('STUDENT'), registerDevice);
router.get('/student/devices', requireAuth, requireRole('STUDENT'), listDevices);
router.get('/student/devices/:deviceId', requireAuth, requireRole('STUDENT'), getDeviceDetails);
router.post('/student/devices/:deviceId/revoke', requireAuth, requireRole('STUDENT'), revokeDevice);

router.post('/device/challenge', deviceVerificationLimiter, requireAuth, requireRole('STUDENT'), requestChallenge);
router.post('/device/verify', deviceVerificationLimiter, requireAuth, requireRole('STUDENT'), verifyChallenge);

// --- ADMIN ROUTES ---
router.get('/admin/students/:studentId/devices', requireAuth, requireRole('ADMIN'), getStudentDevicesForAdmin);

export default router;
