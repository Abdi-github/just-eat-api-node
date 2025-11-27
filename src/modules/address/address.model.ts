import { Schema, model, Document } from 'mongoose';

/**
 * Address Document Interface
 */
export interface IAddress extends Document {
  _id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  label: string;
  street: string;
  street_number: string;
  floor: string | null;
  postal_code: string;
  city_id: Schema.Types.ObjectId;
  canton_id: Schema.Types.ObjectId;
  country: string;
  instructions: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Address Schema
 *
 * Customer delivery addresses for the just-eat platform.
 * Each customer can have multiple addresses (max 10) with one default.
 * Country is always 'CH' (Switzerland).
 */
const addressSchema = new Schema<IAddress>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    street_number: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    floor: {
      type: String,
      default: null,
      trim: true,
      maxlength: 20,
    },
    postal_code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    city_id: {
      type: Schema.Types.ObjectId,
      ref: 'City',
      required: true,
    },
    canton_id: {
      type: Schema.Types.ObjectId,
      ref: 'Canton',
      required: true,
    },
    country: {
      type: String,
      default: 'CH',
      enum: ['CH'],
    },
    instructions: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'addresses',
  }
);

// ==================== Indexes ====================

// User's addresses (primary query pattern)
addressSchema.index({ user_id: 1, is_default: -1, created_at: -1 });

// User + postal code (for delivery zone matching)
addressSchema.index({ user_id: 1, postal_code: 1 });

export const Address = model<IAddress>('Address', addressSchema);
