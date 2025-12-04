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

const router = Router();

/**
 * Admin Promotion Routes
 * Base path: /api/v1/admin/promotions
 *
 * Platform admin can manage all coupons (platform + restaurant) and stamp cards.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Platform Coupon Management (Admin)
// ============================================================================

/**
 * @route   POST /api/v1/admin/promotions/coupons
 * @desc    Create a coupon (platform or restaurant-scoped)
 * @access  Admin (promotions:manage)
 */
router.post(
  '/coupons',
  requirePermission('promotions:manage'),
  createCouponValidator,
  validate,
  promotionController.createCoupon
);

/**
 * @route   GET /api/v1/admin/promotions/coupons
 * @desc    List all coupons with filtering
 * @access  Admin (promotions:manage)
 */
router.get(
  '/coupons',
  requirePermission('promotions:manage'),
  couponListQueryValidator,
  validate,
  promotionController.getAllCoupons
);

/**
 * @route   GET /api/v1/admin/promotions/coupons/:id
 * @desc    Get coupon by ID
 * @access  Admin (promotions:manage)
 */
router.get(
  '/coupons/:id',
  requirePermission('promotions:manage'),
  mongoIdParamValidator,
  validate,
  promotionController.getCouponById
);

/**
 * @route   PUT /api/v1/admin/promotions/coupons/:id
 * @desc    Update any coupon
 * @access  Admin (promotions:manage)
 */
router.put(
  '/coupons/:id',
  requirePermission('promotions:manage'),
  updateCouponValidator,
  validate,
  promotionController.updateCoupon
);

/**
 * @route   DELETE /api/v1/admin/promotions/coupons/:id
 * @desc    Delete any coupon
 * @access  Admin (promotions:manage)
 */
router.delete(
  '/coupons/:id',
  requirePermission('promotions:manage'),
  mongoIdParamValidator,
  validate,
  promotionController.deleteCoupon
);

// ============================================================================
// Stamp Card Management (Admin)
// ============================================================================

/**
 * @route   POST /api/v1/admin/promotions/stamps
 * @desc    Create a stamp card for any restaurant
 * @access  Admin (promotions:manage)
 */
router.post(
  '/stamps',
  requirePermission('promotions:manage'),
  createStampCardValidator,
  validate,
  promotionController.createStampCard
);

/**
 * @route   GET /api/v1/admin/promotions/stamps
 * @desc    List all stamp cards with filtering
 * @access  Admin (promotions:manage)
 */
router.get(
  '/stamps',
  requirePermission('promotions:manage'),
  stampCardListQueryValidator,
  validate,
  promotionController.getStampCards
);

/**
 * @route   GET /api/v1/admin/promotions/stamps/:id
 * @desc    Get stamp card by ID
 * @access  Admin (promotions:manage)
 */
router.get(
  '/stamps/:id',
  requirePermission('promotions:manage'),
  mongoIdParamValidator,
  validate,
  promotionController.getStampCardById
);

/**
 * @route   PUT /api/v1/admin/promotions/stamps/:id
 * @desc    Update any stamp card
 * @access  Admin (promotions:manage)
 */
router.put(
  '/stamps/:id',
  requirePermission('promotions:manage'),
  updateStampCardValidator,
  validate,
  promotionController.updateStampCard
);

/**
 * @route   DELETE /api/v1/admin/promotions/stamps/:id
 * @desc    Delete any stamp card
 * @access  Admin (promotions:manage)
 */
router.delete(
  '/stamps/:id',
  requirePermission('promotions:manage'),
  mongoIdParamValidator,
  validate,
  promotionController.deleteStampCard
);

export default router;
