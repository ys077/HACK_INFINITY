import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { biometricLimiter } from '../middleware/rate-limit.middleware.js';
import { enrollFace, startVerification, verifyFaceAndLiveness } from '../controllers/face.controller.js';

const router = Router();

// Rate limiting specifically for biometric endpoints
router.use(biometricLimiter);

router.post('/enrollment', requireAuth, enrollFace);
router.post('/verification/start', requireAuth, startVerification);
router.post('/verification/verify', requireAuth, verifyFaceAndLiveness);

export default router;
