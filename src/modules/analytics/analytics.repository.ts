import mongoose from 'mongoose';
import { Order } from '../order/order.model.js';
import { Restaurant } from '../restaurant/restaurant.model.js';
import { User } from '../user/user.model.js';
import type {
  DateRange,
  OrderStatusBreakdown,
  OrderTypeBreakdown,
  PaymentMethodBreakdown,
  RestaurantStatusBreakdown,
  RevenueTimeSeriesPoint,
  TopItemResponseDto,
  TopRestaurantResponseDto,
} from './analytics.types.js';
import { AnalyticsPeriod } from './analytics.types.js';

/**
 * Analytics Repository
 *
 * Pure data access layer using MongoDB aggregation pipelines.
 * All queries are read-only — no mutations.
 *
 * NOTE: Date fields from seed data are stored as ISO strings (not Date objects)
 * because the seed script uses raw insertMany. All aggregation pipelines
 * start with a date conversion stage (`$convert`) to handle both formats.
 */
export class AnalyticsRepository {
  // ==========================================================================
  // RESTAURANT-SCOPED AGGREGATIONS
  // ==========================================================================

  /**
   * Get order overview stats for a specific restaurant.
   */
  async getRestaurantOrderOverview(
    restaurantId: string,
    dateRange: DateRange
  ): Promise<{
    total_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    avg_order_value: number;
  }> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          restaurant_id: new mongoose.Types.ObjectId(restaurantId),
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          delivered: [
            { $match: { status: 'DELIVERED' } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: '$total' },
              },
            },
          ],
          cancelled: [
            { $match: { status: { $in: ['CANCELLED', 'REJECTED'] } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const facets = result[0] || {};
    const total = facets.total?.[0]?.count || 0;
    const delivered = facets.delivered?.[0] || { count: 0, revenue: 0 };
    const cancelled = facets.cancelled?.[0]?.count || 0;

    return {
      total_orders: total,
      delivered_orders: delivered.count,
      cancelled_orders: cancelled,
      total_revenue: Math.round(delivered.revenue * 100) / 100,
      avg_order_value:
        delivered.count > 0 ? Math.round((delivered.revenue / delivered.count) * 100) / 100 : 0,
    };
  }

  /**
   * Get order status breakdown for a restaurant.
   */
  async getRestaurantOrderStatusBreakdown(
    restaurantId: string,
    dateRange: DateRange
  ): Promise<OrderStatusBreakdown> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          restaurant_id: new mongoose.Types.ObjectId(restaurantId),
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const breakdown: OrderStatusBreakdown = {
      PLACED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      PREPARING: 0,
      READY: 0,
      PICKED_UP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof OrderStatusBreakdown] = row.count;
      }
    }

    return breakdown;
  }

  /**
   * Get order type breakdown (delivery vs pickup) for a restaurant.
   */
  async getRestaurantOrderTypeBreakdown(
    restaurantId: string,
    dateRange: DateRange
  ): Promise<OrderTypeBreakdown> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          restaurant_id: new mongoose.Types.ObjectId(restaurantId),
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $group: { _id: '$order_type', count: { $sum: 1 } } },
    ]);

    const breakdown: OrderTypeBreakdown = { delivery: 0, pickup: 0 };
    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof OrderTypeBreakdown] = row.count;
      }
    }
    return breakdown;
  }

  /**
   * Get payment method breakdown for a restaurant.
   */
  async getRestaurantPaymentMethodBreakdown(
    restaurantId: string,
    dateRange: DateRange
  ): Promise<PaymentMethodBreakdown> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          restaurant_id: new mongoose.Types.ObjectId(restaurantId),
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $group: { _id: '$payment_method', count: { $sum: 1 } } },
    ]);

    const breakdown: PaymentMethodBreakdown = {
      card: 0,
      twint: 0,
      postfinance: 0,
      cash: 0,
    };
    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof PaymentMethodBreakdown] = row.count;
      }
    }
    return breakdown;
  }

  /**
   * Get revenue time series for a restaurant (DELIVERED orders only).
   */
  async getRestaurantRevenueTimeSeries(
    restaurantId: string,
    dateRange: DateRange,
    period: AnalyticsPeriod
  ): Promise<RevenueTimeSeriesPoint[]> {
    const dateGroupExpr = this.getDateGroupExpression(period);

    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          restaurant_id: new mongoose.Types.ObjectId(restaurantId),
          status: 'DELIVERED',
          _delivered_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $group: {
          _id: dateGroupExpr,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((row) => ({
      date: row._id,
      revenue: Math.round(row.revenue * 100) / 100,
      orders: row.orders,
    }));
  }

  /**
   * Get top-ordered items for a restaurant (by quantity).
   */
  async getRestaurantTopItems(
    restaurantId: string,
    dateRange: DateRange,
    limit: number
  ): Promise<TopItemResponseDto[]> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          restaurant_id: new mongoose.Types.ObjectId(restaurantId),
          status: 'DELIVERED',
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menu_item_id',
          name: { $first: '$items.name' },
          total_ordered: { $sum: '$items.quantity' },
          total_revenue: { $sum: '$items.total_price' },
        },
      },
      { $sort: { total_ordered: -1 } },
      { $limit: limit },
    ]);

    return result.map((row) => ({
      menu_item_id: row._id?.toString() || 'unknown',
      name: row.name || 'Unknown item',
      total_ordered: row.total_ordered,
      total_revenue: Math.round(row.total_revenue * 100) / 100,
    }));
  }

  // ==========================================================================
  // PLATFORM-WIDE AGGREGATIONS
  // ==========================================================================

  /**
   * Get platform-wide order overview stats.
   */
  async getPlatformOrderOverview(dateRange: DateRange): Promise<{
    total_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    avg_order_value: number;
  }> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          delivered: [
            { $match: { status: 'DELIVERED' } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: '$total' },
              },
            },
          ],
          cancelled: [
            { $match: { status: { $in: ['CANCELLED', 'REJECTED'] } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const facets = result[0] || {};
    const total = facets.total?.[0]?.count || 0;
    const delivered = facets.delivered?.[0] || { count: 0, revenue: 0 };
    const cancelled = facets.cancelled?.[0]?.count || 0;

    return {
      total_orders: total,
      delivered_orders: delivered.count,
      cancelled_orders: cancelled,
      total_revenue: Math.round(delivered.revenue * 100) / 100,
      avg_order_value:
        delivered.count > 0 ? Math.round((delivered.revenue / delivered.count) * 100) / 100 : 0,
    };
  }

  /**
   * Get platform-wide order status breakdown.
   */
  async getPlatformOrderStatusBreakdown(dateRange: DateRange): Promise<OrderStatusBreakdown> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const breakdown: OrderStatusBreakdown = {
      PLACED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      PREPARING: 0,
      READY: 0,
      PICKED_UP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof OrderStatusBreakdown] = row.count;
      }
    }
    return breakdown;
  }

  /**
   * Get platform-wide order type breakdown.
   */
  async getPlatformOrderTypeBreakdown(dateRange: DateRange): Promise<OrderTypeBreakdown> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $group: { _id: '$order_type', count: { $sum: 1 } } },
    ]);

    const breakdown: OrderTypeBreakdown = { delivery: 0, pickup: 0 };
    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof OrderTypeBreakdown] = row.count;
      }
    }
    return breakdown;
  }

  /**
   * Get platform-wide payment method breakdown.
   */
  async getPlatformPaymentMethodBreakdown(dateRange: DateRange): Promise<PaymentMethodBreakdown> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      { $group: { _id: '$payment_method', count: { $sum: 1 } } },
    ]);

    const breakdown: PaymentMethodBreakdown = {
      card: 0,
      twint: 0,
      postfinance: 0,
      cash: 0,
    };
    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof PaymentMethodBreakdown] = row.count;
      }
    }
    return breakdown;
  }

  /**
   * Get restaurant status breakdown (platform-wide).
   */
  async getRestaurantStatusBreakdown(): Promise<RestaurantStatusBreakdown> {
    const result = await Restaurant.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    const breakdown: RestaurantStatusBreakdown = {
      DRAFT: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      SUSPENDED: 0,
      ARCHIVED: 0,
    };

    for (const row of result) {
      if (row._id in breakdown) {
        breakdown[row._id as keyof RestaurantStatusBreakdown] = row.count;
      }
    }
    return breakdown;
  }

  /**
   * Get restaurant counts (total + active).
   */
  async getRestaurantCounts(): Promise<{
    total: number;
    active: number;
  }> {
    const [total, active] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({
        status: 'PUBLISHED',
        is_active: { $ne: false },
      }),
    ]);

    return { total, active };
  }

  /**
   * Get user counts (total + new in date range).
   * Uses aggregation with $toDate to handle string dates from seed data.
   */
  async getUserCounts(dateRange: DateRange): Promise<{
    total: number;
    new_in_period: number;
  }> {
    const [total, newResult] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        {
          $addFields: {
            _created_date: {
              $convert: {
                input: '$created_at',
                to: 'date',
                onError: '$created_at',
                onNull: null,
              },
            },
          },
        },
        {
          $match: {
            _created_date: { $gte: dateRange.from, $lte: dateRange.to },
          },
        },
        { $count: 'count' },
      ]),
    ]);

    return {
      total,
      new_in_period: newResult[0]?.count || 0,
    };
  }

  /**
   * Get platform-wide revenue time series (DELIVERED orders).
   */
  async getPlatformRevenueTimeSeries(
    dateRange: DateRange,
    period: AnalyticsPeriod
  ): Promise<RevenueTimeSeriesPoint[]> {
    const dateGroupExpr = this.getDateGroupExpression(period);

    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          status: 'DELIVERED',
          _delivered_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $group: {
          _id: dateGroupExpr,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((row) => ({
      date: row._id,
      revenue: Math.round(row.revenue * 100) / 100,
      orders: row.orders,
    }));
  }

  /**
   * Get top restaurants by total revenue (DELIVERED orders).
   */
  async getTopRestaurants(
    dateRange: DateRange,
    limit: number
  ): Promise<TopRestaurantResponseDto[]> {
    const result = await Order.aggregate([
      this.dateConversionStage(),
      {
        $match: {
          status: 'DELIVERED',
          _created_date: { $gte: dateRange.from, $lte: dateRange.to },
        },
      },
      {
        $group: {
          _id: '$restaurant_id',
          total_orders: { $sum: 1 },
          total_revenue: { $sum: '$total' },
        },
      },
      { $sort: { total_revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          restaurant_id: '$_id',
          name: { $ifNull: ['$restaurant.name', 'Unknown'] },
          slug: { $ifNull: ['$restaurant.slug', 'unknown'] },
          total_orders: 1,
          total_revenue: 1,
          avg_order_value: {
            $cond: [
              { $gt: ['$total_orders', 0] },
              { $divide: ['$total_revenue', '$total_orders'] },
              0,
            ],
          },
        },
      },
    ]);

    return result.map((row) => ({
      restaurant_id: row.restaurant_id?.toString() || 'unknown',
      name: row.name,
      slug: row.slug,
      total_orders: row.total_orders,
      total_revenue: Math.round(row.total_revenue * 100) / 100,
      avg_order_value: Math.round(row.avg_order_value * 100) / 100,
    }));
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Build a pipeline stage that converts string dates to Date objects.
   *
   * Seed data stores dates as ISO strings (raw insertMany bypasses Mongoose).
   * API-created documents have proper Date objects. $convert handles both:
   * - String → Date (parsed)
   * - Date → Date (no-op)
   * - null/missing → null (via onNull)
   *
   * Uses `_created_date` and `_delivered_date` temporary fields to avoid
   * overwriting the original fields.
   */
  private dateConversionStage(): Record<string, unknown> {
    return {
      $addFields: {
        _created_date: {
          $convert: {
            input: '$created_at',
            to: 'date',
            onError: '$created_at',
            onNull: null,
          },
        },
        _delivered_date: {
          $convert: {
            input: '$delivered_at',
            to: 'date',
            onError: '$delivered_at',
            onNull: null,
          },
        },
      },
    };
  }

  /**
   * Build a MongoDB date group expression based on period.
   * Uses `_delivered_date` (converted) for date formatting.
   */
  private getDateGroupExpression(period: AnalyticsPeriod): Record<string, unknown> {
    switch (period) {
      case AnalyticsPeriod.DAILY:
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$_delivered_date' },
        };
      case AnalyticsPeriod.WEEKLY:
        return {
          $dateToString: { format: '%G-W%V', date: '$_delivered_date' },
        };
      case AnalyticsPeriod.MONTHLY:
        return {
          $dateToString: { format: '%Y-%m', date: '$_delivered_date' },
        };
      default:
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$_delivered_date' },
        };
    }
  }
}
