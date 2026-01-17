// ===========================================
// Admin Routes
// ===========================================
// Protected routes for admin users only.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { AdminController } from '../controllers/admin.controller.js';

const router: IRouter = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Settings management
router.get('/settings', SettingsController.list);
router.get('/settings/:key', SettingsController.get);
router.patch('/settings/:key', SettingsController.update);

// User management
router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUser);
router.patch('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Audit logs
router.get('/audit-logs', AdminController.listAuditLogs);

export default router;

