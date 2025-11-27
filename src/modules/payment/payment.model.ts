// ──────────────────────────────────────────────
// Payment Transaction — Mongoose Model
// ──────────────────────────────────────────────

import { Schema, model, Document, Types } from 'mongoose';
import {
  PaymentMethodEnum,
  PaymentTransactionStatus,
  PaymentProviderName,
} from './payment.types.js';

// ─── Interface ──────────────────────────────────

export interface IPaymentTransaction extends Document {
  _id: Types.ObjectId;
  order_id: Types.ObjectId;
  user_id: Types.ObjectId;
  amount: number;
  currency: string;

  payment_method: PaymentMethodEnum;
  provider_transaction_id?: string | null;
  provider_name: PaymentProviderName;

  status: PaymentTransactionStatus;

  // Redirect-based flow tracking (TWINT, PostFinance)
  redirect_url?: string | null;
  return_url?: string | null;
  session_expires_at?: Date | null;

  // Stripe-specific
  stripe_payment_intent_id?: string | null;
  stripe_client_secret?: string | null;

  // Refund tracking
  refund_amount?: number | null;
  refund_reason?: string | null;
  refund_id?: string | null;
  refunded_at?: Date | null;

  // Cash-specific
  cash_collected_by?: Types.ObjectId | null;
  cash_collected_at?: Date | null;
  cash_confirmed: boolean;

  // Provider raw response (sanitized — no secrets)
  provider_response?: Record<string, unknown> | null;

  // Audit
  error_message?: string | null;
  error_code?: string | null;
  attempts: number;
  ip_address?: string | null;

  created_at: Date;
  updated_at: Date;
}

// ─── Schema ─────────────────────────────────────

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'CHF',
    },

    payment_method: {
      type: String,
      required: true,
      enum: Object.values(PaymentMethodEnum),
    },
    provider_transaction_id: {
      type: String,
      default: null,
    },
    provider_name: {
      type: String,
      required: true,
      enum: Object.values(PaymentProviderName),
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(PaymentTransactionStatus),
      default: PaymentTransactionStatus.PENDING,
    },

    // Redirect-based flow
    redirect_url: { type: String, default: null },
    return_url: { type: String, default: null },
    session_expires_at: { type: Date, default: null },

    // Stripe-specific
    stripe_payment_intent_id: { type: String, default: null },
    stripe_client_secret: { type: String, default: null },

    // Refund tracking
    refund_amount: { type: Number, default: null },
    refund_reason: { type: String, default: null },
    refund_id: { type: String, default: null },
    refunded_at: { type: Date, default: null },

    // Cash-specific
    cash_collected_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cash_collected_at: { type: Date, default: null },
    cash_confirmed: { type: Boolean, default: false },

    // Provider raw response
    provider_response: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Audit
    error_message: { type: String, default: null },
    error_code: { type: String, default: null },
    attempts: { type: Number, default: 1, min: 1 },
    ip_address: { type: String, default: null },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────

paymentTransactionSchema.index({ order_id: 1, status: 1 });
paymentTransactionSchema.index({ user_id: 1, created_at: -1 });
paymentTransactionSchema.index({ provider_transaction_id: 1 });
paymentTransactionSchema.index({ status: 1, created_at: -1 });
paymentTransactionSchema.index({ stripe_payment_intent_id: 1 }, { sparse: true });

// ─── Export ─────────────────────────────────────

export const PaymentTransaction = model<IPaymentTransaction>(
  'PaymentTransaction',
  paymentTransactionSchema
);
