import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { orderController } from './order.controller.js';
import { orderValidators } from './order.validator.js';

const router = Router();

/**
 * Courier Order Routes
 * Base path: /api/v1/courier/orders
 *
 * All routes require authentication + courier role.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Courier Delivery Management
// ============================================================================

/**
 * @route   GET /api/v1/courier/orders
 * @desc    Get courier's assigned orders (history)
 * @access  Courier (orders:read)
 */
router.get(
  '/',
  requirePermission('orders:read'),
  orderValidators.getCourierOrders,
  validate,
  orderController.getCourierOrders
);

/**
 * @route   GET /api/v1/courier/orders/active
 * @desc    Get courier's active deliveries
 * @access  Courier (orders:read)
 */
router.get('/active', requirePermission('orders:read'), orderController.getCourierActiveDeliveries);

/**
 * @route   PATCH /api/v1/courier/orders/:id/status
 * @desc    Update delivery status (PICKED_UP, IN_TRANSIT, DELIVERED)
 * @access  Courier (orders:update — via super_admin or extended courier permissions)
 */
router.patch(
  '/:id/status',
  orderValidators.updateDeliveryStatus,
  validate,
  orderController.updateDeliveryStatus
);

export default router;
