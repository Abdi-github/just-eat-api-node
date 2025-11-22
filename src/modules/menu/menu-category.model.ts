import { Schema, model, Document } from 'mongoose';

/**
 * Menu Category Document Interface
 */
export interface IMenuCategory extends Document {
  _id: Schema.Types.ObjectId;
  restaurant_id: Schema.Types.ObjectId;
  name: {
    en: string;
    fr: string;
    de: string;
    it: string;
  };
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Menu Category Schema
 */
const menuCategorySchema = new Schema<IMenuCategory>(
  {
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
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    sort_order: {
      type: Number,
      default: 0,
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
    collection: 'menu_categories',
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

// Compound: unique slug per restaurant
menuCategorySchema.index({ restaurant_id: 1, slug: 1 }, { unique: true });

// Sort order within restaurant
menuCategorySchema.index({ restaurant_id: 1, sort_order: 1 });

// Active categories per restaurant
menuCategorySchema.index({ restaurant_id: 1, is_active: 1, sort_order: 1 });

export const MenuCategory = model<IMenuCategory>('MenuCategory', menuCategorySchema);
