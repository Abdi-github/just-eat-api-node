import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';
import { PromotionRepository } from './promotion.repository.js';
import {
  validateCouponCodeValidator,
  stampCardListQueryValidator,
  mongoIdParamValidator,
} from './promotion.validator.js';

// Instantiate
const promotionRepository = new PromotionRepository();
const promotionService = new PromotionService(promotionRepository);
const promotionController = new PromotionController(promotionService);

const router = Router();

/**
 * Public Promotion Routes
 * Base path: /api/v1/public/promotions
 *
 * Customer-facing promotion endpoints.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Coupon Validation
// ============================================================================

/**
 * @route   POST /api/v1/public/promotions/coupons/validate
 * @desc    Validate a coupon code for a given restaurant & subtotal
 * @access  Authenticated users
 */
router.post(
  '/coupons/validate',
  validateCouponCodeValidator,
  validate,
  promotionController.validateCoupon
);

// ============================================================================
// Stamp Progress
// ============================================================================

/**
 * @route   GET /api/v1/public/promotions/stamps/my-progress
 * @desc    Get customer's stamp progress across all restaurants
 * @access  Authenticated users
 */
router.get('/stamps/my-progress', promotionController.getMyStampProgress);

/**
 * @route   POST /api/v1/public/promotions/stamps/:id/redeem
 * @desc    Redeem a completed stamp card reward
 * @access  Authenticated users
 */
router.post(
  '/stamps/:id/redeem',
  mongoIdParamValidator,
  validate,
  promotionController.redeemStampReward
);

/**
 * @route   GET /api/v1/public/promotions/stamps/restaurant/:restaurantId
 * @desc    Get stamp cards for a specific restaurant (public view)
 * @access  Authenticated users
 */
router.get(
  '/stamps/restaurant/:restaurantId',
  stampCardListQueryValidator,
  validate,
  promotionController.getStampCards
);

export default router;
