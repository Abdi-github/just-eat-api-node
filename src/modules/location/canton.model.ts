import mongoose, { Schema, Document } from 'mongoose';
import type { TranslatedField } from './location.types.js';

/**
 * Canton document interface
 */
export interface ICanton extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: TranslatedField;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Canton Schema
 */
const cantonSchema = new Schema<ICanton>(
  {
    code: {
      type: String,
      required: [true, 'Canton code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [2, 'Canton code must be exactly 2 characters'],
      minlength: [2, 'Canton code must be exactly 2 characters'],
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
    collection: 'cantons',
  }
);

// Indexes (code and slug already indexed by unique: true)
cantonSchema.index({ is_active: 1 });
cantonSchema.index({
  'name.en': 'text',
  'name.fr': 'text',
  'name.de': 'text',
  'name.it': 'text',
});

export const Canton = mongoose.model<ICanton>('Canton', cantonSchema);
