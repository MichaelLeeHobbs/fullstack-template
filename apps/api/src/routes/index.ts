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
import caRoutes from './ca.routes.js';
import certificateProfileRoutes from './certificate-profile.routes.js';
import certificateRoutes from './certificate.routes.js';
import csrRoutes from './csr.routes.js';
import certLoginRoutes from './cert-login.routes.js';
import pkiAuditRoutes from './pki-audit.routes.js';

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
router.use('/ca', caRoutes);
router.use('/profiles', certificateProfileRoutes);
router.use('/certificates/requests', csrRoutes);
router.use('/certificates', certificateRoutes);
router.use('/pki-audit', pkiAuditRoutes);
router.use('/', certLoginRoutes);

export default router;

