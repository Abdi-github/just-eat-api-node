import { body, param, query } from 'express-validator';
import { ReviewStatus, REVIEW_CONSTANTS } from './review.types.js';

/**
 * Review Validators
 * express-validator rules for review endpoints.
 */

// ============================================================================
// Customer Validators
// ============================================================================

const validateCreateReview = [
  body('restaurant_id')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID format'),
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: REVIEW_CONSTANTS.MIN_RATING, max: REVIEW_CONSTANTS.MAX_RATING })
    .withMessage(
      `Rating must be between ${REVIEW_CONSTANTS.MIN_RATING} and ${REVIEW_CONSTANTS.MAX_RATING}`
    ),
  body('comment')
    .optional()
    .isString()
    .withMessage('Comment must be a string')
    .isLength({ max: REVIEW_CONSTANTS.MAX_COMMENT_LENGTH })
    .withMessage(`Comment cannot exceed ${REVIEW_CONSTANTS.MAX_COMMENT_LENGTH} characters`)
    .trim(),
];

const validateUpdateReview = [
  param('id')
    .notEmpty()
    .withMessage('Review ID is required')
    .isMongoId()
    .withMessage('Invalid review ID format'),
  body('rating')
    .optional()
    .isInt({ min: REVIEW_CONSTANTS.MIN_RATING, max: REVIEW_CONSTANTS.MAX_RATING })
    .withMessage(
      `Rating must be between ${REVIEW_CONSTANTS.MIN_RATING} and ${REVIEW_CONSTANTS.MAX_RATING}`
    ),
  body('comment')
    .optional()
    .isString()
    .withMessage('Comment must be a string')
    .isLength({ max: REVIEW_CONSTANTS.MAX_COMMENT_LENGTH })
    .withMessage(`Comment cannot exceed ${REVIEW_CONSTANTS.MAX_COMMENT_LENGTH} characters`)
    .trim(),
];

const validateDeleteReview = [
  param('id')
    .notEmpty()
    .withMessage('Review ID is required')
    .isMongoId()
    .withMessage('Invalid review ID format'),
];

const validateGetMyReviews = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: REVIEW_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${REVIEW_CONSTANTS.MAX_LIMIT}`),
  query('sort').optional().isString().withMessage('Sort must be a string'),
];

// ============================================================================
// Public Validators
// ============================================================================

const validateGetRestaurantReviews = [
  param('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: REVIEW_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${REVIEW_CONSTANTS.MAX_LIMIT}`),
  query('sort').optional().isString().withMessage('Sort must be a string'),
  query('rating')
    .optional()
    .isInt({ min: REVIEW_CONSTANTS.MIN_RATING, max: REVIEW_CONSTANTS.MAX_RATING })
    .withMessage(
      `Rating filter must be between ${REVIEW_CONSTANTS.MIN_RATING} and ${REVIEW_CONSTANTS.MAX_RATING}`
    ),
];

const validateGetRatingSummary = [
  param('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID format'),
];

// ============================================================================
// Restaurant Owner Validators
// ============================================================================

const validateReplyToReview = [
  param('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID format'),
  param('id')
    .notEmpty()
    .withMessage('Review ID is required')
    .isMongoId()
    .withMessage('Invalid review ID format'),
  body('restaurant_reply')
    .notEmpty()
    .withMessage('Reply text is required')
    .isString()
    .withMessage('Reply must be a string')
    .isLength({ max: REVIEW_CONSTANTS.MAX_REPLY_LENGTH })
    .withMessage(`Reply cannot exceed ${REVIEW_CONSTANTS.MAX_REPLY_LENGTH} characters`)
    .trim(),
];

const validateGetOwnerReviews = [
  param('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: REVIEW_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${REVIEW_CONSTANTS.MAX_LIMIT}`),
  query('sort').optional().isString().withMessage('Sort must be a string'),
  query('rating')
    .optional()
    .isInt({ min: REVIEW_CONSTANTS.MIN_RATING, max: REVIEW_CONSTANTS.MAX_RATING })
    .withMessage('Invalid rating filter'),
  query('status').optional().isIn(Object.values(ReviewStatus)).withMessage('Invalid status filter'),
];

// ============================================================================
// Admin Validators
// ============================================================================

const validateAdminListReviews = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: REVIEW_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${REVIEW_CONSTANTS.MAX_LIMIT}`),
  query('sort').optional().isString().withMessage('Sort must be a string'),
  query('status').optional().isIn(Object.values(ReviewStatus)).withMessage('Invalid status filter'),
  query('restaurant_id').optional().isMongoId().withMessage('Invalid restaurant ID format'),
  query('user_id').optional().isMongoId().withMessage('Invalid user ID format'),
  query('min_rating')
    .optional()
    .isInt({ min: REVIEW_CONSTANTS.MIN_RATING, max: REVIEW_CONSTANTS.MAX_RATING })
    .withMessage('Invalid min_rating'),
  query('max_rating')
    .optional()
    .isInt({ min: REVIEW_CONSTANTS.MIN_RATING, max: REVIEW_CONSTANTS.MAX_RATING })
    .withMessage('Invalid max_rating'),
];

const validateAdminGetReview = [
  param('id')
    .notEmpty()
    .withMessage('Review ID is required')
    .isMongoId()
    .withMessage('Invalid review ID format'),
];

const validateModerateReview = [
  param('id')
    .notEmpty()
    .withMessage('Review ID is required')
    .isMongoId()
    .withMessage('Invalid review ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.FLAGGED])
    .withMessage('Status must be APPROVED, REJECTED, or FLAGGED'),
  body('moderation_reason')
    .optional()
    .isString()
    .withMessage('Moderation reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Moderation reason cannot exceed 500 characters')
    .trim(),
];

const validateAdminDeleteReview = [
  param('id')
    .notEmpty()
    .withMessage('Review ID is required')
    .isMongoId()
    .withMessage('Invalid review ID format'),
];

// ============================================================================
// Export
// ============================================================================

export const reviewValidators = {
  // Customer
  validateCreateReview,
  validateUpdateReview,
  validateDeleteReview,
  validateGetMyReviews,
  // Public
  validateGetRestaurantReviews,
  validateGetRatingSummary,
  // Restaurant owner
  validateReplyToReview,
  validateGetOwnerReviews,
  // Admin
  validateAdminListReviews,
  validateAdminGetReview,
  validateModerateReview,
  validateAdminDeleteReview,
};
