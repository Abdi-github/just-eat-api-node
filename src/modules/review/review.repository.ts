import { Review, IReview } from './review.model.js';
import type {
  ReviewQueryDto,
  AdminReviewQueryDto,
  ReviewStatus,
  RatingSummaryDto,
} from './review.types.js';
import { REVIEW_CONSTANTS } from './review.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Review Repository
 * Data access layer for review operations.
 */
export class ReviewRepository {
  // ==================== CREATE ====================

  async create(data: Partial<IReview>): Promise<IReview> {
    const review = new Review(data);
    return review.save();
  }

  // ==================== FIND ====================

  async findById(id: string): Promise<IReview | null> {
    return Review.findById(id)
      .populate('user_id', 'first_name last_name')
      .populate('restaurant_id', 'name slug')
      .populate('order_id', 'order_number')
      .lean()
      .exec() as Promise<IReview | null>;
  }

  async findByOrderId(orderId: string): Promise<IReview | null> {
    return Review.findOne({ order_id: orderId }).lean().exec() as Promise<IReview | null>;
  }

  /**
   * Find reviews for a specific restaurant (public — only APPROVED)
   */
  async findByRestaurant(
    restaurantId: string,
    query: ReviewQueryDto
  ): Promise<{ reviews: IReview[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = REVIEW_CONSTANTS.DEFAULT_LIMIT,
      sort = REVIEW_CONSTANTS.DEFAULT_SORT,
      rating,
    } = query;

    const parsedPage = Math.max(1, Number(page));
    const parsedLimit = Math.min(Math.max(1, Number(limit)), REVIEW_CONSTANTS.MAX_LIMIT);

    const filter: Record<string, unknown> = {
      restaurant_id: restaurantId,
      status: 'APPROVED',
    };

    if (rating) {
      filter.rating = Number(rating);
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('user_id', 'first_name last_name')
        .populate('restaurant_id', 'name slug')
        .lean()
        .exec(),
      Review.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(parsedPage, parsedLimit, total);
    return { reviews: reviews as IReview[], pagination };
  }

  /**
   * Find reviews by a specific user
   */
  async findByUser(
    userId: string,
    query: ReviewQueryDto
  ): Promise<{ reviews: IReview[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = REVIEW_CONSTANTS.DEFAULT_LIMIT,
      sort = REVIEW_CONSTANTS.DEFAULT_SORT,
    } = query;

    const parsedPage = Math.max(1, Number(page));
    const parsedLimit = Math.min(Math.max(1, Number(limit)), REVIEW_CONSTANTS.MAX_LIMIT);

    const filter: Record<string, unknown> = { user_id: userId };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('restaurant_id', 'name slug')
        .populate('order_id', 'order_number')
        .lean()
        .exec(),
      Review.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(parsedPage, parsedLimit, total);
    return { reviews: reviews as IReview[], pagination };
  }

  /**
   * Admin: list all reviews with filtering
   */
  async findAll(
    query: AdminReviewQueryDto
  ): Promise<{ reviews: IReview[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = REVIEW_CONSTANTS.DEFAULT_LIMIT,
      sort = REVIEW_CONSTANTS.DEFAULT_SORT,
      status,
      restaurant_id,
      user_id,
      min_rating,
      max_rating,
    } = query;

    const parsedPage = Math.max(1, Number(page));
    const parsedLimit = Math.min(Math.max(1, Number(limit)), REVIEW_CONSTANTS.MAX_LIMIT);

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (restaurant_id) filter.restaurant_id = restaurant_id;
    if (user_id) filter.user_id = user_id;
    if (min_rating || max_rating) {
      filter.rating = {};
      if (min_rating) (filter.rating as Record<string, unknown>).$gte = Number(min_rating);
      if (max_rating) (filter.rating as Record<string, unknown>).$lte = Number(max_rating);
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('user_id', 'first_name last_name email')
        .populate('restaurant_id', 'name slug')
        .populate('order_id', 'order_number')
        .lean()
        .exec(),
      Review.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(parsedPage, parsedLimit, total);
    return { reviews: reviews as IReview[], pagination };
  }

  // ==================== UPDATE ====================

  async update(id: string, data: Partial<IReview>): Promise<IReview | null> {
    return Review.findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate('user_id', 'first_name last_name')
      .populate('restaurant_id', 'name slug')
      .populate('order_id', 'order_number')
      .lean()
      .exec() as Promise<IReview | null>;
  }

  // ==================== DELETE ====================

  async delete(id: string): Promise<IReview | null> {
    return Review.findByIdAndDelete(id).lean().exec() as Promise<IReview | null>;
  }

  // ==================== AGGREGATIONS ====================

  /**
   * Calculate rating summary for a restaurant (only APPROVED reviews)
   */
  async getRatingSummary(restaurantId: string): Promise<RatingSummaryDto> {
    const result = await Review.aggregate([
      {
        $match: {
          restaurant_id: Review.base.Types.ObjectId.createFromHexString(restaurantId),
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id: null,
          average_rating: { $avg: '$rating' },
          review_count: { $sum: 1 },
          rating_1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating_2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating_3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating_4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating_5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        average_rating: 0,
        review_count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const data = result[0];
    return {
      average_rating: Math.round(data.average_rating * 10) / 10,
      review_count: data.review_count,
      distribution: {
        1: data.rating_1,
        2: data.rating_2,
        3: data.rating_3,
        4: data.rating_4,
        5: data.rating_5,
      },
    };
  }

  /**
   * Count reviews by restaurant and status
   */
  async countByRestaurantAndStatus(restaurantId: string, status: string): Promise<number> {
    return Review.countDocuments({ restaurant_id: restaurantId, status });
  }
}
