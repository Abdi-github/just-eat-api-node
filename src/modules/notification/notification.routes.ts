import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { notificationController } from './notification.controller.js';
import { notificationValidators } from './notification.validator.js';

const router = Router();

/**
 * Notification Routes (User-facing)
 * Base path: /api/v1/public/notifications
 *
 * All routes require authentication.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// List notifications
// ============================================================================

/**
 * @route   GET /api/v1/public/notifications
 * @desc    Get authenticated user's notifications
 * @access  Authenticated (notifications:read)
 */
router.get(
  '/',
  requirePermission('notifications:read'),
  notificationValidators.validateNotificationListQuery,
  validate,
  notificationController.getMyNotifications
);

// ============================================================================
// Notification count (unread badge)
// ============================================================================

/**
 * @route   GET /api/v1/public/notifications/count
 * @desc    Get total + unread notification count
 * @access  Authenticated (notifications:read)
 */
router.get(
  '/count',
  requirePermission('notifications:read'),
  notificationController.getNotificationCount
);

// ============================================================================
// Mark all as read
// ============================================================================

/**
 * @route   PATCH /api/v1/public/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Authenticated (notifications:update)
 */
router.patch(
  '/read-all',
  requirePermission('notifications:update'),
  notificationController.markAllAsRead
);

// ============================================================================
// Delete all
// ============================================================================

/**
 * @route   DELETE /api/v1/public/notifications
 * @desc    Delete all notifications
 * @access  Authenticated (notifications:delete)
 */
router.delete(
  '/',
  requirePermission('notifications:delete'),
  notificationController.deleteAllNotifications
);

// ============================================================================
// Single notification — mark read
// ============================================================================

/**
 * @route   PATCH /api/v1/public/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Authenticated (notifications:update)
 */
router.patch(
  '/:id/read',
  requirePermission('notifications:update'),
  notificationValidators.validateNotificationId,
  validate,
  notificationController.markAsRead
);

// ============================================================================
// Single notification — delete
// ============================================================================

/**
 * @route   DELETE /api/v1/public/notifications/:id
 * @desc    Delete a single notification
 * @access  Authenticated (notifications:delete)
 */
router.delete(
  '/:id',
  requirePermission('notifications:delete'),
  notificationValidators.validateNotificationId,
  validate,
  notificationController.deleteNotification
);

export default router;
