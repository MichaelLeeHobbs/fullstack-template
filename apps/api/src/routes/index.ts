// ===========================================
// Route Aggregator
// ===========================================
// Combines all route modules under /api/v1 prefix.

import { Router, type IRouter } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import userRoutes from './user.routes.js';
import accountRoutes from './account.routes.js';
import roleRoutes from './role.routes.js';
import apiKeyRoutes from './api-key.routes.js';
import sessionRoutes from './session.routes.js';
import mfaRoutes from './mfa.routes.js';
import notificationRoutes from './notification.routes.js';

const router: IRouter = Router();

// API v1 routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/account', accountRoutes);
router.use('/roles', roleRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/sessions', sessionRoutes);
router.use('/mfa', mfaRoutes);
router.use('/notifications', notificationRoutes);

export default router;

