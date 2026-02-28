// ===========================================
// CSR Routes
// ===========================================
// Certificate Signing Request workflow routes.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CsrController } from '../controllers/csr.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import { submitCsrSchema, approveCsrSchema, rejectCsrSchema, listCsrQuerySchema } from '../schemas/csr.schema.js';
import { uuidParamSchema } from '../schemas/query.schema.js';

const router: IRouter = Router();

// All CSR routes require authentication
router.use(authenticate);

// ===========================================
// CSR Operations
// ===========================================

router.post(
  '/',
  requirePermission(PERMISSIONS.CSR_SUBMIT),
  validate({ body: submitCsrSchema }),
  CsrController.submit,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.CSR_READ),
  validate({ query: listCsrQuerySchema }),
  CsrController.list,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CSR_READ),
  validate({ params: uuidParamSchema }),
  CsrController.getById,
);

router.post(
  '/:id/approve',
  requirePermission(PERMISSIONS.CSR_APPROVE),
  validate({ params: uuidParamSchema, body: approveCsrSchema }),
  CsrController.approve,
);

router.post(
  '/:id/reject',
  requirePermission(PERMISSIONS.CSR_APPROVE),
  validate({ params: uuidParamSchema, body: rejectCsrSchema }),
  CsrController.reject,
);

export default router;
