/**
 * Promotion Types & DTOs
 *
 * Type definitions for coupons, stamp cards, and promotions.
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum PromotionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum PromotionScope {
  PLATFORM = 'PLATFORM', // Platform-wide coupon (admin only)
  RESTAURANT = 'RESTAURANT', // Restaurant-specific coupon
}

export const PROMOTION_CONSTANTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_DISCOUNT_PERCENTAGE: 1,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MIN_FLAT_DISCOUNT: 0.5,
  CODE_MIN_LENGTH: 3,
  CODE_MAX_LENGTH: 30,
} as const;

// ============================================================================
// Request DTOs
// ============================================================================

export interface CreateCouponDto {
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order?: number;
  maximum_discount?: number; // Cap for percentage discounts
  scope: PromotionScope;
  restaurant_id?: string; // Required when scope = RESTAURANT
  valid_from?: string;
  valid_until?: string;
  usage_limit?: number; // Total uses allowed (null = unlimited)
  per_user_limit?: number; // Uses per user (default 1)
  is_active?: boolean;
}

export interface UpdateCouponDto {
  description?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  minimum_order?: number;
  maximum_discount?: number;
  valid_from?: string;
  valid_until?: string;
  usage_limit?: number;
  per_user_limit?: number;
  is_active?: boolean;
}

export interface CreateStampCardDto {
  name: string;
  description?: string;
  restaurant_id: string;
  stamps_required: number; // e.g., 10 stamps to complete
  reward_description: string; // "Free pizza" or "50% off next order"
  reward_type: DiscountType;
  reward_value: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}

export interface UpdateStampCardDto {
  name?: string;
  description?: string;
  stamps_required?: number;
  reward_description?: string;
  reward_type?: DiscountType;
  reward_value?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}

export interface ValidateCouponDto {
  code: string;
  restaurant_id: string;
  subtotal: number;
}

// ============================================================================
// Query DTOs
// ============================================================================

export interface CouponQueryDto {
  page?: number | string;
  limit?: number | string;
  scope?: PromotionScope;
  status?: PromotionStatus | string;
  restaurant_id?: string;
}

export interface StampCardQueryDto {
  page?: number | string;
  limit?: number | string;
  restaurant_id?: string;
  is_active?: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface CouponResponseDto {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order: number;
  maximum_discount: number | null;
  scope: PromotionScope;
  restaurant_id: string | null;
  restaurant_name?: string | null;
  valid_from: Date | null;
  valid_until: Date | null;
  usage_limit: number | null;
  per_user_limit: number;
  usage_count: number;
  is_active: boolean;
  status: PromotionStatus;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StampCardResponseDto {
  id: string;
  name: string;
  description: string | null;
  restaurant_id: string;
  restaurant_name?: string | null;
  stamps_required: number;
  reward_description: string;
  reward_type: DiscountType;
  reward_value: number;
  valid_from: Date | null;
  valid_until: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserStampProgressDto {
  id: string;
  stamp_card_id: string;
  stamp_card_name: string;
  restaurant_id: string;
  restaurant_name?: string;
  stamps_collected: number;
  stamps_required: number;
  is_complete: boolean;
  reward_description: string;
  reward_redeemed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponResponseDto;
  discount_amount?: number;
  message: string;
}
