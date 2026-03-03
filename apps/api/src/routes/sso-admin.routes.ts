// ===========================================
// SSO Admin Routes
// ===========================================
// Protected routes for SSO provider management.

import { Router, type IRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { SsoAdminController } from '../controllers/sso-admin.controller.js';
import { PERMISSIONS } from '@fullstack-template/shared';
import { createSsoProviderSchema, updateSsoProviderSchema, ssoToggleSchema } from '../schemas/sso.schema.js';
import { uuidParamSchema } from '../schemas/query.schema.js';

const router: IRouter = Router();

// All admin SSO routes require authentication
router.use(authenticate);

// List all SSO providers
router.get(
  '/providers',
  requirePermission(PERMISSIONS.SSO_PROVIDERS_READ),
  SsoAdminController.listProviders,
);

// Get a single SSO provider
router.get(
  '/providers/:id',
  requirePermission(PERMISSIONS.SSO_PROVIDERS_READ),
  validate({ params: uuidParamSchema }),
  SsoAdminController.getProvider,
);

// Create a new SSO provider
router.post(
  '/providers',
  requirePermission(PERMISSIONS.SSO_PROVIDERS_CREATE),
  validate({ body: createSsoProviderSchema }),
  SsoAdminController.createProvider,
);

// Update an SSO provider
router.patch(
  '/providers/:id',
  requirePermission(PERMISSIONS.SSO_PROVIDERS_UPDATE),
  validate({ params: uuidParamSchema, body: updateSsoProviderSchema }),
  SsoAdminController.updateProvider,
);

// Delete an SSO provider
router.delete(
  '/providers/:id',
  requirePermission(PERMISSIONS.SSO_PROVIDERS_DELETE),
  validate({ params: uuidParamSchema }),
  SsoAdminController.deleteProvider,
);

// Enable/disable an SSO provider
router.patch(
  '/providers/:id/toggle',
  requirePermission(PERMISSIONS.SSO_PROVIDERS_UPDATE),
  validate({ params: uuidParamSchema, body: ssoToggleSchema }),
  SsoAdminController.toggleProvider,
);

export default router;
