import { PromotionRepository } from './promotion.repository.js';
import { Restaurant } from '../restaurant/restaurant.model.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';
import { DiscountType, PromotionScope, PromotionStatus } from './promotion.types.js';
import type {
  CreateCouponDto,
  UpdateCouponDto,
  CreateStampCardDto,
  UpdateStampCardDto,
  ValidateCouponDto,
  CouponResponseDto,
  StampCardResponseDto,
  UserStampProgressDto,
  CouponValidationResult,
  CouponQueryDto,
  StampCardQueryDto,
} from './promotion.types.js';
import type { ICoupon, IStampCard, IUserStampProgress } from './promotion.model.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Promotion Service
 *
 * Business logic for coupons and stamp cards.
 */
export class PromotionService {
  constructor(private promotionRepository: PromotionRepository) {}

  // ===========================================================================
  // Coupon CRUD
  // ===========================================================================

  async createCoupon(dto: CreateCouponDto, user: AuthenticatedUser): Promise<CouponResponseDto> {
    // Validate restaurant exists if restaurant-scoped
    if (dto.scope === PromotionScope.RESTAURANT) {
      if (!dto.restaurant_id) {
        throw BadRequestError('Restaurant ID is required for restaurant-scoped coupons');
      }
      const restaurant = await Restaurant.findById(dto.restaurant_id).select('_id').exec();
      if (!restaurant) {
        throw NotFoundError('Restaurant not found');
      }
    }

    // Check code uniqueness
    const existing = await this.promotionRepository.findCouponByCode(dto.code);
    if (existing) {
      throw BadRequestError(`Coupon code "${dto.code.toUpperCase()}" already exists`);
    }

    const coupon = await this.promotionRepository.createCoupon({
      code: dto.code.toUpperCase(),
      description: dto.description || null,
      discount_type: dto.discount_type,
      discount_value: dto.discount_value,
      minimum_order: dto.minimum_order || 0,
      maximum_discount: dto.maximum_discount ?? null,
      scope: dto.scope,
      restaurant_id:
        dto.scope === PromotionScope.RESTAURANT
          ? (dto.restaurant_id as unknown as ICoupon['restaurant_id'])
          : null,
      valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
      valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
      usage_limit: dto.usage_limit ?? null,
      per_user_limit: dto.per_user_limit ?? 1,
      usage_count: 0,
      is_active: dto.is_active !== false,
      created_by: user.id as unknown as ICoupon['created_by'],
    } as Partial<ICoupon>);

    return this.toCouponResponseDto(coupon);
  }

  async getCouponById(id: string): Promise<CouponResponseDto> {
    const coupon = await this.promotionRepository.findCouponById(id);
    if (!coupon) throw NotFoundError('Coupon not found');
    return this.toCouponResponseDto(coupon);
  }

  async getAllCoupons(
    query: CouponQueryDto
  ): Promise<{ data: CouponResponseDto[]; total: number }> {
    const result = await this.promotionRepository.findAllCoupons(query);
    return {
      data: result.data.map((c) => this.toCouponResponseDto(c)),
      total: result.total,
    };
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto> {
    const coupon = await this.promotionRepository.findCouponById(id);
    if (!coupon) throw NotFoundError('Coupon not found');

    const updateData: Partial<ICoupon> = {};
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.discount_type !== undefined)
      updateData.discount_type = dto.discount_type as ICoupon['discount_type'];
    if (dto.discount_value !== undefined) updateData.discount_value = dto.discount_value;
    if (dto.minimum_order !== undefined) updateData.minimum_order = dto.minimum_order;
    if (dto.maximum_discount !== undefined) updateData.maximum_discount = dto.maximum_discount;
    if (dto.valid_from !== undefined)
      updateData.valid_from = dto.valid_from ? new Date(dto.valid_from) : null;
    if (dto.valid_until !== undefined)
      updateData.valid_until = dto.valid_until ? new Date(dto.valid_until) : null;
    if (dto.usage_limit !== undefined) updateData.usage_limit = dto.usage_limit;
    if (dto.per_user_limit !== undefined) updateData.per_user_limit = dto.per_user_limit;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const updated = await this.promotionRepository.updateCoupon(id, updateData);
    if (!updated) throw NotFoundError('Coupon not found');
    return this.toCouponResponseDto(updated);
  }

  async deleteCoupon(id: string): Promise<void> {
    const coupon = await this.promotionRepository.deleteCoupon(id);
    if (!coupon) throw NotFoundError('Coupon not found');
  }

  // ===========================================================================
  // Coupon Validation & Application
  // ===========================================================================

  /**
   * Validate a coupon code for a given order context.
   * Returns the discount amount if valid.
   */
  async validateCoupon(dto: ValidateCouponDto, userId: string): Promise<CouponValidationResult> {
    const coupon = await this.promotionRepository.findCouponByCode(dto.code);

    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    // Check active
    if (!coupon.is_active) {
      return { valid: false, message: 'This coupon is no longer active' };
    }

    // Check date validity
    const now = new Date();
    if (coupon.valid_from && now < coupon.valid_from) {
      return { valid: false, message: 'This coupon is not yet valid' };
    }
    if (coupon.valid_until && now > coupon.valid_until) {
      return { valid: false, message: 'This coupon has expired' };
    }

    // Check scope — restaurant-scoped coupon must match the restaurant
    if (coupon.scope === PromotionScope.RESTAURANT) {
      if (coupon.restaurant_id?.toString() !== dto.restaurant_id) {
        return { valid: false, message: 'This coupon is not valid for this restaurant' };
      }
    }

    // Check total usage limit
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, message: 'This coupon has reached its usage limit' };
    }

    // Check per-user usage limit
    const userUsageCount = await this.promotionRepository.countUserCouponUsage(
      coupon._id.toString(),
      userId
    );
    if (userUsageCount >= coupon.per_user_limit) {
      return {
        valid: false,
        message: 'You have already used this coupon the maximum number of times',
      };
    }

    // Check minimum order
    if (dto.subtotal < coupon.minimum_order) {
      return {
        valid: false,
        message: `Minimum order amount of CHF ${coupon.minimum_order} required for this coupon`,
      };
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discount_type === DiscountType.PERCENTAGE) {
      discountAmount = Math.round(((dto.subtotal * coupon.discount_value) / 100) * 100) / 100;
      // Apply maximum discount cap
      if (coupon.maximum_discount !== null && discountAmount > coupon.maximum_discount) {
        discountAmount = coupon.maximum_discount;
      }
    } else {
      // FLAT discount
      discountAmount = Math.min(coupon.discount_value, dto.subtotal);
    }

    return {
      valid: true,
      coupon: this.toCouponResponseDto(coupon),
      discount_amount: Math.round(discountAmount * 100) / 100,
      message: `Coupon applied! You save CHF ${discountAmount.toFixed(2)}`,
    };
  }

  /**
   * Record coupon usage after order is placed.
   * Called by order service when a coupon is used.
   */
  async recordCouponUsage(
    couponCode: string,
    userId: string,
    orderId: string,
    discountAmount: number
  ): Promise<void> {
    const coupon = await this.promotionRepository.findCouponByCode(couponCode);
    if (!coupon) return;

    await this.promotionRepository.createCouponUsage({
      coupon_id: coupon._id,
      user_id: userId as unknown as ICoupon['created_by'],
      order_id: orderId as unknown as ICoupon['created_by'],
      discount_amount: discountAmount,
    } as Partial<import('./promotion.model.js').ICouponUsage>);

    await this.promotionRepository.incrementCouponUsage(coupon._id.toString());
  }

  // ===========================================================================
  // Stamp Card CRUD
  // ===========================================================================

  async createStampCard(
    dto: CreateStampCardDto,
    user: AuthenticatedUser
  ): Promise<StampCardResponseDto> {
    // Validate restaurant exists
    const restaurant = await Restaurant.findById(dto.restaurant_id).select('_id').exec();
    if (!restaurant) throw NotFoundError('Restaurant not found');

    const stampCard = await this.promotionRepository.createStampCard({
      name: dto.name,
      description: dto.description || null,
      restaurant_id: dto.restaurant_id as unknown as IStampCard['restaurant_id'],
      stamps_required: dto.stamps_required,
      reward_description: dto.reward_description,
      reward_type: dto.reward_type,
      reward_value: dto.reward_value,
      valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
      valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
      is_active: dto.is_active !== false,
      created_by: user.id as unknown as IStampCard['created_by'],
    } as Partial<IStampCard>);

    return this.toStampCardResponseDto(stampCard);
  }

  async getStampCardById(id: string): Promise<StampCardResponseDto> {
    const card = await this.promotionRepository.findStampCardById(id);
    if (!card) throw NotFoundError('Stamp card not found');
    return this.toStampCardResponseDto(card);
  }

  async getStampCards(
    query: StampCardQueryDto
  ): Promise<{ data: StampCardResponseDto[]; total: number }> {
    const result = await this.promotionRepository.findStampCardsByRestaurant(query);
    return {
      data: result.data.map((c) => this.toStampCardResponseDto(c)),
      total: result.total,
    };
  }

  async updateStampCard(id: string, dto: UpdateStampCardDto): Promise<StampCardResponseDto> {
    const card = await this.promotionRepository.findStampCardById(id);
    if (!card) throw NotFoundError('Stamp card not found');

    const updateData: Partial<IStampCard> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.stamps_required !== undefined) updateData.stamps_required = dto.stamps_required;
    if (dto.reward_description !== undefined)
      updateData.reward_description = dto.reward_description;
    if (dto.reward_type !== undefined)
      updateData.reward_type = dto.reward_type as IStampCard['reward_type'];
    if (dto.reward_value !== undefined) updateData.reward_value = dto.reward_value;
    if (dto.valid_from !== undefined)
      updateData.valid_from = dto.valid_from ? new Date(dto.valid_from) : null;
    if (dto.valid_until !== undefined)
      updateData.valid_until = dto.valid_until ? new Date(dto.valid_until) : null;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const updated = await this.promotionRepository.updateStampCard(id, updateData);
    if (!updated) throw NotFoundError('Stamp card not found');
    return this.toStampCardResponseDto(updated);
  }

  async deleteStampCard(id: string): Promise<void> {
    const card = await this.promotionRepository.deleteStampCard(id);
    if (!card) throw NotFoundError('Stamp card not found');
  }

  // ===========================================================================
  // Stamp Progress (Customer)
  // ===========================================================================

  async getUserStampProgress(userId: string): Promise<UserStampProgressDto[]> {
    const progress = await this.promotionRepository.findUserStampProgressByUser(userId);
    return progress.map((p) => this.toStampProgressDto(p));
  }

  async addStamp(
    stampCardId: string,
    userId: string,
    orderId: string
  ): Promise<UserStampProgressDto> {
    const card = await this.promotionRepository.findStampCardById(stampCardId);
    if (!card) throw NotFoundError('Stamp card not found');
    if (!card.is_active) throw BadRequestError('This stamp card is no longer active');

    // Check date validity
    const now = new Date();
    if (card.valid_until && now > card.valid_until) {
      throw BadRequestError('This stamp card has expired');
    }

    const progress = await this.promotionRepository.createOrUpdateStampProgress(
      stampCardId,
      userId,
      card.restaurant_id.toString(),
      orderId,
      card.stamps_required
    );

    return this.toStampProgressDto(progress);
  }

  async redeemStampReward(progressId: string, userId: string): Promise<UserStampProgressDto> {
    const progress = await this.promotionRepository.findUserStampProgress(progressId, userId);

    // Need to find by ID, not by card+user
    const allProgress = await this.promotionRepository.findUserStampProgressByUser(userId);
    const found = allProgress.find((p) => p._id.toString() === progressId);

    if (!found) throw NotFoundError('Stamp progress not found');
    if (!found.is_complete) throw BadRequestError('Stamp card is not yet complete');
    if (found.reward_redeemed) throw BadRequestError('Reward has already been redeemed');

    const redeemed = await this.promotionRepository.redeemStampReward(progressId);
    if (!redeemed) throw NotFoundError('Stamp progress not found');

    return this.toStampProgressDto(redeemed);
  }

  // ===========================================================================
  // DTO Mappers
  // ===========================================================================

  private getCouponStatus(coupon: ICoupon): PromotionStatus {
    if (!coupon.is_active) return PromotionStatus.INACTIVE;
    if (coupon.valid_until && new Date() > coupon.valid_until) return PromotionStatus.EXPIRED;
    return PromotionStatus.ACTIVE;
  }

  private toCouponResponseDto(coupon: ICoupon): CouponResponseDto {
    const restaurant = coupon.restaurant_id as unknown as Record<string, unknown>;
    const isPopulated = restaurant && typeof restaurant === 'object' && '_id' in restaurant;

    return {
      id: coupon._id.toString(),
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type as DiscountType,
      discount_value: coupon.discount_value,
      minimum_order: coupon.minimum_order,
      maximum_discount: coupon.maximum_discount,
      scope: coupon.scope as PromotionScope,
      restaurant_id: isPopulated
        ? (restaurant._id as { toString(): string }).toString()
        : coupon.restaurant_id?.toString() || null,
      restaurant_name: isPopulated ? (restaurant.name as string) : null,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      usage_limit: coupon.usage_limit,
      per_user_limit: coupon.per_user_limit,
      usage_count: coupon.usage_count,
      is_active: coupon.is_active,
      status: this.getCouponStatus(coupon),
      created_by: coupon.created_by?.toString() || null,
      created_at: coupon.created_at,
      updated_at: coupon.updated_at,
    };
  }

  private toStampCardResponseDto(card: IStampCard): StampCardResponseDto {
    const restaurant = card.restaurant_id as unknown as Record<string, unknown>;
    const isPopulated = restaurant && typeof restaurant === 'object' && '_id' in restaurant;

    return {
      id: card._id.toString(),
      name: card.name,
      description: card.description,
      restaurant_id: isPopulated
        ? (restaurant._id as { toString(): string }).toString()
        : card.restaurant_id?.toString() || '',
      restaurant_name: isPopulated ? (restaurant.name as string) : null,
      stamps_required: card.stamps_required,
      reward_description: card.reward_description,
      reward_type: card.reward_type as DiscountType,
      reward_value: card.reward_value,
      valid_from: card.valid_from,
      valid_until: card.valid_until,
      is_active: card.is_active,
      created_at: card.created_at,
      updated_at: card.updated_at,
    };
  }

  private toStampProgressDto(progress: IUserStampProgress): UserStampProgressDto {
    const stampCard = progress.stamp_card_id as unknown as Record<string, unknown>;
    const restaurant = progress.restaurant_id as unknown as Record<string, unknown>;
    const isCardPopulated = stampCard && typeof stampCard === 'object' && '_id' in stampCard;
    const isRestPopulated = restaurant && typeof restaurant === 'object' && '_id' in restaurant;

    return {
      id: progress._id.toString(),
      stamp_card_id: isCardPopulated
        ? (stampCard._id as { toString(): string }).toString()
        : progress.stamp_card_id?.toString() || '',
      stamp_card_name: isCardPopulated ? (stampCard.name as string) : '',
      restaurant_id: isRestPopulated
        ? (restaurant._id as { toString(): string }).toString()
        : progress.restaurant_id?.toString() || '',
      restaurant_name: isRestPopulated ? (restaurant.name as string) : undefined,
      stamps_collected: progress.stamps_collected,
      stamps_required: isCardPopulated ? (stampCard.stamps_required as number) : 0,
      is_complete: progress.is_complete,
      reward_description: isCardPopulated ? (stampCard.reward_description as string) : '',
      reward_redeemed: progress.reward_redeemed,
      created_at: progress.created_at,
      updated_at: progress.updated_at,
    };
  }
}
