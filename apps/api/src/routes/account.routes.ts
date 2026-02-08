// ===========================================
// Account Routes
// ===========================================
// Password recovery and email verification.

import { Router, type IRouter } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { passwordResetRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/account.schema.js';

const router: IRouter = Router();

// Public routes (with rate limiting)
router.post('/forgot-password', passwordResetRateLimiter, validate({ body: forgotPasswordSchema }), AccountController.forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), AccountController.resetPassword);
router.post('/verify-email', validate({ body: verifyEmailSchema }), AccountController.verifyEmail);

// Protected routes
router.post('/resend-verification', authenticate, AccountController.resendVerification);

export default router;
