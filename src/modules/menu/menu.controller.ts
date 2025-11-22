import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import { menuService } from './menu.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  MenuCategoryQueryDto,
  MenuCategoryCreateDto,
  MenuCategoryUpdateDto,
  MenuItemQueryDto,
  MenuItemCreateDto,
  MenuItemUpdateDto,
  SupportedLanguage,
} from './menu.types.js';

/**
 * Menu Controller
 * Thin controller — delegates all logic to MenuService
 */
class MenuController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * GET /api/v1/public/restaurants/:restaurantId/menu
   * Get full menu (categories with nested items)
   */
  getFullMenu = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { restaurantId } = req.params;

    const menu = await menuService.getFullMenu(restaurantId, lang);
    sendSuccessResponse(res, 200, 'Restaurant menu retrieved successfully', menu);
  });

  /**
   * GET /api/v1/public/restaurants/:restaurantId/menu/items
   * Get menu items (flat list, filterable)
   */
  getPublicMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { restaurantId } = req.params;

    const query: MenuItemQueryDto = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort as string | undefined,
      category_id: req.query.category_id as string | undefined,
      is_popular: req.query.is_popular === 'true' ? true : undefined,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      search: req.query.search as string | undefined,
    };

    const result = await menuService.getMenuItems(restaurantId, query, lang);
    sendPaginatedResponse(res, 200, 'Menu items retrieved successfully', result.data, result.meta);
  });

  // ==================== CATEGORY MANAGEMENT (Owner) ====================

  /**
   * GET /api/v1/restaurant/:restaurantId/menu/categories
   * List all categories for a restaurant (owner view)
   */
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { restaurantId } = req.params;

    const query: MenuCategoryQueryDto = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort as string | undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    };

    const result = await menuService.getCategories(restaurantId, query, lang);
    sendPaginatedResponse(
      res,
      200,
      'Menu categories retrieved successfully',
      result.data,
      result.meta
    );
  });

  /**
   * GET /api/v1/restaurant/:restaurantId/menu/categories/:categoryId
   * Get a single category
   */
  getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { categoryId } = req.params;

    const category = await menuService.getCategoryById(categoryId, lang);
    sendSuccessResponse(res, 200, 'Menu category retrieved successfully', category);
  });

  /**
   * POST /api/v1/restaurant/:restaurantId/menu/categories
   * Create a new category
   */
  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId } = req.params;

    const dto: MenuCategoryCreateDto = req.body;
    const category = await menuService.createCategory(restaurantId, user.id, dto, lang);
    sendSuccessResponse(res, 201, 'Menu category created successfully', category);
  });

  /**
   * PUT /api/v1/restaurant/:restaurantId/menu/categories/:categoryId
   * Update a category
   */
  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, categoryId } = req.params;

    const dto: MenuCategoryUpdateDto = req.body;
    const category = await menuService.updateCategory(categoryId, restaurantId, user.id, dto, lang);
    sendSuccessResponse(res, 200, 'Menu category updated successfully', category);
  });

  /**
   * DELETE /api/v1/restaurant/:restaurantId/menu/categories/:categoryId
   * Delete a category and all its items
   */
  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, categoryId } = req.params;

    const result = await menuService.deleteCategory(categoryId, restaurantId, user.id);
    sendSuccessResponse(res, 200, 'Menu category deleted successfully', result);
  });

  /**
   * PATCH /api/v1/restaurant/:restaurantId/menu/categories/reorder
   * Reorder categories
   */
  reorderCategories = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId } = req.params;

    await menuService.reorderCategories(restaurantId, user.id, req.body.order);
    sendSuccessResponse(res, 200, 'Menu categories reordered successfully');
  });

  // ==================== ITEM MANAGEMENT (Owner/Staff) ====================

  /**
   * GET /api/v1/restaurant/:restaurantId/menu/items
   * List all items for a restaurant (owner view — includes unavailable)
   */
  getItems = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { restaurantId } = req.params;

    const query: MenuItemQueryDto = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort as string | undefined,
      category_id: req.query.category_id as string | undefined,
      is_available:
        req.query.is_available !== undefined ? req.query.is_available === 'true' : undefined,
      is_popular: req.query.is_popular === 'true' ? true : undefined,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      search: req.query.search as string | undefined,
    };

    const result = await menuService.getItems(restaurantId, query, lang);
    sendPaginatedResponse(res, 200, 'Menu items retrieved successfully', result.data, result.meta);
  });

  /**
   * GET /api/v1/restaurant/:restaurantId/menu/items/:itemId
   * Get a single item
   */
  getItemById = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const { itemId } = req.params;

    const item = await menuService.getItemById(itemId, lang);
    sendSuccessResponse(res, 200, 'Menu item retrieved successfully', item);
  });

  /**
   * POST /api/v1/restaurant/:restaurantId/menu/items
   * Create a new menu item
   */
  createItem = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId } = req.params;

    const dto: MenuItemCreateDto = req.body;
    const item = await menuService.createItem(restaurantId, user.id, dto, lang);
    sendSuccessResponse(res, 201, 'Menu item created successfully', item);
  });

  /**
   * PUT /api/v1/restaurant/:restaurantId/menu/items/:itemId
   * Update a menu item
   */
  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, itemId } = req.params;

    const dto: MenuItemUpdateDto = req.body;
    const item = await menuService.updateItem(itemId, restaurantId, user.id, dto, lang);
    sendSuccessResponse(res, 200, 'Menu item updated successfully', item);
  });

  /**
   * DELETE /api/v1/restaurant/:restaurantId/menu/items/:itemId
   * Delete a menu item
   */
  deleteItem = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, itemId } = req.params;

    await menuService.deleteItem(itemId, restaurantId, user.id);
    sendSuccessResponse(res, 200, 'Menu item deleted successfully');
  });

  /**
   * PATCH /api/v1/restaurant/:restaurantId/menu/items/:itemId/availability
   * Toggle item availability
   */
  toggleItemAvailability = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as Record<string, unknown>).language as SupportedLanguage) || 'de';
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, itemId } = req.params;
    const { is_available } = req.body;

    const item = await menuService.toggleItemAvailability(
      itemId,
      restaurantId,
      user.id,
      is_available,
      lang
    );
    sendSuccessResponse(res, 200, 'Menu item availability updated successfully', item);
  });

  /**
   * PATCH /api/v1/restaurant/:restaurantId/menu/items/reorder
   * Reorder items
   */
  reorderItems = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId } = req.params;

    await menuService.reorderItems(restaurantId, user.id, req.body.order);
    sendSuccessResponse(res, 200, 'Menu items reordered successfully');
  });

  // ==================== IMAGE UPLOAD ENDPOINTS ====================

  /**
   * POST /api/v1/restaurant/:restaurantId/menu/items/:itemId/image
   * Upload menu item image
   */
  uploadItemImage = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, itemId } = req.params;
    if (!req.file) throw BadRequestError('Item image file is required');

    const result = await menuService.uploadItemImage(
      itemId,
      restaurantId,
      user.id,
      req.file.buffer,
      req.file.originalname
    );
    sendSuccessResponse(res, 200, 'Menu item image uploaded successfully', result);
  });

  /**
   * DELETE /api/v1/restaurant/:restaurantId/menu/items/:itemId/image
   * Remove menu item image
   */
  deleteItemImage = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId, itemId } = req.params;

    await menuService.deleteItemImage(itemId, restaurantId, user.id);
    sendSuccessResponse(res, 200, 'Menu item image deleted successfully');
  });
}

export const menuController = new MenuController();
