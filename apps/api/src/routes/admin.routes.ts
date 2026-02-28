// ===========================================
// Admin Routes
// ===========================================
// Protected routes for admin users with specific permissions.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { AdminController } from '../controllers/admin.controller.js';
import { PERMISSIONS } from '@fullstack-template/shared';
import { listUsersQuerySchema, updateUserSchema, listAuditLogsQuerySchema } from '../schemas/admin.schema.js';
import { updateSettingSchema } from '../schemas/settings.schema.js';
import { uuidParamSchema } from '../schemas/query.schema.js';
import { cacheControl } from '../middleware/cache.middleware.js';

const router: IRouter = Router();

// All admin routes require authentication
router.use(authenticate);

// ===========================================
// Settings Management
// ===========================================

/**
 * @openapi
 * /admin/settings:
 *   get:
 *     tags: [Settings]
 *     summary: List all system settings
 *     responses:
 *       200:
 *         description: List of settings
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
 *                     $ref: '#/components/schemas/Setting'
 */
router.get('/settings', requirePermission(PERMISSIONS.SETTINGS_READ), cacheControl({ maxAge: 60, private: true }), SettingsController.list);

/**
 * @openapi
 * /admin/settings/{key}:
 *   get:
 *     tags: [Settings]
 *     summary: Get a single system setting by key
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Setting value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *       404:
 *         description: Setting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/settings/:key', requirePermission(PERMISSIONS.SETTINGS_READ), cacheControl({ maxAge: 60, private: true }), SettingsController.get);

/**
 * @openapi
 * /admin/settings/{key}:
 *   patch:
 *     tags: [Settings]
 *     summary: Update a system setting
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: boolean
 *     responses:
 *       200:
 *         description: Setting updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 */
router.patch(
  '/settings/:key',
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  validate({ body: updateSettingSchema }),
  SettingsController.update
);

// ===========================================
// User Management
// ===========================================

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (paginated)
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: isAdmin
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated user list
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
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/users', requirePermission(PERMISSIONS.USERS_READ), validate({ query: listUsersQuerySchema }), cacheControl({ maxAge: 0, mustRevalidate: true, private: true }), AdminController.listUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
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
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users/:id', requirePermission(PERMISSIONS.USERS_READ), validate({ params: uuidParamSchema }), cacheControl({ maxAge: 0, mustRevalidate: true, private: true }), AdminController.getUser);

/**
 * @openapi
 * /admin/users/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user (admin actions)
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
 *             properties:
 *               isActive:
 *                 type: boolean
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
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
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/users/:id', requirePermission(PERMISSIONS.USERS_UPDATE), validate({ params: uuidParamSchema, body: updateUserSchema }), AdminController.updateUser);

/**
 * @openapi
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Cannot delete own account or other error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/users/:id', requirePermission(PERMISSIONS.USERS_DELETE), validate({ params: uuidParamSchema }), AdminController.deleteUser);

// ===========================================
// Audit Logs
// ===========================================

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit logs (paginated)
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
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated audit log list
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
 *                     $ref: '#/components/schemas/AuditLog'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_READ), validate({ query: listAuditLogsQuerySchema }), cacheControl({ maxAge: 0, mustRevalidate: true, private: true }), AdminController.listAuditLogs);

export default router;
