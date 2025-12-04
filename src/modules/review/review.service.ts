import { ReviewRepository } from './review.repository.js';
import type { IReview } from './review.model.js';
import type {
  CreateReviewDto,
  UpdateReviewDto,
  ReplyToReviewDto,
  ModerateReviewDto,
  ReviewQueryDto,
  AdminReviewQueryDto,
  ReviewResponseDto,
  RatingSummaryDto,
} from './review.types.js';
import { ReviewStatus, REVIEW_CONSTANTS } from './review.types.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

// Import models for cross-module operations
import { Order } from '../order/order.model.js';
import { Restaurant } from '../restaurant/restaurant.model.js';

/**
 * Review Service
 * Business logic layer for review operations.
 * Handles review creation, moderation, restaurant replies,
 * and auto-updating restaurant rating/review_count.
 */
export class ReviewService {
  constructor(private reviewRepository: ReviewRepository) {}

  /**
   * Extract string ID from a field that may be populated or an ObjectId
   */
  private extractId(field: unknown): string | null {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field !== null) {
      const obj = field as Record<string, unknown>;
      if (obj._id) return obj._id.toString();
    }
    return field.toString();
  }

  /**
   * Map a review document to a response DTO
   */
  private toResponseDto(review: IReview): ReviewResponseDto {
    const user = review.user_id as unknown as Record<string, unknown> | null;
    const restaurant = review.restaurant_id as unknown as Record<string, unknown> | null;

    return {
      id: review._id.toString(),
      user:
        user && typeof user === 'object' && user._id
          ? {
              id: user._id.toString(),
              first_name: (user.first_name as string) || '',
              last_name: (user.last_name as string) || '',
            }
          : null,
      restaurant:
        restaurant && typeof restaurant === 'object' && restaurant._id
          ? {
              id: restaurant._id.toString(),
              name: (restaurant.name as string) || '',
              slug: (restaurant.slug as string) || '',
            }
          : null,
      order_id: this.extractId(review.order_id) || '',
      rating: review.rating,
      comment: review.comment || null,
      is_verified: review.is_verified ?? true,
      status: review.status as ReviewStatus,
      restaurant_reply: review.restaurant_reply || null,
      restaurant_reply_at: review.restaurant_reply_at
        ? review.restaurant_reply_at.toISOString?.() || String(review.restaurant_reply_at)
        : null,
      moderation_reason: review.moderation_reason || null,
      created_at: review.created_at
        ? review.created_at.toISOString?.() || String(review.created_at)
        : new Date().toISOString(),
      updated_at: review.updated_at
        ? review.updated_at.toISOString?.() || String(review.updated_at)
        : new Date().toISOString(),
    };
  }

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================

  /**
   * Create a review for a completed order.
   * Business rules:
   * - User must own the order
   * - Order must be DELIVERED
   * - One review per order (enforced by unique index)
   * - Review starts as PENDING (auto-approved for verified purchases)
   */
  async createReview(dto: CreateReviewDto, user: AuthenticatedUser): Promise<ReviewResponseDto> {
    // 1. Validate order exists and belongs to user
    const order = await Order.findById(dto.order_id).lean().exec();
    if (!order) {
      throw NotFoundError('Order not found');
    }

    if (order.user_id.toString() !== user.id) {
      throw ForbiddenError('You can only review your own orders');
    }

    // 2. Order must be delivered
    if (order.status !== 'DELIVERED') {
      throw BadRequestError('You can only review delivered orders');
    }

    // 3. Restaurant must match
    if (order.restaurant_id.toString() !== dto.restaurant_id) {
      throw BadRequestError('Restaurant ID does not match the order');
    }

    // 4. Check for existing review on this order
    const existingReview = await this.reviewRepository.findByOrderId(dto.order_id);
    if (existingReview) {
      throw BadRequestError('You have already reviewed this order');
    }

    // 5. Create the review
    const review = await this.reviewRepository.create({
      user_id: order.user_id,
      restaurant_id: order.restaurant_id,
      order_id: order._id,
      rating: dto.rating,
      comment: dto.comment || null,
      is_verified: true,
      status: ReviewStatus.APPROVED, // Auto-approve verified purchases
    } as Partial<IReview>);

    // 6. Auto-update restaurant rating and review_count
    await this.updateRestaurantRating(dto.restaurant_id);

    // 7. Return populated review
    const populated = await this.reviewRepository.findById(review._id.toString());
    return this.toResponseDto(populated || review);
  }

  /**
   * Get reviews by the authenticated user
   */
  async getMyReviews(
    user: AuthenticatedUser,
    query: ReviewQueryDto
  ): Promise<{ data: ReviewResponseDto[]; pagination: PaginationMeta }> {
    const result = await this.reviewRepository.findByUser(user.id, query);
    return {
      data: result.reviews.map((r) => this.toResponseDto(r)),
      pagination: result.pagination,
    };
  }

  /**
   * Update own review (rating / comment)
   */
  async updateMyReview(
    reviewId: string,
    dto: UpdateReviewDto,
    user: AuthenticatedUser
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw NotFoundError('Review not found');
    }

    // Verify ownership
    const reviewUserId = this.extractId(review.user_id);
    if (reviewUserId !== user.id) {
      throw ForbiddenError('You can only update your own reviews');
    }

    // Build update data
    const updateData: Partial<IReview> = {};
    if (dto.rating !== undefined) updateData.rating = dto.rating;
    if (dto.comment !== undefined) updateData.comment = dto.comment;

    // After edit, set back to PENDING for re-moderation
    updateData.status = ReviewStatus.PENDING as unknown as IReview['status'];

    const updated = await this.reviewRepository.update(reviewId, updateData);
    if (!updated) {
      throw NotFoundError('Review not found after update');
    }

    // Re-calculate restaurant rating
    const restaurantId = this.extractId(review.restaurant_id);
    if (restaurantId) {
      await this.updateRestaurantRating(restaurantId);
    }

    return this.toResponseDto(updated);
  }

  /**
   * Delete own review
   */
  async deleteMyReview(reviewId: string, user: AuthenticatedUser): Promise<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw NotFoundError('Review not found');
    }

    const reviewUserId = this.extractId(review.user_id);
    if (reviewUserId !== user.id) {
      throw ForbiddenError('You can only delete your own reviews');
    }

    const restaurantId = this.extractId(review.restaurant_id);
    await this.reviewRepository.delete(reviewId);

    // Recalculate restaurant rating
    if (restaurantId) {
      await this.updateRestaurantRating(restaurantId);
    }
  }

  // ============================================================================
  // PUBLIC OPERATIONS
  // ============================================================================

  /**
   * Get reviews for a restaurant (public — only APPROVED reviews)
   */
  async getRestaurantReviews(
    restaurantId: string,
    query: ReviewQueryDto
  ): Promise<{ data: ReviewResponseDto[]; pagination: PaginationMeta }> {
    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId).lean().exec();
    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }

    const result = await this.reviewRepository.findByRestaurant(restaurantId, query);
    return {
      data: result.reviews.map((r) => this.toResponseDto(r)),
      pagination: result.pagination,
    };
  }

  /**
   * Get rating summary for a restaurant
   */
  async getRestaurantRatingSummary(restaurantId: string): Promise<RatingSummaryDto> {
    const restaurant = await Restaurant.findById(restaurantId).lean().exec();
    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }
    return this.reviewRepository.getRatingSummary(restaurantId);
  }

  // ============================================================================
  // RESTAURANT OWNER OPERATIONS
  // ============================================================================

  /**
   * Restaurant owner replies to a review
   */
  async replyToReview(
    reviewId: string,
    dto: ReplyToReviewDto,
    user: AuthenticatedUser
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw NotFoundError('Review not found');
    }

    // Verify user owns the restaurant
    const restaurantId = this.extractId(review.restaurant_id);
    if (!restaurantId) {
      throw BadRequestError('Review has no associated restaurant');
    }

    const restaurant = await Restaurant.findById(restaurantId).lean().exec();
    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }

    if (restaurant.owner_id?.toString() !== user.id) {
      throw ForbiddenError('You can only reply to reviews for your own restaurant');
    }

    // Set reply
    const updated = await this.reviewRepository.update(reviewId, {
      restaurant_reply: dto.restaurant_reply,
      restaurant_reply_at: new Date(),
    } as Partial<IReview>);

    if (!updated) {
      throw NotFoundError('Review not found after update');
    }

    return this.toResponseDto(updated);
  }

  /**
   * Get reviews for the owner's restaurant (all statuses)
   */
  async getOwnerRestaurantReviews(
    restaurantId: string,
    query: ReviewQueryDto,
    user: AuthenticatedUser
  ): Promise<{ data: ReviewResponseDto[]; pagination: PaginationMeta }> {
    // Verify user owns the restaurant
    const restaurant = await Restaurant.findById(restaurantId).lean().exec();
    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }
    if (restaurant.owner_id?.toString() !== user.id) {
      throw ForbiddenError('You can only view reviews for your own restaurant');
    }

    // Owner sees all statuses — override findByRestaurant to include all
    const {
      page = 1,
      limit = REVIEW_CONSTANTS.DEFAULT_LIMIT,
      sort = REVIEW_CONSTANTS.DEFAULT_SORT,
      rating,
      status,
    } = query;

    const parsedPage = Math.max(1, Number(page));
    const parsedLimit = Math.min(Math.max(1, Number(limit)), REVIEW_CONSTANTS.MAX_LIMIT);

    const filter: Record<string, unknown> = { restaurant_id: restaurantId };
    if (rating) filter.rating = Number(rating);
    if (status) filter.status = status;

    const { Review: ReviewModel } = await import('./review.model.js');
    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort(sort)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('user_id', 'first_name last_name')
        .populate('order_id', 'order_number')
        .lean()
        .exec(),
      ReviewModel.countDocuments(filter),
    ]);

    const { calculatePaginationMeta: calcPagination } =
      await import('../../shared/utils/response.helper.js');
    const pagination = calcPagination(total, parsedPage, parsedLimit);

    return {
      data: (reviews as IReview[]).map((r) => this.toResponseDto(r)),
      pagination,
    };
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  /**
   * Admin: list all reviews with filtering
   */
  async getAllReviews(
    query: AdminReviewQueryDto
  ): Promise<{ data: ReviewResponseDto[]; pagination: PaginationMeta }> {
    const result = await this.reviewRepository.findAll(query);
    return {
      data: result.reviews.map((r) => this.toResponseDto(r)),
      pagination: result.pagination,
    };
  }

  /**
   * Admin: get review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw NotFoundError('Review not found');
    }
    return this.toResponseDto(review);
  }

  /**
   * Admin: moderate a review (approve / reject / flag)
   */
  async moderateReview(reviewId: string, dto: ModerateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw NotFoundError('Review not found');
    }

    const updateData: Partial<IReview> = {
      status: dto.status as unknown as IReview['status'],
    };
    if (dto.moderation_reason) {
      updateData.moderation_reason = dto.moderation_reason;
    }

    const updated = await this.reviewRepository.update(reviewId, updateData);
    if (!updated) {
      throw NotFoundError('Review not found after update');
    }

    // Re-calculate restaurant rating (approval/rejection changes the count)
    const restaurantId = this.extractId(review.restaurant_id);
    if (restaurantId) {
      await this.updateRestaurantRating(restaurantId);
    }

    return this.toResponseDto(updated);
  }

  /**
   * Admin: delete a review
   */
  async adminDeleteReview(reviewId: string): Promise<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw NotFoundError('Review not found');
    }

    const restaurantId = this.extractId(review.restaurant_id);
    await this.reviewRepository.delete(reviewId);

    // Recalculate restaurant rating
    if (restaurantId) {
      await this.updateRestaurantRating(restaurantId);
    }
  }

  // ============================================================================
  // RATING CALCULATION
  // ============================================================================

  /**
   * Recalculate and update a restaurant's rating and review_count
   * based on all APPROVED reviews.
   */
  private async updateRestaurantRating(restaurantId: string): Promise<void> {
    const summary = await this.reviewRepository.getRatingSummary(restaurantId);

    await Restaurant.findByIdAndUpdate(restaurantId, {
      rating: summary.average_rating,
      review_count: summary.review_count,
    });
  }
}
