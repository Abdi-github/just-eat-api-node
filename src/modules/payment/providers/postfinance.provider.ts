// ──────────────────────────────────────────────
// PostFinance Payment Provider (Swiss National Bank)
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
const pfSessions = new Map<
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

export class PostFinanceProvider implements IPaymentProvider {
  readonly providerName = PaymentMethodEnum.POSTFINANCE;

  /**
   * Create a PostFinance transaction
   * In sandbox: generates mock transaction reference and redirect URL
   * In production: would call PostFinance Checkout REST API
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    const pfTransactionId = `PF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timeoutMinutes = config.payment.postfinance.sessionTimeoutMinutes;
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Store session for sandbox simulation
    pfSessions.set(pfTransactionId, {
      order_id: params.order_id,
      user_id: params.user_id,
      amount: params.amount,
      status: PaymentTransactionStatus.PENDING,
      created_at: new Date(),
      expires_at: expiresAt,
    });

    // Build redirect URL (in production, this would be PostFinance hosted page)
    const baseUrl = config.payment.postfinance.apiUrl || `http://localhost:${config.port}/api/v1`;
    const redirectUrl = `${baseUrl}/payments/postfinance/checkout/${pfTransactionId}`;

    logger.info(`PostFinance session created: ${pfTransactionId} for order ${params.order_id}`);

    return {
      provider_transaction_id: pfTransactionId,
      status: PaymentTransactionStatus.PENDING,
      redirect_url: redirectUrl,
      expires_at: expiresAt,
    };
  }

  /**
   * Confirm a PostFinance payment
   * In production: would verify with PostFinance API
   */
  async confirmPayment(
    transactionId: string,
    _providerData?: Record<string, unknown>
  ): Promise<PaymentConfirmResult> {
    const session = pfSessions.get(transactionId);
    if (!session) {
      throw BadRequestError('PostFinance session not found or expired');
    }

    if (session.status === PaymentTransactionStatus.COMPLETED) {
      return {
        provider_transaction_id: transactionId,
        status: PaymentTransactionStatus.COMPLETED,
        paid_at: new Date(),
      };
    }

    throw BadRequestError('PostFinance payment has not been confirmed yet');
  }

  /**
   * Sandbox-only: simulate customer completing PostFinance payment
   */
  async simulateConfirmation(transactionId: string): Promise<PaymentConfirmResult> {
    if (!config.payment.postfinance.sandboxMode) {
      throw ForbiddenError('PostFinance simulation only available in sandbox mode');
    }

    const session = pfSessions.get(transactionId);
    if (!session) {
      throw BadRequestError('PostFinance session not found or expired');
    }

    if (new Date() > session.expires_at) {
      session.status = PaymentTransactionStatus.EXPIRED;
      throw BadRequestError('PostFinance session has expired');
    }

    if (session.status === PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('PostFinance payment already confirmed');
    }

    // Mark as completed
    session.status = PaymentTransactionStatus.COMPLETED;

    logger.info(`PostFinance sandbox confirmation: ${transactionId}`);

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
    const session = pfSessions.get(transactionId);
    if (!session) {
      throw BadRequestError('PostFinance session not found');
    }

    if (session.status !== PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('Cannot refund a payment that is not completed');
    }

    const refundAmount = amount || session.amount;
    const refundId = `PF-REF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    session.status =
      refundAmount >= session.amount
        ? PaymentTransactionStatus.REFUNDED
        : PaymentTransactionStatus.PARTIAL_REFUND;

    logger.info(
      `PostFinance refund: ${refundId} for ${transactionId}, amount: ${refundAmount} CHF`
    );

    return {
      refund_id: refundId,
      status: refundAmount >= session.amount ? 'REFUNDED' : 'PARTIAL_REFUND',
      refunded_amount: refundAmount,
      refunded_at: new Date(),
    };
  }

  /**
   * Handle PostFinance webhook (sandbox: simulated)
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent> {
    // In sandbox, verify using HMAC with API secret
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.postfinance.apiSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature && config.payment.postfinance.sandboxMode) {
      logger.warn('PostFinance webhook signature mismatch (sandbox mode — allowing)');
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
   * Get PostFinance payment status (sandbox)
   */
  async getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult> {
    const session = pfSessions.get(providerTransactionId);
    if (!session) {
      throw BadRequestError('PostFinance session not found');
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
    return pfSessions.get(transactionId);
  }
}
