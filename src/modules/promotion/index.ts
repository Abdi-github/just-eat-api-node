export { PromotionRepository } from './promotion.repository.js';
export { PromotionService } from './promotion.service.js';
export { PromotionController } from './promotion.controller.js';
export {
  DiscountType,
  PromotionScope,
  PromotionStatus,
  PROMOTION_CONSTANTS,
} from './promotion.types.js';
export type {
  CreateCouponDto,
  UpdateCouponDto,
  CreateStampCardDto,
  UpdateStampCardDto,
  ValidateCouponDto,
  CouponResponseDto,
  StampCardResponseDto,
  UserStampProgressDto,
  CouponValidationResult,
} from './promotion.types.js';
export { Coupon, CouponUsage, StampCard, UserStampProgress } from './promotion.model.js';
export type { ICoupon, ICouponUsage, IStampCard, IUserStampProgress } from './promotion.model.js';
