/**
 * Supported languages for the platform (4 Swiss national languages)
 */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

/**
 * Multilingual text structure
 */
export interface TranslatedField {
  en: string;
  fr: string;
  de: string;
  it: string;
}

// ==================== CANTON DTOs ====================

/**
 * Canton Query DTO
 */
export interface CantonQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  is_active?: boolean;
  code?: string;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Canton Create DTO (Admin only)
 */
export interface CantonCreateDto {
  code: string;
  name: TranslatedField;
  slug?: string;
  is_active?: boolean;
}

/**
 * Canton Update DTO (Admin only)
 */
export interface CantonUpdateDto {
  code?: string;
  name?: Partial<TranslatedField>;
  slug?: string;
  is_active?: boolean;
}

/**
 * Canton Response DTO
 */
export interface CantonResponseDto {
  id: string;
  code: string;
  name: string | TranslatedField;
  slug: string;
  is_active: boolean;
  city_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Canton List Response DTO
 */
export interface CantonListResponseDto {
  data: CantonResponseDto[];
  total: number;
}

// ==================== CITY DTOs ====================

/**
 * City Query DTO
 */
export interface CityQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  is_active?: boolean;
  canton_id?: string;
  postal_code?: number;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * City Create DTO (Admin only)
 */
export interface CityCreateDto {
  canton_id: string;
  name: TranslatedField;
  slug?: string;
  postal_codes?: number[];
  is_active?: boolean;
}

/**
 * City Update DTO (Admin only)
 */
export interface CityUpdateDto {
  canton_id?: string;
  name?: Partial<TranslatedField>;
  slug?: string;
  postal_codes?: number[];
  is_active?: boolean;
}

/**
 * City Response DTO
 */
export interface CityResponseDto {
  id: string;
  canton_id: string;
  canton?: CantonResponseDto;
  name: string | TranslatedField;
  slug: string;
  postal_codes: number[];
  is_active: boolean;
  restaurant_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * City List Response DTO
 */
export interface CityListResponseDto {
  data: CityResponseDto[];
  total: number;
}

// ==================== INTERNAL TYPES ====================

/**
 * City with populated canton (from Mongoose populate)
 */
export interface PopulatedCanton {
  _id: { toString(): string };
  code: string;
  name: TranslatedField;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CityWithCanton {
  _id: { toString(): string };
  canton_id: PopulatedCanton | { toString(): string };
  name: TranslatedField;
  slug: string;
  postal_codes: number[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Allowed sort fields for cantons
 */
export const CANTON_SORT_FIELDS = ['code', 'slug', 'created_at', 'updated_at'] as const;

/**
 * Allowed sort fields for cities
 */
export const CITY_SORT_FIELDS = ['slug', 'created_at', 'updated_at'] as const;
