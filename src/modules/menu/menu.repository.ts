import { MenuCategory, type IMenuCategory } from './menu-category.model.js';
import { MenuItem, type IMenuItem } from './menu-item.model.js';
import type {
  MenuCategoryQueryDto,
  MenuCategoryCreateDto,
  MenuCategoryUpdateDto,
  MenuItemQueryDto,
  MenuItemCreateDto,
  MenuItemUpdateDto,
} from './menu.types.js';

// ==================== MENU CATEGORY REPOSITORY ====================

export class MenuCategoryRepository {
  // -------------------- READ --------------------

  /**
   * Find all categories for a restaurant
   */
  async findByRestaurant(
    restaurantId: string,
    query: MenuCategoryQueryDto = {}
  ): Promise<{ data: IMenuCategory[]; total: number }> {
    const { page = 1, limit = 50, sort = 'sort_order', is_active } = query;

    const filter: Record<string, unknown> = { restaurant_id: restaurantId };
    if (is_active !== undefined) {
      // Use $ne for tolerant matching — treats missing is_active as true
      filter.is_active = is_active ? { $ne: false } : false;
    }

    const [data, total] = await Promise.all([
      MenuCategory.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      MenuCategory.countDocuments(filter),
    ]);

    return { data, total };
  }

  /**
   * Find a category by ID
   */
  async findById(id: string): Promise<IMenuCategory | null> {
    return MenuCategory.findById(id).exec();
  }

  /**
   * Find a category by slug within a restaurant
   */
  async findBySlug(restaurantId: string, slug: string): Promise<IMenuCategory | null> {
    return MenuCategory.findOne({ restaurant_id: restaurantId, slug }).exec();
  }

  /**
   * Check if a slug is unique within a restaurant
   */
  async isSlugUnique(restaurantId: string, slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { restaurant_id: restaurantId, slug };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const count = await MenuCategory.countDocuments(filter);
    return count === 0;
  }

  /**
   * Get the next sort order for a restaurant
   */
  async getNextSortOrder(restaurantId: string): Promise<number> {
    const lastCategory = await MenuCategory.findOne({ restaurant_id: restaurantId })
      .sort({ sort_order: -1 })
      .select('sort_order')
      .exec();
    return lastCategory ? lastCategory.sort_order + 1 : 0;
  }

  // -------------------- WRITE --------------------

  /**
   * Create a new category
   */
  async create(restaurantId: string, data: MenuCategoryCreateDto): Promise<IMenuCategory> {
    return MenuCategory.create({
      restaurant_id: restaurantId,
      ...data,
    });
  }

  /**
   * Update a category
   */
  async update(id: string, data: MenuCategoryUpdateDto): Promise<IMenuCategory | null> {
    // Handle partial name updates with dot notation
    const updateData: Record<string, unknown> = {};

    if (data.name) {
      if (data.name.en !== undefined) updateData['name.en'] = data.name.en;
      if (data.name.fr !== undefined) updateData['name.fr'] = data.name.fr;
      if (data.name.de !== undefined) updateData['name.de'] = data.name.de;
      if (data.name.it !== undefined) updateData['name.it'] = data.name.it;
    }
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return MenuCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<IMenuCategory | null> {
    return MenuCategory.findByIdAndDelete(id).exec();
  }

  /**
   * Count categories for a restaurant
   */
  async countByRestaurant(restaurantId: string): Promise<number> {
    return MenuCategory.countDocuments({ restaurant_id: restaurantId });
  }

  /**
   * Reorder categories — set sort_order for multiple categories
   */
  async reorder(orderedIds: { id: string; sort_order: number }[]): Promise<void> {
    const bulkOps = orderedIds.map(({ id, sort_order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sort_order } },
      },
    }));
    await MenuCategory.bulkWrite(bulkOps);
  }
}

// ==================== MENU ITEM REPOSITORY ====================

export class MenuItemRepository {
  // -------------------- READ --------------------

  /**
   * Find all items for a restaurant (optionally filtered by category)
   */
  async findByRestaurant(
    restaurantId: string,
    query: MenuItemQueryDto = {}
  ): Promise<{ data: IMenuItem[]; total: number }> {
    const {
      page = 1,
      limit = 100,
      sort = 'sort_order',
      category_id,
      is_available,
      is_popular,
      min_price,
      max_price,
      search,
      allergens,
      dietary_flags,
    } = query;

    const filter: Record<string, unknown> = { restaurant_id: restaurantId };

    if (category_id) filter.category_id = category_id;
    if (is_available !== undefined) {
      // Tolerant matching — seed data may not have is_available (defaults to true)
      filter.is_available = is_available ? { $ne: false } : false;
    }
    if (is_popular !== undefined) filter.is_popular = is_popular;

    // Price range
    if (min_price !== undefined || max_price !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (min_price !== undefined) priceFilter.$gte = min_price;
      if (max_price !== undefined) priceFilter.$lte = max_price;
      filter.price = priceFilter;
    }

    // Search by name (regex across all language fields)
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { 'name.en': regex },
        { 'name.fr': regex },
        { 'name.de': regex },
        { 'name.it': regex },
      ];
    }

    // Filter by allergens (items that contain specific allergens — for exclusion, negate in service)
    if (allergens && allergens.length > 0) {
      filter.allergens = { $in: allergens };
    }

    // Filter by dietary flags
    if (dietary_flags && dietary_flags.length > 0) {
      filter.dietary_flags = { $all: dietary_flags };
    }

    const [data, total] = await Promise.all([
      MenuItem.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      MenuItem.countDocuments(filter),
    ]);

    return { data, total };
  }

  /**
   * Find items by category
   */
  async findByCategory(categoryId: string, onlyAvailable = false): Promise<IMenuItem[]> {
    const filter: Record<string, unknown> = { category_id: categoryId };
    if (onlyAvailable) filter.is_available = { $ne: false };
    return MenuItem.find(filter).sort('sort_order').exec();
  }

  /**
   * Find an item by ID
   */
  async findById(id: string): Promise<IMenuItem | null> {
    return MenuItem.findById(id).exec();
  }

  /**
   * Get the next sort order within a category
   */
  async getNextSortOrder(categoryId: string): Promise<number> {
    const lastItem = await MenuItem.findOne({ category_id: categoryId })
      .sort({ sort_order: -1 })
      .select('sort_order')
      .exec();
    return lastItem ? lastItem.sort_order + 1 : 0;
  }

  // -------------------- WRITE --------------------

  /**
   * Create a new menu item
   */
  async create(restaurantId: string, data: MenuItemCreateDto): Promise<IMenuItem> {
    return MenuItem.create({
      restaurant_id: restaurantId,
      ...data,
    });
  }

  /**
   * Update a menu item
   */
  async update(id: string, data: MenuItemUpdateDto): Promise<IMenuItem | null> {
    const updateData: Record<string, unknown> = {};

    // Handle partial name updates
    if (data.name) {
      if (data.name.en !== undefined) updateData['name.en'] = data.name.en;
      if (data.name.fr !== undefined) updateData['name.fr'] = data.name.fr;
      if (data.name.de !== undefined) updateData['name.de'] = data.name.de;
      if (data.name.it !== undefined) updateData['name.it'] = data.name.it;
    }

    // Handle partial description updates
    if (data.description) {
      if (data.description.en !== undefined) updateData['description.en'] = data.description.en;
      if (data.description.fr !== undefined) updateData['description.fr'] = data.description.fr;
      if (data.description.de !== undefined) updateData['description.de'] = data.description.de;
      if (data.description.it !== undefined) updateData['description.it'] = data.description.it;
    }

    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.is_available !== undefined) updateData.is_available = data.is_available;
    if (data.is_popular !== undefined) updateData.is_popular = data.is_popular;
    if (data.allergens !== undefined) updateData.allergens = data.allergens;
    if (data.dietary_flags !== undefined) updateData.dietary_flags = data.dietary_flags;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;

    return MenuItem.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' }).exec();
  }

  /**
   * Delete a menu item
   */
  async delete(id: string): Promise<IMenuItem | null> {
    return MenuItem.findByIdAndDelete(id).exec();
  }

  /**
   * Delete all items in a category
   */
  async deleteByCategoryId(categoryId: string): Promise<number> {
    const result = await MenuItem.deleteMany({ category_id: categoryId });
    return result.deletedCount;
  }

  /**
   * Delete all items for a restaurant
   */
  async deleteByRestaurantId(restaurantId: string): Promise<number> {
    const result = await MenuItem.deleteMany({ restaurant_id: restaurantId });
    return result.deletedCount;
  }

  /**
   * Count items in a category
   */
  async countByCategory(categoryId: string): Promise<number> {
    return MenuItem.countDocuments({ category_id: categoryId });
  }

  /**
   * Count items for a restaurant
   */
  async countByRestaurant(restaurantId: string): Promise<number> {
    return MenuItem.countDocuments({ restaurant_id: restaurantId });
  }

  /**
   * Reorder items — set sort_order for multiple items
   */
  async reorder(orderedIds: { id: string; sort_order: number }[]): Promise<void> {
    const bulkOps = orderedIds.map(({ id, sort_order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sort_order } },
      },
    }));
    await MenuItem.bulkWrite(bulkOps);
  }

  /**
   * Toggle availability for a single item
   */
  async toggleAvailability(id: string, is_available: boolean): Promise<IMenuItem | null> {
    return MenuItem.findByIdAndUpdate(
      id,
      { $set: { is_available } },
      { returnDocument: 'after' }
    ).exec();
  }
}

// ==================== SINGLETON EXPORTS ====================

export const menuCategoryRepository = new MenuCategoryRepository();
export const menuItemRepository = new MenuItemRepository();
