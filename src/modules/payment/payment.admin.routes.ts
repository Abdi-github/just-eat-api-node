// ──────────────────────────────────────────────
// Payment Admin Routes
// Platform admin payment management endpoints
// Base path: /api/v1/admin/payments
// ──────────────────────────────────────────────

import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import {
  adminGetAllPayments,
  adminGetPaymentById,
  adminProcessRefund,
} from './payment.controller.js';

import {
  validateAdminPaymentQuery,
  validateAdminGetPaymentById,
  validateRefund,
} from './payment.validator.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ============================================================================
// Admin Payment Management
// ============================================================================

/**
 * @route   GET /api/v1/admin/payments
 * @desc    List all payment transactions with filtering
 * @access  Admin (orders:manage)
 */
router.get(
  '/',
  requirePermission('orders:manage'),
  validateAdminPaymentQuery,
  validate,
  adminGetAllPayments
);

/**
 * @route   GET /api/v1/admin/payments/:id
 * @desc    Get a specific payment transaction by ID
 * @access  Admin (orders:manage)
 */
router.get(
  '/:id',
  requirePermission('orders:manage'),
  validateAdminGetPaymentById,
  validate,
  adminGetPaymentById
);

/**
 * @route   POST /api/v1/admin/payments/:orderId/refund
 * @desc    Process a refund for an order's payment
 * @access  Admin (orders:manage)
 */
router.post(
  '/:orderId/refund',
  requirePermission('orders:manage'),
  validateRefund,
  validate,
  adminProcessRefund
);

export default router;
