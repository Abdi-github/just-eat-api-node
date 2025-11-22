import { Request, Response } from 'express';
import { brandService } from './brand.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import type { BrandQueryDto } from './brand.types.js';

/**
 * Brand Controller
 */
export const brandController = {
  /**
   * GET / — List all brands
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);

    const query: BrandQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || 'name',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
    };

    if (req.query.is_active !== undefined) {
      query.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      query.search = req.query.search as string;
    }

    const result = await brandService.getAllBrands(query);
    sendPaginatedResponse(
      res,
      200,
      'Brands retrieved successfully',
      result.data,
      result.pagination
    );
  }),

  /**
   * GET /:id — Get brand by ID
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.getBrandById(req.params.id);
    sendSuccessResponse(res, 200, 'Brand retrieved successfully', brand);
  }),

  /**
   * GET /slug/:slug — Get brand by slug
   */
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.getBrandBySlug(req.params.slug);
    sendSuccessResponse(res, 200, 'Brand retrieved successfully', brand);
  }),

  /**
   * POST / — Create a new brand (Admin)
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.createBrand(req.body);
    sendSuccessResponse(res, 201, 'Brand created successfully', brand);
  }),

  /**
   * PUT /:id — Update a brand (Admin)
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'Brand updated successfully', brand);
  }),

  /**
   * DELETE /:id — Delete a brand (Admin)
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await brandService.deleteBrand(req.params.id);
    sendSuccessResponse(res, 200, 'Brand deleted successfully');
  }),

  // ==================== IMAGE UPLOAD ENDPOINTS ====================

  /**
   * POST /:id/logo — Upload brand logo
   */
  uploadLogo: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw BadRequestError('Logo image file is required');

    const result = await brandService.uploadBrandLogo(
      req.params.id,
      req.file.buffer,
      req.file.originalname
    );
    sendSuccessResponse(res, 200, 'Brand logo uploaded successfully', result);
  }),

  /**
   * DELETE /:id/logo — Remove brand logo
   */
  deleteLogo: asyncHandler(async (req: Request, res: Response) => {
    await brandService.deleteBrandLogo(req.params.id);
    sendSuccessResponse(res, 200, 'Brand logo deleted successfully');
  }),
};
