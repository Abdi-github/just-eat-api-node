import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { orderController } from './order.controller.js';
import { orderValidators } from './order.validator.js';

const router = Router();

/**
 * Customer Order Routes
 * Base path: /api/v1/public/orders
 *
 * All routes require authentication.
 */

// ============================================================================
// Customer Routes (require authentication)
// ============================================================================

/**
 * @route   POST /api/v1/public/orders
 * @desc    Place a new order
 * @access  Customer (orders:create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('orders:create'),
  orderValidators.placeOrder,
  validate,
  orderController.placeOrder
);

/**
 * @route   GET /api/v1/public/orders/my
 * @desc    Get customer's own orders
 * @access  Customer (orders:read)
 */
router.get(
  '/my',
  authenticate,
  requirePermission('orders:read'),
  orderValidators.getMyOrders,
  validate,
  orderController.getMyOrders
);

/**
 * @route   GET /api/v1/public/orders/:id
 * @desc    Get a specific order by ID
 * @access  Customer (orders:read)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('orders:read'),
  orderValidators.getById,
  validate,
  orderController.getOrderById
);

/**
 * @route   PATCH /api/v1/public/orders/:id/cancel
 * @desc    Cancel an order (before PREPARING)
 * @access  Customer (orders:create)
 */
router.patch(
  '/:id/cancel',
  authenticate,
  requirePermission('orders:create'),
  orderValidators.cancelOrder,
  validate,
  orderController.cancelOrder
);

export default router;
