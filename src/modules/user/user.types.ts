import mongoose from 'mongoose';

import { type UserStatus, type INotificationPreferences } from './user.model.js';

// ============================================================================
// Query & Filter DTOs
// ============================================================================

/**
 * User query parameters for listing/searching users (admin)
 */
export interface UserQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: UserStatus;
  is_active?: boolean;
  is_verified?: boolean;
}

/**
 * Allowed sort fields for user listing
 */
export const USER_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'first_name',
  'last_name',
  'email',
  'status',
  'last_login_at',
] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Admin: Create a new user
 */
export interface UserCreateDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  preferred_language?: 'en' | 'fr' | 'de' | 'it';
  status?: UserStatus;
  is_active?: boolean;
}

/**
 * User: Update own profile
 */
export interface UserProfileUpdateDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  preferred_language?: 'en' | 'fr' | 'de' | 'it';
  avatar_url?: string;
}

/**
 * Admin: Update a user
 */
export interface UserAdminUpdateDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  preferred_language?: 'en' | 'fr' | 'de' | 'it';
  status?: UserStatus;
  is_active?: boolean;
  is_verified?: boolean;
}

/**
 * User: Update notification preferences
 */
export interface UserSettingsUpdateDto {
  email_order_updates?: boolean;
  email_promotions?: boolean;
  email_newsletter?: boolean;
  push_enabled?: boolean;
}

/**
 * User: Change password
 */
export interface UserPasswordChangeDto {
  current_password: string;
  new_password: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Role response (nested in user response)
 */
export interface RoleResponseDto {
  id: string;
  name: string;
  code: string;
}

/**
 * Single user response DTO
 */
export interface UserResponseDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  preferred_language: string;
  notification_preferences: INotificationPreferences;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  verified_at?: Date;
  last_login_at?: Date;
  roles: RoleResponseDto[];
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * User list response DTO (for admin listing)
 */
export interface UserListResponseDto {
  data: UserResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * User settings response DTO
 */
export interface UserSettingsResponseDto {
  notification_preferences: INotificationPreferences;
  preferred_language: string;
}

/**
 * User statistics response DTO (admin dashboard)
 */
export interface UserStatisticsDto {
  total: number;
  by_status: Record<string, number>;
  active: number;
  verified: number;
  new_last_30_days: number;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * MongoDB filter built from query DTO
 */
export interface UserFilter {
  status?: UserStatus;
  is_active?: boolean;
  is_verified?: boolean;
  $or?: Array<Record<string, unknown>>;
  $text?: { $search: string };
}

/**
 * Find result from repository
 */
export interface UserFindResult {
  data: UserResponseDto[];
  total: number;
}

/**
 * Role with populated permissions (for building user response)
 */
export interface PopulatedRoleInfo {
  _id: mongoose.Types.ObjectId;
  name: string;
  permissions: Array<{
    _id: mongoose.Types.ObjectId;
    name?: string;
    resource?: string;
    action?: string;
  }>;
}

/**
 * User role record with populated role
 */
export interface PopulatedUserRole {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role_id: PopulatedRoleInfo | null;
  is_active: boolean;
}
