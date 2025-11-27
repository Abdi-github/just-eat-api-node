import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { deliveryController } from './delivery.controller.js';
import { deliveryValidators } from './delivery.validator.js';

const router = Router();

/**
 * Courier Delivery Routes
 * Base path: /api/v1/courier/deliveries
 *
 * All routes require authentication + courier role.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Available Deliveries Pool
// ============================================================================

/**
 * @route   GET /api/v1/courier/deliveries/available
 * @desc    List available deliveries for couriers to accept
 * @access  Courier (deliveries:read or orders:read)
 */
router.get(
  '/available',
  requirePermission('deliveries:read'),
  deliveryValidators.validateAvailableQuery,
  validate,
  deliveryController.getAvailableDeliveries
);

// ============================================================================
// Active Delivery
// ============================================================================

/**
 * @route   GET /api/v1/courier/deliveries/active
 * @desc    Get courier's current active delivery
 * @access  Courier (orders:read)
 */
router.get('/active', requirePermission('deliveries:read'), deliveryController.getActiveDelivery);

// ============================================================================
// Delivery History
// ============================================================================

/**
 * @route   GET /api/v1/courier/deliveries/history
 * @desc    Get courier's delivery history
 * @access  Courier (orders:read)
 */
router.get(
  '/history',
  requirePermission('deliveries:read'),
  deliveryValidators.validateHistoryQuery,
  validate,
  deliveryController.getDeliveryHistory
);

// ============================================================================
// Delivery Actions
// ============================================================================

/**
 * @route   POST /api/v1/courier/deliveries/:id/accept
 * @desc    Accept a delivery assignment
 * @access  Courier (orders:update)
 */
router.post(
  '/:id/accept',
  requirePermission('deliveries:update'),
  deliveryValidators.validateAcceptDelivery,
  validate,
  deliveryController.acceptDelivery
);

/**
 * @route   PATCH /api/v1/courier/deliveries/:id/status
 * @desc    Update delivery status (PICKED_UP, IN_TRANSIT, DELIVERED)
 * @access  Courier (orders:update)
 */
router.patch(
  '/:id/status',
  requirePermission('deliveries:update'),
  deliveryValidators.validateUpdateStatus,
  validate,
  deliveryController.updateDeliveryStatus
);

/**
 * @route   PATCH /api/v1/courier/deliveries/:id/location
 * @desc    Update courier's live location
 * @access  Courier (orders:update)
 */
router.patch(
  '/:id/location',
  requirePermission('deliveries:update'),
  deliveryValidators.validateUpdateLocation,
  validate,
  deliveryController.updateLocation
);

export default router;
