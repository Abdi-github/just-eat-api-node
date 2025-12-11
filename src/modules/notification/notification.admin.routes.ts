import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { notificationController } from './notification.controller.js';
import { notificationValidators } from './notification.validator.js';

const router = Router();

/**
 * Notification Admin Routes
 * Base path: /api/v1/admin/notifications
 *
 * All routes require authentication + notifications:manage permission.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Send notification to users
// ============================================================================

/**
 * @route   POST /api/v1/admin/notifications/send
 * @desc    Send notification to one or more users
 * @access  Admin (notifications:manage)
 */
router.post(
  '/send',
  requirePermission('notifications:manage'),
  notificationValidators.validateAdminSendNotification,
  validate,
  notificationController.adminSendNotification
);

export default router;
