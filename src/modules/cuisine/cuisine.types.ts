import type { SupportedLanguage, TranslatedField } from '../location/location.types.js';

// Re-export shared types for convenience
export type { SupportedLanguage, TranslatedField };

// ==================== CUISINE DTOs ====================

/**
 * Cuisine Query DTO
 */
export interface CuisineQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  is_active?: boolean;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Cuisine Create DTO (Admin only)
 */
export interface CuisineCreateDto {
  name: TranslatedField;
  slug?: string;
  image_url?: string | null;
  is_active?: boolean;
}

/**
 * Cuisine Update DTO (Admin only)
 */
export interface CuisineUpdateDto {
  name?: Partial<TranslatedField>;
  slug?: string;
  image_url?: string | null;
  is_active?: boolean;
}

/**
 * Cuisine Response DTO
 */
export interface CuisineResponseDto {
  id: string;
  name: string | TranslatedField;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  restaurant_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Cuisine List Response DTO
 */
export interface CuisineListResponseDto {
  data: CuisineResponseDto[];
  total: number;
}

/**
 * Allowed sort fields for cuisines
 */
export const CUISINE_SORT_FIELDS = ['slug', 'created_at', 'updated_at'] as const;
