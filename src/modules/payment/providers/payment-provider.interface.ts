// ──────────────────────────────────────────────
// Payment Provider Interface
// All providers MUST implement this contract
// ──────────────────────────────────────────────

import {
  PaymentMethodEnum,
  CreatePaymentParams,
  PaymentInitResult,
  PaymentConfirmResult,
  PaymentRefundResult,
  WebhookEvent,
  PaymentStatusResult,
} from '../payment.types.js';

export interface IPaymentProvider {
  readonly providerName: PaymentMethodEnum;

  /**
   * Initiate a payment — returns provider-specific session/redirect
   */
  createPayment(params: CreatePaymentParams): Promise<PaymentInitResult>;

  /**
   * Confirm/capture a payment after customer action
   */
  confirmPayment(
    transactionId: string,
    providerData?: Record<string, unknown>
  ): Promise<PaymentConfirmResult>;

  /**
   * Process refund (full or partial)
   */
  refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentRefundResult>;

  /**
   * Verify webhook signature & parse event
   */
  handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent>;

  /**
   * Check payment status with the provider
   */
  getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult>;
}
