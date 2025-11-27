import { body, param, query } from 'express-validator';
import { DeliveryStatus } from './delivery.types.js';

/**
 * Delivery Validators
 * express-validator rules for delivery endpoints.
 */

// ============================================================================
// Courier Validators
// ============================================================================

const validateAcceptDelivery = [
  param('id')
    .notEmpty()
    .withMessage('Delivery ID is required')
    .isMongoId()
    .withMessage('Invalid delivery ID format'),
];

const validateUpdateStatus = [
  param('id')
    .notEmpty()
    .withMessage('Delivery ID is required')
    .isMongoId()
    .withMessage('Invalid delivery ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.DELIVERED,
      DeliveryStatus.FAILED,
    ])
    .withMessage(
      `Status must be one of: ${DeliveryStatus.PICKED_UP}, ${DeliveryStatus.IN_TRANSIT}, ${DeliveryStatus.DELIVERED}, ${DeliveryStatus.FAILED}`
    ),
];

const validateUpdateLocation = [
  param('id')
    .notEmpty()
    .withMessage('Delivery ID is required')
    .isMongoId()
    .withMessage('Invalid delivery ID format'),
  body('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

const validateAvailableQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('city').optional().isString().withMessage('City must be a string').trim(),
  query('postal_code').optional().isString().withMessage('Postal code must be a string').trim(),
];

const validateHistoryQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort').optional().isString().withMessage('Sort must be a string').trim(),
  query('status')
    .optional()
    .isIn(Object.values(DeliveryStatus))
    .withMessage(`Status must be one of: ${Object.values(DeliveryStatus).join(', ')}`),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid ISO 8601 date'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid ISO 8601 date'),
];

// ============================================================================
// Customer Validators
// ============================================================================

const validateTrackDelivery = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
];

// ============================================================================
// Admin Validators
// ============================================================================

const validateAdminQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort').optional().isString().withMessage('Sort must be a string').trim(),
  query('status')
    .optional()
    .isIn(Object.values(DeliveryStatus))
    .withMessage(`Status must be one of: ${Object.values(DeliveryStatus).join(', ')}`),
  query('courier_id').optional().isMongoId().withMessage('Invalid courier ID format'),
  query('restaurant_id').optional().isMongoId().withMessage('Invalid restaurant ID format'),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid ISO 8601 date'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid ISO 8601 date'),
];

const validateAdminGetById = [
  param('id')
    .notEmpty()
    .withMessage('Delivery ID is required')
    .isMongoId()
    .withMessage('Invalid delivery ID format'),
];

const validateAdminAssignCourier = [
  param('id')
    .notEmpty()
    .withMessage('Delivery ID is required')
    .isMongoId()
    .withMessage('Invalid delivery ID format'),
  body('courier_id')
    .notEmpty()
    .withMessage('Courier ID is required')
    .isMongoId()
    .withMessage('Invalid courier ID format'),
];

const validateAdminCancel = [
  param('id')
    .notEmpty()
    .withMessage('Delivery ID is required')
    .isMongoId()
    .withMessage('Invalid delivery ID format'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
    .trim(),
];

const validateAdminCreate = [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
];

// ============================================================================
// EXPORT
// ============================================================================

export const deliveryValidators = {
  // Courier
  validateAcceptDelivery,
  validateUpdateStatus,
  validateUpdateLocation,
  validateAvailableQuery,
  validateHistoryQuery,
  // Customer
  validateTrackDelivery,
  // Admin
  validateAdminQuery,
  validateAdminGetById,
  validateAdminAssignCourier,
  validateAdminCancel,
  validateAdminCreate,
};
