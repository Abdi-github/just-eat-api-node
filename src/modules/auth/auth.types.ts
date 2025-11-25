import { Request } from 'express';
import mongoose from 'mongoose';

/**
 * Supported languages
 */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

/**
 * User type enum
 */
export type UserType =
  | 'customer'
  | 'restaurant_owner'
  | 'restaurant_staff'
  | 'courier'
  | 'support_agent'
  | 'platform_admin'
  | 'super_admin';

/**
 * User types that have access to the admin panel
 * Only platform-level administrators should be included here
 *
 * - super_admin: Full system access
 * - platform_admin: Platform-wide moderation and management
 *
 * NOTE: restaurant_owner is NOT included — they manage their restaurant, not the platform
 */
export const ADMIN_USER_TYPES: readonly UserType[] = ['super_admin', 'platform_admin'] as const;

/**
 * JWT Token payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  userType: UserType;
  roles: string[]; // Role codes
  permissions: string[]; // Permission codes
  restaurantId?: string; // For restaurant_owner / restaurant_staff
  lang: SupportedLanguage;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Token pair response
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Authenticated user info attached to request
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: UserType;
  roles: string[];
  permissions: string[];
  restaurantId?: string;
  lang: SupportedLanguage;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data (customer)
 */
export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  preferred_language?: SupportedLanguage;
}

/**
 * Restaurant owner registration data
 */
export interface RegisterRestaurantData {
  // Personal info
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_language?: SupportedLanguage;
  // Restaurant info
  restaurant_name: string;
  restaurant_address: string;
  restaurant_postal_code: string;
  restaurant_city_id: string;
  restaurant_canton_id: string;
  restaurant_phone?: string;
  restaurant_email?: string;
  application_note?: string;
}

/**
 * Courier registration data
 */
export interface RegisterCourierData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_language?: SupportedLanguage;
  vehicle_type: 'bicycle' | 'motorcycle' | 'car' | 'scooter';
  date_of_birth?: string;
  application_note?: string;
}

/**
 * Application status response
 */
export interface ApplicationStatusResponse {
  application_status: string;
  application_type: string | null;
  application_note?: string;
  application_rejection_reason?: string;
  application_reviewed_at?: Date;
  restaurant?: {
    id: string;
    name: string;
    status: string;
  };
}

/**
 * Password change data
 */
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

/**
 * User with roles and permissions (for auth operations)
 */
export interface UserWithRolesAndPermissions {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  preferred_language: SupportedLanguage;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  refresh_token?: string;
  roles: Array<{
    code: string;
    permissions: Array<{ name: string }>;
  }>;
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

/**
 * Permission document for populate results
 */
export interface PermissionDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  resource: string;
  action: string;
}

/**
 * Role document with populated permissions
 */
export interface PopulatedRoleDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  permissions?: PermissionDoc[];
}

/**
 * UserRole document with populated role
 */
export interface PopulatedUserRoleDoc {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role_id: PopulatedRoleDoc | null;
  is_active: boolean;
}
