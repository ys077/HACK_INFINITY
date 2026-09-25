import rateLimit from 'express-rate-limit';

const skipInTest = () => process.env.NODE_ENV === 'test';

// Global rate limiter applied to all requests
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000, // limit each IP to 5000 auth requests per hour
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// Limiter for device verification/challenge (preventing brute force)
export const deviceVerificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many device verification attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

export const biometricLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 biometric attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many biometric attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});
