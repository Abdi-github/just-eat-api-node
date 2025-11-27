import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { deliveryController } from './delivery.controller.js';
import { deliveryValidators } from './delivery.validator.js';

const router = Router();

/**
 * Public Delivery Routes
 * Base path: /api/v1/public/deliveries
 *
 * Customer-facing delivery tracking.
 */

/**
 * @route   GET /api/v1/public/deliveries/:orderId/track
 * @desc    Track delivery status for an order
 * @access  Authenticated customer (order owner)
 */
router.get(
  '/:orderId/track',
  authenticate,
  requirePermission('orders:read'),
  deliveryValidators.validateTrackDelivery,
  validate,
  deliveryController.trackDelivery
);

export default router;
