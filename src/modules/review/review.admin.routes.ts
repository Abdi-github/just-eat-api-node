import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { reviewController } from './review.controller.js';
import { reviewValidators } from './review.validator.js';

const router = Router();

/**
 * Admin Review Routes
 * Base path: /api/v1/admin/reviews
 *
 * All routes require authentication + admin permissions.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// List & Get
// ============================================================================

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    List all reviews with filtering
 * @access  Admin (reviews:approve — implies read access)
 */
router.get(
  '/',
  requirePermission('reviews:approve'),
  reviewValidators.validateAdminListReviews,
  validate,
  reviewController.getAllReviews
);

/**
 * @route   GET /api/v1/admin/reviews/:id
 * @desc    Get review by ID
 * @access  Admin (reviews:approve)
 */
router.get(
  '/:id',
  requirePermission('reviews:approve'),
  reviewValidators.validateAdminGetReview,
  validate,
  reviewController.getReviewById
);

// ============================================================================
// Moderation
// ============================================================================

/**
 * @route   PATCH /api/v1/admin/reviews/:id/moderate
 * @desc    Moderate a review (approve / reject / flag)
 * @access  Admin (reviews:approve)
 */
router.patch(
  '/:id/moderate',
  requirePermission('reviews:approve'),
  reviewValidators.validateModerateReview,
  validate,
  reviewController.moderateReview
);

// ============================================================================
// Delete
// ============================================================================

/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Delete a review
 * @access  Admin (reviews:delete — only super_admin/platform_admin have this)
 */
router.delete(
  '/:id',
  requirePermission('reviews:approve'),
  reviewValidators.validateAdminDeleteReview,
  validate,
  reviewController.adminDeleteReview
);

export default router;
