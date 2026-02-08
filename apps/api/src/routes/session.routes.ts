// ===========================================
// Session Routes
// ===========================================

import { Router, type IRouter } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { sessionIdParamSchema } from '../schemas/session.schema.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List current user's active sessions
 *     responses:
 *       200:
 *         description: List of active sessions
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
 *                     $ref: '#/components/schemas/Session'
 */
router.get('/', SessionController.list);

/**
 * @openapi
 * /sessions:
 *   delete:
 *     tags: [Sessions]
 *     summary: Revoke all sessions except the current one
 *     responses:
 *       200:
 *         description: All other sessions revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/', SessionController.revokeAll);

/**
 * @openapi
 * /sessions/{id}:
 *   delete:
 *     tags: [Sessions]
 *     summary: Revoke a specific session by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Cannot revoke current session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', validate({ params: sessionIdParamSchema }), SessionController.revoke);

export default router;
