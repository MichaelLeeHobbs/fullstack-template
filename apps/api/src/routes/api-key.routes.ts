// ===========================================
// API Key Routes
// ===========================================
// Routes for API key management and service accounts.

import { type IRouter, Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ApiKeyController } from '../controllers/api-key.controller.js';
import { PERMISSIONS } from '../db/seeds/permissions.js';
import {
  createApiKeySchema,
  updateApiKeyPermissionsSchema,
  listApiKeysQuerySchema,
  createServiceAccountSchema,
} from '../schemas/api-key.schema.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticate);

// ===========================================
// Self-Service (no special permissions needed)
// ===========================================

router.get('/my', ApiKeyController.listMy);

// ===========================================
// Service Accounts (before /:id to avoid param capture)
// ===========================================

router.get('/service-accounts', requirePermission(PERMISSIONS.SERVICE_ACCOUNTS_READ), ApiKeyController.listServiceAccounts);
router.post('/service-accounts', requirePermission(PERMISSIONS.SERVICE_ACCOUNTS_CREATE), validate({ body: createServiceAccountSchema }), ApiKeyController.createServiceAccount);
router.delete('/service-accounts/:id', requirePermission(PERMISSIONS.SERVICE_ACCOUNTS_DELETE), ApiKeyController.deleteServiceAccount);

// ===========================================
// API Key Admin CRUD
// ===========================================

router.post('/', requirePermission(PERMISSIONS.API_KEYS_CREATE), validate({ body: createApiKeySchema }), ApiKeyController.create);
router.get('/', requirePermission(PERMISSIONS.API_KEYS_READ), validate({ query: listApiKeysQuerySchema }), ApiKeyController.list);
router.get('/:id', requirePermission(PERMISSIONS.API_KEYS_READ), ApiKeyController.get);
router.put('/:id/permissions', requirePermission(PERMISSIONS.API_KEYS_UPDATE), validate({ body: updateApiKeyPermissionsSchema }), ApiKeyController.setPermissions);
router.post('/:id/revoke', requirePermission(PERMISSIONS.API_KEYS_DELETE), ApiKeyController.revoke);
router.delete('/:id', requirePermission(PERMISSIONS.API_KEYS_DELETE), ApiKeyController.remove);

export default router;
