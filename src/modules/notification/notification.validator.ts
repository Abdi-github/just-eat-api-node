import { body, param, query } from 'express-validator';
import {
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CHANNEL_VALUES,
  NOTIFICATION_PRIORITY_VALUES,
  NOTIFICATION_CONSTANTS,
} from './notification.types.js';

/**
 * Notification Validators
 *
 * express-validator rules for notification endpoints.
 */

// ============================================================================
// Query validators
// ============================================================================

const validateNotificationListQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: NOTIFICATION_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${NOTIFICATION_CONSTANTS.MAX_LIMIT}`),
  query('type')
    .optional()
    .isIn(NOTIFICATION_TYPE_VALUES)
    .withMessage(`Type must be one of: ${NOTIFICATION_TYPE_VALUES.join(', ')}`),
  query('is_read')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('is_read must be "true" or "false"'),
];

// ============================================================================
// Param validators
// ============================================================================

const validateNotificationId = [param('id').isMongoId().withMessage('Invalid notification ID')];

// ============================================================================
// Admin: send notification
// ============================================================================

const validateAdminSendNotification = [
  body('user_ids').isArray({ min: 1 }).withMessage('user_ids must be a non-empty array'),
  body('user_ids.*').isMongoId().withMessage('Each user_id must be a valid MongoDB ObjectId'),
  body('type')
    .isIn(NOTIFICATION_TYPE_VALUES)
    .withMessage(`Type must be one of: ${NOTIFICATION_TYPE_VALUES.join(', ')}`),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: NOTIFICATION_CONSTANTS.MAX_TITLE_LENGTH })
    .withMessage(
      `Title is required and must not exceed ${NOTIFICATION_CONSTANTS.MAX_TITLE_LENGTH} characters`
    ),
  body('body')
    .isString()
    .trim()
    .isLength({ min: 1, max: NOTIFICATION_CONSTANTS.MAX_BODY_LENGTH })
    .withMessage(
      `Body is required and must not exceed ${NOTIFICATION_CONSTANTS.MAX_BODY_LENGTH} characters`
    ),
  body('data').optional().isObject().withMessage('Data must be a JSON object'),
  body('channel')
    .optional()
    .isIn(NOTIFICATION_CHANNEL_VALUES)
    .withMessage(`Channel must be one of: ${NOTIFICATION_CHANNEL_VALUES.join(', ')}`),
  body('priority')
    .optional()
    .isIn(NOTIFICATION_PRIORITY_VALUES)
    .withMessage(`Priority must be one of: ${NOTIFICATION_PRIORITY_VALUES.join(', ')}`),
];

export const notificationValidators = {
  validateNotificationListQuery,
  validateNotificationId,
  validateAdminSendNotification,
};
