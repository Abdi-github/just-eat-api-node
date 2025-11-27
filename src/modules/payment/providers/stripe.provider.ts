// ──────────────────────────────────────────────
// Stripe Payment Provider (Credit/Debit Cards)
// Uses Stripe test keys in development
// ──────────────────────────────────────────────

import Stripe from 'stripe';
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
import { BadRequestError } from '../../../shared/errors/AppError.js';
import { logger } from '../../../shared/logger/index.js';

export class StripeProvider implements IPaymentProvider {
  readonly providerName = PaymentMethodEnum.STRIPE_CARD;
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.payment.stripe.secretKey, {
      apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
    });
  }

  /**
   * Create a Stripe PaymentIntent
   * Returns client_secret for frontend confirmation via Stripe Elements
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Stripe uses smallest currency unit (Rappen)
        currency: params.currency.toLowerCase(),
        metadata: {
          order_id: params.order_id,
          user_id: params.user_id,
          ...(params.metadata || {}),
        },
        receipt_email: params.customer_email,
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info(`Stripe PaymentIntent created: ${paymentIntent.id} for order ${params.order_id}`);

      return {
        provider_transaction_id: paymentIntent.id,
        status: PaymentTransactionStatus.PENDING,
        client_secret: paymentIntent.client_secret!,
      };
    } catch (error) {
      logger.error('Stripe createPayment error:', error);
      throw BadRequestError(
        `Stripe payment creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Confirm a payment (used for server-side confirmation)
   */
  async confirmPayment(
    transactionId: string,
    _providerData?: Record<string, unknown>
  ): Promise<PaymentConfirmResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);

      const statusMap: Record<string, PaymentTransactionStatus> = {
        succeeded: PaymentTransactionStatus.COMPLETED,
        processing: PaymentTransactionStatus.PROCESSING,
        requires_payment_method: PaymentTransactionStatus.FAILED,
        requires_confirmation: PaymentTransactionStatus.PENDING,
        requires_action: PaymentTransactionStatus.PENDING,
        canceled: PaymentTransactionStatus.CANCELLED,
      };

      return {
        provider_transaction_id: paymentIntent.id,
        status: statusMap[paymentIntent.status] || PaymentTransactionStatus.PENDING,
        paid_at: paymentIntent.status === 'succeeded' ? new Date() : undefined,
        provider_response: {
          stripe_status: paymentIntent.status,
          amount_received: paymentIntent.amount_received,
        },
      };
    } catch (error) {
      logger.error('Stripe confirmPayment error:', error);
      throw BadRequestError('Failed to confirm Stripe payment');
    }
  }

  /**
   * Process full or partial refund
   */
  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentRefundResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: transactionId,
        reason: 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundParams.metadata = { reason };
      }

      const refund = await this.stripe.refunds.create(refundParams);

      logger.info(`Stripe refund created: ${refund.id} for PI ${transactionId}`);

      return {
        refund_id: refund.id,
        status:
          refund.amount === (await this.stripe.paymentIntents.retrieve(transactionId)).amount
            ? 'REFUNDED'
            : 'PARTIAL_REFUND',
        refunded_amount: refund.amount / 100,
        refunded_at: new Date(),
      };
    } catch (error) {
      logger.error('Stripe refundPayment error:', error);
      throw BadRequestError(
        `Stripe refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify Stripe webhook signature and parse event
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.payment.stripe.webhookSecret
      );

      const eventTypeMap: Record<string, WebhookEventType> = {
        'payment_intent.succeeded': WebhookEventType.PAYMENT_COMPLETED,
        'payment_intent.payment_failed': WebhookEventType.PAYMENT_FAILED,
        'charge.refunded': WebhookEventType.PAYMENT_REFUNDED,
        'payment_intent.canceled': WebhookEventType.PAYMENT_CANCELLED,
      };

      const webhookEventType = eventTypeMap[event.type];
      if (!webhookEventType) {
        logger.info(`Unhandled Stripe event type: ${event.type}`);
        return {
          event_type: WebhookEventType.PAYMENT_COMPLETED, // default
          provider_transaction_id: '',
          amount: 0,
        };
      }

      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      return {
        event_type: webhookEventType,
        provider_transaction_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error) {
      logger.error('Stripe webhook verification failed:', error);
      throw BadRequestError('Invalid Stripe webhook signature');
    }
  }

  /**
   * Get payment status from Stripe
   */
  async getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(providerTransactionId);

      const statusMap: Record<string, PaymentTransactionStatus> = {
        succeeded: PaymentTransactionStatus.COMPLETED,
        processing: PaymentTransactionStatus.PROCESSING,
        requires_payment_method: PaymentTransactionStatus.FAILED,
        canceled: PaymentTransactionStatus.CANCELLED,
      };

      return {
        provider_transaction_id: paymentIntent.id,
        status: statusMap[paymentIntent.status] || PaymentTransactionStatus.PENDING,
        amount: paymentIntent.amount / 100,
        paid_at: paymentIntent.status === 'succeeded' ? new Date() : undefined,
      };
    } catch (error) {
      logger.error('Stripe getPaymentStatus error:', error);
      throw BadRequestError('Failed to retrieve Stripe payment status');
    }
  }
}
