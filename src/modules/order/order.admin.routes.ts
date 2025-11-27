import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { orderController } from './order.controller.js';
import { orderValidators } from './order.validator.js';

const router = Router();

/**
 * Admin Order Routes
 * Base path: /api/v1/admin/orders
 *
 * All routes require authentication + admin permissions.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Admin Order Management
// ============================================================================

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders with extensive filtering
 * @access  Admin (orders:read or orders:manage)
 */
router.get(
  '/',
  requirePermission('orders:read'),
  orderValidators.getAllOrders,
  validate,
  orderController.getAllOrders
);

/**
 * @route   GET /api/v1/admin/orders/:id
 * @desc    Get any order by ID
 * @access  Admin (orders:read or orders:manage)
 */
router.get(
  '/:id',
  requirePermission('orders:read'),
  orderValidators.getByIdAdmin,
  validate,
  orderController.getOrderByIdAdmin
);

/**
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @desc    Update any order's status (admin override)
 * @access  Admin (orders:update or orders:manage)
 */
router.patch(
  '/:id/status',
  requirePermission('orders:update'),
  orderValidators.updateOrderStatusAdmin,
  validate,
  orderController.updateOrderStatusAdmin
);

export default router;
