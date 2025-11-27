import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { deliveryController } from './delivery.controller.js';
import { deliveryValidators } from './delivery.validator.js';

const router = Router();

/**
 * Admin Delivery Routes
 * Base path: /api/v1/admin/deliveries
 *
 * Platform admin delivery management.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Query
// ============================================================================

/**
 * @route   GET /api/v1/admin/deliveries
 * @desc    List all deliveries with filters
 * @access  Admin (orders:manage)
 */
router.get(
  '/',
  requirePermission('orders:manage'),
  deliveryValidators.validateAdminQuery,
  validate,
  deliveryController.adminGetAllDeliveries
);

/**
 * @route   GET /api/v1/admin/deliveries/:id
 * @desc    Get delivery details
 * @access  Admin (orders:manage)
 */
router.get(
  '/:id',
  requirePermission('orders:manage'),
  deliveryValidators.validateAdminGetById,
  validate,
  deliveryController.adminGetDeliveryById
);

// ============================================================================
// Actions
// ============================================================================

/**
 * @route   POST /api/v1/admin/deliveries/create
 * @desc    Create a delivery assignment for an order
 * @access  Admin (orders:manage)
 */
router.post(
  '/create',
  requirePermission('orders:manage'),
  deliveryValidators.validateAdminCreate,
  validate,
  deliveryController.adminCreateDelivery
);

/**
 * @route   POST /api/v1/admin/deliveries/:id/assign
 * @desc    Manually assign courier to delivery
 * @access  Admin (orders:manage)
 */
router.post(
  '/:id/assign',
  requirePermission('orders:manage'),
  deliveryValidators.validateAdminAssignCourier,
  validate,
  deliveryController.adminAssignCourier
);

/**
 * @route   POST /api/v1/admin/deliveries/:id/cancel
 * @desc    Cancel a delivery
 * @access  Admin (orders:manage)
 */
router.post(
  '/:id/cancel',
  requirePermission('orders:manage'),
  deliveryValidators.validateAdminCancel,
  validate,
  deliveryController.adminCancelDelivery
);

export default router;
