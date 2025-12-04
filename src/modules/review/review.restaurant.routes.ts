import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { reviewController } from './review.controller.js';
import { reviewValidators } from './review.validator.js';

const router = Router({ mergeParams: true });

/**
 * Restaurant Owner Review Routes
 * Base path: /api/v1/restaurant/:restaurantId/reviews
 *
 * All routes require authentication + restaurant owner role.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// List reviews for own restaurant
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/reviews
 * @desc    List all reviews for the owner's restaurant (all statuses)
 * @access  Restaurant Owner (reviews:read)
 */
router.get(
  '/',
  requirePermission('reviews:read'),
  reviewValidators.validateGetOwnerReviews,
  validate,
  reviewController.getOwnerRestaurantReviews
);

// ============================================================================
// Reply to a review
// ============================================================================

/**
 * @route   POST /api/v1/restaurant/:restaurantId/reviews/:id/reply
 * @desc    Restaurant owner replies to a review
 * @access  Restaurant Owner (reviews:read)
 */
router.post(
  '/:id/reply',
  requirePermission('reviews:read'),
  reviewValidators.validateReplyToReview,
  validate,
  reviewController.replyToReview
);

export default router;
