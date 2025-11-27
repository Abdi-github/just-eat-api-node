// ──────────────────────────────────────────────
// Payment Validator — express-validator rules
// ──────────────────────────────────────────────

import { body, param, query } from 'express-validator';
import { PaymentMethodEnum, PaymentTransactionStatus } from './payment.types.js';

// ─── Initiate Payment ───────────────────────────

export const validateInitiatePayment = [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('payment_method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(Object.values(PaymentMethodEnum))
    .withMessage(`Payment method must be one of: ${Object.values(PaymentMethodEnum).join(', ')}`),
  body('return_url').optional().isURL({ require_tld: false }).withMessage('Return URL must be a valid URL'),
  body('cancel_url').optional().isURL({ require_tld: false }).withMessage('Cancel URL must be a valid URL'),
];

// ─── Refund ─────────────────────────────────────

export const validateRefund = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be a positive number'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
];

// ─── Get Payment Status ─────────────────────────

export const validateGetPaymentStatus = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
];

// ─── Cash Confirm ───────────────────────────────

export const validateCashConfirm = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
];

// ─── Simulation Endpoints ───────────────────────

export const validateSimulateConfirm = [
  param('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .isString()
    .withMessage('Transaction ID must be a string')
    .trim(),
];

// ─── Admin Query ────────────────────────────────

export const validateAdminPaymentQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(Object.values(PaymentTransactionStatus))
    .withMessage(`Status must be one of: ${Object.values(PaymentTransactionStatus).join(', ')}`),
  query('payment_method')
    .optional()
    .isIn(Object.values(PaymentMethodEnum))
    .withMessage(`Payment method must be one of: ${Object.values(PaymentMethodEnum).join(', ')}`),
  query('order_id').optional().isMongoId().withMessage('Invalid order ID format'),
  query('user_id').optional().isMongoId().withMessage('Invalid user ID format'),
];

// ─── Admin Get by ID ────────────────────────────

export const validateAdminGetPaymentById = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isMongoId()
    .withMessage('Invalid payment ID format'),
];
