import { Schema, model, Document } from 'mongoose';

/**
 * Menu Item Document Interface
 */
export interface IMenuItem extends Document {
  _id: Schema.Types.ObjectId;
  category_id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  name: {
    en: string;
    fr: string;
    de: string;
    it: string;
  };
  description?: {
    en?: string;
    fr?: string;
    de?: string;
    it?: string;
  };
  price: number;
  currency: string;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  allergens: string[];
  dietary_flags: string[];
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Menu Item Schema
 */
const menuItemSchema = new Schema<IMenuItem>(
  {
    category_id: {
      type: Schema.Types.ObjectId,
      ref: 'MenuCategory',
      required: true,
      index: true,
    },
    restaurant_id: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      en: { type: String, required: true, trim: true },
      fr: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
      it: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String, trim: true, default: '' },
      fr: { type: String, trim: true, default: '' },
      de: { type: String, trim: true, default: '' },
      it: { type: String, trim: true, default: '' },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'CHF',
      enum: ['CHF'],
    },
    image_url: {
      type: String,
      default: null,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
    is_popular: {
      type: Boolean,
      default: false,
    },
    allergens: {
      type: [String],
      default: [],
    },
    dietary_flags: {
      type: [String],
      default: [],
    },
    sort_order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'menu_items',
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// ==================== INDEXES ====================

// Items by category (sorted)
menuItemSchema.index({ category_id: 1, sort_order: 1 });

// Items by restaurant (for queries across all categories)
menuItemSchema.index({ restaurant_id: 1, sort_order: 1 });

// Available items per restaurant
menuItemSchema.index({ restaurant_id: 1, is_available: 1 });

// Price range queries
menuItemSchema.index({ restaurant_id: 1, price: 1 });

// Text search on item names
menuItemSchema.index(
  { 'name.en': 'text', 'name.fr': 'text', 'name.de': 'text', 'name.it': 'text' },
  { name: 'menu_item_text_search' }
);

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
