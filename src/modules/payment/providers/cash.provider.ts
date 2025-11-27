// ──────────────────────────────────────────────
// Cash on Delivery Payment Provider
// No external provider — internal flow only
// ──────────────────────────────────────────────

import crypto from 'crypto';
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
import { BadRequestError } from '../../../shared/errors/AppError.js';
import { logger } from '../../../shared/logger/index.js';

// In-memory tracking for cash payments
const cashRecords = new Map<
  string,
  {
    order_id: string;
    user_id: string;
    amount: number;
    status: PaymentTransactionStatus;
    collected_by?: string;
    collected_at?: Date;
  }
>();

export class CashProvider implements IPaymentProvider {
  readonly providerName = PaymentMethodEnum.CASH;

  /**
   * Create a cash payment record
   * No external API call — just records the intent
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    const cashRef = `CASH-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    cashRecords.set(cashRef, {
      order_id: params.order_id,
      user_id: params.user_id,
      amount: params.amount,
      status: PaymentTransactionStatus.PENDING,
    });

    logger.info(`Cash payment record created: ${cashRef} for order ${params.order_id}`);

    return {
      provider_transaction_id: cashRef,
      status: PaymentTransactionStatus.PENDING,
      // No redirect_url or client_secret — cash is collected at delivery
    };
  }

  /**
   * Confirm cash collected by courier/restaurant staff
   */
  async confirmPayment(
    transactionId: string,
    providerData?: Record<string, unknown>
  ): Promise<PaymentConfirmResult> {
    const record = cashRecords.get(transactionId);
    if (!record) {
      // For DB-stored transactions, just confirm
      logger.info(`Cash payment confirmed: ${transactionId}`);
      return {
        provider_transaction_id: transactionId,
        status: PaymentTransactionStatus.COMPLETED,
        paid_at: new Date(),
        provider_response: {
          collected_by: providerData?.collected_by,
          collected_at: new Date().toISOString(),
        },
      };
    }

    if (record.status === PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('Cash payment already confirmed');
    }

    record.status = PaymentTransactionStatus.COMPLETED;
    record.collected_by = providerData?.collected_by as string;
    record.collected_at = new Date();

    logger.info(`Cash payment confirmed: ${transactionId} collected by ${record.collected_by}`);

    return {
      provider_transaction_id: transactionId,
      status: PaymentTransactionStatus.COMPLETED,
      paid_at: record.collected_at,
      provider_response: {
        collected_by: record.collected_by,
        collected_at: record.collected_at.toISOString(),
        order_id: record.order_id,
      },
    };
  }

  /**
   * Cash payments cannot be refunded through the platform
   */
  async refundPayment(
    _transactionId: string,
    _amount?: number,
    _reason?: string
  ): Promise<PaymentRefundResult> {
    throw BadRequestError(
      'Cash payments cannot be refunded through the platform. Please handle cash refunds manually.'
    );
  }

  /**
   * No webhooks for cash payments
   */
  async handleWebhook(_payload: Buffer, _signature: string): Promise<WebhookEvent> {
    // No-op for cash
    return {
      event_type: WebhookEventType.PAYMENT_COMPLETED,
      provider_transaction_id: '',
      amount: 0,
    };
  }

  /**
   * Get cash payment status
   */
  async getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult> {
    const record = cashRecords.get(providerTransactionId);
    if (!record) {
      throw BadRequestError('Cash payment record not found');
    }

    return {
      provider_transaction_id: providerTransactionId,
      status: record.status,
      amount: record.amount,
      paid_at: record.collected_at,
    };
  }
}
