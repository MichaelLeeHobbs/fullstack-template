// ===========================================
// SSO Public Routes
// ===========================================
// Public SSO endpoints for authentication flow.

import { Router, type IRouter } from 'express';
import { SsoController } from '../controllers/sso.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { ssoExchangeSchema } from '../schemas/sso.schema.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router: IRouter = Router();

// List enabled SSO providers (for login page)
router.get('/providers', SsoController.listProviders);

// Initiate SSO login (redirects to IdP)
router.get('/:slug/login', authRateLimiter, SsoController.initiateLogin);

// OIDC callback from IdP
router.get('/oidc/callback', SsoController.oidcCallback);

// SAML ACS callback from IdP
router.post('/saml/callback', SsoController.samlCallback);

// Exchange auth code for JWT tokens
router.post('/exchange', authRateLimiter, validate({ body: ssoExchangeSchema }), SsoController.exchangeCode);

export default router;
