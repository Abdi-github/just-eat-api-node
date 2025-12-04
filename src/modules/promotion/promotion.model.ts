import { Schema, model, Document } from 'mongoose';
import type { DiscountType, PromotionScope } from './promotion.types.js';

// ============================================================================
// Coupon Model
// ============================================================================

export interface ICoupon extends Document {
  _id: Schema.Types.ObjectId;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order: number;
  maximum_discount: number | null;
  scope: PromotionScope;
  restaurant_id: Schema.Types.ObjectId | null;
  valid_from: Date | null;
  valid_until: Date | null;
  usage_limit: number | null;
  per_user_limit: number;
  usage_count: number;
  is_active: boolean;
  created_by: Schema.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: null },
    discount_type: {
      type: String,
      required: true,
      enum: ['PERCENTAGE', 'FLAT'],
    },
    discount_value: { type: Number, required: true, min: 0 },
    minimum_order: { type: Number, default: 0, min: 0 },
    maximum_discount: { type: Number, default: null, min: 0 },
    scope: {
      type: String,
      required: true,
      enum: ['PLATFORM', 'RESTAURANT'],
    },
    restaurant_id: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    usage_limit: { type: Number, default: null, min: 0 },
    per_user_limit: { type: Number, default: 1, min: 1 },
    usage_count: { type: Number, default: 0, min: 0 },
    is_active: { type: Boolean, default: true },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'coupons',
    versionKey: false,
  }
);

couponSchema.index({ scope: 1, is_active: 1 });
couponSchema.index({ restaurant_id: 1, is_active: 1 });

export const Coupon = model<ICoupon>('Coupon', couponSchema);

// ============================================================================
// Coupon Usage Model — tracks per-user usage
// ============================================================================

export interface ICouponUsage extends Document {
  _id: Schema.Types.ObjectId;
  coupon_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  order_id: Schema.Types.ObjectId;
  discount_amount: number;
  used_at: Date;
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    coupon_id: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    discount_amount: { type: Number, required: true, min: 0 },
    used_at: { type: Date, default: Date.now },
  },
  {
    collection: 'coupon_usages',
    versionKey: false,
  }
);

couponUsageSchema.index({ coupon_id: 1, user_id: 1 });

export const CouponUsage = model<ICouponUsage>('CouponUsage', couponUsageSchema);

// ============================================================================
// Stamp Card Model
// ============================================================================

export interface IStampCard extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  description: string | null;
  restaurant_id: Schema.Types.ObjectId;
  stamps_required: number;
  reward_description: string;
  reward_type: DiscountType;
  reward_value: number;
  valid_from: Date | null;
  valid_until: Date | null;
  is_active: boolean;
  created_by: Schema.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const stampCardSchema = new Schema<IStampCard>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    restaurant_id: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    stamps_required: { type: Number, required: true, min: 2 },
    reward_description: { type: String, required: true },
    reward_type: {
      type: String,
      required: true,
      enum: ['PERCENTAGE', 'FLAT'],
    },
    reward_value: { type: Number, required: true, min: 0 },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'stamp_cards',
    versionKey: false,
  }
);

// Compound index for filtered queries
stampCardSchema.index({ restaurant_id: 1, is_active: 1 });

export const StampCard = model<IStampCard>('StampCard', stampCardSchema);

// ============================================================================
// User Stamp Progress Model — tracks each user's stamp collection
// ============================================================================

export interface IUserStampProgress extends Document {
  _id: Schema.Types.ObjectId;
  stamp_card_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  stamps_collected: number;
  is_complete: boolean;
  reward_redeemed: boolean;
  order_ids: Schema.Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

const userStampProgressSchema = new Schema<IUserStampProgress>(
  {
    stamp_card_id: {
      type: Schema.Types.ObjectId,
      ref: 'StampCard',
      required: true,
      index: true,
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
    },
    stamps_collected: { type: Number, default: 0, min: 0 },
    is_complete: { type: Boolean, default: false },
    reward_redeemed: { type: Boolean, default: false },
    order_ids: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'user_stamp_progress',
    versionKey: false,
  }
);

userStampProgressSchema.index({ stamp_card_id: 1, user_id: 1 }, { unique: true });
userStampProgressSchema.index({ user_id: 1, restaurant_id: 1 });

export const UserStampProgress = model<IUserStampProgress>(
  'UserStampProgress',
  userStampProgressSchema
);
