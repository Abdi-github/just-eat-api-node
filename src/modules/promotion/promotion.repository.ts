import {
  Coupon,
  ICoupon,
  CouponUsage,
  ICouponUsage,
  StampCard,
  IStampCard,
  UserStampProgress,
  IUserStampProgress,
} from './promotion.model.js';
import type { CouponQueryDto, StampCardQueryDto } from './promotion.types.js';
import { Schema } from 'mongoose';

/**
 * Promotion Repository
 *
 * Data access layer for coupons, stamp cards, and related collections.
 */
export class PromotionRepository {
  // ===========================================================================
  // Coupons
  // ===========================================================================

  async createCoupon(data: Partial<ICoupon>): Promise<ICoupon> {
    return Coupon.create(data);
  }

  async findCouponById(id: string): Promise<ICoupon | null> {
    return Coupon.findById(id)
      .populate('restaurant_id', 'name slug')
      .populate('created_by', 'first_name last_name email')
      .exec();
  }

  async findCouponByCode(code: string): Promise<ICoupon | null> {
    return Coupon.findOne({ code: code.toUpperCase() })
      .populate('restaurant_id', 'name slug')
      .exec();
  }

  async findAllCoupons(query: CouponQueryDto): Promise<{ data: ICoupon[]; total: number }> {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.scope) filter.scope = query.scope;
    if (query.restaurant_id) filter.restaurant_id = query.restaurant_id;

    if (query.status === 'ACTIVE') {
      filter.is_active = true;
      filter.$or = [{ valid_until: null }, { valid_until: { $gte: new Date() } }];
    } else if (query.status === 'INACTIVE') {
      filter.is_active = false;
    } else if (query.status === 'EXPIRED') {
      filter.valid_until = { $lt: new Date() };
    }

    const [data, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('restaurant_id', 'name slug')
        .exec(),
      Coupon.countDocuments(filter),
    ]);

    return { data, total };
  }

  async updateCoupon(id: string, data: Partial<ICoupon>): Promise<ICoupon | null> {
    return Coupon.findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate('restaurant_id', 'name slug')
      .exec();
  }

  async deleteCoupon(id: string): Promise<ICoupon | null> {
    return Coupon.findByIdAndDelete(id).exec();
  }

  async incrementCouponUsage(couponId: string): Promise<void> {
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usage_count: 1 } }).exec();
  }

  // ===========================================================================
  // Coupon Usage
  // ===========================================================================

  async createCouponUsage(data: Partial<ICouponUsage>): Promise<ICouponUsage> {
    return CouponUsage.create(data);
  }

  async countUserCouponUsage(couponId: string, userId: string): Promise<number> {
    return CouponUsage.countDocuments({ coupon_id: couponId, user_id: userId });
  }

  // ===========================================================================
  // Stamp Cards
  // ===========================================================================

  async createStampCard(data: Partial<IStampCard>): Promise<IStampCard> {
    return StampCard.create(data);
  }

  async findStampCardById(id: string): Promise<IStampCard | null> {
    return StampCard.findById(id).populate('restaurant_id', 'name slug').exec();
  }

  async findStampCardsByRestaurant(
    query: StampCardQueryDto
  ): Promise<{ data: IStampCard[]; total: number }> {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.restaurant_id) filter.restaurant_id = query.restaurant_id;
    if (query.is_active !== undefined) filter.is_active = query.is_active === 'true';

    const [data, total] = await Promise.all([
      StampCard.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('restaurant_id', 'name slug')
        .exec(),
      StampCard.countDocuments(filter),
    ]);

    return { data, total };
  }

  async updateStampCard(id: string, data: Partial<IStampCard>): Promise<IStampCard | null> {
    return StampCard.findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate('restaurant_id', 'name slug')
      .exec();
  }

  async deleteStampCard(id: string): Promise<IStampCard | null> {
    return StampCard.findByIdAndDelete(id).exec();
  }

  // ===========================================================================
  // User Stamp Progress
  // ===========================================================================

  async findUserStampProgress(
    stampCardId: string,
    userId: string
  ): Promise<IUserStampProgress | null> {
    return UserStampProgress.findOne({ stamp_card_id: stampCardId, user_id: userId })
      .populate('stamp_card_id', 'name stamps_required reward_description reward_type reward_value')
      .populate('restaurant_id', 'name slug')
      .exec();
  }

  async findUserStampProgressByUser(userId: string): Promise<IUserStampProgress[]> {
    return UserStampProgress.find({ user_id: userId })
      .populate('stamp_card_id', 'name stamps_required reward_description reward_type reward_value')
      .populate('restaurant_id', 'name slug')
      .sort({ updated_at: -1 })
      .exec();
  }

  async createOrUpdateStampProgress(
    stampCardId: string,
    userId: string,
    restaurantId: string,
    orderId: string,
    stampsRequired: number
  ): Promise<IUserStampProgress> {
    let progress = await UserStampProgress.findOne({
      stamp_card_id: stampCardId,
      user_id: userId,
    }).exec();

    if (!progress) {
      progress = await UserStampProgress.create({
        stamp_card_id: stampCardId,
        user_id: userId,
        restaurant_id: restaurantId,
        stamps_collected: 1,
        is_complete: 1 >= stampsRequired,
        reward_redeemed: false,
        order_ids: [orderId],
      });
    } else {
      progress.stamps_collected += 1;
      progress.order_ids.push(orderId as unknown as Schema.Types.ObjectId);
      progress.is_complete = progress.stamps_collected >= stampsRequired;
      await progress.save();
    }

    return progress;
  }

  async redeemStampReward(progressId: string): Promise<IUserStampProgress | null> {
    return UserStampProgress.findByIdAndUpdate(
      progressId,
      { reward_redeemed: true },
      { returnDocument: 'after' }
    ).exec();
  }
}
