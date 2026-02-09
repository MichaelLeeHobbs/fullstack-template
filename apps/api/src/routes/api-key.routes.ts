// ===========================================
// API Key Routes
// ===========================================
// Routes for API key management and service accounts.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ApiKeyController } from '../controllers/api-key.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import {
  createApiKeySchema,
  updateApiKeyPermissionsSchema,
  listApiKeysQuerySchema,
  listServiceAccountsQuerySchema,
  createServiceAccountSchema,
} from '../schemas/api-key.schema.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticate);

// ===========================================
// Self-Service (no special permissions needed)
// ===========================================

/**
 * @openapi
 * /api-keys/my:
 *   get:
 *     tags: [API Keys]
 *     summary: List current user's API keys
 *     responses:
 *       200:
 *         description: List of user's API keys
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
 *                     $ref: '#/components/schemas/ApiKey'
 */
router.get('/my', ApiKeyController.listMy);

// ===========================================
// Service Accounts (before /:id to avoid param capture)
// ===========================================

/**
 * @openapi
 * /api-keys/service-accounts:
 *   get:
 *     tags: [API Keys]
 *     summary: List all service accounts
 *     responses:
 *       200:
 *         description: List of service accounts
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
 *                     $ref: '#/components/schemas/User'
 */
router.get('/service-accounts', requirePermission(PERMISSIONS.SERVICE_ACCOUNTS_READ), validate({ query: listServiceAccountsQuerySchema }), ApiKeyController.listServiceAccounts);

/**
 * @openapi
 * /api-keys/service-accounts:
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new service account
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
 *       201:
 *         description: Service account created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/service-accounts', requirePermission(PERMISSIONS.SERVICE_ACCOUNTS_CREATE), validate({ body: createServiceAccountSchema }), ApiKeyController.createServiceAccount);

/**
 * @openapi
 * /api-keys/service-accounts/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete a service account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Service account deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/service-accounts/:id', requirePermission(PERMISSIONS.SERVICE_ACCOUNTS_DELETE), ApiKeyController.deleteServiceAccount);

// ===========================================
// API Key Admin CRUD
// ===========================================

/**
 * @openapi
 * /api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Assign to a specific user (admin only)
 *     responses:
 *       201:
 *         description: API key created (includes plaintext key — only shown once)
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
 *                     apiKey:
 *                       $ref: '#/components/schemas/ApiKey'
 *                     key:
 *                       type: string
 *                       description: Plaintext API key (only returned at creation)
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', requirePermission(PERMISSIONS.API_KEYS_CREATE), validate({ body: createApiKeySchema }), ApiKeyController.create);

/**
 * @openapi
 * /api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List all API keys (paginated)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Paginated API key list
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
 *                     $ref: '#/components/schemas/ApiKey'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', requirePermission(PERMISSIONS.API_KEYS_READ), validate({ query: listApiKeysQuerySchema }), ApiKeyController.list);

/**
 * @openapi
 * /api-keys/{id}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get an API key by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: API key details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiKey'
 *       404:
 *         description: API key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', requirePermission(PERMISSIONS.API_KEYS_READ), ApiKeyController.get);

/**
 * @openapi
 * /api-keys/{id}/permissions:
 *   put:
 *     tags: [API Keys]
 *     summary: Set permissions for an API key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissionIds]
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: API key permissions updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put('/:id/permissions', requirePermission(PERMISSIONS.API_KEYS_UPDATE), validate({ body: updateApiKeyPermissionsSchema }), ApiKeyController.setPermissions);

/**
 * @openapi
 * /api-keys/{id}/revoke:
 *   post:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: API key revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/:id/revoke', requirePermission(PERMISSIONS.API_KEYS_DELETE), ApiKeyController.revoke);

/**
 * @openapi
 * /api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete an API key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: API key deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/:id', requirePermission(PERMISSIONS.API_KEYS_DELETE), ApiKeyController.remove);

export default router;
