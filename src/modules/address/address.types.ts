// ==================== ADDRESS TYPES & DTOs ====================

/**
 * Supported sort fields for address queries
 */
export const ADDRESS_SORT_FIELDS = ['label', 'created_at', 'postal_code', 'is_default'] as const;
export type AddressSortField = (typeof ADDRESS_SORT_FIELDS)[number];

/**
 * Maximum addresses per user
 */
export const MAX_ADDRESSES_PER_USER = 10;

/**
 * Common address labels
 */
export const COMMON_ADDRESS_LABELS = ['Home', 'Office', 'Work', 'Other'] as const;

// ==================== Query DTOs ====================

/**
 * Address Query DTO
 */
export interface AddressQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ==================== Request DTOs ====================

/**
 * Address Create DTO
 */
export interface AddressCreateDto {
  label: string;
  street: string;
  street_number: string;
  floor?: string | null;
  postal_code: string;
  city_id: string;
  canton_id: string;
  instructions?: string | null;
  is_default?: boolean;
}

/**
 * Address Update DTO
 */
export interface AddressUpdateDto {
  label?: string;
  street?: string;
  street_number?: string;
  floor?: string | null;
  postal_code?: string;
  city_id?: string;
  canton_id?: string;
  instructions?: string | null;
  is_default?: boolean;
}

// ==================== Response DTOs ====================

/**
 * Address Response DTO
 */
export interface AddressResponseDto {
  id: string;
  user_id: string;
  label: string;
  street: string;
  street_number: string;
  floor: string | null;
  postal_code: string;
  city_id: string;
  canton_id: string;
  country: string;
  instructions: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Address Response DTO with populated city/canton
 */
export interface AddressPopulatedResponseDto {
  id: string;
  user_id: string;
  label: string;
  street: string;
  street_number: string;
  floor: string | null;
  postal_code: string;
  city: {
    id: string;
    name: string;
    slug: string;
  } | null;
  canton: {
    id: string;
    name: string;
    slug: string;
    code: string;
  } | null;
  country: string;
  instructions: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}
