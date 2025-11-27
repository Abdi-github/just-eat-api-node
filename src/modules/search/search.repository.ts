import mongoose from 'mongoose';
import crypto from 'crypto';

import { Restaurant, IRestaurant } from '../restaurant/restaurant.model.js';
import { MenuItem, IMenuItem } from '../menu/menu-item.model.js';
import { MenuCategory } from '../menu/menu-category.model.js';
import { RestaurantCuisine } from '../cuisine/restaurant-cuisine.model.js';
import { Cuisine } from '../cuisine/cuisine.model.js';
import { getRedisClient } from '../../config/redis.js';
import { logger } from '../../shared/logger/index.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type {
  RestaurantSearchQueryDto,
  MenuItemSearchQueryDto,
  SearchSuggestionsQueryDto,
  SupportedLanguage,
} from './search.types.js';
import { SEARCH_CACHE_TTL, SUGGESTIONS_CACHE_TTL } from './search.types.js';

/**
 * Search Repository
 * Handles all database operations for search functionality with Redis caching
 */
export class SearchRepository {
  // ==================== CACHE HELPERS ====================

  /**
   * Generate a cache key from search parameters
   */
  private generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    const hash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `search:${prefix}:${hash}`;
  }

  /**
   * Get cached search results from Redis
   */
  private async getCachedResults<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);
      if (cached) {
        logger.debug(`Search cache hit: ${key}`);
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      logger.warn('Redis search cache read error:', error);
      return null;
    }
  }

  /**
   * Store search results in Redis cache
   */
  private async setCachedResults(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Search cache set: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      logger.warn('Redis search cache write error:', error);
    }
  }

  /**
   * Invalidate search cache by pattern
   */
  async invalidateCache(pattern: string = 'search:*'): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} search cache keys matching: ${pattern}`);
      }
    } catch (error) {
      logger.warn('Redis search cache invalidation error:', error);
    }
  }

  // ==================== RESTAURANT SEARCH ====================

  /**
   * Search restaurants with advanced filtering, sorting, and pagination
   * Results are cached in Redis for performance
   */
  async searchRestaurants(
    query: RestaurantSearchQueryDto
  ): Promise<{ restaurants: IRestaurant[]; pagination: PaginationMeta }> {
    const {
      q,
      page = 1,
      limit = 20,
      sort = '-rating',
      order = 'desc',
      city_id,
      canton_id,
      cuisine_id,
      brand_id,
      postal_code,
      min_rating,
      max_delivery_fee,
      order_type,
      is_featured,
    } = query;

    // Check cache
    const cacheKey = this.generateCacheKey('restaurants', query);
    const cached = await this.getCachedResults<{
      restaurants: IRestaurant[];
      pagination: PaginationMeta;
    }>(cacheKey);
    if (cached) return cached;

    // Build filter — only PUBLISHED and active restaurants
    const filter: Record<string, unknown> = {
      status: 'PUBLISHED',
      is_active: { $ne: false },
    };

    // Text search on restaurant name
    if (q && q.trim().length >= 2) {
      filter.$or = [{ name: new RegExp(q.trim(), 'i') }, { slug: new RegExp(q.trim(), 'i') }];
    }

    // Location filters
    if (city_id) filter.city_id = new mongoose.Types.ObjectId(city_id);
    if (canton_id) filter.canton_id = new mongoose.Types.ObjectId(canton_id);
    if (postal_code) filter.postal_code = postal_code;

    // Brand filter
    if (brand_id) filter.brand_id = new mongoose.Types.ObjectId(brand_id);

    // Rating filter
    if (min_rating !== undefined) filter.rating = { $gte: min_rating };

    // Delivery fee filter
    if (max_delivery_fee !== undefined) {
      filter.delivery_fee = { $lte: max_delivery_fee };
    }

    // Order type filter
    if (order_type === 'delivery') {
      filter.supports_delivery = { $ne: false };
    } else if (order_type === 'pickup') {
      filter.supports_pickup = true;
    }

    // Featured filter
    if (is_featured === true) {
      filter.is_featured = true;
    }

    // Cuisine filter — get restaurant IDs from junction table
    if (cuisine_id) {
      const links = await RestaurantCuisine.find({ cuisine_id })
        .select('restaurant_id')
        .lean()
        .exec();
      const restaurantIds = links.map((l) => l.restaurant_id);
      if (restaurantIds.length === 0) {
        // No restaurants match this cuisine
        const pagination = calculatePaginationMeta(page, limit, 0);
        const result = { restaurants: [], pagination };
        await this.setCachedResults(cacheKey, result, SEARCH_CACHE_TTL);
        return result;
      }
      filter._id = { $in: restaurantIds };
    }

    // Count total matches
    const total = await Restaurant.countDocuments(filter);

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;

    // Execute query with population
    const restaurants = await Restaurant.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);
    const result = { restaurants, pagination };

    // Cache result
    await this.setCachedResults(cacheKey, result, SEARCH_CACHE_TTL);

    return result;
  }

  // ==================== MENU ITEM SEARCH ====================

  /**
   * Search menu items within a specific restaurant
   * Supports filtering by category, price, dietary flags, allergens
   */
  async searchMenuItems(
    restaurantId: string,
    query: MenuItemSearchQueryDto
  ): Promise<{ items: IMenuItem[]; pagination: PaginationMeta }> {
    const {
      q,
      page = 1,
      limit = 20,
      sort = 'sort_order',
      order = 'asc',
      category_id,
      min_price,
      max_price,
      is_available,
      is_popular,
      allergens,
      dietary_flags,
      lang = 'de',
    } = query;

    // Check cache
    const cacheParams = { restaurantId, ...query };
    const cacheKey = this.generateCacheKey('menu_items', cacheParams);
    const cached = await this.getCachedResults<{
      items: IMenuItem[];
      pagination: PaginationMeta;
    }>(cacheKey);
    if (cached) return cached;

    // Build filter
    const filter: Record<string, unknown> = {
      restaurant_id: new mongoose.Types.ObjectId(restaurantId),
    };

    // Text search on item name (language-aware)
    if (q && q.trim().length >= 2) {
      const searchTerm = q.trim();
      filter.$or = [
        { [`name.${lang}`]: new RegExp(searchTerm, 'i') },
        { [`name.en`]: new RegExp(searchTerm, 'i') },
        { [`name.de`]: new RegExp(searchTerm, 'i') },
        { [`name.fr`]: new RegExp(searchTerm, 'i') },
        { [`name.it`]: new RegExp(searchTerm, 'i') },
      ];
    }

    // Category filter
    if (category_id) {
      filter.category_id = new mongoose.Types.ObjectId(category_id);
    }

    // Price range filter
    if (min_price !== undefined || max_price !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (min_price !== undefined) priceFilter.$gte = min_price;
      if (max_price !== undefined) priceFilter.$lte = max_price;
      filter.price = priceFilter;
    }

    // Availability filter
    if (typeof is_available === 'boolean') {
      if (is_available) {
        filter.is_available = { $ne: false };
      } else {
        filter.is_available = false;
      }
    }

    // Popularity filter
    if (is_popular === true) {
      filter.is_popular = true;
    }

    // Allergens filter (exclude items containing specified allergens)
    if (allergens && allergens.length > 0) {
      filter.allergens = { $nin: allergens };
    }

    // Dietary flags filter (include items matching specified flags)
    if (dietary_flags && dietary_flags.length > 0) {
      filter.dietary_flags = { $all: dietary_flags };
    }

    // Count total matches
    const total = await MenuItem.countDocuments(filter);

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'asc' ? 1 : -1;
    sortObj[sortField] = sortDir;

    // Execute query with category population
    const items = await MenuItem.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category_id', 'name slug')
      .lean<IMenuItem[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);
    const result = { items, pagination };

    // Cache result
    await this.setCachedResults(cacheKey, result, SEARCH_CACHE_TTL);

    return result;
  }

  // ==================== SEARCH SUGGESTIONS ====================

  /**
   * Get search suggestions (autocomplete) for restaurants and cuisines
   */
  async getSuggestions(query: SearchSuggestionsQueryDto): Promise<{
    restaurants: Array<{ _id: string; name: string; slug: string; city_name?: string }>;
    cuisines: Array<{ _id: string; name: Record<string, string>; slug: string; count: number }>;
  }> {
    const { q, limit = 5, lang = 'de' } = query;

    // Check cache
    const cacheKey = this.generateCacheKey('suggestions', { q, limit, lang });
    const cached = await this.getCachedResults<{
      restaurants: Array<{ _id: string; name: string; slug: string; city_name?: string }>;
      cuisines: Array<{ _id: string; name: Record<string, string>; slug: string; count: number }>;
    }>(cacheKey);
    if (cached) return cached;

    const searchTerm = q.trim();
    const regex = new RegExp(searchTerm, 'i');

    // Search restaurants
    const restaurants = await Restaurant.find({
      name: regex,
      status: 'PUBLISHED',
      is_active: { $ne: false },
    })
      .select('name slug city_id')
      .populate('city_id', `name.${lang} name.en`)
      .limit(limit)
      .lean()
      .exec();

    const restaurantSuggestions = restaurants.map((r: Record<string, unknown>) => {
      const city = r.city_id as Record<string, unknown> | null;
      let cityName: string | undefined;
      if (city && typeof city === 'object' && 'name' in city) {
        const nameObj = city.name as Record<string, string>;
        cityName = nameObj?.[lang] || nameObj?.en || undefined;
      }
      return {
        _id: String(r._id),
        name: r.name as string,
        slug: r.slug as string,
        city_name: cityName,
      };
    });

    // Search cuisines
    const cuisines = await Cuisine.find({
      $or: [{ [`name.${lang}`]: regex }, { 'name.en': regex }],
      is_active: { $ne: false },
    })
      .select('name slug')
      .limit(limit)
      .lean()
      .exec();

    // Get restaurant counts per cuisine
    const cuisineIds = cuisines.map((c: Record<string, unknown>) => c._id);
    const cuisineCounts = await RestaurantCuisine.aggregate([
      { $match: { cuisine_id: { $in: cuisineIds } } },
      { $group: { _id: '$cuisine_id', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      cuisineCounts.map((c: { _id: unknown; count: number }) => [String(c._id), c.count])
    );

    const cuisineSuggestions = cuisines.map((c: Record<string, unknown>) => ({
      _id: String(c._id),
      name: c.name as Record<string, string>,
      slug: c.slug as string,
      count: countMap.get(String(c._id)) || 0,
    }));

    const result = {
      restaurants: restaurantSuggestions,
      cuisines: cuisineSuggestions,
    };

    // Cache suggestions
    await this.setCachedResults(cacheKey, result, SUGGESTIONS_CACHE_TTL);

    return result;
  }

  // ==================== AGGREGATION HELPERS ====================

  /**
   * Get cuisines for a set of restaurants (by IDs)
   * Returns a map of restaurant_id → cuisines[]
   */
  async getCuisinesForRestaurants(
    restaurantIds: string[]
  ): Promise<Map<string, Array<{ id: string; name: Record<string, string>; slug: string }>>> {
    if (restaurantIds.length === 0) return new Map();

    const links = await RestaurantCuisine.find({
      restaurant_id: { $in: restaurantIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .lean()
      .exec();

    // Gather unique cuisine IDs
    const cuisineIds = [
      ...new Set(links.map((l: Record<string, unknown>) => String(l.cuisine_id))),
    ];

    // Fetch cuisine details
    const cuisines = await Cuisine.find({
      _id: { $in: cuisineIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select('name slug')
      .lean()
      .exec();

    const cuisineMap = new Map(
      cuisines.map((c: Record<string, unknown>) => [
        String(c._id),
        { id: String(c._id), name: c.name as Record<string, string>, slug: c.slug as string },
      ])
    );

    // Build restaurant → cuisines map
    const resultMap = new Map<
      string,
      Array<{ id: string; name: Record<string, string>; slug: string }>
    >();
    for (const link of links) {
      const restId = String((link as Record<string, unknown>).restaurant_id);
      const cuisineId = String((link as Record<string, unknown>).cuisine_id);
      const cuisine = cuisineMap.get(cuisineId);
      if (cuisine) {
        if (!resultMap.has(restId)) {
          resultMap.set(restId, []);
        }
        resultMap.get(restId)!.push(cuisine);
      }
    }

    return resultMap;
  }
}

// Singleton
export const searchRepository = new SearchRepository();
