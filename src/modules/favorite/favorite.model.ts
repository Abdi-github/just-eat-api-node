import { Schema, model, Document } from 'mongoose';

/**
 * Favorite Document Interface
 */
export interface IFavorite extends Document {
  _id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  created_at: Date;
}

/**
 * Favorite Schema
 *
 * Tracks user favorite restaurants. Each user can favorite a restaurant
 * exactly once (enforced by compound unique index on user_id + restaurant_id).
 */
const favoriteSchema = new Schema<IFavorite>(
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
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'favorites',
    versionKey: false,
  }
);

// Compound unique index: one favorite per user per restaurant
favoriteSchema.index({ user_id: 1, restaurant_id: 1 }, { unique: true });
favoriteSchema.index({ user_id: 1, created_at: -1 });

export const Favorite = model<IFavorite>('Favorite', favoriteSchema);
