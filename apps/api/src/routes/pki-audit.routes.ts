// ===========================================
// PKI Audit Routes
// ===========================================
// Routes for PKI audit log viewing.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PkiAuditController } from '../controllers/pki-audit.controller.js';
import { PERMISSIONS } from '@fullstack-template/shared';
import { listPkiAuditQuerySchema } from '../schemas/pki-audit.schema.js';
import { cacheControl } from '../middleware/cache.middleware.js';

const router: IRouter = Router();

// All PKI audit routes require authentication
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PKI_AUDIT_READ),
  validate({ query: listPkiAuditQuerySchema }),
  cacheControl({ maxAge: 0, mustRevalidate: true, private: true }),
  PkiAuditController.list,
);

export default router;
