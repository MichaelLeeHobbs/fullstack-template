// ===========================================
// MFA Routes
// ===========================================

import { Router, type IRouter } from 'express';
import { MfaController } from '../controllers/mfa.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  mfaVerifySetupSchema,
  mfaVerifyLoginSchema,
  mfaDisableSchema,
  mfaRegenerateBackupCodesSchema,
} from '../schemas/mfa.schema.js';

const router: IRouter = Router();

// Public route (uses temp token, not JWT)

/**
 * @openapi
 * /mfa/verify:
 *   post:
 *     tags: [MFA]
 *     summary: Verify MFA code during login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, method, code]
 *             properties:
 *               tempToken:
 *                 type: string
 *                 description: Temporary token received from login when MFA is required
 *               method:
 *                 type: string
 *                 description: MFA method (e.g. "totp", "backup")
 *               code:
 *                 type: string
 *                 description: MFA verification code
 *     responses:
 *       200:
 *         description: MFA verified — returns access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid MFA code or expired temp token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify', authRateLimiter, validate({ body: mfaVerifyLoginSchema }), MfaController.verifyLogin);

// Authenticated routes

/**
 * @openapi
 * /mfa/methods:
 *   get:
 *     tags: [MFA]
 *     summary: Get enabled MFA methods for current user
 *     responses:
 *       200:
 *         description: List of MFA methods and their status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       enabled:
 *                         type: boolean
 */
router.get('/methods', authenticate, MfaController.getMethods);

/**
 * @openapi
 * /mfa/totp/setup:
 *   post:
 *     tags: [MFA]
 *     summary: Begin TOTP setup — returns secret and QR code
 *     responses:
 *       200:
 *         description: TOTP setup data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *                       description: Base64-encoded QR code image
 */
router.post('/totp/setup', authenticate, MfaController.setupTotp);

/**
 * @openapi
 * /mfa/totp/verify-setup:
 *   post:
 *     tags: [MFA]
 *     summary: Verify TOTP setup with a code from the authenticator app
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: TOTP enabled — returns backup codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/totp/verify-setup', authenticate, validate({ body: mfaVerifySetupSchema }), MfaController.verifySetup);

/**
 * @openapi
 * /mfa/disable:
 *   post:
 *     tags: [MFA]
 *     summary: Disable an MFA method
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method, code]
 *             properties:
 *               method:
 *                 type: string
 *                 description: MFA method to disable
 *               code:
 *                 type: string
 *                 description: Verification code to confirm identity
 *     responses:
 *       200:
 *         description: MFA method disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid code or method not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/disable', authenticate, validate({ body: mfaDisableSchema }), MfaController.disable);

/**
 * @openapi
 * /mfa/backup-codes:
 *   post:
 *     tags: [MFA]
 *     summary: Regenerate backup codes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method, code]
 *             properties:
 *               method:
 *                 type: string
 *                 description: Active MFA method for verification
 *               code:
 *                 type: string
 *                 description: Verification code to confirm identity
 *     responses:
 *       200:
 *         description: New backup codes generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid code or MFA not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/backup-codes', authenticate, validate({ body: mfaRegenerateBackupCodesSchema }), MfaController.regenerateBackupCodes);

export default router;
