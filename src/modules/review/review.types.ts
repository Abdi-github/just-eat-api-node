/**
 * Review Types & DTOs
 *
 * Type definitions for the review module including status enums,
 * business rules, and Data Transfer Objects.
 */

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Review moderation status
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

/**
 * Review-related constants
 */
export const REVIEW_CONSTANTS = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_COMMENT_LENGTH: 2000,
  MAX_REPLY_LENGTH: 1000,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_SORT: '-created_at',
} as const;

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * DTO for creating a review
 */
export interface CreateReviewDto {
  restaurant_id: string;
  order_id: string;
  rating: number;
  comment?: string;
}

/**
 * DTO for updating own review
 */
export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

/**
 * DTO for restaurant owner reply
 */
export interface ReplyToReviewDto {
  restaurant_reply: string;
}

/**
 * DTO for admin moderation
 */
export interface ModerateReviewDto {
  status: ReviewStatus.APPROVED | ReviewStatus.REJECTED | ReviewStatus.FLAGGED;
  moderation_reason?: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

/**
 * Query DTO for listing reviews by restaurant
 */
export interface ReviewQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  rating?: number;
  status?: ReviewStatus;
}

/**
 * Query DTO for admin list
 */
export interface AdminReviewQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  status?: ReviewStatus;
  restaurant_id?: string;
  user_id?: string;
  min_rating?: number;
  max_rating?: number;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Review response DTO
 */
export interface ReviewResponseDto {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  order_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  status: ReviewStatus;
  restaurant_reply: string | null;
  restaurant_reply_at: string | null;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Restaurant rating summary
 */
export interface RatingSummaryDto {
  average_rating: number;
  review_count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
