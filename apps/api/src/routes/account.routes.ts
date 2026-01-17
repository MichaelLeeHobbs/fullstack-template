// ===========================================
// Account Routes
// ===========================================
// Password recovery and email verification.

import { Router, type IRouter } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { passwordResetRateLimiter } from '../middleware/rateLimit.middleware.js';

const router: IRouter = Router();

// Public routes (with rate limiting)
router.post('/forgot-password', passwordResetRateLimiter, AccountController.forgotPassword);
router.post('/reset-password', AccountController.resetPassword);
router.post('/verify-email', AccountController.verifyEmail);

// Protected routes
router.post('/resend-verification', authenticate, AccountController.resendVerification);

export default router;
