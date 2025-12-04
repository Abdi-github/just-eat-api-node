import { Schema, model, Document } from 'mongoose';
import type { ReviewStatus } from './review.types.js';

/**
 * Review Document Interface
 */
export interface IReview extends Document {
  _id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  order_id: Schema.Types.ObjectId;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  status: ReviewStatus;
  restaurant_reply: string | null;
  restaurant_reply_at: Date | null;
  moderation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Review Schema
 *
 * Customer reviews for restaurants. One review per order.
 * Reviews go through moderation: PENDING → APPROVED / REJECTED / FLAGGED.
 * Restaurant owners can reply to reviews.
 * Approved reviews contribute to the restaurant's average rating.
 */
const reviewSchema = new Schema<IReview>(
  {
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
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // One review per order
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    is_verified: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'],
      default: 'PENDING',
      index: true,
    },
    restaurant_reply: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    restaurant_reply_at: {
      type: Date,
      default: null,
    },
    moderation_reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'reviews',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Compound: restaurant reviews sorted by date
reviewSchema.index({ restaurant_id: 1, status: 1, created_at: -1 });

// Compound: user reviews
reviewSchema.index({ user_id: 1, created_at: -1 });

// ============================================================================
// Model
// ============================================================================

export const Review = model<IReview>('Review', reviewSchema);
