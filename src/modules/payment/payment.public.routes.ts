// ──────────────────────────────────────────────
// Payment Public Routes
// Customer-facing payment endpoints + sandbox simulation
// Base path: /api/v1/public/payments
// ──────────────────────────────────────────────

import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import {
  initiatePayment,
  getPaymentStatus,
  confirmCashPayment,
  simulateTwintConfirm,
  simulatePostFinanceConfirm,
} from './payment.controller.js';

import {
  validateInitiatePayment,
  validateGetPaymentStatus,
  validateCashConfirm,
  validateSimulateConfirm,
} from './payment.validator.js';

const router = Router();

// ============================================================================
// Customer Routes (require authentication)
// ============================================================================

/**
 * @route   POST /api/v1/public/payments/initiate
 * @desc    Initiate payment for an order
 * @access  Customer (orders:create — part of order creation flow)
 */
router.post(
  '/initiate',
  authenticate,
  requirePermission('orders:create'),
  validateInitiatePayment,
  validate,
  initiatePayment
);

/**
 * @route   GET /api/v1/public/payments/:orderId/status
 * @desc    Get payment status for an order
 * @access  Customer (orders:read)
 */
router.get(
  '/:orderId/status',
  authenticate,
  requirePermission('orders:read'),
  validateGetPaymentStatus,
  validate,
  getPaymentStatus
);

// ============================================================================
// Cash Payment Confirmation (Courier / Restaurant Staff)
// ============================================================================

/**
 * @route   POST /api/v1/public/payments/:orderId/cash/confirm
 * @desc    Confirm cash collected for an order
 * @access  Courier or Restaurant Staff (authenticated — service validates role)
 */
router.post(
  '/:orderId/cash/confirm',
  authenticate,
  validateCashConfirm,
  validate,
  confirmCashPayment
);

// ============================================================================
// Sandbox / Development Simulation Endpoints
// These are dev-only routes for testing TWINT and PostFinance flows.
// ============================================================================

/**
 * @route   POST /api/v1/public/payments/twint/simulate-confirm/:transactionId
 * @desc    Simulate TWINT customer confirmation (sandbox only)
 * @access  Dev only
 */
router.post(
  '/twint/simulate-confirm/:transactionId',
  validateSimulateConfirm,
  validate,
  simulateTwintConfirm
);

/**
 * @route   POST /api/v1/public/payments/postfinance/simulate-confirm/:transactionId
 * @desc    Simulate PostFinance customer confirmation (sandbox only)
 * @access  Dev only
 */
router.post(
  '/postfinance/simulate-confirm/:transactionId',
  validateSimulateConfirm,
  validate,
  simulatePostFinanceConfirm
);

export default router;
