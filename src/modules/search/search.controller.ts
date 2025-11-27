import { Request, Response } from 'express';

import { searchService } from './search.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import type { SupportedLanguage } from './search.types.js';

/**
 * Search Controller
 * Thin controller — delegates all business logic to SearchService
 */
export class SearchController {
  /**
   * GET /search/restaurants
   * Search restaurants with filters, sorting, pagination
   */
  searchRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';

    const { restaurants, pagination } = await searchService.searchRestaurants(
      req.query as Record<string, unknown>,
      lang
    );

    sendPaginatedResponse(res, 200, 'Restaurants retrieved successfully', restaurants, pagination);
  });

  /**
   * GET /search/restaurants/:restaurantId/menu
   * Search menu items within a specific restaurant
   */
  searchMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { restaurantId } = req.params;

    const { items, pagination } = await searchService.searchMenuItems(
      restaurantId,
      req.query as Record<string, unknown>,
      lang
    );

    sendPaginatedResponse(res, 200, 'Menu items retrieved successfully', items, pagination);
  });

  /**
   * GET /search/suggestions
   * Get search suggestions (autocomplete) for restaurants and cuisines
   */
  getSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const q = String(req.query.q || '');
    const limit = req.query.limit ? Number(req.query.limit) : 5;

    const suggestions = await searchService.getSuggestions({ q, limit, lang }, lang);

    sendSuccessResponse(res, 200, 'Search suggestions retrieved successfully', suggestions);
  });
}

// Singleton
export const searchController = new SearchController();
