// ===========================================
// CA Routes
// ===========================================
// Certificate Authority management routes.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CaController } from '../controllers/ca.controller.js';
import { CrlController } from '../controllers/crl.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import { createCaSchema, updateCaSchema, listCaQuerySchema } from '../schemas/ca.schema.js';
import { generateCrlSchema, listCrlQuerySchema } from '../schemas/crl.schema.js';
import { uuidParamSchema } from '../schemas/query.schema.js';

const router: IRouter = Router();

// ===========================================
// Public CRL endpoint (before auth middleware)
// ===========================================

// Public endpoint for CRL distribution points (no auth required)
router.get(
  '/:id/crl/latest.der',
  validate({ params: uuidParamSchema }),
  CrlController.getLatestDer,
);

// All remaining CA routes require authentication
router.use(authenticate);

// ===========================================
// CA Management
// ===========================================

router.post(
  '/',
  requirePermission(PERMISSIONS.CA_CREATE),
  validate({ body: createCaSchema }),
  CaController.create,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.CA_READ),
  validate({ query: listCaQuerySchema }),
  CaController.list,
);

router.get(
  '/hierarchy',
  requirePermission(PERMISSIONS.CA_READ),
  CaController.getHierarchy,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CA_READ),
  validate({ params: uuidParamSchema }),
  CaController.getById,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CA_UPDATE),
  validate({ params: uuidParamSchema, body: updateCaSchema }),
  CaController.update,
);

router.post(
  '/:id/suspend',
  requirePermission(PERMISSIONS.CA_UPDATE),
  validate({ params: uuidParamSchema }),
  CaController.suspend,
);

router.post(
  '/:id/retire',
  requirePermission(PERMISSIONS.CA_UPDATE),
  validate({ params: uuidParamSchema }),
  CaController.retire,
);

router.get(
  '/:id/chain',
  requirePermission(PERMISSIONS.CA_READ),
  validate({ params: uuidParamSchema }),
  CaController.getChain,
);

// ===========================================
// CRL Management
// ===========================================

router.post(
  '/:id/crl',
  requirePermission(PERMISSIONS.CRL_GENERATE),
  validate({ params: uuidParamSchema, body: generateCrlSchema }),
  CrlController.generate,
);

router.get(
  '/:id/crl/latest',
  requirePermission(PERMISSIONS.CRL_READ),
  validate({ params: uuidParamSchema }),
  CrlController.getLatest,
);

router.get(
  '/:id/crl/history',
  requirePermission(PERMISSIONS.CRL_READ),
  validate({ params: uuidParamSchema, query: listCrlQuerySchema }),
  CrlController.getHistory,
);

export default router;
