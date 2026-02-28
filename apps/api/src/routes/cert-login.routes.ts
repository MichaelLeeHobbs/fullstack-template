// ===========================================
// Certificate Login Routes
// ===========================================
// Routes for mTLS certificate-based authentication and certificate binding.

import { Router, type IRouter } from 'express';
import { z } from 'zod/v4';
import { CertLoginController } from '../controllers/cert-login.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { attachCertificateSchema } from '../schemas/cert-login.schema.js';

const router: IRouter = Router();

// ===========================================
// Public routes (no auth - uses client cert)
// ===========================================

/**
 * @openapi
 * /cert-login:
 *   post:
 *     tags: [Certificate Auth]
 *     summary: Log in using a client certificate (mTLS)
 *     description: >
 *       Authenticates the user via client certificate headers forwarded by NGINX.
 *       No request body is needed; authentication is based on x-ssl-* headers.
 *     security: []
 *     responses:
 *       200:
 *         description: Login successful
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
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Certificate not detected, not authenticated, or not bound
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/cert-login', CertLoginController.login);

/**
 * @openapi
 * /cert-attach:
 *   post:
 *     tags: [Certificate Auth]
 *     summary: Attach a client certificate to a user account using a one-time code
 *     security: []
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
 *                 format: uuid
 *               label:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Certificate attached successfully
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
 *       400:
 *         description: Invalid or expired attach code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Certificate already bound to an account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/cert-attach',
  validate({ body: attachCertificateSchema }),
  CertLoginController.attachCertificate,
);

// ===========================================
// Protected routes (requires JWT auth)
// ===========================================

/**
 * @openapi
 * /cert-attach/code:
 *   post:
 *     tags: [Certificate Auth]
 *     summary: Generate a one-time code for attaching a client certificate
 *     description: >
 *       Creates a one-time code (valid for 15 minutes) that can be used
 *       to bind a client certificate to the authenticated user's account.
 *       Rate-limited to 5 codes per hour.
 *     responses:
 *       201:
 *         description: Attach code generated
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
 *                     code:
 *                       type: string
 *                       format: uuid
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/cert-attach/code', authenticate, CertLoginController.generateAttachCode);

/**
 * @openapi
 * /cert-status:
 *   get:
 *     tags: [Certificate Auth]
 *     summary: Get all certificate bindings for the authenticated user
 *     responses:
 *       200:
 *         description: List of certificate bindings
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
 */
router.get('/cert-status', authenticate, CertLoginController.getCertStatus);

/**
 * @openapi
 * /cert-binding/{id}:
 *   delete:
 *     tags: [Certificate Auth]
 *     summary: Remove a certificate binding
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Binding removed
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
 *                     message:
 *                       type: string
 *       404:
 *         description: Binding not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/cert-binding/:id',
  authenticate,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  CertLoginController.removeBinding,
);

export default router;
