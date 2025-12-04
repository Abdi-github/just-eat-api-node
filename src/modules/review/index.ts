// Review Module — Barrel Export

// Types & Enums
export { ReviewStatus, REVIEW_CONSTANTS } from './review.types.js';

export type {
  CreateReviewDto,
  UpdateReviewDto,
  ReplyToReviewDto,
  ModerateReviewDto,
  ReviewQueryDto,
  AdminReviewQueryDto,
  ReviewResponseDto,
  RatingSummaryDto,
} from './review.types.js';

// Model
export { Review } from './review.model.js';
export type { IReview } from './review.model.js';

// Repository
export { ReviewRepository } from './review.repository.js';

// Service
export { ReviewService } from './review.service.js';

// Controller
export { reviewController } from './review.controller.js';

// Routes
export { default as reviewPublicRoutes } from './review.public.routes.js';
export { default as reviewRestaurantRoutes } from './review.restaurant.routes.js';
export { default as reviewAdminRoutes } from './review.admin.routes.js';
