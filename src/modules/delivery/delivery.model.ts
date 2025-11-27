import { Schema, model, Document } from 'mongoose';
import type { DeliveryAddressSnapshot, CourierLocation } from './delivery.types.js';

/**
 * Delivery Assignment Document Interface
 */
export interface IDeliveryAssignment extends Document {
  _id: Schema.Types.ObjectId;
  order_id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  courier_id: Schema.Types.ObjectId | null;

  status: string;

  pickup_address: string;
  delivery_address: DeliveryAddressSnapshot;

  delivery_fee: number;
  distance_km: number | null;

  estimated_pickup_at: Date | null;
  estimated_delivery_at: Date | null;

  assigned_at: Date | null;
  picked_up_at: Date | null;
  in_transit_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;

  courier_location: CourierLocation | null;

  notes: string | null;

  created_at: Date;
  updated_at: Date;
}

/**
 * Delivery Address Snapshot Sub-schema
 */
const deliveryAddressSchema = new Schema(
  {
    street: { type: String, required: true, trim: true },
    street_number: { type: String, required: true, trim: true },
    postal_code: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    floor: { type: String, default: null, trim: true },
    instructions: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { _id: false }
);

/**
 * Courier Location Sub-schema
 */
const courierLocationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updated_at: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * Delivery Assignment Schema
 *
 * Tracks the delivery lifecycle for an order, from restaurant to customer.
 * Created when a delivery order reaches READY status or is accepted.
 * Status lifecycle: PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
 *                                     ↘ CANCELLED        ↘ FAILED
 */
const deliveryAssignmentSchema = new Schema<IDeliveryAssignment>(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
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

    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },

    pickup_address: {
      type: String,
      required: true,
      trim: true,
    },
    delivery_address: {
      type: deliveryAddressSchema,
      required: true,
    },

    delivery_fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    distance_km: {
      type: Number,
      default: null,
      min: 0,
    },

    estimated_pickup_at: { type: Date, default: null },
    estimated_delivery_at: { type: Date, default: null },

    assigned_at: { type: Date, default: null },
    picked_up_at: { type: Date, default: null },
    in_transit_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    cancellation_reason: { type: String, default: null, trim: true, maxlength: 500 },

    courier_location: {
      type: courierLocationSchema,
      default: null,
    },

    notes: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'delivery_assignments',
    versionKey: false,
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Available deliveries lookup (pending, unassigned)
deliveryAssignmentSchema.index({ status: 1, courier_id: 1, created_at: -1 });

// Courier's active/history deliveries
deliveryAssignmentSchema.index({ courier_id: 1, status: 1, created_at: -1 });

// Restaurant delivery tracking
deliveryAssignmentSchema.index({ restaurant_id: 1, status: 1, created_at: -1 });

export const DeliveryAssignment = model<IDeliveryAssignment>(
  'DeliveryAssignment',
  deliveryAssignmentSchema
);
export default DeliveryAssignment;
