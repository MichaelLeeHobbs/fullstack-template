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
  resendVerificationSchema,
} from '../schemas/account.schema.js';

const router: IRouter = Router();

// Public routes (with rate limiting)

/**
 * @openapi
 * /account/forgot-password:
 *   post:
 *     tags: [Account]
 *     summary: Request a password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (always returns 200 to prevent email enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/forgot-password', passwordResetRateLimiter, validate({ body: forgotPasswordSchema }), AccountController.forgotPassword);

/**
 * @openapi
 * /account/reset-password:
 *   post:
 *     tags: [Account]
 *     summary: Reset password using a token from email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', validate({ body: resetPasswordSchema }), AccountController.resetPassword);

/**
 * @openapi
 * /account/verify-email:
 *   post:
 *     tags: [Account]
 *     summary: Verify email address using a token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-email', validate({ body: verifyEmailSchema }), AccountController.verifyEmail);

router.post(
  '/resend-verification-public',
  passwordResetRateLimiter,
  validate({ body: resendVerificationSchema }),
  AccountController.resendVerificationPublic,
);

// Protected routes

/**
 * @openapi
 * /account/resend-verification:
 *   post:
 *     tags: [Account]
 *     summary: Resend email verification link
 *     responses:
 *       200:
 *         description: Verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend-verification', authenticate, AccountController.resendVerification);

export default router;
