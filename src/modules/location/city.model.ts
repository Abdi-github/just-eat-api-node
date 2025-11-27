import mongoose, { Schema, Document } from 'mongoose';
import type { TranslatedField } from './location.types.js';

/**
 * City document interface
 */
export interface ICity extends Document {
  _id: mongoose.Types.ObjectId;
  canton_id: mongoose.Types.ObjectId;
  name: TranslatedField;
  slug: string;
  postal_codes: number[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * City Schema
 */
const citySchema = new Schema<ICity>(
  {
    canton_id: {
      type: Schema.Types.ObjectId,
      ref: 'Canton',
      required: [true, 'Canton ID is required'],
      index: true,
    },
    name: {
      en: { type: String, required: true, trim: true },
      fr: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
      it: { type: String, required: true, trim: true },
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    postal_codes: {
      type: [Number],
      default: [],
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
    collection: 'cities',
  }
);

// Indexes (canton_id already indexed by index:true, slug by unique:true)
citySchema.index({ postal_codes: 1 });
citySchema.index({ is_active: 1 });
citySchema.index({
  'name.en': 'text',
  'name.fr': 'text',
  'name.de': 'text',
  'name.it': 'text',
});

export const City = mongoose.model<ICity>('City', citySchema);
