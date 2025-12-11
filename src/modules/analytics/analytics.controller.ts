import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  AnalyticsDateQueryDto,
  RevenueTimeSeriesQueryDto,
  TopItemsQueryDto,
} from './analytics.types.js';

const analyticsRepository = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepository);

// ============================================================================
// RESTAURANT ANALYTICS (Owner)
// ============================================================================

/**
 * GET /api/v1/restaurant/:restaurantId/analytics/dashboard
 * Restaurant dashboard overview
 */
const getRestaurantDashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { restaurantId } = req.params;
  const query = req.query as unknown as AnalyticsDateQueryDto;

  const result = await analyticsService.getRestaurantDashboard(restaurantId, user.id, query);

  sendSuccessResponse(res, 200, 'Restaurant dashboard retrieved successfully', result);
});

/**
 * GET /api/v1/restaurant/:restaurantId/analytics/revenue
 * Restaurant revenue time series
 */
const getRestaurantRevenue = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { restaurantId } = req.params;
  const query = req.query as unknown as RevenueTimeSeriesQueryDto;

  const result = await analyticsService.getRestaurantRevenue(restaurantId, user.id, query);

  sendSuccessResponse(res, 200, 'Restaurant revenue data retrieved successfully', result);
});

/**
 * GET /api/v1/restaurant/:restaurantId/analytics/top-items
 * Restaurant top ordered items
 */
const getRestaurantTopItems = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { restaurantId } = req.params;
  const query = req.query as unknown as TopItemsQueryDto;

  const result = await analyticsService.getRestaurantTopItems(restaurantId, user.id, query);

  sendSuccessResponse(res, 200, 'Top items retrieved successfully', result);
});

// ============================================================================
// PLATFORM ANALYTICS (Admin)
// ============================================================================

/**
 * GET /api/v1/admin/analytics/dashboard
 * Platform admin dashboard overview
 */
const getPlatformDashboard = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as AnalyticsDateQueryDto;

  const result = await analyticsService.getPlatformDashboard(query);

  sendSuccessResponse(res, 200, 'Platform dashboard retrieved successfully', result);
});

/**
 * GET /api/v1/admin/analytics/revenue
 * Platform revenue time series
 */
const getPlatformRevenue = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as RevenueTimeSeriesQueryDto;

  const result = await analyticsService.getPlatformRevenue(query);

  sendSuccessResponse(res, 200, 'Platform revenue data retrieved successfully', result);
});

/**
 * GET /api/v1/admin/analytics/top-restaurants
 * Top restaurants by revenue
 */
const getTopRestaurants = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as TopItemsQueryDto;

  const result = await analyticsService.getTopRestaurants(query);

  sendSuccessResponse(res, 200, 'Top restaurants retrieved successfully', result);
});

// ============================================================================
// EXPORTS
// ============================================================================

export const analyticsController = {
  // Restaurant
  getRestaurantDashboard,
  getRestaurantRevenue,
  getRestaurantTopItems,
  // Platform
  getPlatformDashboard,
  getPlatformRevenue,
  getTopRestaurants,
};
