// ===========================================
// MFA Routes
// ===========================================

import { Router, type IRouter } from 'express';
import { MfaController } from '../controllers/mfa.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  mfaVerifySetupSchema,
  mfaVerifyLoginSchema,
  mfaDisableSchema,
  mfaRegenerateBackupCodesSchema,
} from '../schemas/mfa.schema.js';

const router: IRouter = Router();

// Public route (uses temp token, not JWT)
router.post('/verify', authRateLimiter, validate({ body: mfaVerifyLoginSchema }), MfaController.verifyLogin);

// Authenticated routes
router.get('/methods', authenticate, MfaController.getMethods);
router.post('/totp/setup', authenticate, MfaController.setupTotp);
router.post('/totp/verify-setup', authenticate, validate({ body: mfaVerifySetupSchema }), MfaController.verifySetup);
router.post('/disable', authenticate, validate({ body: mfaDisableSchema }), MfaController.disable);
router.post('/backup-codes', authenticate, validate({ body: mfaRegenerateBackupCodesSchema }), MfaController.regenerateBackupCodes);

export default router;
