import { Schema, model, Document } from 'mongoose';
import type { RestaurantStatus } from './restaurant.types.js';

/**
 * Restaurant Document Interface
 */
export interface IRestaurant extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  slug: string;
  description?: {
    en?: string;
    fr?: string;
    de?: string;
    it?: string;
  };
  address: string;
  postal_code: string;
  city_id: Schema.Types.ObjectId;
  canton_id: Schema.Types.ObjectId;

  brand_id?: Schema.Types.ObjectId | null;
  owner_id?: Schema.Types.ObjectId | null;

  rating: number;
  review_count: number;
  logo_url?: string | null;
  cover_image_url?: string | null;

  delivery_fee?: number | null;
  minimum_order?: number | null;
  estimated_delivery_minutes?: {
    min: number;
    max: number;
  };

  supports_delivery: boolean;
  supports_pickup: boolean;
  is_partner_delivery: boolean;
  accepted_payment_methods: string[];

  phone?: string | null;
  email?: string | null;

  status: RestaurantStatus;
  reviewed_by?: Schema.Types.ObjectId | null;
  reviewed_at?: Date | null;
  rejection_reason?: string | null;

  is_active: boolean;
  is_featured: boolean;

  published_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Restaurant Schema
 *
 * Core entity representing a restaurant on the platform.
 * Status workflow: DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED
 */
const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      en: { type: String, trim: true },
      fr: { type: String, trim: true },
      de: { type: String, trim: true },
      it: { type: String, trim: true },
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    postal_code: {
      type: String,
      required: true,
      trim: true,
    },
    city_id: {
      type: Schema.Types.ObjectId,
      ref: 'City',
      required: true,
      index: true,
    },
    canton_id: {
      type: Schema.Types.ObjectId,
      ref: 'Canton',
      required: true,
      index: true,
    },

    brand_id: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      default: null,
      index: true,
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    review_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    logo_url: {
      type: String,
      default: null,
    },
    cover_image_url: {
      type: String,
      default: null,
    },

    delivery_fee: {
      type: Number,
      default: null,
      min: 0,
    },
    minimum_order: {
      type: Number,
      default: null,
      min: 0,
    },
    estimated_delivery_minutes: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },

    supports_delivery: {
      type: Boolean,
      default: true,
    },
    supports_pickup: {
      type: Boolean,
      default: false,
    },
    is_partner_delivery: {
      type: Boolean,
      default: false,
    },
    accepted_payment_methods: {
      type: [String],
      enum: ['card', 'twint', 'postfinance', 'cash'],
      default: ['card', 'twint', 'postfinance', 'cash'],
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'PUBLISHED',
        'REJECTED',
        'SUSPENDED',
        'ARCHIVED',
      ],
      default: 'DRAFT',
      index: true,
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
      trim: true,
    },

    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    published_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Compound indexes for common queries
restaurantSchema.index({ city_id: 1, is_active: 1, status: 1 });
restaurantSchema.index({ canton_id: 1, is_active: 1, status: 1 });
restaurantSchema.index({ postal_code: 1, is_active: 1, status: 1 });
restaurantSchema.index({ rating: -1, review_count: -1 });

// Text index for search
restaurantSchema.index({ name: 'text' }, { name: 'restaurant_name_text' });

export const Restaurant = model<IRestaurant>('Restaurant', restaurantSchema);
