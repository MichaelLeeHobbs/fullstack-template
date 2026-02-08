// ===========================================
// Session Routes
// ===========================================

import { Router, type IRouter } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { sessionIdParamSchema } from '../schemas/session.schema.js';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', SessionController.list);
router.delete('/', SessionController.revokeAll);
router.delete('/:id', validate({ params: sessionIdParamSchema }), SessionController.revoke);

export default router;
