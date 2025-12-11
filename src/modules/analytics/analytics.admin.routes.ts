import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { analyticsController } from './analytics.controller.js';
import { analyticsValidators } from './analytics.validator.js';

const router = Router();

/**
 * Analytics Admin Routes
 * Base path: /api/v1/admin/analytics
 *
 * All routes require authentication + analytics:read or analytics:manage permission.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Platform Dashboard
// ============================================================================

/**
 * @route   GET /api/v1/admin/analytics/dashboard
 * @desc    Get platform overview dashboard (orders, revenue, users, restaurants)
 * @access  Admin (analytics:read)
 */
router.get(
  '/dashboard',
  requirePermission('analytics:read'),
  analyticsValidators.validateDashboardQuery,
  validate,
  analyticsController.getPlatformDashboard
);

// ============================================================================
// Revenue Time Series
// ============================================================================

/**
 * @route   GET /api/v1/admin/analytics/revenue
 * @desc    Get platform-wide revenue over time (daily/weekly/monthly)
 * @access  Admin (analytics:read)
 */
router.get(
  '/revenue',
  requirePermission('analytics:read'),
  analyticsValidators.validateRevenueQuery,
  validate,
  analyticsController.getPlatformRevenue
);

// ============================================================================
// Top Restaurants
// ============================================================================

/**
 * @route   GET /api/v1/admin/analytics/top-restaurants
 * @desc    Get top restaurants by revenue
 * @access  Admin (analytics:read)
 */
router.get(
  '/top-restaurants',
  requirePermission('analytics:read'),
  analyticsValidators.validateTopQuery,
  validate,
  analyticsController.getTopRestaurants
);

export default router;
