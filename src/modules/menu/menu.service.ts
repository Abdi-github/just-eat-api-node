import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';
import { generateSlug } from '../../shared/utils/slug.helper.js';
import { menuCategoryRepository, menuItemRepository } from './menu.repository.js';
import { restaurantRepository } from '../restaurant/restaurant.repository.js';
import { cloudinaryService, CLOUDINARY_FOLDERS } from '../../shared/services/cloudinary.service.js';
import type { IMenuCategory } from './menu-category.model.js';
import type { IMenuItem } from './menu-item.model.js';
import type {
  MenuCategoryQueryDto,
  MenuCategoryCreateDto,
  MenuCategoryUpdateDto,
  MenuCategoryResponseDto,
  MenuItemQueryDto,
  MenuItemCreateDto,
  MenuItemUpdateDto,
  MenuItemResponseDto,
  FullMenuResponseDto,
  SupportedLanguage,
} from './menu.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Menu Service
 * Business logic for Menu Category and Menu Item operations
 */
export class MenuService {
  // ==================== HELPER METHODS ====================

  /**
   * Localize a translated field
   */
  private localizeField(
    field: { en?: string; fr?: string; de?: string; it?: string } | undefined | null,
    lang: SupportedLanguage = 'de'
  ): string | null {
    if (!field) return null;
    return field[lang] || field.en || field.de || null;
  }

  /**
   * Transform a category document to response DTO
   */
  private toCategoryResponse(
    category: IMenuCategory | Record<string, unknown>,
    lang: SupportedLanguage = 'de',
    items?: MenuItemResponseDto[]
  ): MenuCategoryResponseDto {
    const c = category as Record<string, unknown>;
    const name = c.name as { en?: string; fr?: string; de?: string; it?: string };

    return {
      id: String(c._id || c.id),
      restaurant_id: String(c.restaurant_id),
      name: this.localizeField(name, lang) || '',
      slug: c.slug as string,
      sort_order: c.sort_order as number,
      is_active: c.is_active as boolean,
      ...(items !== undefined && { items }),
      created_at: (c.created_at as Date)?.toISOString?.() || String(c.created_at || ''),
      updated_at: (c.updated_at as Date)?.toISOString?.() || String(c.updated_at || ''),
    };
  }

  /**
   * Transform an item document to response DTO
   */
  private toItemResponse(
    item: IMenuItem | Record<string, unknown>,
    lang: SupportedLanguage = 'de'
  ): MenuItemResponseDto {
    const i = item as Record<string, unknown>;
    const name = i.name as { en?: string; fr?: string; de?: string; it?: string };
    const description = i.description as
      | { en?: string; fr?: string; de?: string; it?: string }
      | undefined;

    return {
      id: String(i._id || i.id),
      category_id: String(i.category_id),
      restaurant_id: String(i.restaurant_id),
      name: this.localizeField(name, lang) || '',
      description: this.localizeField(description, lang),
      price: i.price as number,
      currency: (i.currency as string) || 'CHF',
      image_url: (i.image_url as string) || null,
      is_available: i.is_available as boolean,
      is_popular: (i.is_popular as boolean) || false,
      allergens: (i.allergens as string[]) || [],
      dietary_flags: (i.dietary_flags as string[]) || [],
      sort_order: i.sort_order as number,
      created_at: (i.created_at as Date)?.toISOString?.() || String(i.created_at || ''),
      updated_at: (i.updated_at as Date)?.toISOString?.() || String(i.updated_at || ''),
    };
  }

  /**
   * Verify restaurant exists
   */
  private async verifyRestaurantExists(restaurantId: string): Promise<void> {
    const exists = await restaurantRepository.exists(restaurantId);
    if (!exists) {
      throw NotFoundError('Restaurant not found');
    }
  }

  /**
   * Verify the caller owns the restaurant
   */
  private async verifyRestaurantOwnership(restaurantId: string, userId: string): Promise<void> {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }
    if (String(restaurant.owner_id) !== userId) {
      throw ForbiddenError('You do not own this restaurant');
    }
  }

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get full menu for a restaurant (categories with nested items)
   * Public — only active categories and available items
   */
  async getFullMenu(
    restaurantId: string,
    lang: SupportedLanguage = 'de'
  ): Promise<FullMenuResponseDto> {
    await this.verifyRestaurantExists(restaurantId);

    // Get active categories, sorted by sort_order
    const { data: categories } = await menuCategoryRepository.findByRestaurant(restaurantId, {
      is_active: true,
      sort: 'sort_order',
      limit: 100,
    });

    // For each category, get available items
    const categoriesWithItems = await Promise.all(
      categories.map(async (cat) => {
        const items = await menuItemRepository.findByCategory(String(cat._id), true);
        const itemDtos = items.map((item) => this.toItemResponse(item, lang));
        return this.toCategoryResponse(cat, lang, itemDtos);
      })
    );

    return {
      restaurant_id: restaurantId,
      categories: categoriesWithItems,
    };
  }

  /**
   * Get menu items for a specific restaurant (flat list, with filters)
   * Public — only available items
   */
  async getMenuItems(
    restaurantId: string,
    query: MenuItemQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ data: MenuItemResponseDto[]; meta: PaginationMeta }> {
    await this.verifyRestaurantExists(restaurantId);

    // Force available-only for public queries
    const publicQuery = { ...query, is_available: true };
    const { data, total } = await menuItemRepository.findByRestaurant(restaurantId, publicQuery);

    const page = query.page || 1;
    const limit = query.limit || 100;

    return {
      data: data.map((item) => this.toItemResponse(item, lang)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  // ==================== CATEGORY MANAGEMENT (Owner/Staff) ====================

  /**
   * List all categories for a restaurant (owner view — includes inactive)
   */
  async getCategories(
    restaurantId: string,
    query: MenuCategoryQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ data: MenuCategoryResponseDto[]; meta: PaginationMeta }> {
    const { data, total } = await menuCategoryRepository.findByRestaurant(restaurantId, query);

    const page = query.page || 1;
    const limit = query.limit || 50;

    return {
      data: data.map((cat) => this.toCategoryResponse(cat, lang)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(
    categoryId: string,
    lang: SupportedLanguage = 'de'
  ): Promise<MenuCategoryResponseDto> {
    const category = await menuCategoryRepository.findById(categoryId);
    if (!category) {
      throw NotFoundError('Menu category not found');
    }
    return this.toCategoryResponse(category, lang);
  }

  /**
   * Create a new menu category
   */
  async createCategory(
    restaurantId: string,
    userId: string,
    dto: MenuCategoryCreateDto,
    lang: SupportedLanguage = 'de'
  ): Promise<MenuCategoryResponseDto> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    // Generate slug from English name if not provided
    const slug = dto.slug ? dto.slug.toLowerCase().replace(/\s+/g, '-') : generateSlug(dto.name.en);

    // Check slug uniqueness within restaurant
    const isUnique = await menuCategoryRepository.isSlugUnique(restaurantId, slug);
    if (!isUnique) {
      throw BadRequestError(`Category slug "${slug}" already exists for this restaurant`);
    }

    // Auto-assign sort_order if not provided
    const sort_order =
      dto.sort_order ?? (await menuCategoryRepository.getNextSortOrder(restaurantId));

    const category = await menuCategoryRepository.create(restaurantId, {
      ...dto,
      slug,
      sort_order,
    });

    return this.toCategoryResponse(category, lang);
  }

  /**
   * Update a menu category
   */
  async updateCategory(
    categoryId: string,
    restaurantId: string,
    userId: string,
    dto: MenuCategoryUpdateDto,
    lang: SupportedLanguage = 'de'
  ): Promise<MenuCategoryResponseDto> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const existing = await menuCategoryRepository.findById(categoryId);
    if (!existing) {
      throw NotFoundError('Menu category not found');
    }

    if (String(existing.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This category does not belong to your restaurant');
    }

    // Check slug uniqueness if slug is being changed
    if (dto.slug) {
      const slug = dto.slug.toLowerCase().replace(/\s+/g, '-');
      const isUnique = await menuCategoryRepository.isSlugUnique(restaurantId, slug, categoryId);
      if (!isUnique) {
        throw BadRequestError(`Category slug "${slug}" already exists for this restaurant`);
      }
      dto.slug = slug;
    }

    const updated = await menuCategoryRepository.update(categoryId, dto);
    if (!updated) {
      throw NotFoundError('Menu category not found');
    }

    return this.toCategoryResponse(updated, lang);
  }

  /**
   * Delete a menu category (and all its items)
   */
  async deleteCategory(
    categoryId: string,
    restaurantId: string,
    userId: string
  ): Promise<{ deleted_items: number }> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const existing = await menuCategoryRepository.findById(categoryId);
    if (!existing) {
      throw NotFoundError('Menu category not found');
    }

    if (String(existing.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This category does not belong to your restaurant');
    }

    // Delete all items in the category first
    const deletedItems = await menuItemRepository.deleteByCategoryId(categoryId);

    // Delete the category
    await menuCategoryRepository.delete(categoryId);

    return { deleted_items: deletedItems };
  }

  /**
   * Reorder categories (drag & drop support)
   */
  async reorderCategories(
    restaurantId: string,
    userId: string,
    orderedIds: { id: string; sort_order: number }[]
  ): Promise<void> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    // Verify all IDs belong to this restaurant
    for (const { id } of orderedIds) {
      const cat = await menuCategoryRepository.findById(id);
      if (!cat || String(cat.restaurant_id) !== restaurantId) {
        throw BadRequestError(`Category ${id} does not belong to this restaurant`);
      }
    }

    await menuCategoryRepository.reorder(orderedIds);
  }

  // ==================== ITEM MANAGEMENT (Owner/Staff) ====================

  /**
   * List all items for a restaurant (owner view — includes unavailable)
   */
  async getItems(
    restaurantId: string,
    query: MenuItemQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ data: MenuItemResponseDto[]; meta: PaginationMeta }> {
    const { data, total } = await menuItemRepository.findByRestaurant(restaurantId, query);

    const page = query.page || 1;
    const limit = query.limit || 100;

    return {
      data: data.map((item) => this.toItemResponse(item, lang)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single item by ID
   */
  async getItemById(itemId: string, lang: SupportedLanguage = 'de'): Promise<MenuItemResponseDto> {
    const item = await menuItemRepository.findById(itemId);
    if (!item) {
      throw NotFoundError('Menu item not found');
    }
    return this.toItemResponse(item, lang);
  }

  /**
   * Create a new menu item
   */
  async createItem(
    restaurantId: string,
    userId: string,
    dto: MenuItemCreateDto,
    lang: SupportedLanguage = 'de'
  ): Promise<MenuItemResponseDto> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    // Verify category belongs to this restaurant
    const category = await menuCategoryRepository.findById(dto.category_id);
    if (!category) {
      throw NotFoundError('Menu category not found');
    }
    if (String(category.restaurant_id) !== restaurantId) {
      throw BadRequestError('Category does not belong to this restaurant');
    }

    // Auto-assign sort_order if not provided
    const sort_order =
      dto.sort_order ?? (await menuItemRepository.getNextSortOrder(dto.category_id));

    const item = await menuItemRepository.create(restaurantId, {
      ...dto,
      sort_order,
      currency: 'CHF',
    });

    return this.toItemResponse(item, lang);
  }

  /**
   * Update a menu item
   */
  async updateItem(
    itemId: string,
    restaurantId: string,
    userId: string,
    dto: MenuItemUpdateDto,
    lang: SupportedLanguage = 'de'
  ): Promise<MenuItemResponseDto> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const existing = await menuItemRepository.findById(itemId);
    if (!existing) {
      throw NotFoundError('Menu item not found');
    }
    if (String(existing.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This item does not belong to your restaurant');
    }

    // If moving to a different category, verify the target category
    if (dto.category_id && dto.category_id !== String(existing.category_id)) {
      const targetCategory = await menuCategoryRepository.findById(dto.category_id);
      if (!targetCategory) {
        throw NotFoundError('Target category not found');
      }
      if (String(targetCategory.restaurant_id) !== restaurantId) {
        throw BadRequestError('Target category does not belong to this restaurant');
      }
    }

    const updated = await menuItemRepository.update(itemId, dto);
    if (!updated) {
      throw NotFoundError('Menu item not found');
    }

    return this.toItemResponse(updated, lang);
  }

  /**
   * Delete a menu item
   */
  async deleteItem(itemId: string, restaurantId: string, userId: string): Promise<void> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const existing = await menuItemRepository.findById(itemId);
    if (!existing) {
      throw NotFoundError('Menu item not found');
    }
    if (String(existing.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This item does not belong to your restaurant');
    }

    await menuItemRepository.delete(itemId);
  }

  /**
   * Toggle item availability (quick action for staff)
   */
  async toggleItemAvailability(
    itemId: string,
    restaurantId: string,
    userId: string,
    is_available: boolean,
    lang: SupportedLanguage = 'de'
  ): Promise<MenuItemResponseDto> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const existing = await menuItemRepository.findById(itemId);
    if (!existing) {
      throw NotFoundError('Menu item not found');
    }
    if (String(existing.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This item does not belong to your restaurant');
    }

    const updated = await menuItemRepository.toggleAvailability(itemId, is_available);
    if (!updated) {
      throw NotFoundError('Menu item not found');
    }

    return this.toItemResponse(updated, lang);
  }

  /**
   * Reorder items within a category (drag & drop)
   */
  async reorderItems(
    restaurantId: string,
    userId: string,
    orderedIds: { id: string; sort_order: number }[]
  ): Promise<void> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    // Verify all IDs belong to this restaurant
    for (const { id } of orderedIds) {
      const item = await menuItemRepository.findById(id);
      if (!item || String(item.restaurant_id) !== restaurantId) {
        throw BadRequestError(`Item ${id} does not belong to this restaurant`);
      }
    }

    await menuItemRepository.reorder(orderedIds);
  }

  // ==================== IMAGE UPLOAD METHODS ====================

  /**
   * Upload menu item image
   */
  async uploadItemImage(
    itemId: string,
    restaurantId: string,
    userId: string,
    buffer: Buffer,
    originalname: string
  ): Promise<{ url: string; thumbnail_url?: string }> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const item = await menuItemRepository.findById(itemId);
    if (!item) throw NotFoundError('Menu item not found');
    if (String(item.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This item does not belong to your restaurant');
    }

    // Delete old image if it exists
    const oldUrl = item.image_url;
    if (oldUrl) {
      const oldPublicId = cloudinaryService.extractPublicId(oldUrl);
      if (oldPublicId) await cloudinaryService.deleteSingle(oldPublicId);
    }

    // Upload new image
    const result = await cloudinaryService.uploadSingle(buffer, originalname, {
      folder: CLOUDINARY_FOLDERS.menu.items,
      preset: 'menuItem',
      publicId: `${itemId}_image`,
      tags: ['menu', 'item', restaurantId, itemId],
      overwrite: true,
    });

    // Update item with new URL
    await menuItemRepository.update(itemId, { image_url: result.url });

    return { url: result.url, thumbnail_url: result.thumbnail_url };
  }

  /**
   * Delete menu item image
   */
  async deleteItemImage(itemId: string, restaurantId: string, userId: string): Promise<void> {
    await this.verifyRestaurantOwnership(restaurantId, userId);

    const item = await menuItemRepository.findById(itemId);
    if (!item) throw NotFoundError('Menu item not found');
    if (String(item.restaurant_id) !== restaurantId) {
      throw ForbiddenError('This item does not belong to your restaurant');
    }

    const url = item.image_url;
    if (url) {
      const publicId = cloudinaryService.extractPublicId(url);
      if (publicId) await cloudinaryService.deleteSingle(publicId);
    }

    await menuItemRepository.update(itemId, { image_url: null });
  }
}

// ==================== SINGLETON EXPORT ====================

export const menuService = new MenuService();
