/**
 * Favorite Types & DTOs
 *
 * Type definitions for the favorite module including
 * request DTOs, response DTOs, and query parameters.
 */

// ============================================================================
// Constants
// ============================================================================

export const FAVORITE_CONSTANTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Toggle favorite — add or remove a restaurant from favorites
 */
export interface ToggleFavoriteDto {
  restaurant_id: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

export interface FavoriteQueryDto {
  page?: string;
  limit?: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface FavoriteResponseDto {
  id: string;
  user_id: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    cover_image_url: string | null;
    rating: number;
    review_count: number;
    delivery_fee: number | null;
    estimated_delivery_minutes: { min: number; max: number } | null;
    supports_delivery: boolean;
    supports_pickup: boolean;
    is_active: boolean;
  } | null;
  created_at: Date;
}

export interface ToggleFavoriteResponseDto {
  is_favorited: boolean;
  favorite: FavoriteResponseDto | null;
}
