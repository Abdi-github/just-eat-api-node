import { Request, Response } from 'express';
import { PromotionService } from './promotion.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
  calculatePaginationMeta,
} from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { ValidateCouponDto, CouponQueryDto, StampCardQueryDto } from './promotion.types.js';

/**
 * Promotion Controller — thin controller (no business logic)
 */
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  // ===========================================================================
  // Coupon CRUD
  // ===========================================================================

  createCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const coupon = await this.promotionService.createCoupon(req.body, user);
    sendSuccessResponse(res, 201, 'Coupon created successfully', coupon);
  });

  getCouponById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const coupon = await this.promotionService.getCouponById(req.params.id);
    sendSuccessResponse(res, 200, 'Coupon retrieved successfully', coupon);
  });

  getAllCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = parsePaginationParams(req.query);
    const query: CouponQueryDto = {
      page,
      limit,
      scope: req.query.scope as CouponQueryDto['scope'],
      status: req.query.status as CouponQueryDto['status'],
      restaurant_id: req.params.restaurantId || (req.query.restaurant_id as string),
    };
    const result = await this.promotionService.getAllCoupons(query);
    const meta = calculatePaginationMeta(page, limit, result.total);
    sendPaginatedResponse(res, 200, 'Coupons retrieved successfully', result.data, meta);
  });

  updateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const coupon = await this.promotionService.updateCoupon(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'Coupon updated successfully', coupon);
  });

  deleteCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await this.promotionService.deleteCoupon(req.params.id);
    sendSuccessResponse(res, 200, 'Coupon deleted successfully', null);
  });

  // ===========================================================================
  // Coupon Validation (Public/Customer)
  // ===========================================================================

  validateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const dto: ValidateCouponDto = {
      code: req.body.code,
      restaurant_id: req.body.restaurant_id,
      subtotal: req.body.subtotal,
    };
    const result = await this.promotionService.validateCoupon(dto, user.id);
    sendSuccessResponse(res, 200, 'Coupon validation result', result);
  });

  // ===========================================================================
  // Stamp Card CRUD
  // ===========================================================================

  createStampCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const card = await this.promotionService.createStampCard(req.body, user);
    sendSuccessResponse(res, 201, 'Stamp card created successfully', card);
  });

  getStampCardById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const card = await this.promotionService.getStampCardById(req.params.id);
    sendSuccessResponse(res, 200, 'Stamp card retrieved successfully', card);
  });

  getStampCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = parsePaginationParams(req.query);
    const query: StampCardQueryDto = {
      page,
      limit,
      restaurant_id: req.params.restaurantId || (req.query.restaurant_id as string),
    };
    const result = await this.promotionService.getStampCards(query);
    const meta = calculatePaginationMeta(page, limit, result.total);
    sendPaginatedResponse(res, 200, 'Stamp cards retrieved successfully', result.data, meta);
  });

  updateStampCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const card = await this.promotionService.updateStampCard(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'Stamp card updated successfully', card);
  });

  deleteStampCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await this.promotionService.deleteStampCard(req.params.id);
    sendSuccessResponse(res, 200, 'Stamp card deleted successfully', null);
  });

  // ===========================================================================
  // Stamp Progress (Customer)
  // ===========================================================================

  getMyStampProgress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const progress = await this.promotionService.getUserStampProgress(user.id);
    sendSuccessResponse(res, 200, 'Stamp progress retrieved successfully', progress);
  });

  redeemStampReward = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const progress = await this.promotionService.redeemStampReward(req.params.id, user.id);
    sendSuccessResponse(res, 200, 'Stamp reward redeemed successfully', progress);
  });
}
