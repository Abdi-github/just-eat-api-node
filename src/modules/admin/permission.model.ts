import mongoose, { Schema, Document } from 'mongoose';

/**
 * Multilingual text interface
 */
export interface IMultilingualText {
  en: string;
  fr: string;
  de: string;
  it: string;
}

/**
 * Permission document interface
 */
export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  name: string; // Generated virtual: "resource:action"
  resource: string; // e.g., "restaurants"
  action: string; // e.g., "create"
  description: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Permission Schema
 */
const permissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      lowercase: true,
      enum: [
        'create',
        'read',
        'update',
        'delete',
        'manage',
        'approve',
        'reject',
        'publish',
        'archive',
        '*', // Wildcard for super admin
      ],
    },
    description: {
      type: String,
      trim: true,
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
    collection: 'permissions',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual field: generates "resource:action" name
 */
permissionSchema.virtual('name').get(function () {
  return `${this.resource}:${this.action}`;
});

// Indexes
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });
permissionSchema.index({ is_active: 1 });

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);
