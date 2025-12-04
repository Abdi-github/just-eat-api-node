import { Request, Response } from 'express';
import { FavoriteService } from './favorite.service.js';
import { FavoriteRepository } from './favorite.repository.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  calculatePaginationMeta,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

const favoriteRepository = new FavoriteRepository();
const favoriteService = new FavoriteService(favoriteRepository);

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/public/favorites/toggle
 * Toggle a restaurant in user's favorites (add if not exists, remove if exists)
 */
const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { restaurant_id } = req.body as { restaurant_id: string };

  const result = await favoriteService.toggleFavorite(user.id, restaurant_id);

  const message = result.is_favorited
    ? 'Restaurant added to favorites'
    : 'Restaurant removed from favorites';

  sendSuccessResponse(res, 200, message, result);
});

/**
 * GET /api/v1/public/favorites
 * Get authenticated user's favorites
 */
const getMyFavorites = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { page, limit } = parsePaginationParams(req.query as { page?: string; limit?: string });

  const result = await favoriteService.getUserFavorites(user.id, page, limit);
  const meta = calculatePaginationMeta(page, limit, result.total);

  sendPaginatedResponse(res, 200, 'Favorites retrieved successfully', result.data, meta);
});

/**
 * GET /api/v1/public/favorites/check/:restaurantId
 * Check if a restaurant is in user's favorites
 */
const checkFavorite = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { restaurantId } = req.params;

  const result = await favoriteService.checkFavorite(user.id, restaurantId);

  sendSuccessResponse(res, 200, 'Favorite status retrieved', result);
});

/**
 * DELETE /api/v1/public/favorites/:restaurantId
 * Remove a restaurant from favorites
 */
const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { restaurantId } = req.params;

  await favoriteService.removeFavorite(user.id, restaurantId);

  sendSuccessResponse(res, 200, 'Restaurant removed from favorites');
});

export const favoriteController = {
  toggleFavorite,
  getMyFavorites,
  checkFavorite,
  removeFavorite,
};
