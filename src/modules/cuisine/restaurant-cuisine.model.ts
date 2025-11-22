import { Schema, model, Document } from 'mongoose';

/**
 * RestaurantCuisine Document Interface (Junction Table)
 * Links restaurants to cuisines (many-to-many relationship)
 */
export interface IRestaurantCuisine extends Document {
  _id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  cuisine_id: Schema.Types.ObjectId;
}

/**
 * RestaurantCuisine Schema
 */
const restaurantCuisineSchema = new Schema<IRestaurantCuisine>(
  {
    restaurant_id: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    cuisine_id: {
      type: Schema.Types.ObjectId,
      ref: 'Cuisine',
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'restaurant_cuisines',
  }
);

// Compound unique index to prevent duplicate assignments
restaurantCuisineSchema.index({ restaurant_id: 1, cuisine_id: 1 }, { unique: true });

export const RestaurantCuisine = model<IRestaurantCuisine>(
  'RestaurantCuisine',
  restaurantCuisineSchema
);
