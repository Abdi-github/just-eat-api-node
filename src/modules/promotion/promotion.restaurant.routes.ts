import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';
import { PromotionRepository } from './promotion.repository.js';
import {
  createCouponValidator,
  updateCouponValidator,
  createStampCardValidator,
  updateStampCardValidator,
  mongoIdParamValidator,
  couponListQueryValidator,
  stampCardListQueryValidator,
} from './promotion.validator.js';

// Instantiate
const promotionRepository = new PromotionRepository();
const promotionService = new PromotionService(promotionRepository);
const promotionController = new PromotionController(promotionService);

const router = Router({ mergeParams: true });

/**
 * Restaurant Promotion Routes
 * Base path: /api/v1/restaurant/:restaurantId/promotions
 *
 * Restaurant owner/staff can manage their coupons and stamp cards.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Coupon Management (Restaurant)
// ============================================================================

/**
 * @route   POST /api/v1/restaurant/:restaurantId/promotions/coupons
 * @desc    Create a restaurant-scoped coupon
 * @access  Restaurant Owner (promotions:create)
 */
router.post(
  '/coupons',
  requirePermission('promotions:create'),
  createCouponValidator,
  validate,
  promotionController.createCoupon
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/promotions/coupons
 * @desc    List coupons for a restaurant
 * @access  Restaurant Owner (promotions:read)
 */
router.get(
  '/coupons',
  requirePermission('promotions:read'),
  couponListQueryValidator,
  validate,
  promotionController.getAllCoupons
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/promotions/coupons/:id
 * @desc    Get a specific coupon
 * @access  Restaurant Owner (promotions:read)
 */
router.get(
  '/coupons/:id',
  requirePermission('promotions:read'),
  mongoIdParamValidator,
  validate,
  promotionController.getCouponById
);

/**
 * @route   PUT /api/v1/restaurant/:restaurantId/promotions/coupons/:id
 * @desc    Update a coupon
 * @access  Restaurant Owner (promotions:update)
 */
router.put(
  '/coupons/:id',
  requirePermission('promotions:update'),
  updateCouponValidator,
  validate,
  promotionController.updateCoupon
);

/**
 * @route   DELETE /api/v1/restaurant/:restaurantId/promotions/coupons/:id
 * @desc    Delete a coupon
 * @access  Restaurant Owner (promotions:delete — if permitted, else forbidden)
 */
router.delete(
  '/coupons/:id',
  requirePermission('promotions:update'),
  mongoIdParamValidator,
  validate,
  promotionController.deleteCoupon
);

// ============================================================================
// Stamp Card Management (Restaurant)
// ============================================================================

/**
 * @route   POST /api/v1/restaurant/:restaurantId/promotions/stamps
 * @desc    Create a stamp card for the restaurant
 * @access  Restaurant Owner (promotions:create)
 */
router.post(
  '/stamps',
  requirePermission('promotions:create'),
  createStampCardValidator,
  validate,
  promotionController.createStampCard
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/promotions/stamps
 * @desc    List stamp cards for the restaurant
 * @access  Restaurant Owner (promotions:read)
 */
router.get(
  '/stamps',
  requirePermission('promotions:read'),
  stampCardListQueryValidator,
  validate,
  promotionController.getStampCards
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/promotions/stamps/:id
 * @desc    Get a specific stamp card
 * @access  Restaurant Owner (promotions:read)
 */
router.get(
  '/stamps/:id',
  requirePermission('promotions:read'),
  mongoIdParamValidator,
  validate,
  promotionController.getStampCardById
);

/**
 * @route   PUT /api/v1/restaurant/:restaurantId/promotions/stamps/:id
 * @desc    Update a stamp card
 * @access  Restaurant Owner (promotions:update)
 */
router.put(
  '/stamps/:id',
  requirePermission('promotions:update'),
  updateStampCardValidator,
  validate,
  promotionController.updateStampCard
);

/**
 * @route   DELETE /api/v1/restaurant/:restaurantId/promotions/stamps/:id
 * @desc    Delete a stamp card
 * @access  Restaurant Owner (promotions:update)
 */
router.delete(
  '/stamps/:id',
  requirePermission('promotions:update'),
  mongoIdParamValidator,
  validate,
  promotionController.deleteStampCard
);

export default router;
