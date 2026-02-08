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

const router: IRouter = Router();

// All role routes require authentication
router.use(authenticate);

// ===========================================
// Permissions (read-only)
// ===========================================

// List all permissions
router.get(
  '/permissions',
  requirePermission(PERMISSIONS.ROLES_READ),
  RoleController.listPermissions
);

// List permissions grouped by resource
router.get(
  '/permissions/grouped',
  requirePermission(PERMISSIONS.ROLES_READ),
  RoleController.listPermissionsGrouped
);

// ===========================================
// Roles
// ===========================================

// List all roles
router.get('/', requirePermission(PERMISSIONS.ROLES_READ), RoleController.listRoles);

// Get role by ID
router.get('/:id', requirePermission(PERMISSIONS.ROLES_READ), RoleController.getRole);

// Create role
router.post('/', requirePermission(PERMISSIONS.ROLES_CREATE), validate({ body: createRoleSchema }), RoleController.createRole);

// Update role
router.put('/:id', requirePermission(PERMISSIONS.ROLES_UPDATE), validate({ body: updateRoleSchema }), RoleController.updateRole);

// Delete role
router.delete('/:id', requirePermission(PERMISSIONS.ROLES_DELETE), RoleController.deleteRole);

// Set role permissions
router.put(
  '/:id/permissions',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  validate({ body: setPermissionsSchema }),
  RoleController.setRolePermissions
);

// ===========================================
// User Roles
// ===========================================

// Get roles for a user
router.get(
  '/users/:userId',
  requirePermission(PERMISSIONS.USERS_READ),
  RoleController.getUserRoles
);

// Set roles for a user
router.put(
  '/users/:userId',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate({ body: setUserRolesSchema }),
  RoleController.setUserRoles
);

export default router;
