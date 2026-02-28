// ===========================================
// Certificate Profile Routes
// ===========================================
// Certificate profile management routes.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CertificateProfileController } from '../controllers/certificate-profile.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import { createProfileSchema, updateProfileSchema, listProfileQuerySchema } from '../schemas/certificate-profile.schema.js';
import { uuidParamSchema } from '../schemas/query.schema.js';

const router: IRouter = Router();

// All profile routes require authentication
router.use(authenticate);

// ===========================================
// Certificate Profile Management
// ===========================================

router.post(
  '/',
  requirePermission(PERMISSIONS.PROFILES_CREATE),
  validate({ body: createProfileSchema }),
  CertificateProfileController.create,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.PROFILES_READ),
  validate({ query: listProfileQuerySchema }),
  CertificateProfileController.list,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PROFILES_READ),
  validate({ params: uuidParamSchema }),
  CertificateProfileController.getById,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PROFILES_UPDATE),
  validate({ params: uuidParamSchema, body: updateProfileSchema }),
  CertificateProfileController.update,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PROFILES_DELETE),
  validate({ params: uuidParamSchema }),
  CertificateProfileController.delete,
);

export default router;
