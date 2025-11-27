import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { orderController } from './order.controller.js';
import { orderValidators } from './order.validator.js';

const router = Router({ mergeParams: true });

/**
 * Restaurant Order Routes
 * Base path: /api/v1/restaurant/:restaurantId/orders
 *
 * All routes require authentication + restaurant owner/staff permissions.
 * mergeParams: true allows access to :restaurantId from parent router.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Restaurant Owner/Staff Order Management
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/orders
 * @desc    Get all orders for a restaurant
 * @access  Restaurant Owner/Staff (orders:read)
 */
router.get(
  '/',
  requirePermission('orders:read'),
  orderValidators.getRestaurantOrders,
  validate,
  orderController.getRestaurantOrders
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/orders/active
 * @desc    Get active (in-progress) orders for a restaurant
 * @access  Restaurant Owner/Staff (orders:read)
 */
router.get(
  '/active',
  requirePermission('orders:read'),
  orderValidators.getActiveRestaurantOrders,
  validate,
  orderController.getActiveRestaurantOrders
);

/**
 * @route   PATCH /api/v1/restaurant/:restaurantId/orders/:id/status
 * @desc    Update an order's status (accept, reject, preparing, ready)
 * @access  Restaurant Owner/Staff (orders:update)
 */
router.patch(
  '/:id/status',
  requirePermission('orders:update'),
  orderValidators.updateOrderStatus,
  validate,
  orderController.updateOrderStatus
);

/**
 * @route   PATCH /api/v1/restaurant/:restaurantId/orders/:id/assign-courier
 * @desc    Assign a courier to a delivery order
 * @access  Restaurant Owner (orders:update)
 */
router.patch(
  '/:id/assign-courier',
  requirePermission('orders:update'),
  orderValidators.assignCourier,
  validate,
  orderController.assignCourier
);

export default router;
