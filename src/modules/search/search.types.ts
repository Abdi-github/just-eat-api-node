import type { SupportedLanguage } from '../location/location.types.js';

// Re-export for convenience
export type { SupportedLanguage };

// ==================== SEARCH CONSTANTS ====================

/**
 * Redis cache TTL for search results (in seconds)
 */
export const SEARCH_CACHE_TTL = 180; // 3 minutes

/**
 * Redis cache TTL for suggestion results (in seconds)
 */
export const SUGGESTIONS_CACHE_TTL = 300; // 5 minutes

/**
 * Maximum search query length
 */
export const MAX_SEARCH_QUERY_LENGTH = 100;

/**
 * Minimum search query length
 */
export const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Default search page size
 */
export const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Maximum search results per page
 */
export const MAX_SEARCH_LIMIT = 100;

/**
 * Allowed sort fields for restaurant search
 */
export const RESTAURANT_SEARCH_SORT_FIELDS = [
  'rating',
  'review_count',
  'delivery_fee',
  'minimum_order',
  'name',
  'created_at',
] as const;

export type RestaurantSearchSortField = (typeof RESTAURANT_SEARCH_SORT_FIELDS)[number];

/**
 * Allowed sort fields for menu item search
 */
export const MENU_ITEM_SEARCH_SORT_FIELDS = ['price', 'sort_order', 'name'] as const;

export type MenuItemSearchSortField = (typeof MENU_ITEM_SEARCH_SORT_FIELDS)[number];

/**
 * Order type filter
 */
export type OrderTypeFilter = 'delivery' | 'pickup';

// ==================== REQUEST DTOs ====================

/**
 * Restaurant Search Query DTO
 */
export interface RestaurantSearchQueryDto {
  q?: string;
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
  max_delivery_fee?: number;
  order_type?: OrderTypeFilter;
  is_featured?: boolean;
  lang?: SupportedLanguage;
}

/**
 * Menu Item Search Query DTO (within a restaurant)
 */
export interface MenuItemSearchQueryDto {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  category_id?: string;
  min_price?: number;
  max_price?: number;
  is_available?: boolean;
  is_popular?: boolean;
  allergens?: string[];
  dietary_flags?: string[];
  lang?: SupportedLanguage;
}

/**
 * Search Suggestions Query DTO
 */
export interface SearchSuggestionsQueryDto {
  q: string;
  limit?: number;
  lang?: SupportedLanguage;
}

// ==================== RESPONSE DTOs ====================

/**
 * Restaurant search result (lightweight response)
 */
export interface RestaurantSearchResultDto {
  id: string;
  name: string;
  slug: string;
  address: string;
  postal_code: string;
  rating: number;
  review_count: number;
  logo_url: string | null;
  cover_image_url: string | null;
  delivery_fee: number | null;
  minimum_order: number | null;
  estimated_delivery_minutes: { min: number; max: number } | null;
  supports_delivery: boolean;
  supports_pickup: boolean;
  is_featured: boolean;
  city?: { id: string; name: string; slug: string } | null;
  canton?: { id: string; name: string; slug: string; code?: string } | null;
  brand?: { id: string; name: string; slug: string; logo_url?: string | null } | null;
  cuisines?: { id: string; name: string; slug: string }[];
}

/**
 * Menu item search result (lightweight response)
 */
export interface MenuItemSearchResultDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  allergens: string[];
  dietary_flags: string[];
  category?: { id: string; name: string; slug: string } | null;
  restaurant_id: string;
}

/**
 * Search suggestions result
 */
export interface SearchSuggestionDto {
  type: 'restaurant' | 'cuisine';
  id: string;
  name: string;
  slug: string;
  extra?: string; // e.g., city name for restaurant, count for cuisine
}

/**
 * Search suggestions response
 */
export interface SearchSuggestionsResponseDto {
  restaurants: SearchSuggestionDto[];
  cuisines: SearchSuggestionDto[];
}
