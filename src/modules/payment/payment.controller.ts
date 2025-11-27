// ──────────────────────────────────────────────
// Payment Controller — Thin Controllers
// ──────────────────────────────────────────────

import { Request, Response } from 'express';
import { paymentService } from './payment.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { PaymentMethodEnum } from './payment.types.js';

// ─── Customer Endpoints ─────────────────────────

/**
 * POST /payments/initiate
 * Initiate payment for an order
 */
export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const ipAddress = req.ip || req.socket.remoteAddress;

  const result = await paymentService.initiatePayment(
    {
      order_id: req.body.order_id,
      payment_method: req.body.payment_method as PaymentMethodEnum,
      return_url: req.body.return_url,
      cancel_url: req.body.cancel_url,
    },
    user,
    ipAddress
  );

  sendSuccessResponse(res, 201, 'Payment initiated successfully', result);
});

/**
 * GET /payments/:orderId/status
 * Get payment status for an order (customer)
 */
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await paymentService.getPaymentByOrderId(req.params.orderId, user);
  sendSuccessResponse(res, 200, 'Payment status retrieved successfully', result);
});

// ─── Webhook Endpoints (no auth — signature verified) ──

/**
 * POST /payments/webhook/stripe
 * Stripe webhook handler — raw body required
 */
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({ success: false, message: 'Missing stripe-signature header' });
    return;
  }

  // req.body is raw Buffer due to express.raw() middleware on webhook routes
  await paymentService.handleStripeWebhook(req.body, signature);
  sendSuccessResponse(res, 200, 'Webhook processed');
});

/**
 * POST /payments/webhook/twint
 * TWINT webhook handler
 */
export const handleTwintWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = (req.headers['x-twint-signature'] as string) || '';
  const payload = Buffer.from(JSON.stringify(req.body));
  await paymentService.handleTwintWebhook(payload, signature);
  sendSuccessResponse(res, 200, 'Webhook processed');
});

/**
 * POST /payments/webhook/postfinance
 * PostFinance webhook handler
 */
export const handlePostFinanceWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = (req.headers['x-postfinance-signature'] as string) || '';
  const payload = Buffer.from(JSON.stringify(req.body));
  await paymentService.handlePostFinanceWebhook(payload, signature);
  sendSuccessResponse(res, 200, 'Webhook processed');
});

// ─── Sandbox Simulation ─────────────────────────

/**
 * POST /payments/twint/simulate-confirm/:transactionId
 * Dev/sandbox only: simulate TWINT customer confirmation
 */
export const simulateTwintConfirm = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.simulateTwintConfirmation(req.params.transactionId);
  sendSuccessResponse(res, 200, 'TWINT payment confirmed (sandbox)', result);
});

/**
 * POST /payments/postfinance/simulate-confirm/:transactionId
 * Dev/sandbox only: simulate PostFinance customer confirmation
 */
export const simulatePostFinanceConfirm = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.simulatePostFinanceConfirmation(req.params.transactionId);
  sendSuccessResponse(res, 200, 'PostFinance payment confirmed (sandbox)', result);
});

// ─── Admin Endpoints ────────────────────────────

/**
 * GET /admin/payments
 * Admin: list all payment transactions
 */
export const adminGetAllPayments = asyncHandler(async (req: Request, res: Response) => {
  const { data, meta } = await paymentService.findAll(
    req.query as Record<string, unknown> as import('./payment.types.js').PaymentQueryDto
  );
  sendPaginatedResponse(res, 200, 'Payment transactions retrieved successfully', data, meta);
});

/**
 * GET /admin/payments/:id
 * Admin: get payment transaction by ID
 */
export const adminGetPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentById(req.params.id);
  sendSuccessResponse(res, 200, 'Payment transaction retrieved successfully', result);
});

/**
 * POST /admin/payments/:orderId/refund
 * Admin: process refund for an order
 */
export const adminProcessRefund = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.processRefund(req.params.orderId, {
    amount: req.body.amount,
    reason: req.body.reason,
  });
  sendSuccessResponse(res, 200, 'Refund processed successfully', result);
});

// ─── Courier / Restaurant Staff Endpoints ───────

/**
 * POST /payments/:orderId/cash/confirm
 * Courier or restaurant staff: confirm cash collected
 */
export const confirmCashPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await paymentService.confirmCashPayment(req.params.orderId, user.id);
  sendSuccessResponse(res, 200, 'Cash payment confirmed successfully', result);
});
