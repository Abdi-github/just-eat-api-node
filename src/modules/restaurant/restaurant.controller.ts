import { Request, Response } from 'express';
import { restaurantService } from './restaurant.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import { cloudinaryService, CLOUDINARY_FOLDERS } from '../../shared/services/cloudinary.service.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import type { SupportedLanguage, RestaurantQueryDto, RestaurantCursorQueryDto } from './restaurant.types.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Restaurant Controller
 */
export const restaurantController = {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * GET / — List restaurants (public, shows PUBLISHED + active)
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;

    const query: RestaurantQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-rating',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
      lang,
    };

    if (req.query.city_id) query.city_id = req.query.city_id as string;
    if (req.query.canton_id) query.canton_id = req.query.canton_id as string;
    if (req.query.cuisine_id) query.cuisine_id = req.query.cuisine_id as string;
    if (req.query.brand_id) query.brand_id = req.query.brand_id as string;
    if (req.query.postal_code) query.postal_code = req.query.postal_code as string;
    if (req.query.min_rating) query.min_rating = parseFloat(req.query.min_rating as string);
    if (req.query.search) query.search = req.query.search as string;

    const result = await restaurantService.getAllRestaurants(query, lang || 'de');
    sendPaginatedResponse(
      res,
      200,
      'Restaurants retrieved successfully',
      result.data,
      result.pagination
    );
  }),

  /**
   * GET /cursor — List restaurants with cursor-based pagination (public)
   */
  getAllCursor: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));

    const query: RestaurantCursorQueryDto = {
      limit,
      cursor: req.query.cursor as string | undefined,
      direction: (req.query.direction as 'next' | 'prev') || 'next',
      sort: (req.query.sort as string) || '-rating',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
      lang,
    };

    if (req.query.city_id) query.city_id = req.query.city_id as string;
    if (req.query.canton_id) query.canton_id = req.query.canton_id as string;
    if (req.query.cuisine_id) query.cuisine_id = req.query.cuisine_id as string;
    if (req.query.brand_id) query.brand_id = req.query.brand_id as string;
    if (req.query.postal_code) query.postal_code = req.query.postal_code as string;
    if (req.query.min_rating) query.min_rating = parseFloat(req.query.min_rating as string);
    if (req.query.search) query.search = req.query.search as string;

    const result = await restaurantService.getAllRestaurantsCursor(query, lang || 'de');

    sendSuccessResponse(res, 200, 'Restaurants retrieved successfully', {
      restaurants: result.data,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }),

  /**
   * GET /:id — Get restaurant by ID
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const restaurant = await restaurantService.getRestaurantById(req.params.id, lang || 'de');
    sendSuccessResponse(res, 200, 'Restaurant retrieved successfully', restaurant);
  }),

  /**
   * GET /slug/:slug — Get restaurant by slug
   */
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug, lang || 'de');
    sendSuccessResponse(res, 200, 'Restaurant retrieved successfully', restaurant);
  }),

  // ==================== OWNER ENDPOINTS ====================

  /**
   * POST / — Create a new restaurant (owner, starts as DRAFT)
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const restaurant = await restaurantService.createRestaurant(req.body, user.id);
    sendSuccessResponse(res, 201, 'Restaurant created successfully', restaurant);
  }),

  /**
   * PUT /:id — Update own restaurant
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const restaurant = await restaurantService.updateRestaurant(
      req.params.id,
      req.body,
      user.id,
      false
    );
    sendSuccessResponse(res, 200, 'Restaurant updated successfully', restaurant);
  }),

  /**
   * GET /my — List restaurants owned by the logged-in user
   */
  getMyRestaurants: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const restaurants = await restaurantService.getMyRestaurants(user.id, lang || 'de');
    sendSuccessResponse(res, 200, 'My restaurants retrieved successfully', restaurants);
  }),

  /**
   * PATCH /:id/toggle-active — Toggle restaurant active status (owner)
   */
  toggleActive: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { is_active } = req.body;
    const restaurant = await restaurantService.toggleMyRestaurantActive(
      req.params.id,
      is_active,
      user.id
    );
    sendSuccessResponse(res, 200, 'Restaurant active status updated', restaurant);
  }),

  // ==================== IMAGE UPLOAD ENDPOINTS ====================

  /**
   * POST /:id/logo — Upload restaurant logo
   */
  uploadLogo: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    if (!req.file) throw BadRequestError('Logo image file is required');

    const result = await restaurantService.uploadRestaurantImage(
      req.params.id,
      user.id,
      req.file.buffer,
      req.file.originalname,
      'logo'
    );
    sendSuccessResponse(res, 200, 'Restaurant logo uploaded successfully', result);
  }),

  /**
   * POST /:id/cover-image — Upload restaurant cover image
   */
  uploadCoverImage: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    if (!req.file) throw BadRequestError('Cover image file is required');

    const result = await restaurantService.uploadRestaurantImage(
      req.params.id,
      user.id,
      req.file.buffer,
      req.file.originalname,
      'cover'
    );
    sendSuccessResponse(res, 200, 'Restaurant cover image uploaded successfully', result);
  }),

  /**
   * DELETE /:id/logo — Remove restaurant logo
   */
  deleteLogo: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    await restaurantService.deleteRestaurantImage(req.params.id, user.id, 'logo');
    sendSuccessResponse(res, 200, 'Restaurant logo deleted successfully');
  }),

  /**
   * DELETE /:id/cover-image — Remove restaurant cover image
   */
  deleteCoverImage: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    await restaurantService.deleteRestaurantImage(req.params.id, user.id, 'cover');
    sendSuccessResponse(res, 200, 'Restaurant cover image deleted successfully');
  }),

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * GET /admin — List all restaurants (admin, no filtering defaults)
   */
  adminGetAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;

    const query: RestaurantQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-created_at',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
      lang,
    };

    if (req.query.status) query.status = req.query.status as RestaurantQueryDto['status'];
    if (req.query.city_id) query.city_id = req.query.city_id as string;
    if (req.query.canton_id) query.canton_id = req.query.canton_id as string;
    if (req.query.cuisine_id) query.cuisine_id = req.query.cuisine_id as string;
    if (req.query.brand_id) query.brand_id = req.query.brand_id as string;
    if (req.query.postal_code) query.postal_code = req.query.postal_code as string;
    if (req.query.min_rating) query.min_rating = parseFloat(req.query.min_rating as string);
    if (req.query.search) query.search = req.query.search as string;
    if (req.query.is_active !== undefined) query.is_active = req.query.is_active === 'true';

    const result = await restaurantService.getAllRestaurantsAdmin(query, lang || 'de');
    sendPaginatedResponse(
      res,
      200,
      'Restaurants retrieved successfully',
      result.data,
      result.pagination
    );
  }),

  /**
   * GET /admin/:id — Get restaurant by ID (admin — includes all statuses)
   */
  adminGetById: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const restaurant = await restaurantService.getRestaurantById(req.params.id, lang || 'de');
    sendSuccessResponse(res, 200, 'Restaurant retrieved successfully', restaurant);
  }),

  /**
   * PUT /admin/:id — Update any restaurant (admin)
   */
  adminUpdate: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const restaurant = await restaurantService.updateRestaurant(
      req.params.id,
      req.body,
      user.id,
      true // isAdmin
    );
    sendSuccessResponse(res, 200, 'Restaurant updated successfully', restaurant);
  }),

  /**
   * PATCH /admin/:id/status — Change restaurant status (admin workflow)
   */
  changeStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const restaurant = await restaurantService.changeRestaurantStatus(
      req.params.id,
      req.body,
      user.id
    );
    sendSuccessResponse(res, 200, 'Restaurant status updated successfully', restaurant);
  }),

  /**
   * GET /admin/pending — Get restaurants pending approval
   */
  getPendingApprovals: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const result = await restaurantService.getPendingApprovals(page, limit, lang || 'de');
    sendPaginatedResponse(
      res,
      200,
      'Pending restaurants retrieved successfully',
      result.data,
      result.pagination
    );
  }),

  /**
   * DELETE /admin/:id — Delete a restaurant (admin)
   */
  adminDelete: asyncHandler(async (req: Request, res: Response) => {
    await restaurantService.deleteRestaurant(req.params.id);
    sendSuccessResponse(res, 200, 'Restaurant deleted successfully');
  }),
};
