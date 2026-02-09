// ===========================================
// Notification Routes
// ===========================================
// All routes require authentication.

import { Router, type IRouter } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../schemas/notification.schema.js';

const router: IRouter = Router();

// All routes require auth
router.use(authenticate);

router.get('/', validate({ query: listNotificationsQuerySchema }), NotificationController.list);
router.get('/unread-count', NotificationController.unreadCount);
router.patch('/read-all', NotificationController.markAllRead);
router.patch('/:id/read', validate({ params: notificationIdParamSchema }), NotificationController.markRead);
router.delete('/:id', validate({ params: notificationIdParamSchema }), NotificationController.remove);

export default router;
