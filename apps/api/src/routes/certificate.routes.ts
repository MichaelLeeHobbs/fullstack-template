// ===========================================
// Certificate Routes
// ===========================================
// Certificate issuance, listing, download, and chain routes.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CertificateController } from '../controllers/certificate.controller.js';
import { CertificateLifecycleController } from '../controllers/certificate-lifecycle.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import { issueCertificateSchema, listCertificateQuerySchema, downloadCertificateSchema } from '../schemas/certificate.schema.js';
import { revokeCertificateSchema, renewCertificateSchema } from '../schemas/revocation.schema.js';
import { uuidParamSchema } from '../schemas/query.schema.js';

const router: IRouter = Router();

// All certificate routes require authentication
router.use(authenticate);

// ===========================================
// Certificate Operations
// ===========================================

router.post(
  '/issue',
  requirePermission(PERMISSIONS.CERTIFICATES_ISSUE),
  validate({ body: issueCertificateSchema }),
  CertificateController.issue,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.CERTIFICATES_READ),
  validate({ query: listCertificateQuerySchema }),
  CertificateController.list,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CERTIFICATES_READ),
  validate({ params: uuidParamSchema }),
  CertificateController.getById,
);

router.get(
  '/:id/download',
  requirePermission(PERMISSIONS.CERTIFICATES_DOWNLOAD),
  validate({ params: uuidParamSchema, query: downloadCertificateSchema }),
  CertificateController.download,
);

router.get(
  '/:id/chain',
  requirePermission(PERMISSIONS.CERTIFICATES_READ),
  validate({ params: uuidParamSchema }),
  CertificateController.getChain,
);

// ===========================================
// Certificate Lifecycle (Revoke / Renew)
// ===========================================

router.post(
  '/:id/revoke',
  requirePermission(PERMISSIONS.CERTIFICATES_REVOKE),
  validate({ params: uuidParamSchema, body: revokeCertificateSchema }),
  CertificateLifecycleController.revoke,
);

router.post(
  '/:id/renew',
  requirePermission(PERMISSIONS.CERTIFICATES_RENEW),
  validate({ params: uuidParamSchema, body: renewCertificateSchema }),
  CertificateLifecycleController.renew,
);

export default router;
