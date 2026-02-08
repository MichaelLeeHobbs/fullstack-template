// ===========================================
// Admin Routes
// ===========================================
// Protected routes for admin users with specific permissions.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { AdminController } from '../controllers/admin.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';

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
  SettingsController.update
);

// ===========================================
// User Management
// ===========================================

router.get('/users', requirePermission(PERMISSIONS.USERS_READ), AdminController.listUsers);
router.get('/users/:id', requirePermission(PERMISSIONS.USERS_READ), AdminController.getUser);
router.patch('/users/:id', requirePermission(PERMISSIONS.USERS_UPDATE), AdminController.updateUser);
router.delete('/users/:id', requirePermission(PERMISSIONS.USERS_DELETE), AdminController.deleteUser);

// ===========================================
// Audit Logs
// ===========================================

router.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_READ), AdminController.listAuditLogs);

export default router;
