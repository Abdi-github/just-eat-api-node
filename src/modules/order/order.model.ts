import { Schema, model, Document } from 'mongoose';
import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from './order.types.js';

/**
 * Order Item Sub-document Interface
 */
export interface IOrderItem {
  menu_item_id: Schema.Types.ObjectId;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string | null;
  options?: Array<{ name: string; price: number }>;
}

/**
 * Order Document Interface
 */
export interface IOrder extends Document {
  _id: Schema.Types.ObjectId;
  order_number: string;
  user_id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  courier_id: Schema.Types.ObjectId | null;
  delivery_address_id: Schema.Types.ObjectId | null;

  order_type: OrderType;
  status: OrderStatus;

  items: IOrderItem[];

  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tip: number;
  discount: number;
  total: number;
  currency: string;

  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_intent_id?: string | null;
  payment_transaction_id?: Schema.Types.ObjectId | null;

  special_instructions: string | null;

  estimated_delivery_at: Date | null;
  placed_at: Date;
  accepted_at: Date | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  preparing_at: Date | null;
  ready_at: Date | null;
  picked_up_at: Date | null;
  in_transit_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;

  created_at: Date;
  updated_at: Date;
}

/**
 * Order Item Sub-schema
 */
const orderItemSchema = new Schema<IOrderItem>(
  {
    menu_item_id: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0,
    },
    total_price: {
      type: Number,
      required: true,
      min: 0,
    },
    special_instructions: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    options: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { _id: false }
);

/**
 * Order Schema
 *
 * Core entity for customer orders.
 * Status lifecycle: PLACED → ACCEPTED → PREPARING → READY → PICKED_UP → IN_TRANSIT → DELIVERED
 *                         ↘ REJECTED                                              ↘ CANCELLED
 */
const orderSchema = new Schema<IOrder>(
  {
    order_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    restaurant_id: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    courier_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    delivery_address_id: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
      default: null,
    },

    order_type: {
      type: String,
      required: true,
      enum: ['delivery', 'pickup'],
    },
    status: {
      type: String,
      required: true,
      enum: [
        'PLACED',
        'ACCEPTED',
        'REJECTED',
        'PREPARING',
        'READY',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must contain at least one item',
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    delivery_fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    service_fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tip: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'CHF',
      enum: ['CHF'],
    },

    payment_method: {
      type: String,
      required: true,
      enum: ['card', 'twint', 'postfinance', 'cash'],
    },
    payment_status: {
      type: String,
      required: true,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    payment_intent_id: {
      type: String,
      default: null,
    },
    payment_transaction_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    special_instructions: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },

    estimated_delivery_at: { type: Date, default: null },
    placed_at: { type: Date, required: true },
    accepted_at: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
    rejection_reason: { type: String, default: null, trim: true, maxlength: 500 },
    preparing_at: { type: Date, default: null },
    ready_at: { type: Date, default: null },
    picked_up_at: { type: Date, default: null },
    in_transit_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    cancellation_reason: { type: String, default: null, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'orders',
    versionKey: false,
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Compound index for customer order history
orderSchema.index({ user_id: 1, status: 1, created_at: -1 });

// Compound index for restaurant order management
orderSchema.index({ restaurant_id: 1, status: 1, created_at: -1 });

// Compound index for courier deliveries
orderSchema.index({ courier_id: 1, status: 1, created_at: -1 });

// Date-based queries for reporting
orderSchema.index({ placed_at: -1 });

// Payment status queries
orderSchema.index({ payment_status: 1 });

export const Order = model<IOrder>('Order', orderSchema);
export default Order;
