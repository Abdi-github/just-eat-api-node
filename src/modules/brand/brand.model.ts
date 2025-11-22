import { Schema, model, Document } from 'mongoose';

/**
 * Brand Document Interface
 */
export interface IBrand extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Brand Schema
 *
 * Brands represent restaurant chains (e.g. McDonald's, Burger King, Subway).
 * A restaurant may optionally belong to a brand via brand_id reference.
 * Names are NOT translated — brands keep their original name across all languages.
 */
const brandSchema = new Schema<IBrand>(
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
    logo_url: {
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
brandSchema.index({ is_active: 1 });
brandSchema.index({ name: 'text' }, { name: 'brand_name_text' });

export const Brand = model<IBrand>('Brand', brandSchema);
