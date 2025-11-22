import type { SupportedLanguage, TranslatedField } from '../location/location.types.js';

// Re-export shared types
export type { SupportedLanguage, TranslatedField };

// ==================== MENU CATEGORY DTOs ====================

/**
 * Menu Category Query DTO
 */
export interface MenuCategoryQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  is_active?: boolean;
  lang?: SupportedLanguage;
}

/**
 * Menu Category Create DTO
 */
export interface MenuCategoryCreateDto {
  name: TranslatedField;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Menu Category Update DTO
 */
export interface MenuCategoryUpdateDto {
  name?: Partial<TranslatedField>;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Menu Category Response DTO
 */
export interface MenuCategoryResponseDto {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  items?: MenuItemResponseDto[];
  created_at: string;
  updated_at: string;
}

// ==================== MENU ITEM DTOs ====================

/**
 * Menu Item Query DTO
 */
export interface MenuItemQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  category_id?: string;
  is_available?: boolean;
  is_popular?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  allergens?: string[];
  dietary_flags?: string[];
  lang?: SupportedLanguage;
}

/**
 * Menu Item Create DTO
 */
export interface MenuItemCreateDto {
  category_id: string;
  name: TranslatedField;
  description?: Partial<TranslatedField>;
  price: number;
  currency?: string;
  image_url?: string | null;
  is_available?: boolean;
  is_popular?: boolean;
  allergens?: string[];
  dietary_flags?: string[];
  sort_order?: number;
}

/**
 * Menu Item Update DTO
 */
export interface MenuItemUpdateDto {
  category_id?: string;
  name?: Partial<TranslatedField>;
  description?: Partial<TranslatedField>;
  price?: number;
  image_url?: string | null;
  is_available?: boolean;
  is_popular?: boolean;
  allergens?: string[];
  dietary_flags?: string[];
  sort_order?: number;
}

/**
 * Menu Item Response DTO
 */
export interface MenuItemResponseDto {
  id: string;
  category_id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  allergens: string[];
  dietary_flags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Full Menu Response DTO (categories with nested items)
 */
export interface FullMenuResponseDto {
  restaurant_id: string;
  categories: MenuCategoryResponseDto[];
}

// ==================== SORT FIELDS ====================

export const MENU_CATEGORY_SORT_FIELDS = ['sort_order', 'name', 'created_at'] as const;
export const MENU_ITEM_SORT_FIELDS = ['sort_order', 'price', 'name', 'created_at'] as const;

// ==================== ALLERGENS & DIETARY FLAGS ====================

export const VALID_ALLERGENS = [
  'gluten',
  'dairy',
  'eggs',
  'fish',
  'shellfish',
  'nuts',
  'peanuts',
  'soy',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

export const VALID_DIETARY_FLAGS = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten_free',
  'lactose_free',
  'organic',
  'spicy',
] as const;
