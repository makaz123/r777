import express from 'express';
import {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
} from '../../controllers/admin/notificationController.js';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', adminAuthMiddleware, getNotifications);
router.get('/unread-count', adminAuthMiddleware, getUnreadNotificationCount);
router.post('/', adminAuthMiddleware, createNotification);
router.patch('/mark-read', adminAuthMiddleware, markNotificationsRead);

export default router;
