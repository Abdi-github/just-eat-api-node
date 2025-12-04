import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { reviewController } from './review.controller.js';
import { reviewValidators } from './review.validator.js';

const router = Router();

/**
 * Public Review Routes
 * Base path: /api/v1/public/reviews
 *
 * Mix of public (no auth) and customer (auth required) endpoints.
 */

// ============================================================================
// Public endpoints (no auth)
// ============================================================================

/**
 * @route   GET /api/v1/public/reviews/restaurant/:restaurantId
 * @desc    Get approved reviews for a restaurant
 * @access  Public
 */
router.get(
  '/restaurant/:restaurantId',
  reviewValidators.validateGetRestaurantReviews,
  validate,
  reviewController.getRestaurantReviews
);

/**
 * @route   GET /api/v1/public/reviews/restaurant/:restaurantId/summary
 * @desc    Get rating summary for a restaurant
 * @access  Public
 */
router.get(
  '/restaurant/:restaurantId/summary',
  reviewValidators.validateGetRatingSummary,
  validate,
  reviewController.getRestaurantRatingSummary
);

// ============================================================================
// Customer endpoints (auth required)
// ============================================================================

/**
 * @route   POST /api/v1/public/reviews
 * @desc    Create a review for a delivered order
 * @access  Customer (reviews:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('reviews:create'),
  reviewValidators.validateCreateReview,
  validate,
  reviewController.createReview
);

/**
 * @route   GET /api/v1/public/reviews/my
 * @desc    Get authenticated user's reviews
 * @access  Customer (reviews:read)
 */
router.get(
  '/my',
  authenticate,
  requirePermission('reviews:read'),
  reviewValidators.validateGetMyReviews,
  validate,
  reviewController.getMyReviews
);

/**
 * @route   PATCH /api/v1/public/reviews/:id
 * @desc    Update own review
 * @access  Customer (reviews:update)
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('reviews:update'),
  reviewValidators.validateUpdateReview,
  validate,
  reviewController.updateMyReview
);

/**
 * @route   DELETE /api/v1/public/reviews/:id
 * @desc    Delete own review
 * @access  Customer (reviews:update)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('reviews:update'),
  reviewValidators.validateDeleteReview,
  validate,
  reviewController.deleteMyReview
);

export default router;
