// ──────────────────────────────────────────────
// Payment Repository — Data Access Layer
// ──────────────────────────────────────────────

import { PaymentTransaction, IPaymentTransaction } from './payment.model.js';
import { PaymentTransactionStatus, PaymentMethodEnum, PaymentQueryDto } from './payment.types.js';

export class PaymentRepository {
  /**
   * Create a new payment transaction
   */
  async create(data: Partial<IPaymentTransaction>): Promise<IPaymentTransaction> {
    return PaymentTransaction.create(data);
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findById(id).exec();
  }

  /**
   * Find by order ID (latest transaction for an order)
   */
  async findByOrderId(orderId: string): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findOne({ order_id: orderId }).sort({ created_at: -1 }).exec();
  }

  /**
   * Find all transactions for an order
   */
  async findAllByOrderId(orderId: string): Promise<IPaymentTransaction[]> {
    return PaymentTransaction.find({ order_id: orderId }).sort({ created_at: -1 }).exec();
  }

  /**
   * Find by provider transaction ID
   */
  async findByProviderTransactionId(
    providerTransactionId: string
  ): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findOne({ provider_transaction_id: providerTransactionId }).exec();
  }

  /**
   * Find by Stripe PaymentIntent ID
   */
  async findByStripePaymentIntentId(paymentIntentId: string): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findOne({ stripe_payment_intent_id: paymentIntentId }).exec();
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    id: string,
    status: PaymentTransactionStatus,
    additionalFields?: Partial<IPaymentTransaction>
  ): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          ...(additionalFields || {}),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Update with arbitrary fields
   */
  async update(
    id: string,
    data: Partial<IPaymentTransaction>
  ): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Increment attempt counter
   */
  async incrementAttempts(id: string): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findByIdAndUpdate(
      id,
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Find pending/expired transactions for an order (prevent double-payment)
   */
  async findActiveByOrderId(orderId: string): Promise<IPaymentTransaction | null> {
    return PaymentTransaction.findOne({
      order_id: orderId,
      status: {
        $in: [
          PaymentTransactionStatus.PENDING,
          PaymentTransactionStatus.PROCESSING,
          PaymentTransactionStatus.COMPLETED,
        ],
      },
    }).exec();
  }

  /**
   * Admin: list transactions with filtering & pagination
   */
  async findAll(query: PaymentQueryDto): Promise<{ data: IPaymentTransaction[]; total: number }> {
    const { page = 1, limit = 20, ...filters } = query;
    const mongoFilter = this.buildFilter(filters);

    const [data, total] = await Promise.all([
      PaymentTransaction.find(mongoFilter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      PaymentTransaction.countDocuments(mongoFilter),
    ]);

    return { data, total };
  }

  /**
   * Build MongoDB filter from query params
   */
  private buildFilter(filters: Omit<PaymentQueryDto, 'page' | 'limit'>): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (filters.status) filter.status = filters.status;
    if (filters.payment_method) filter.payment_method = filters.payment_method;
    if (filters.order_id) filter.order_id = filters.order_id;
    if (filters.user_id) filter.user_id = filters.user_id;

    return filter;
  }
}

// Singleton export
export const paymentRepository = new PaymentRepository();
