import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';

import { locationService } from './location.service.js';
import type {
  SupportedLanguage,
  CantonQueryDto,
  CityQueryDto,
  CANTON_SORT_FIELDS,
  CITY_SORT_FIELDS,
} from './location.types.js';

// ============================================================================
// Canton Controller
// ============================================================================

export const cantonController = {
  /**
   * @route   GET /api/v1/locations/cantons
   * @desc    List all cantons with filtering, sorting, and pagination
   * @access  Public
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;

    const query: CantonQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || 'code',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      lang,
    };

    const { data, pagination } = await locationService.getAllCantons(query);

    sendPaginatedResponse(res, 200, 'Cantons retrieved successfully', data, pagination);
  }),

  /**
   * @route   GET /api/v1/locations/cantons/:id
   * @desc    Get canton by ID
   * @access  Public
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const canton = await locationService.getCantonById(req.params.id, lang);

    sendSuccessResponse(res, 200, 'Canton retrieved successfully', canton);
  }),

  /**
   * @route   GET /api/v1/locations/cantons/slug/:slug
   * @desc    Get canton by slug
   * @access  Public
   */
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const canton = await locationService.getCantonBySlug(req.params.slug, lang);

    sendSuccessResponse(res, 200, 'Canton retrieved successfully', canton);
  }),

  /**
   * @route   GET /api/v1/locations/cantons/code/:code
   * @desc    Get canton by code (e.g., ZH, BE)
   * @access  Public
   */
  getByCode: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const canton = await locationService.getCantonByCode(req.params.code.toUpperCase(), lang);

    sendSuccessResponse(res, 200, 'Canton retrieved successfully', canton);
  }),

  /**
   * @route   GET /api/v1/locations/cantons/:id/cities
   * @desc    Get all cities within a canton
   * @access  Public
   */
  getCities: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;

    const query: CityQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || 'slug',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      lang,
    };

    const { data, pagination } = await locationService.getCitiesByCanton(req.params.id, query);

    sendPaginatedResponse(res, 200, 'Cities retrieved successfully', data, pagination);
  }),

  /**
   * @route   POST /api/v1/admin/locations/cantons
   * @desc    Create a canton
   * @access  Admin (locations:create)
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const canton = await locationService.createCanton(req.body, lang);

    sendSuccessResponse(res, 201, 'Canton created successfully', canton);
  }),

  /**
   * @route   PUT /api/v1/admin/locations/cantons/:id
   * @desc    Update a canton
   * @access  Admin (locations:update)
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const canton = await locationService.updateCanton(req.params.id, req.body, lang);

    sendSuccessResponse(res, 200, 'Canton updated successfully', canton);
  }),

  /**
   * @route   DELETE /api/v1/admin/locations/cantons/:id
   * @desc    Delete a canton
   * @access  Admin (locations:delete)
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await locationService.deleteCanton(req.params.id);

    sendSuccessResponse(res, 200, 'Canton deleted successfully');
  }),
};

// ============================================================================
// City Controller
// ============================================================================

export const cityController = {
  /**
   * @route   GET /api/v1/locations/cities
   * @desc    List all cities with filtering, sorting, and pagination
   * @access  Public
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;

    const query: CityQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || 'slug',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
      canton_id: req.query.canton_id as string,
      postal_code: req.query.postal_code
        ? parseInt(req.query.postal_code as string, 10)
        : undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      lang,
    };

    const { data, pagination } = await locationService.getAllCities(query);

    sendPaginatedResponse(res, 200, 'Cities retrieved successfully', data, pagination);
  }),

  /**
   * @route   GET /api/v1/locations/cities/search
   * @desc    Search locations (cantons + cities)
   * @access  Public
   */
  search: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const q = req.query.q as string;

    const results = await locationService.searchLocations(q, lang);

    sendSuccessResponse(res, 200, 'Search results retrieved successfully', results);
  }),

  /**
   * @route   GET /api/v1/locations/cities/postal/:postalCode
   * @desc    Get cities by postal code
   * @access  Public
   */
  getByPostalCode: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const postalCode = parseInt(req.params.postalCode, 10);

    const cities = await locationService.getCitiesByPostalCode(postalCode, lang);

    sendSuccessResponse(res, 200, 'Cities retrieved successfully', cities);
  }),

  /**
   * @route   GET /api/v1/locations/cities/:id
   * @desc    Get city by ID
   * @access  Public
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const city = await locationService.getCityById(req.params.id, lang);

    sendSuccessResponse(res, 200, 'City retrieved successfully', city);
  }),

  /**
   * @route   GET /api/v1/locations/cities/slug/:slug
   * @desc    Get city by slug
   * @access  Public
   */
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const city = await locationService.getCityBySlug(req.params.slug, lang);

    sendSuccessResponse(res, 200, 'City retrieved successfully', city);
  }),

  /**
   * @route   POST /api/v1/admin/locations/cities
   * @desc    Create a city
   * @access  Admin (locations:create)
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const city = await locationService.createCity(req.body, lang);

    sendSuccessResponse(res, 201, 'City created successfully', city);
  }),

  /**
   * @route   PUT /api/v1/admin/locations/cities/:id
   * @desc    Update a city
   * @access  Admin (locations:update)
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const lang = (req as Record<string, unknown>).language as SupportedLanguage | undefined;
    const city = await locationService.updateCity(req.params.id, req.body, lang);

    sendSuccessResponse(res, 200, 'City updated successfully', city);
  }),

  /**
   * @route   DELETE /api/v1/admin/locations/cities/:id
   * @desc    Delete a city
   * @access  Admin (locations:delete)
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await locationService.deleteCity(req.params.id);

    sendSuccessResponse(res, 200, 'City deleted successfully');
  }),
};
