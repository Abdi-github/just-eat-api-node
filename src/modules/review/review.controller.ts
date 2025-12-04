import { Request, Response } from 'express';
import { ReviewService } from './review.service.js';
import { ReviewRepository } from './review.repository.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  CreateReviewDto,
  UpdateReviewDto,
  ReplyToReviewDto,
  ModerateReviewDto,
  ReviewQueryDto,
  AdminReviewQueryDto,
} from './review.types.js';

const reviewRepository = new ReviewRepository();
const reviewService = new ReviewService(reviewRepository);

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/public/reviews
 * Create a review for a delivered order
 */
const createReview = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await reviewService.createReview(req.body as CreateReviewDto, user);
  sendSuccessResponse(res, 201, 'Review created successfully', result);
});

/**
 * GET /api/v1/public/reviews/my
 * Get authenticated user's reviews
 */
const getMyReviews = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await reviewService.getMyReviews(user, req.query as unknown as ReviewQueryDto);
  sendPaginatedResponse(
    res,
    200,
    'Your reviews retrieved successfully',
    result.data,
    result.pagination
  );
});

/**
 * PATCH /api/v1/public/reviews/:id
 * Update own review
 */
const updateMyReview = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await reviewService.updateMyReview(
    req.params.id,
    req.body as UpdateReviewDto,
    user
  );
  sendSuccessResponse(res, 200, 'Review updated successfully', result);
});

/**
 * DELETE /api/v1/public/reviews/:id
 * Delete own review
 */
const deleteMyReview = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  await reviewService.deleteMyReview(req.params.id, user);
  sendSuccessResponse(res, 200, 'Review deleted successfully', null);
});

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/public/reviews/restaurant/:restaurantId
 * Get approved reviews for a restaurant
 */
const getRestaurantReviews = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.getRestaurantReviews(
    req.params.restaurantId,
    req.query as unknown as ReviewQueryDto
  );
  sendPaginatedResponse(
    res,
    200,
    'Restaurant reviews retrieved successfully',
    result.data,
    result.pagination
  );
});

/**
 * GET /api/v1/public/reviews/restaurant/:restaurantId/summary
 * Get rating summary for a restaurant
 */
const getRestaurantRatingSummary = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.getRestaurantRatingSummary(req.params.restaurantId);
  sendSuccessResponse(res, 200, 'Rating summary retrieved successfully', result);
});

// ============================================================================
// RESTAURANT OWNER ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/restaurant/:restaurantId/reviews/:id/reply
 * Restaurant owner replies to a review
 */
const replyToReview = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await reviewService.replyToReview(
    req.params.id,
    req.body as ReplyToReviewDto,
    user
  );
  sendSuccessResponse(res, 200, 'Reply added successfully', result);
});

/**
 * GET /api/v1/restaurant/:restaurantId/reviews
 * Restaurant owner views all reviews for their restaurant
 */
const getOwnerRestaurantReviews = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await reviewService.getOwnerRestaurantReviews(
    req.params.restaurantId,
    req.query as unknown as ReviewQueryDto,
    user
  );
  sendPaginatedResponse(
    res,
    200,
    'Restaurant reviews retrieved successfully',
    result.data,
    result.pagination
  );
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/admin/reviews
 * List all reviews with filtering
 */
const getAllReviews = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.getAllReviews(req.query as unknown as AdminReviewQueryDto);
  sendPaginatedResponse(res, 200, 'Reviews retrieved successfully', result.data, result.pagination);
});

/**
 * GET /api/v1/admin/reviews/:id
 * Get review by ID
 */
const getReviewById = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.getReviewById(req.params.id);
  sendSuccessResponse(res, 200, 'Review retrieved successfully', result);
});

/**
 * PATCH /api/v1/admin/reviews/:id/moderate
 * Moderate a review (approve / reject / flag)
 */
const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.moderateReview(req.params.id, req.body as ModerateReviewDto);
  sendSuccessResponse(res, 200, 'Review moderated successfully', result);
});

/**
 * DELETE /api/v1/admin/reviews/:id
 * Delete a review (admin)
 */
const adminDeleteReview = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.adminDeleteReview(req.params.id);
  sendSuccessResponse(res, 200, 'Review deleted successfully', null);
});

// ============================================================================
// Export controller object
// ============================================================================

export const reviewController = {
  // Customer
  createReview,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
  // Public
  getRestaurantReviews,
  getRestaurantRatingSummary,
  // Restaurant owner
  replyToReview,
  getOwnerRestaurantReviews,
  // Admin
  getAllReviews,
  getReviewById,
  moderateReview,
  adminDeleteReview,
};
