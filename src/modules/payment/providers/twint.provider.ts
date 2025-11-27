// ──────────────────────────────────────────────
// TWINT Payment Provider (Swiss Mobile Payment)
// Sandbox simulation for portfolio/demo project
// ──────────────────────────────────────────────

import crypto from 'crypto';
import { config } from '../../../config/index.js';
import { IPaymentProvider } from './payment-provider.interface.js';
import {
  PaymentMethodEnum,
  PaymentTransactionStatus,
  WebhookEventType,
  CreatePaymentParams,
  PaymentInitResult,
  PaymentConfirmResult,
  PaymentRefundResult,
  WebhookEvent,
  PaymentStatusResult,
} from '../payment.types.js';
import { BadRequestError, ForbiddenError } from '../../../shared/errors/AppError.js';
import { logger } from '../../../shared/logger/index.js';

// In-memory session store for sandbox simulation
const twintSessions = new Map<
  string,
  {
    order_id: string;
    user_id: string;
    amount: number;
    status: PaymentTransactionStatus;
    created_at: Date;
    expires_at: Date;
  }
>();

export class TwintProvider implements IPaymentProvider {
  readonly providerName = PaymentMethodEnum.TWINT;

  /**
   * Create a TWINT payment session
   * In sandbox: generates mock order reference and redirect URL
   * In production: would call TWINT Merchant API
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    const twintOrderId = `TWINT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const timeoutMinutes = config.payment.twint.sessionTimeoutMinutes;
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Store session for sandbox simulation
    twintSessions.set(twintOrderId, {
      order_id: params.order_id,
      user_id: params.user_id,
      amount: params.amount,
      status: PaymentTransactionStatus.PENDING,
      created_at: new Date(),
      expires_at: expiresAt,
    });

    // Build redirect URL (in production, this would be a TWINT checkout page)
    const baseUrl = config.payment.twint.apiUrl || `http://localhost:${config.port}/api/v1`;
    const redirectUrl = `${baseUrl}/payments/twint/checkout/${twintOrderId}`;

    logger.info(`TWINT session created: ${twintOrderId} for order ${params.order_id}`);

    return {
      provider_transaction_id: twintOrderId,
      status: PaymentTransactionStatus.PENDING,
      redirect_url: redirectUrl,
      expires_at: expiresAt,
    };
  }

  /**
   * Confirm a TWINT payment
   * In production: would verify with TWINT API
   */
  async confirmPayment(
    transactionId: string,
    _providerData?: Record<string, unknown>
  ): Promise<PaymentConfirmResult> {
    const session = twintSessions.get(transactionId);
    if (!session) {
      throw BadRequestError('TWINT session not found or expired');
    }

    if (session.status === PaymentTransactionStatus.COMPLETED) {
      return {
        provider_transaction_id: transactionId,
        status: PaymentTransactionStatus.COMPLETED,
        paid_at: new Date(),
      };
    }

    throw BadRequestError('TWINT payment has not been confirmed yet');
  }

  /**
   * Sandbox-only: simulate customer confirming TWINT payment
   */
  async simulateConfirmation(transactionId: string): Promise<PaymentConfirmResult> {
    if (!config.payment.twint.sandboxMode) {
      throw ForbiddenError('TWINT simulation only available in sandbox mode');
    }

    const session = twintSessions.get(transactionId);
    if (!session) {
      throw BadRequestError('TWINT session not found or expired');
    }

    if (new Date() > session.expires_at) {
      session.status = PaymentTransactionStatus.EXPIRED;
      throw BadRequestError('TWINT session has expired');
    }

    if (session.status === PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('TWINT payment already confirmed');
    }

    // Mark as completed
    session.status = PaymentTransactionStatus.COMPLETED;

    logger.info(`TWINT sandbox confirmation: ${transactionId}`);

    return {
      provider_transaction_id: transactionId,
      status: PaymentTransactionStatus.COMPLETED,
      paid_at: new Date(),
      provider_response: {
        simulation: true,
        order_id: session.order_id,
        amount: session.amount,
      },
    };
  }

  /**
   * Process refund (sandbox simulation)
   */
  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentRefundResult> {
    const session = twintSessions.get(transactionId);
    if (!session) {
      throw BadRequestError('TWINT session not found');
    }

    if (session.status !== PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('Cannot refund a payment that is not completed');
    }

    const refundAmount = amount || session.amount;
    const refundId = `TWINT-REF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    session.status =
      refundAmount >= session.amount
        ? PaymentTransactionStatus.REFUNDED
        : PaymentTransactionStatus.PARTIAL_REFUND;

    logger.info(`TWINT refund: ${refundId} for ${transactionId}, amount: ${refundAmount} CHF`);

    return {
      refund_id: refundId,
      status: refundAmount >= session.amount ? 'REFUNDED' : 'PARTIAL_REFUND',
      refunded_amount: refundAmount,
      refunded_at: new Date(),
    };
  }

  /**
   * Handle TWINT webhook (sandbox: simulated)
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent> {
    // In sandbox, verify using HMAC with merchant secret
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.twint.merchantSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature && config.payment.twint.sandboxMode) {
      // In sandbox, be lenient with signatures
      logger.warn('TWINT webhook signature mismatch (sandbox mode — allowing)');
    }

    const body = JSON.parse(payload.toString());

    return {
      event_type:
        body.status === 'COMPLETED'
          ? WebhookEventType.PAYMENT_COMPLETED
          : WebhookEventType.PAYMENT_FAILED,
      provider_transaction_id: body.transaction_id,
      amount: body.amount,
      metadata: body.metadata,
    };
  }

  /**
   * Get TWINT payment status (sandbox)
   */
  async getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult> {
    const session = twintSessions.get(providerTransactionId);
    if (!session) {
      throw BadRequestError('TWINT session not found');
    }

    // Check session expiry
    if (session.status === PaymentTransactionStatus.PENDING && new Date() > session.expires_at) {
      session.status = PaymentTransactionStatus.EXPIRED;
    }

    return {
      provider_transaction_id: providerTransactionId,
      status: session.status,
      amount: session.amount,
      paid_at: session.status === PaymentTransactionStatus.COMPLETED ? new Date() : undefined,
    };
  }

  /**
   * Get sandbox session (for internal use)
   */
  getSession(transactionId: string) {
    return twintSessions.get(transactionId);
  }
}
