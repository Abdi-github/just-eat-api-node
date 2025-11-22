import { Schema, model, Document } from 'mongoose';

/**
 * Cuisine Document Interface
 */
export interface ICuisine extends Document {
  _id: Schema.Types.ObjectId;
  name: {
    en: string;
    fr: string;
    de: string;
    it: string;
  };
  slug: string;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Cuisine Schema
 */
const cuisineSchema = new Schema<ICuisine>(
  {
    name: {
      en: { type: String, required: true, trim: true },
      fr: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
      it: { type: String, required: true, trim: true },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    image_url: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Indexes (slug already indexed via unique: true)
cuisineSchema.index({ is_active: 1 });
cuisineSchema.index(
  { 'name.en': 'text', 'name.fr': 'text', 'name.de': 'text', 'name.it': 'text' },
  { name: 'cuisine_name_text' }
);

export const Cuisine = model<ICuisine>('Cuisine', cuisineSchema);
