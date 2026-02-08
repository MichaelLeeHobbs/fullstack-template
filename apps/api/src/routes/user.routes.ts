// ===========================================
// User Routes
// ===========================================
// Routes for user profile and preferences.

import { Router, type IRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { UserController } from '../controllers/user.controller.js';
import { changePasswordSchema, updatePreferencesSchema } from '../schemas/user.schema.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/me', UserController.getProfile);

// Password
router.patch('/me/password', validate({ body: changePasswordSchema }), UserController.changePassword);

// Preferences
router.get('/me/preferences', UserController.getPreferences);
router.patch('/me/preferences', validate({ body: updatePreferencesSchema }), UserController.updatePreferences);

export default router;
