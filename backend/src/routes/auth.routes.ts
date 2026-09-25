import { Router } from 'express';
import { login, refresh, logout, getMe, googleOidcStart, googleOidcCallback } from '../controllers/auth.controller.js';
import { generateRegistration, verifyRegistration, generateAuth, verifyAuth, revokeCredential, getPasskeys } from '../controllers/passkey.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

// OIDC
router.get('/oidc/google/start', authLimiter, googleOidcStart);
router.get('/oidc/google/callback', authLimiter, googleOidcCallback);

// Passkey Step-up
router.post('/passkey/register/options', requireAuth, authLimiter, generateRegistration);
router.post('/passkey/register/verify', requireAuth, authLimiter, verifyRegistration);
router.post('/passkey/auth/options', requireAuth, authLimiter, generateAuth);
router.post('/passkey/auth/verify', requireAuth, authLimiter, verifyAuth);
router.post('/passkey/revoke', requireAuth, revokeCredential);
router.get('/passkeys', requireAuth, getPasskeys);

export default router;
