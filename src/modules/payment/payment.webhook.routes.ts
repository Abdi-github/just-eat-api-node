// ──────────────────────────────────────────────
// Payment Webhook Routes
// External payment provider webhook endpoints
// Base path: /api/v1/webhooks/payments
//
// IMPORTANT: These routes are mounted BEFORE the global express.json()
// middleware in app.ts. Stripe requires the raw request body for
// signature verification, while TWINT and PostFinance use JSON.
// Each route explicitly applies its own body parser.
// ──────────────────────────────────────────────

import express, { Router } from 'express';

import {
  handleStripeWebhook,
  handleTwintWebhook,
  handlePostFinanceWebhook,
} from './payment.controller.js';

const router = Router();

// ============================================================================
// Webhook Endpoints (No authentication — signature verified per provider)
// ============================================================================

/**
 * @route   POST /api/v1/webhooks/payments/stripe
 * @desc    Stripe webhook — payment_intent.succeeded / failed, refund events
 * @access  Public (signature verified by Stripe SDK)
 * @note    Uses express.raw() to pass raw Buffer body for signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

/**
 * @route   POST /api/v1/webhooks/payments/twint
 * @desc    TWINT webhook — payment completed / failed events
 * @access  Public (HMAC signature verified)
 */
router.post('/twint', express.json(), handleTwintWebhook);

/**
 * @route   POST /api/v1/webhooks/payments/postfinance
 * @desc    PostFinance webhook — transaction completed / failed events
 * @access  Public (HMAC signature verified)
 */
router.post('/postfinance', express.json(), handlePostFinanceWebhook);

export default router;
