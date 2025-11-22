import { Request, Response } from 'express';
import { cuisineService } from './cuisine.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import type { SupportedLanguage, CuisineQueryDto } from './cuisine.types.js';

/**
 * Cuisine Controller
 */
export const cuisineController = {
  /**
   * GET / — List all cuisines
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;

    const query: CuisineQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || 'slug',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
      lang,
    };

    if (req.query.is_active !== undefined) {
      query.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      query.search = req.query.search as string;
    }

    const result = await cuisineService.getAllCuisines(query);
    sendPaginatedResponse(
      res,
      200,
      'Cuisines retrieved successfully',
      result.data,
      result.pagination
    );
  }),

  /**
   * GET /:id — Get cuisine by ID
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const cuisine = await cuisineService.getCuisineById(req.params.id, lang);
    sendSuccessResponse(res, 200, 'Cuisine retrieved successfully', cuisine);
  }),

  /**
   * GET /slug/:slug — Get cuisine by slug
   */
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const cuisine = await cuisineService.getCuisineBySlug(req.params.slug, lang);
    sendSuccessResponse(res, 200, 'Cuisine retrieved successfully', cuisine);
  }),

  /**
   * POST / — Create a new cuisine (Admin)
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const cuisine = await cuisineService.createCuisine(req.body, lang);
    sendSuccessResponse(res, 201, 'Cuisine created successfully', cuisine);
  }),

  /**
   * PUT /:id — Update a cuisine (Admin)
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const cuisine = await cuisineService.updateCuisine(req.params.id, req.body, lang);
    sendSuccessResponse(res, 200, 'Cuisine updated successfully', cuisine);
  }),

  /**
   * DELETE /:id — Delete a cuisine (Admin)
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await cuisineService.deleteCuisine(req.params.id);
    sendSuccessResponse(res, 200, 'Cuisine deleted successfully');
  }),
};
