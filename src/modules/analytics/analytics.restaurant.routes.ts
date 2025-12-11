import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { analyticsController } from './analytics.controller.js';
import { analyticsValidators } from './analytics.validator.js';

const router = Router({ mergeParams: true });

/**
 * Analytics Restaurant Routes
 * Base path: /api/v1/restaurant/:restaurantId/analytics
 *
 * All routes require authentication + analytics:read permission.
 * mergeParams: true allows access to :restaurantId from parent router.
 * Ownership is verified in the service layer.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Restaurant Dashboard
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/analytics/dashboard
 * @desc    Get restaurant dashboard overview (orders, revenue, rating, breakdowns)
 * @access  Restaurant Owner (analytics:read)
 */
router.get(
  '/dashboard',
  requirePermission('analytics:read'),
  analyticsValidators.validateDashboardQuery,
  validate,
  analyticsController.getRestaurantDashboard
);

// ============================================================================
// Revenue Time Series
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/analytics/revenue
 * @desc    Get restaurant revenue over time (daily/weekly/monthly)
 * @access  Restaurant Owner (analytics:read)
 */
router.get(
  '/revenue',
  requirePermission('analytics:read'),
  analyticsValidators.validateRevenueQuery,
  validate,
  analyticsController.getRestaurantRevenue
);

// ============================================================================
// Top Items
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/analytics/top-items
 * @desc    Get most ordered menu items
 * @access  Restaurant Owner (analytics:read)
 */
router.get(
  '/top-items',
  requirePermission('analytics:read'),
  analyticsValidators.validateTopQuery,
  validate,
  analyticsController.getRestaurantTopItems
);

export default router;
