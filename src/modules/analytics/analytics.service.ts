import { AnalyticsRepository } from './analytics.repository.js';
import { Restaurant } from '../restaurant/restaurant.model.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { DatePreset, AnalyticsPeriod, ANALYTICS_CONSTANTS } from './analytics.types.js';
import type {
  DateRange,
  AnalyticsDateQueryDto,
  RevenueTimeSeriesQueryDto,
  TopItemsQueryDto,
  RestaurantDashboardResponseDto,
  PlatformDashboardResponseDto,
  RevenueTimeSeriesPoint,
  TopItemResponseDto,
  TopRestaurantResponseDto,
} from './analytics.types.js';

/**
 * Analytics Service
 *
 * Business logic for analytics dashboards. Assembles data from
 * the repository's aggregation queries into structured responses.
 */
export class AnalyticsService {
  constructor(private analyticsRepository: AnalyticsRepository) {}

  // ==========================================================================
  // RESTAURANT DASHBOARD
  // ==========================================================================

  /**
   * Get the full restaurant dashboard.
   */
  async getRestaurantDashboard(
    restaurantId: string,
    ownerId: string,
    query: AnalyticsDateQueryDto
  ): Promise<RestaurantDashboardResponseDto> {
    // Verify restaurant exists and user is the owner
    const restaurant = await Restaurant.findById(restaurantId)
      .select('owner_id rating review_count')
      .lean()
      .exec();

    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }

    if (restaurant.owner_id?.toString() !== ownerId) {
      throw NotFoundError('Restaurant not found');
    }

    const dateRange = this.resolveDateRange(query);

    const [overview, statusBreakdown, typeBreakdown, paymentBreakdown] = await Promise.all([
      this.analyticsRepository.getRestaurantOrderOverview(restaurantId, dateRange),
      this.analyticsRepository.getRestaurantOrderStatusBreakdown(restaurantId, dateRange),
      this.analyticsRepository.getRestaurantOrderTypeBreakdown(restaurantId, dateRange),
      this.analyticsRepository.getRestaurantPaymentMethodBreakdown(restaurantId, dateRange),
    ]);

    return {
      restaurant_id: restaurantId,
      date_range: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      overview: {
        ...overview,
        avg_rating: restaurant.rating || 0,
        review_count: restaurant.review_count || 0,
      },
      order_status_breakdown: statusBreakdown,
      order_type_breakdown: typeBreakdown,
      payment_method_breakdown: paymentBreakdown,
    };
  }

  /**
   * Get restaurant revenue time series.
   */
  async getRestaurantRevenue(
    restaurantId: string,
    ownerId: string,
    query: RevenueTimeSeriesQueryDto
  ): Promise<RevenueTimeSeriesPoint[]> {
    await this.verifyRestaurantOwnership(restaurantId, ownerId);

    const dateRange = this.resolveDateRange(query);
    const period = (query.period as AnalyticsPeriod) || AnalyticsPeriod.DAILY;

    return this.analyticsRepository.getRestaurantRevenueTimeSeries(restaurantId, dateRange, period);
  }

  /**
   * Get top-ordered items for a restaurant.
   */
  async getRestaurantTopItems(
    restaurantId: string,
    ownerId: string,
    query: TopItemsQueryDto
  ): Promise<TopItemResponseDto[]> {
    await this.verifyRestaurantOwnership(restaurantId, ownerId);

    const dateRange = this.resolveDateRange(query);
    const limit = query.limit
      ? parseInt(query.limit, 10)
      : ANALYTICS_CONSTANTS.DEFAULT_TOP_ITEMS_LIMIT;

    return this.analyticsRepository.getRestaurantTopItems(restaurantId, dateRange, limit);
  }

  // ==========================================================================
  // PLATFORM DASHBOARD (Admin)
  // ==========================================================================

  /**
   * Get the full platform admin dashboard.
   */
  async getPlatformDashboard(query: AnalyticsDateQueryDto): Promise<PlatformDashboardResponseDto> {
    const dateRange = this.resolveDateRange(query);

    const [
      orderOverview,
      statusBreakdown,
      typeBreakdown,
      paymentBreakdown,
      restaurantStatusBreakdown,
      restaurantCounts,
      userCounts,
    ] = await Promise.all([
      this.analyticsRepository.getPlatformOrderOverview(dateRange),
      this.analyticsRepository.getPlatformOrderStatusBreakdown(dateRange),
      this.analyticsRepository.getPlatformOrderTypeBreakdown(dateRange),
      this.analyticsRepository.getPlatformPaymentMethodBreakdown(dateRange),
      this.analyticsRepository.getRestaurantStatusBreakdown(),
      this.analyticsRepository.getRestaurantCounts(),
      this.analyticsRepository.getUserCounts(dateRange),
    ]);

    return {
      date_range: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      overview: {
        ...orderOverview,
        total_restaurants: restaurantCounts.total,
        active_restaurants: restaurantCounts.active,
        new_users_period: userCounts.new_in_period,
        total_users: userCounts.total,
      },
      order_status_breakdown: statusBreakdown,
      order_type_breakdown: typeBreakdown,
      payment_method_breakdown: paymentBreakdown,
      restaurant_status_breakdown: restaurantStatusBreakdown,
    };
  }

  /**
   * Get platform-wide revenue time series.
   */
  async getPlatformRevenue(query: RevenueTimeSeriesQueryDto): Promise<RevenueTimeSeriesPoint[]> {
    const dateRange = this.resolveDateRange(query);
    const period = (query.period as AnalyticsPeriod) || AnalyticsPeriod.DAILY;

    return this.analyticsRepository.getPlatformRevenueTimeSeries(dateRange, period);
  }

  /**
   * Get top restaurants by revenue.
   */
  async getTopRestaurants(query: TopItemsQueryDto): Promise<TopRestaurantResponseDto[]> {
    const dateRange = this.resolveDateRange(query);
    const limit = query.limit
      ? parseInt(query.limit, 10)
      : ANALYTICS_CONSTANTS.DEFAULT_TOP_RESTAURANTS_LIMIT;

    return this.analyticsRepository.getTopRestaurants(dateRange, limit);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Resolve date range from query params. Priority: preset > from/to > default (last 30 days).
   */
  private resolveDateRange(query: AnalyticsDateQueryDto): DateRange {
    const now = new Date();

    // Custom from/to takes precedence if no preset
    if (!query.preset && query.from) {
      const from = new Date(query.from);
      from.setUTCHours(0, 0, 0, 0);
      const to = query.to ? new Date(query.to) : new Date(now);
      to.setUTCHours(23, 59, 59, 999);
      return { from, to };
    }

    const preset = (query.preset as DatePreset) || DatePreset.LAST_30_DAYS;

    switch (preset) {
      case DatePreset.TODAY: {
        const from = new Date(now);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.YESTERDAY: {
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - 1);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.THIS_WEEK: {
        const from = new Date(now);
        const dayOfWeek = from.getUTCDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
        from.setUTCDate(from.getUTCDate() - diff);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.THIS_MONTH: {
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.LAST_7_DAYS: {
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - 7);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.LAST_30_DAYS: {
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - 30);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.LAST_90_DAYS: {
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - 90);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      case DatePreset.THIS_YEAR: {
        const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
      default: {
        // Default: last 30 days
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - 30);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        return { from, to };
      }
    }
  }

  /**
   * Verify restaurant exists and is owned by the given user.
   */
  private async verifyRestaurantOwnership(restaurantId: string, ownerId: string): Promise<void> {
    const restaurant = await Restaurant.findById(restaurantId).select('owner_id').lean().exec();

    if (!restaurant || restaurant.owner_id?.toString() !== ownerId) {
      throw NotFoundError('Restaurant not found');
    }
  }
}
