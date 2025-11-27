// ──────────────────────────────────────────────
// Payment Service — Business Logic & Orchestrator
// Delegates to the correct provider via factory
// ──────────────────────────────────────────────

import { PaymentRepository } from './payment.repository.js';
import type { IPaymentTransaction } from './payment.model.js';
import {
  PaymentMethodEnum,
  PaymentTransactionStatus,
  PaymentProviderName,
  WebhookEventType,
  PAYMENT_CONSTANTS,
  InitiatePaymentDto,
  RefundPaymentDto,
  PaymentQueryDto,
  PaymentTransactionResponseDto,
} from './payment.types.js';
import { PaymentProviderFactory } from './providers/payment-provider.factory.js';
import { TwintProvider } from './providers/twint.provider.js';
import { PostFinanceProvider } from './providers/postfinance.provider.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

// Import order model for payment-order integration
import { Order } from '../order/order.model.js';
import { PaymentStatus } from '../order/order.types.js';
import { logger } from '../../shared/logger/index.js';

/**
 * Payment Service
 * Orchestrates payment flows across all providers.
 * Manages PaymentTransaction lifecycle and order payment status sync.
 */
export class PaymentService {
  constructor(private paymentRepository: PaymentRepository) {}

  // ============================================================================
  // PAYMENT INITIATION
  // ============================================================================

  /**
   * Initiate a payment for an order
   */
  async initiatePayment(
    dto: InitiatePaymentDto,
    user: AuthenticatedUser,
    ipAddress?: string
  ): Promise<PaymentTransactionResponseDto> {
    // 1. Validate order exists and belongs to user
    const order = await Order.findById(dto.order_id)
      .populate('restaurant_id', 'name accepted_payment_methods')
      .lean()
      .exec();

    if (!order) {
      throw NotFoundError('Order not found');
    }

    // Verify ownership
    const orderUserId = order.user_id?.toString();
    if (orderUserId !== user.id) {
      throw ForbiddenError('You can only initiate payment for your own orders');
    }

    // 2. Verify order is in a valid state for payment
    const terminalPaymentStatuses = ['PAID', 'REFUNDED'];
    if (terminalPaymentStatuses.includes(order.payment_status)) {
      throw BadRequestError(
        `Cannot initiate payment — order payment status is ${order.payment_status}`
      );
    }

    // 3. Check for existing active payment
    const activePayment = await this.paymentRepository.findActiveByOrderId(dto.order_id);
    if (activePayment && activePayment.status === PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('A completed payment already exists for this order');
    }

    // If there's an active PENDING or PROCESSING payment, block duplicate initiation
    if (
      activePayment &&
      (activePayment.status === PaymentTransactionStatus.PENDING ||
        activePayment.status === PaymentTransactionStatus.PROCESSING)
    ) {
      throw BadRequestError(
        'A payment is already in progress for this order. Complete or cancel the existing payment first.'
      );
    }

    // 4. Validate payment method is accepted by restaurant
    const restaurant = order.restaurant_id as unknown as {
      _id: { toString(): string };
      name: string;
      accepted_payment_methods?: string[];
    };
    if (
      restaurant?.accepted_payment_methods &&
      restaurant.accepted_payment_methods.length > 0 &&
      !restaurant.accepted_payment_methods.includes(dto.payment_method)
    ) {
      throw BadRequestError(
        `This restaurant does not accept ${dto.payment_method} payments. Accepted: ${restaurant.accepted_payment_methods.join(', ')}`
      );
    }

    // 5. Get provider and create payment
    const provider = PaymentProviderFactory.getProvider(dto.payment_method);

    // Resolve provider name
    const providerNameMap: Record<string, PaymentProviderName> = {
      [PaymentMethodEnum.STRIPE_CARD]: PaymentProviderName.STRIPE,
      [PaymentMethodEnum.TWINT]: PaymentProviderName.TWINT,
      [PaymentMethodEnum.POSTFINANCE]: PaymentProviderName.POSTFINANCE,
      [PaymentMethodEnum.CASH]: PaymentProviderName.CASH,
    };

    const result = await provider.createPayment({
      order_id: dto.order_id,
      user_id: user.id,
      amount: order.total,
      currency: 'CHF',
      description: `Order ${order.order_number}`,
      customer_email: user.email,
      metadata: {
        order_number: order.order_number,
      },
      return_url: dto.return_url,
      cancel_url: dto.cancel_url,
    });

    // 6. Create PaymentTransaction record
    const transaction = await this.paymentRepository.create({
      order_id: order._id,
      user_id: order.user_id,
      amount: order.total,
      currency: PAYMENT_CONSTANTS.DEFAULT_CURRENCY,
      payment_method: dto.payment_method,
      provider_name: providerNameMap[dto.payment_method],
      provider_transaction_id: result.provider_transaction_id,
      status: result.status,
      redirect_url: result.redirect_url || null,
      session_expires_at: result.expires_at || null,
      stripe_payment_intent_id:
        dto.payment_method === PaymentMethodEnum.STRIPE_CARD
          ? result.provider_transaction_id
          : null,
      stripe_client_secret:
        dto.payment_method === PaymentMethodEnum.STRIPE_CARD ? result.client_secret : null,
      ip_address: ipAddress || null,
    } as Partial<IPaymentTransaction>);

    // 7. Update order with payment reference
    await Order.findByIdAndUpdate(dto.order_id, {
      $set: {
        payment_status: PaymentStatus.PROCESSING,
        payment_transaction_id: transaction._id,
        payment_intent_id: result.provider_transaction_id,
      },
    });

    logger.info(
      `Payment initiated: ${transaction._id} (${dto.payment_method}) for order ${order.order_number}`
    );

    return this.toResponseDto(transaction);
  }

  // ============================================================================
  // PAYMENT STATUS
  // ============================================================================

  /**
   * Get payment status for an order (customer)
   */
  async getPaymentByOrderId(
    orderId: string,
    user: AuthenticatedUser
  ): Promise<PaymentTransactionResponseDto> {
    const order = await Order.findById(orderId).select('user_id').lean().exec();

    if (!order) {
      throw NotFoundError('Order not found');
    }

    if (order.user_id?.toString() !== user.id) {
      throw ForbiddenError('You can only view payment for your own orders');
    }

    const transaction = await this.paymentRepository.findByOrderId(orderId);
    if (!transaction) {
      throw NotFoundError('No payment found for this order');
    }

    return this.toResponseDto(transaction);
  }

  /**
   * Get payment transaction by ID (admin)
   */
  async getPaymentById(id: string): Promise<PaymentTransactionResponseDto> {
    const transaction = await this.paymentRepository.findById(id);
    if (!transaction) {
      throw NotFoundError('Payment transaction not found');
    }
    return this.toResponseDto(transaction);
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = PaymentProviderFactory.getProvider(PaymentMethodEnum.STRIPE_CARD);
    const event = await provider.handleWebhook(payload, signature);

    if (!event.provider_transaction_id) {
      logger.warn('Stripe webhook: no provider_transaction_id');
      return;
    }

    // Find transaction by Stripe PaymentIntent ID
    const transaction = await this.paymentRepository.findByStripePaymentIntentId(
      event.provider_transaction_id
    );

    if (!transaction) {
      logger.warn(`Stripe webhook: no transaction found for PI ${event.provider_transaction_id}`);
      return;
    }

    await this.processWebhookEvent(transaction, event);
  }

  /**
   * Handle TWINT webhook
   */
  async handleTwintWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = PaymentProviderFactory.getProvider(PaymentMethodEnum.TWINT);
    const event = await provider.handleWebhook(payload, signature);

    if (!event.provider_transaction_id) return;

    const transaction = await this.paymentRepository.findByProviderTransactionId(
      event.provider_transaction_id
    );
    if (!transaction) return;

    await this.processWebhookEvent(transaction, event);
  }

  /**
   * Handle PostFinance webhook
   */
  async handlePostFinanceWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = PaymentProviderFactory.getProvider(PaymentMethodEnum.POSTFINANCE);
    const event = await provider.handleWebhook(payload, signature);

    if (!event.provider_transaction_id) return;

    const transaction = await this.paymentRepository.findByProviderTransactionId(
      event.provider_transaction_id
    );
    if (!transaction) return;

    await this.processWebhookEvent(transaction, event);
  }

  /**
   * Process a webhook event (shared logic)
   */
  private async processWebhookEvent(
    transaction: IPaymentTransaction,
    event: { event_type: WebhookEventType; provider_transaction_id: string; amount: number }
  ): Promise<void> {
    const statusMap: Record<WebhookEventType, PaymentTransactionStatus> = {
      [WebhookEventType.PAYMENT_COMPLETED]: PaymentTransactionStatus.COMPLETED,
      [WebhookEventType.PAYMENT_FAILED]: PaymentTransactionStatus.FAILED,
      [WebhookEventType.PAYMENT_REFUNDED]: PaymentTransactionStatus.REFUNDED,
      [WebhookEventType.PAYMENT_CANCELLED]: PaymentTransactionStatus.CANCELLED,
    };

    const newStatus = statusMap[event.event_type];
    if (!newStatus) return;

    // Update payment transaction
    await this.paymentRepository.updateStatus(transaction._id.toString(), newStatus, {
      provider_response: { webhook_event: event.event_type },
    } as Partial<IPaymentTransaction>);

    // Sync order payment status
    const orderPaymentStatusMap: Record<PaymentTransactionStatus, PaymentStatus | null> = {
      [PaymentTransactionStatus.COMPLETED]: PaymentStatus.PAID,
      [PaymentTransactionStatus.FAILED]: PaymentStatus.FAILED,
      [PaymentTransactionStatus.REFUNDED]: PaymentStatus.REFUNDED,
      [PaymentTransactionStatus.CANCELLED]: PaymentStatus.FAILED,
      [PaymentTransactionStatus.PENDING]: null,
      [PaymentTransactionStatus.PROCESSING]: null,
      [PaymentTransactionStatus.PARTIAL_REFUND]: null,
      [PaymentTransactionStatus.EXPIRED]: null,
    };

    const orderPaymentStatus = orderPaymentStatusMap[newStatus];
    if (orderPaymentStatus) {
      await Order.findByIdAndUpdate(transaction.order_id, {
        $set: { payment_status: orderPaymentStatus },
      });
    }

    logger.info(
      `Webhook processed: ${event.event_type} → transaction ${transaction._id} → status ${newStatus}`
    );
  }

  // ============================================================================
  // SANDBOX SIMULATION
  // ============================================================================

  /**
   * Simulate TWINT confirmation (sandbox/dev only)
   */
  async simulateTwintConfirmation(
    providerTransactionId: string
  ): Promise<PaymentTransactionResponseDto> {
    const transaction =
      await this.paymentRepository.findByProviderTransactionId(providerTransactionId);
    if (!transaction) {
      throw NotFoundError('Payment transaction not found');
    }

    if (transaction.payment_method !== PaymentMethodEnum.TWINT) {
      throw BadRequestError('This endpoint is only for TWINT payments');
    }

    // Call the TWINT provider simulation
    const provider = PaymentProviderFactory.getProvider(PaymentMethodEnum.TWINT) as TwintProvider;
    const result = await provider.simulateConfirmation(transaction.provider_transaction_id!);

    // Update transaction
    const updated = await this.paymentRepository.updateStatus(
      transaction._id.toString(),
      result.status,
      {
        provider_response: result.provider_response,
      } as Partial<IPaymentTransaction>
    );

    // Sync order payment status
    if (result.status === PaymentTransactionStatus.COMPLETED) {
      await Order.findByIdAndUpdate(transaction.order_id, {
        $set: { payment_status: PaymentStatus.PAID },
      });
    }

    logger.info(`TWINT simulation confirmed: transaction ${transaction._id}`);

    return this.toResponseDto(updated!);
  }

  /**
   * Simulate PostFinance confirmation (sandbox/dev only)
   */
  async simulatePostFinanceConfirmation(
    providerTransactionId: string
  ): Promise<PaymentTransactionResponseDto> {
    const transaction =
      await this.paymentRepository.findByProviderTransactionId(providerTransactionId);
    if (!transaction) {
      throw NotFoundError('Payment transaction not found');
    }

    if (transaction.payment_method !== PaymentMethodEnum.POSTFINANCE) {
      throw BadRequestError('This endpoint is only for PostFinance payments');
    }

    // Call the PostFinance provider simulation
    const provider = PaymentProviderFactory.getProvider(
      PaymentMethodEnum.POSTFINANCE
    ) as PostFinanceProvider;
    const result = await provider.simulateConfirmation(transaction.provider_transaction_id!);

    // Update transaction
    const updated = await this.paymentRepository.updateStatus(
      transaction._id.toString(),
      result.status,
      {
        provider_response: result.provider_response,
      } as Partial<IPaymentTransaction>
    );

    // Sync order payment status
    if (result.status === PaymentTransactionStatus.COMPLETED) {
      await Order.findByIdAndUpdate(transaction.order_id, {
        $set: { payment_status: PaymentStatus.PAID },
      });
    }

    logger.info(`PostFinance simulation confirmed: transaction ${transaction._id}`);

    return this.toResponseDto(updated!);
  }

  // ============================================================================
  // REFUNDS
  // ============================================================================

  /**
   * Process refund for an order (admin only)
   */
  async processRefund(
    orderId: string,
    dto: RefundPaymentDto
  ): Promise<PaymentTransactionResponseDto> {
    const transaction = await this.paymentRepository.findByOrderId(orderId);
    if (!transaction) {
      throw NotFoundError('No payment found for this order');
    }

    if (transaction.status !== PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('Can only refund completed payments');
    }

    const provider = PaymentProviderFactory.getProvider(
      transaction.payment_method as PaymentMethodEnum
    );

    const result = await provider.refundPayment(
      transaction.provider_transaction_id!,
      dto.amount,
      dto.reason
    );

    // Update transaction
    const updated = await this.paymentRepository.update(transaction._id.toString(), {
      status:
        result.status === 'REFUNDED'
          ? PaymentTransactionStatus.REFUNDED
          : PaymentTransactionStatus.PARTIAL_REFUND,
      refund_id: result.refund_id,
      refund_amount: result.refunded_amount,
      refund_reason: dto.reason || null,
      refunded_at: result.refunded_at,
    } as Partial<IPaymentTransaction>);

    // Sync order payment status
    await Order.findByIdAndUpdate(transaction.order_id, {
      $set: { payment_status: PaymentStatus.REFUNDED },
    });

    logger.info(
      `Refund processed: ${result.refund_id} for order ${orderId}, amount: ${result.refunded_amount} CHF`
    );

    return this.toResponseDto(updated!);
  }

  // ============================================================================
  // CASH PAYMENT
  // ============================================================================

  /**
   * Confirm cash collected by courier or restaurant staff
   */
  async confirmCashPayment(
    orderId: string,
    collectedBy: string
  ): Promise<PaymentTransactionResponseDto> {
    const transaction = await this.paymentRepository.findByOrderId(orderId);
    if (!transaction) {
      throw NotFoundError('No payment found for this order');
    }

    if (transaction.payment_method !== PaymentMethodEnum.CASH) {
      throw BadRequestError('This endpoint is only for cash payments');
    }

    if (transaction.status === PaymentTransactionStatus.COMPLETED) {
      throw BadRequestError('Cash payment already confirmed');
    }

    // Call cash provider confirm
    const provider = PaymentProviderFactory.getProvider(PaymentMethodEnum.CASH);
    await provider.confirmPayment(transaction.provider_transaction_id!, {
      collected_by: collectedBy,
    });

    // Update transaction
    const updated = await this.paymentRepository.update(transaction._id.toString(), {
      status: PaymentTransactionStatus.COMPLETED,
      cash_confirmed: true,
      cash_collected_by: collectedBy as unknown as IPaymentTransaction['cash_collected_by'],
      cash_collected_at: new Date(),
    } as Partial<IPaymentTransaction>);

    // Sync order payment status
    await Order.findByIdAndUpdate(transaction.order_id, {
      $set: { payment_status: PaymentStatus.PAID },
    });

    logger.info(`Cash payment confirmed: order ${orderId}, collected by ${collectedBy}`);

    return this.toResponseDto(updated!);
  }

  // ============================================================================
  // ADMIN QUERIES
  // ============================================================================

  /**
   * Admin: list all payment transactions
   */
  async findAll(
    query: PaymentQueryDto
  ): Promise<{ data: PaymentTransactionResponseDto[]; meta: PaginationMeta }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const { data, total } = await this.paymentRepository.findAll({
      ...query,
      page,
      limit,
    });

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };

    return {
      data: data.map((t) => this.toResponseDto(t)),
      meta,
    };
  }

  // ============================================================================
  // DTO TRANSFORMATION
  // ============================================================================

  /**
   * Transform payment transaction document to response DTO
   */
  private toResponseDto(txn: IPaymentTransaction): PaymentTransactionResponseDto {
    return {
      id: txn._id.toString(),
      order_id: txn.order_id?.toString() || '',
      user_id: txn.user_id?.toString() || '',
      amount: txn.amount,
      currency: txn.currency,
      payment_method: txn.payment_method,
      provider_name: txn.provider_name,
      provider_transaction_id: txn.provider_transaction_id || undefined,
      status: txn.status,
      redirect_url: txn.redirect_url || undefined,
      client_secret: txn.stripe_client_secret || undefined,
      session_expires_at: txn.session_expires_at?.toISOString() || undefined,
      refund_amount: txn.refund_amount || undefined,
      refund_reason: txn.refund_reason || undefined,
      refunded_at: txn.refunded_at?.toISOString() || undefined,
      cash_confirmed: txn.cash_confirmed || undefined,
      cash_collected_at: txn.cash_collected_at?.toISOString() || undefined,
      error_message: txn.error_message || undefined,
      error_code: txn.error_code || undefined,
      attempts: txn.attempts,
      created_at: txn.created_at.toISOString(),
      updated_at: txn.updated_at.toISOString(),
    };
  }
}

// Singleton
import { paymentRepository } from './payment.repository.js';
export const paymentService = new PaymentService(paymentRepository);
