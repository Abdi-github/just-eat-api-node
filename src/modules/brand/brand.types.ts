import type { SupportedLanguage } from '../location/location.types.js';

// Re-export for convenience
export type { SupportedLanguage };

// ==================== BRAND DTOs ====================

/**
 * Brand Query DTO
 */
export interface BrandQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  is_active?: boolean;
  search?: string;
}

/**
 * Brand Create DTO (Admin only)
 */
export interface BrandCreateDto {
  name: string;
  slug?: string;
  logo_url?: string | null;
  is_active?: boolean;
}

/**
 * Brand Update DTO (Admin only)
 */
export interface BrandUpdateDto {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  is_active?: boolean;
}

/**
 * Brand Response DTO
 */
export interface BrandResponseDto {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  restaurant_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Brand List Response DTO
 */
export interface BrandListResponseDto {
  data: BrandResponseDto[];
  total: number;
}

/**
 * Allowed sort fields for brands
 */
export const BRAND_SORT_FIELDS = ['name', 'slug', 'created_at', 'updated_at'] as const;
