import bcrypt from 'bcryptjs';
import mongoose, { Schema, Document } from 'mongoose';

/**
 * User type enum values
 */
export const USER_TYPES = [
  'customer',
  'restaurant_owner',
  'restaurant_staff',
  'courier',
  'support_agent',
  'platform_admin',
  'super_admin',
] as const;

/**
 * User type
 */
export type UserType = (typeof USER_TYPES)[number];

/**
 * User status enum values
 */
export const USER_STATUSES = ['active', 'pending', 'suspended', 'inactive'] as const;

/**
 * Application status enum values (for restaurant owner / courier applications)
 */
export const APPLICATION_STATUSES = ['none', 'pending_approval', 'approved', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Application type enum values
 */
export const APPLICATION_TYPES = ['restaurant_owner', 'courier'] as const;
export type ApplicationType = (typeof APPLICATION_TYPES)[number];

/**
 * Vehicle type enum values (for courier applications)
 */
export const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'car', 'scooter'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * User status
 */
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Notification preferences sub-document
 */
export interface INotificationPreferences {
  email_order_updates: boolean;
  email_promotions: boolean;
  email_newsletter: boolean;
  push_enabled: boolean;
}

/**
 * User document interface
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  preferred_language: 'en' | 'fr' | 'de' | 'it';
  notification_preferences: INotificationPreferences;
  status: UserStatus;
  is_active: boolean;
  is_verified: boolean;
  verified_at?: Date;
  email_verification_token?: string;
  email_verification_expires?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_login_at?: Date;
  password_changed_at?: Date;
  refresh_token?: string;
  // Application tracking (for restaurant owner / courier self-registration)
  vehicle_type?: VehicleType;
  date_of_birth?: Date;
  application_status: ApplicationStatus;
  application_type?: ApplicationType;
  application_note?: string;
  application_reviewed_by?: mongoose.Types.ObjectId;
  application_reviewed_at?: Date;
  application_rejection_reason?: string;
  created_at: Date;
  updated_at: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName(): string;
}

/**
 * User Schema
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password_hash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include in queries by default
    },
    first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    last_name: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar_url: {
      type: String,
      trim: true,
    },
    preferred_language: {
      type: String,
      enum: ['en', 'fr', 'de', 'it'],
      default: 'de',
    },
    notification_preferences: {
      email_order_updates: { type: Boolean, default: true },
      email_promotions: { type: Boolean, default: false },
      email_newsletter: { type: Boolean, default: false },
      push_enabled: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: {
        values: USER_STATUSES,
        message: 'Status must be one of: active, pending, suspended, inactive',
      },
      default: 'pending',
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    verified_at: {
      type: Date,
    },
    email_verification_token: {
      type: String,
      select: false,
    },
    email_verification_expires: {
      type: Date,
      select: false,
    },
    password_reset_token: {
      type: String,
      select: false,
    },
    password_reset_expires: {
      type: Date,
      select: false,
    },
    last_login_at: {
      type: Date,
    },
    password_changed_at: {
      type: Date,
    },
    refresh_token: {
      type: String,
      select: false,
    },
    // Application tracking (for restaurant owner / courier self-registration)
    vehicle_type: {
      type: String,
      enum: {
        values: VEHICLE_TYPES,
        message: 'Vehicle type must be one of: bicycle, motorcycle, car, scooter',
      },
    },
    date_of_birth: {
      type: Date,
    },
    application_status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: 'Application status must be one of: none, pending_approval, approved, rejected',
      },
      default: 'none',
      index: true,
    },
    application_type: {
      type: String,
      enum: {
        values: APPLICATION_TYPES,
        message: 'Application type must be one of: restaurant_owner, courier',
      },
    },
    application_note: {
      type: String,
      maxlength: [1000, 'Application note cannot exceed 1000 characters'],
    },
    application_reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    application_reviewed_at: {
      type: Date,
    },
    application_rejection_reason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'users',
  }
);

// Indexes (email is already indexed via unique:true, status via index:true)
userSchema.index({ is_active: 1 });
userSchema.index({ first_name: 'text', last_name: 'text', email: 'text' });

// Sparse indexes for auth token lookups (avoid full collection scans)
userSchema.index({ refresh_token: 1 }, { sparse: true });
userSchema.index({ email_verification_token: 1 }, { sparse: true });
userSchema.index({ password_reset_token: 1 }, { sparse: true });

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

/**
 * Get full name
 */
userSchema.methods.fullName = function (): string {
  return `${this.first_name} ${this.last_name}`;
};

/**
 * Pre-save hook to hash password if modified
 */
userSchema.pre('save', async function () {
  // Only hash if password_hash is modified and it's not already hashed
  if (!this.isModified('password_hash')) return;

  // Check if it's already hashed (bcrypt hashes start with $2)
  if (this.password_hash.startsWith('$2')) return;

  const salt = await bcrypt.genSalt(12);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  this.password_changed_at = new Date();
});

export const User = mongoose.model<IUser>('User', userSchema);
