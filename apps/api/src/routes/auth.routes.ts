// ===========================================
// Auth Routes
// ===========================================

import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  authRateLimiter,
  registrationRateLimiter,
} from '../middleware/rateLimit.middleware.js';

const router: IRouter = Router();

// Public routes (with rate limiting)
router.post('/register', registrationRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/me', authenticate, AuthController.me);

export default router;

