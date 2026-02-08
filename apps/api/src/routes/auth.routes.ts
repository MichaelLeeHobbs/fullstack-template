// ===========================================
// Auth Routes
// ===========================================

import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  authRateLimiter,
  registrationRateLimiter,
} from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema.js';

const router: IRouter = Router();

// Public routes (with rate limiting)
router.post('/register', registrationRateLimiter, validate({ body: registerSchema }), AuthController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', validate({ body: refreshSchema }), AuthController.refresh);
router.post('/logout', validate({ body: refreshSchema }), AuthController.logout);

// Protected routes
router.get('/me', authenticate, AuthController.me);

export default router;
