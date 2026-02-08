// ===========================================
// Role Routes
// ===========================================
// Routes for role and permission management.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { RoleController } from '../controllers/role.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import { createRoleSchema, updateRoleSchema, setPermissionsSchema, setUserRolesSchema } from '../schemas/role.schema.js';
import { cacheControl } from '../middleware/cache.middleware.js';

const router: IRouter = Router();

// All role routes require authentication
router.use(authenticate);

// ===========================================
// Permissions (read-only)
// ===========================================

/**
 * @openapi
 * /roles/permissions:
 *   get:
 *     tags: [Roles]
 *     summary: List all permissions
 *     responses:
 *       200:
 *         description: List of all permissions
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
 *                     $ref: '#/components/schemas/Permission'
 */
router.get(
  '/permissions',
  requirePermission(PERMISSIONS.ROLES_READ),
  cacheControl({ maxAge: 300, private: true }),
  RoleController.listPermissions
);

/**
 * @openapi
 * /roles/permissions/grouped:
 *   get:
 *     tags: [Roles]
 *     summary: List permissions grouped by resource
 *     responses:
 *       200:
 *         description: Permissions organized by resource
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
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Permission'
 */
router.get(
  '/permissions/grouped',
  requirePermission(PERMISSIONS.ROLES_READ),
  cacheControl({ maxAge: 300, private: true }),
  RoleController.listPermissionsGrouped
);

// ===========================================
// Roles
// ===========================================

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: List all roles
 *     responses:
 *       200:
 *         description: List of roles with their permissions
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
 *                     $ref: '#/components/schemas/Role'
 */
router.get('/', requirePermission(PERMISSIONS.ROLES_READ), cacheControl({ maxAge: 60, private: true }), RoleController.listRoles);

/**
 * @openapi
 * /roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get a role by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role details with permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', requirePermission(PERMISSIONS.ROLES_READ), cacheControl({ maxAge: 60, private: true }), RoleController.getRole);

/**
 * @openapi
 * /roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create a new role
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
 *               description:
 *                 type: string
 *                 maxLength: 255
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Role created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       409:
 *         description: Role name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', requirePermission(PERMISSIONS.ROLES_CREATE), validate({ body: createRoleSchema }), RoleController.createRole);

/**
 * @openapi
 * /roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Update a role
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
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       403:
 *         description: Cannot modify system role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', requirePermission(PERMISSIONS.ROLES_UPDATE), validate({ body: updateRoleSchema }), RoleController.updateRole);

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete a role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Cannot delete system role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', requirePermission(PERMISSIONS.ROLES_DELETE), RoleController.deleteRole);

/**
 * @openapi
 * /roles/{id}/permissions:
 *   put:
 *     tags: [Roles]
 *     summary: Set permissions for a role
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
 *         description: Role permissions updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put(
  '/:id/permissions',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  validate({ body: setPermissionsSchema }),
  RoleController.setRolePermissions
);

// ===========================================
// User Roles
// ===========================================

/**
 * @openapi
 * /roles/users/{userId}:
 *   get:
 *     tags: [Roles]
 *     summary: Get roles assigned to a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of roles for the user
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
 *                     $ref: '#/components/schemas/Role'
 */
router.get(
  '/users/:userId',
  requirePermission(PERMISSIONS.USERS_READ),
  RoleController.getUserRoles
);

/**
 * @openapi
 * /roles/users/{userId}:
 *   put:
 *     tags: [Roles]
 *     summary: Set roles for a user
 *     parameters:
 *       - in: path
 *         name: userId
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
 *             required: [roleIds]
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: User roles updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put(
  '/users/:userId',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate({ body: setUserRolesSchema }),
  RoleController.setUserRoles
);

export default router;
