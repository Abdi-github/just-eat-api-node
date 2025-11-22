import type { SupportedLanguage } from '../location/location.types.js';

// Re-export for convenience
export type { SupportedLanguage };

// ==================== RESTAURANT ENUMS ====================

export const RESTAURANT_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'SUSPENDED',
  'ARCHIVED',
] as const;

export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

/**
 * Valid status transitions for the restaurant approval workflow
 */
export const RESTAURANT_STATUS_TRANSITIONS: Record<RestaurantStatus, RestaurantStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['PUBLISHED'],
  PUBLISHED: ['SUSPENDED', 'ARCHIVED'],
  REJECTED: ['DRAFT'], // Owner can fix and resubmit
  SUSPENDED: ['PUBLISHED', 'ARCHIVED'],
  ARCHIVED: [],
};

// ==================== RESTAURANT DTOs ====================

/**
 * Restaurant Query DTO — public listing
 */
export interface RestaurantQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  city_id?: string;
  canton_id?: string;
  cuisine_id?: string;
  brand_id?: string;
  postal_code?: string;
  min_rating?: number;
  is_active?: boolean;
  status?: RestaurantStatus;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Cursor-based pagination query DTO
 */
export interface RestaurantCursorQueryDto {
  limit?: number;
  cursor?: string;        // Opaque cursor (base64-encoded _id)
  direction?: 'next' | 'prev';
  sort?: string;
  order?: 'asc' | 'desc';
  city_id?: string;
  canton_id?: string;
  cuisine_id?: string;
  brand_id?: string;
  postal_code?: string;
  min_rating?: number;
  is_active?: boolean;
  status?: RestaurantStatus;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Restaurant Create DTO — restaurant owner submits draft
 */
export interface RestaurantCreateDto {
  name: string;
  slug?: string;
  description?: {
    en?: string;
    fr?: string;
    de?: string;
    it?: string;
  };
  address: string;
  postal_code: string;
  city_id: string;
  canton_id: string;
  brand_id?: string;
  phone?: string;
  email?: string;
  delivery_fee?: number | null;
  minimum_order?: number | null;
  estimated_delivery_minutes?: {
    min: number;
    max: number;
  };
  supports_delivery?: boolean;
  supports_pickup?: boolean;
  is_partner_delivery?: boolean;
}

/**
 * Restaurant Update DTO — owner or admin updates
 */
export interface RestaurantUpdateDto {
  name?: string;
  slug?: string;
  description?: {
    en?: string;
    fr?: string;
    de?: string;
    it?: string;
  };
  address?: string;
  postal_code?: string;
  city_id?: string;
  canton_id?: string;
  brand_id?: string | null;
  phone?: string;
  email?: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  delivery_fee?: number | null;
  minimum_order?: number | null;
  estimated_delivery_minutes?: {
    min: number;
    max: number;
  };
  supports_delivery?: boolean;
  supports_pickup?: boolean;
  is_partner_delivery?: boolean;
  is_active?: boolean;
  is_featured?: boolean;
}

/**
 * Admin status change DTO
 */
export interface RestaurantStatusChangeDto {
  status: RestaurantStatus;
  rejection_reason?: string;
}

/**
 * Restaurant Response DTO
 */
export interface RestaurantResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string | { en?: string; fr?: string; de?: string; it?: string } | null;
  address: string;
  postal_code: string;
  city_id: string;
  canton_id: string;
  city?: { id: string; name: string; slug: string } | null;
  canton?: { id: string; name: string; slug: string; code?: string } | null;
  brand_id?: string | null;
  brand?: { id: string; name: string; slug: string; logo_url?: string | null } | null;
  owner_id?: string | null;
  rating: number;
  review_count: number;
  logo_url?: string | null;
  cover_image_url?: string | null;
  delivery_fee?: number | null;
  minimum_order?: number | null;
  estimated_delivery_minutes?: { min: number; max: number } | null;
  supports_delivery: boolean;
  supports_pickup: boolean;
  is_partner_delivery: boolean;
  phone?: string | null;
  email?: string | null;
  status: RestaurantStatus;
  is_active: boolean;
  is_featured: boolean;
  cuisines?: { id: string; name: string; slug: string }[];
  published_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * RestaurantList Response DTO
 */
export interface RestaurantListResponseDto {
  data: RestaurantResponseDto[];
  total: number;
}

/**
 * Allowed sort fields for restaurants
 */
export const RESTAURANT_SORT_FIELDS = [
  'name',
  'slug',
  'rating',
  'review_count',
  'delivery_fee',
  'created_at',
  'updated_at',
] as const;
