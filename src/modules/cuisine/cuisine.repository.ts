import { Cuisine, ICuisine } from './cuisine.model.js';
import { RestaurantCuisine } from './restaurant-cuisine.model.js';
import type { CuisineQueryDto, CuisineCreateDto, CuisineUpdateDto } from './cuisine.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Cuisine Repository
 * Data access layer for Cuisines and RestaurantCuisine junction
 */
export class CuisineRepository {
  // ==================== CUISINE METHODS ====================

  /**
   * Find all cuisines with filtering, sorting, and pagination
   */
  async findAll(
    query: CuisineQueryDto
  ): Promise<{ cuisines: ICuisine[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 50, sort = 'slug', order = 'asc', is_active, search } = query;

    const filter: Record<string, unknown> = {};

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    if (search) {
      filter.$or = [
        { slug: new RegExp(search, 'i') },
        { 'name.en': new RegExp(search, 'i') },
        { 'name.fr': new RegExp(search, 'i') },
        { 'name.de': new RegExp(search, 'i') },
        { 'name.it': new RegExp(search, 'i') },
      ];
    }

    const total = await Cuisine.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;

    const cuisines = await Cuisine.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<ICuisine[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);

    return { cuisines, pagination };
  }

  /**
   * Find cuisine by ID
   */
  async findById(id: string): Promise<ICuisine | null> {
    return Cuisine.findById(id).lean<ICuisine>().exec();
  }

  /**
   * Find cuisine by slug
   */
  async findBySlug(slug: string): Promise<ICuisine | null> {
    return Cuisine.findOne({ slug }).lean<ICuisine>().exec();
  }

  /**
   * Create a cuisine
   */
  async create(data: CuisineCreateDto): Promise<ICuisine> {
    const cuisine = new Cuisine({
      name: data.name,
      slug: data.slug,
      image_url: data.image_url ?? null,
      is_active: data.is_active ?? true,
    });
    await cuisine.save();
    return cuisine.toObject();
  }

  /**
   * Update a cuisine
   */
  async update(id: string, data: CuisineUpdateDto): Promise<ICuisine | null> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      // Support partial name updates via dot notation
      if (data.name.en !== undefined) updateData['name.en'] = data.name.en;
      if (data.name.fr !== undefined) updateData['name.fr'] = data.name.fr;
      if (data.name.de !== undefined) updateData['name.de'] = data.name.de;
      if (data.name.it !== undefined) updateData['name.it'] = data.name.it;
    }
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return Cuisine.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .lean<ICuisine>()
      .exec();
  }

  /**
   * Delete a cuisine
   */
  async delete(id: string): Promise<boolean> {
    const result = await Cuisine.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if cuisine exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await Cuisine.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if slug is unique (excluding a given ID for updates)
   */
  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await Cuisine.countDocuments(filter);
    return count === 0;
  }

  // ==================== RESTAURANT-CUISINE JUNCTION METHODS ====================

  /**
   * Count restaurants linked to a cuisine
   */
  async countRestaurantsForCuisine(cuisineId: string): Promise<number> {
    return RestaurantCuisine.countDocuments({ cuisine_id: cuisineId });
  }

  /**
   * Get cuisine IDs for a restaurant
   */
  async getCuisineIdsForRestaurant(restaurantId: string): Promise<string[]> {
    const links = await RestaurantCuisine.find({ restaurant_id: restaurantId })
      .select('cuisine_id')
      .lean()
      .exec();
    return links.map((l) => l.cuisine_id.toString());
  }

  /**
   * Get restaurant IDs for a cuisine
   */
  async getRestaurantIdsForCuisine(cuisineId: string): Promise<string[]> {
    const links = await RestaurantCuisine.find({ cuisine_id: cuisineId })
      .select('restaurant_id')
      .lean()
      .exec();
    return links.map((l) => l.restaurant_id.toString());
  }

  /**
   * Add a cuisine to a restaurant
   */
  async addCuisineToRestaurant(restaurantId: string, cuisineId: string): Promise<boolean> {
    try {
      await RestaurantCuisine.create({ restaurant_id: restaurantId, cuisine_id: cuisineId });
      return true;
    } catch (error: unknown) {
      // Duplicate key error — already linked
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Remove a cuisine from a restaurant
   */
  async removeCuisineFromRestaurant(restaurantId: string, cuisineId: string): Promise<boolean> {
    const result = await RestaurantCuisine.findOneAndDelete({
      restaurant_id: restaurantId,
      cuisine_id: cuisineId,
    }).exec();
    return result !== null;
  }

  /**
   * Remove all cuisine links for a restaurant
   */
  async removeAllCuisinesFromRestaurant(restaurantId: string): Promise<number> {
    const result = await RestaurantCuisine.deleteMany({ restaurant_id: restaurantId }).exec();
    return result.deletedCount;
  }

  /**
   * Remove all restaurant links for a cuisine
   */
  async removeAllRestaurantsFromCuisine(cuisineId: string): Promise<number> {
    const result = await RestaurantCuisine.deleteMany({ cuisine_id: cuisineId }).exec();
    return result.deletedCount;
  }
}

// Singleton instance
export const cuisineRepository = new CuisineRepository();
