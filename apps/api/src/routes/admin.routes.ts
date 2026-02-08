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
import { PERMISSIONS } from '../db/seeds/permissions.js';
import { listUsersQuerySchema, updateUserSchema, listAuditLogsQuerySchema } from '../schemas/admin.schema.js';
import { updateSettingSchema } from '../schemas/settings.schema.js';

const router: IRouter = Router();

// All admin routes require authentication
router.use(authenticate);

// ===========================================
// Settings Management
// ===========================================

router.get('/settings', requirePermission(PERMISSIONS.SETTINGS_READ), SettingsController.list);
router.get('/settings/:key', requirePermission(PERMISSIONS.SETTINGS_READ), SettingsController.get);
router.patch(
  '/settings/:key',
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  validate({ body: updateSettingSchema }),
  SettingsController.update
);

// ===========================================
// User Management
// ===========================================

router.get('/users', requirePermission(PERMISSIONS.USERS_READ), validate({ query: listUsersQuerySchema }), AdminController.listUsers);
router.get('/users/:id', requirePermission(PERMISSIONS.USERS_READ), AdminController.getUser);
router.patch('/users/:id', requirePermission(PERMISSIONS.USERS_UPDATE), validate({ body: updateUserSchema }), AdminController.updateUser);
router.delete('/users/:id', requirePermission(PERMISSIONS.USERS_DELETE), AdminController.deleteUser);

// ===========================================
// Audit Logs
// ===========================================

router.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_READ), validate({ query: listAuditLogsQuerySchema }), AdminController.listAuditLogs);

export default router;
