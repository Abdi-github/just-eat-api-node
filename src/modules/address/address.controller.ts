import { Request, Response } from 'express';
import { addressService } from './address.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import type { AddressQueryDto } from './address.types.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { SupportedLanguage } from '../location/location.types.js';

/**
 * Address Controller
 * Thin controller — delegates all logic to AddressService
 */
export const addressController = {
  /**
   * GET / — List all addresses for the authenticated user
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const lang = (req as Record<string, unknown>).language as SupportedLanguage;
    const { page, limit } = parsePaginationParams(req.query);

    const query: AddressQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-is_default',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
    };

    const result = await addressService.getMyAddresses(user.id, query, lang);
    sendPaginatedResponse(
      res,
      200,
      'Addresses retrieved successfully',
      result.data,
      result.pagination
    );
  }),

  /**
   * GET /:id — Get address by ID
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const lang = (req as Record<string, unknown>).language as SupportedLanguage;

    const address = await addressService.getAddressById(req.params.id, user.id, lang);
    sendSuccessResponse(res, 200, 'Address retrieved successfully', address);
  }),

  /**
   * POST / — Create a new address
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const lang = (req as Record<string, unknown>).language as SupportedLanguage;

    const address = await addressService.createAddress(user.id, req.body, lang);
    sendSuccessResponse(res, 201, 'Address created successfully', address);
  }),

  /**
   * PUT /:id — Update an address
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const lang = (req as Record<string, unknown>).language as SupportedLanguage;

    const address = await addressService.updateAddress(req.params.id, user.id, req.body, lang);
    sendSuccessResponse(res, 200, 'Address updated successfully', address);
  }),

  /**
   * DELETE /:id — Delete an address
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;

    await addressService.deleteAddress(req.params.id, user.id);
    sendSuccessResponse(res, 200, 'Address deleted successfully');
  }),

  /**
   * PATCH /:id/default — Set address as default
   */
  setDefault: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const lang = (req as Record<string, unknown>).language as SupportedLanguage;

    const address = await addressService.setDefaultAddress(req.params.id, user.id, lang);
    sendSuccessResponse(res, 200, 'Default address updated successfully', address);
  }),
};
