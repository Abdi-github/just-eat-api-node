import { Restaurant, IRestaurant } from './restaurant.model.js';
import type {
  RestaurantQueryDto,
  RestaurantCursorQueryDto,
  RestaurantCreateDto,
  RestaurantUpdateDto,
  RestaurantStatus,
} from './restaurant.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Restaurant Repository
 * Data access layer for Restaurant operations
 */
export class RestaurantRepository {
  // ==================== QUERY METHODS ====================

  /**
   * Find all restaurants with advanced filtering, sorting, and pagination
   */
  async findAll(
    query: RestaurantQueryDto
  ): Promise<{ restaurants: IRestaurant[]; pagination: PaginationMeta }> {
    const {
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
      is_active,
      status,
      search,
    } = query;

    const filter: Record<string, unknown> = {};

    // Location filters
    if (city_id) filter.city_id = city_id;
    if (canton_id) filter.canton_id = canton_id;
    if (postal_code) filter.postal_code = postal_code;

    // Brand filter
    if (brand_id) filter.brand_id = brand_id;

    // Rating filter
    if (min_rating !== undefined) filter.rating = { $gte: min_rating };

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Active filter
    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    // Text search
    if (search) {
      filter.$or = [{ name: new RegExp(search, 'i') }, { slug: new RegExp(search, 'i') }];
    }

    // If filtering by cuisine, get restaurant IDs from junction table first
    if (cuisine_id) {
      const { RestaurantCuisine } = await import('../cuisine/restaurant-cuisine.model.js');
      const links = await RestaurantCuisine.find({ cuisine_id })
        .select('restaurant_id')
        .lean()
        .exec();
      const restaurantIds = links.map((l) => l.restaurant_id);
      filter._id = { $in: restaurantIds };
    }

    const total = await Restaurant.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;

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

    return { restaurants, pagination };
  }

  /**
   * Find restaurants with cursor-based pagination
   * Uses _id as a tiebreaker cursor for stable ordering
   */
  async findAllCursor(
    query: RestaurantCursorQueryDto
  ): Promise<{
    restaurants: IRestaurant[];
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const {
      limit = 20,
      cursor,
      direction = 'next',
      sort = '-rating',
      city_id,
      canton_id,
      cuisine_id,
      brand_id,
      postal_code,
      min_rating,
      is_active,
      status,
      search,
    } = query;

    const filter: Record<string, unknown> = {};

    // Location filters
    if (city_id) filter.city_id = city_id;
    if (canton_id) filter.canton_id = canton_id;
    if (postal_code) filter.postal_code = postal_code;
    if (brand_id) filter.brand_id = brand_id;
    if (min_rating !== undefined) filter.rating = { $gte: min_rating };
    if (status) filter.status = status;
    if (typeof is_active === 'boolean') filter.is_active = is_active;

    if (search) {
      filter.$or = [{ name: new RegExp(search, 'i') }, { slug: new RegExp(search, 'i') }];
    }

    // Cuisine filter
    if (cuisine_id) {
      const { RestaurantCuisine } = await import('../cuisine/restaurant-cuisine.model.js');
      const links = await RestaurantCuisine.find({ cuisine_id })
        .select('restaurant_id')
        .lean()
        .exec();
      const restaurantIds = links.map((l) => l.restaurant_id);
      filter._id = { ...(filter._id as object || {}), $in: restaurantIds };
    }

    // Build sort
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : 1;

    // Apply cursor filter
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        const { id: cursorId, value: cursorValue } = decoded;

        if (direction === 'next') {
          // For "next": get items after the cursor
          filter.$and = [
            ...(filter.$and as Array<Record<string, unknown>> || []),
            {
              $or: [
                { [sortField]: sortDir === -1 ? { $lt: cursorValue } : { $gt: cursorValue } },
                {
                  [sortField]: cursorValue,
                  _id: sortDir === -1 ? { $lt: cursorId } : { $gt: cursorId },
                },
              ],
            },
          ];
        } else {
          // For "prev": get items before the cursor (reverse direction)
          filter.$and = [
            ...(filter.$and as Array<Record<string, unknown>> || []),
            {
              $or: [
                { [sortField]: sortDir === -1 ? { $gt: cursorValue } : { $lt: cursorValue } },
                {
                  [sortField]: cursorValue,
                  _id: sortDir === -1 ? { $gt: cursorId } : { $lt: cursorId },
                },
              ],
            },
          ];
        }
      } catch {
        // Invalid cursor — ignore and fetch from beginning
      }
    }

    const total = await Restaurant.countDocuments(
      // Count without cursor filter to get the real total
      (() => {
        const countFilter = { ...filter };
        delete countFilter.$and;
        return countFilter;
      })()
    );

    const sortObj: Record<string, 1 | -1> = { [sortField]: sortDir as 1 | -1, _id: sortDir as 1 | -1 };

    // Fetch limit + 1 to check if there are more
    let restaurants = await Restaurant.find(filter)
      .sort(direction === 'prev' ? { [sortField]: (-sortDir) as 1 | -1, _id: (-sortDir) as 1 | -1 } : sortObj)
      .limit(limit + 1)
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant[]>()
      .exec();

    const hasMore = restaurants.length > limit;
    if (hasMore) {
      restaurants = restaurants.slice(0, limit);
    }

    // If fetching previous page, reverse back to original order
    if (direction === 'prev') {
      restaurants.reverse();
    }

    // Build cursors
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (restaurants.length > 0) {
      const lastItem = restaurants[restaurants.length - 1]!;
      const firstItem = restaurants[0]!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastVal = (lastItem as any)[sortField];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstVal = (firstItem as any)[sortField];

      if (hasMore || (direction === 'prev')) {
        nextCursor = Buffer.from(
          JSON.stringify({ id: lastItem._id.toString(), value: lastVal }),
          'utf8'
        ).toString('base64url');
      }

      if (cursor) {
        prevCursor = Buffer.from(
          JSON.stringify({ id: firstItem._id.toString(), value: firstVal }),
          'utf8'
        ).toString('base64url');
      }
    }

    return { restaurants, nextCursor, prevCursor, hasMore, total };
  }

  /**
   * Find restaurant by ID with populated references
   */
  async findById(id: string): Promise<IRestaurant | null> {
    return Restaurant.findById(id)
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant>()
      .exec();
  }

  /**
   * Find restaurant by slug with populated references
   */
  async findBySlug(slug: string): Promise<IRestaurant | null> {
    return Restaurant.findOne({ slug })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant>()
      .exec();
  }

  /**
   * Find restaurants by owner ID
   */
  async findByOwnerId(ownerId: string): Promise<IRestaurant[]> {
    return Restaurant.find({ owner_id: ownerId })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .sort({ created_at: -1 })
      .lean<IRestaurant[]>()
      .exec();
  }

  /**
   * Find restaurants by status (for admin approval queue)
   */
  async findByStatus(
    status: RestaurantStatus,
    page = 1,
    limit = 20
  ): Promise<{ restaurants: IRestaurant[]; pagination: PaginationMeta }> {
    const filter = { status };
    const total = await Restaurant.countDocuments(filter);

    const restaurants = await Restaurant.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);
    return { restaurants, pagination };
  }

  // ==================== MUTATION METHODS ====================

  /**
   * Create a restaurant
   */
  async create(
    data: RestaurantCreateDto & { slug: string; owner_id?: string; status?: RestaurantStatus }
  ): Promise<IRestaurant> {
    const restaurant = new Restaurant({
      name: data.name,
      slug: data.slug,
      description: data.description,
      address: data.address,
      postal_code: data.postal_code,
      city_id: data.city_id,
      canton_id: data.canton_id,
      brand_id: data.brand_id || null,
      owner_id: data.owner_id || null,
      phone: data.phone || null,
      email: data.email || null,
      delivery_fee: data.delivery_fee ?? null,
      minimum_order: data.minimum_order ?? null,
      estimated_delivery_minutes: data.estimated_delivery_minutes,
      supports_delivery: data.supports_delivery ?? true,
      supports_pickup: data.supports_pickup ?? false,
      is_partner_delivery: data.is_partner_delivery ?? false,
      status: data.status || 'DRAFT',
    });
    await restaurant.save();
    return restaurant.toObject();
  }

  /**
   * Update a restaurant
   */
  async update(id: string, data: RestaurantUpdateDto): Promise<IRestaurant | null> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code;
    if (data.city_id !== undefined) updateData.city_id = data.city_id;
    if (data.canton_id !== undefined) updateData.canton_id = data.canton_id;
    if (data.brand_id !== undefined) updateData.brand_id = data.brand_id;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
    if (data.cover_image_url !== undefined) updateData.cover_image_url = data.cover_image_url;
    if (data.delivery_fee !== undefined) updateData.delivery_fee = data.delivery_fee;
    if (data.minimum_order !== undefined) updateData.minimum_order = data.minimum_order;
    if (data.estimated_delivery_minutes !== undefined)
      updateData.estimated_delivery_minutes = data.estimated_delivery_minutes;
    if (data.supports_delivery !== undefined) updateData.supports_delivery = data.supports_delivery;
    if (data.supports_pickup !== undefined) updateData.supports_pickup = data.supports_pickup;
    if (data.is_partner_delivery !== undefined)
      updateData.is_partner_delivery = data.is_partner_delivery;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.is_featured !== undefined) updateData.is_featured = data.is_featured;

    // Description partial update
    if (data.description !== undefined) {
      if (data.description.en !== undefined) updateData['description.en'] = data.description.en;
      if (data.description.fr !== undefined) updateData['description.fr'] = data.description.fr;
      if (data.description.de !== undefined) updateData['description.de'] = data.description.de;
      if (data.description.it !== undefined) updateData['description.it'] = data.description.it;
    }

    return Restaurant.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant>()
      .exec();
  }

  /**
   * Update restaurant status (admin workflow)
   */
  async updateStatus(
    id: string,
    status: RestaurantStatus,
    adminId?: string,
    rejectionReason?: string
  ): Promise<IRestaurant | null> {
    const updateData: Record<string, unknown> = {
      status,
      reviewed_by: adminId || null,
      reviewed_at: new Date(),
    };

    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    if (status === 'PUBLISHED') {
      updateData.published_at = new Date();
    }

    return Restaurant.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant>()
      .exec();
  }

  /**
   * Delete a restaurant
   */
  async delete(id: string): Promise<boolean> {
    const result = await Restaurant.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if restaurant exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await Restaurant.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if slug is unique
   */
  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await Restaurant.countDocuments(filter);
    return count === 0;
  }

  /**
   * Count restaurants by brand
   */
  async countByBrand(brandId: string): Promise<number> {
    return Restaurant.countDocuments({ brand_id: brandId });
  }

  /**
   * Count restaurants by city
   */
  async countByCity(cityId: string): Promise<number> {
    return Restaurant.countDocuments({ city_id: cityId });
  }

  /**
   * Toggle is_active
   */
  async toggleActive(id: string, isActive: boolean): Promise<IRestaurant | null> {
    return Restaurant.findByIdAndUpdate(id, { is_active: isActive }, { returnDocument: 'after' })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .populate('brand_id', 'name slug logo_url')
      .lean<IRestaurant>()
      .exec();
  }
}

// Singleton
export const restaurantRepository = new RestaurantRepository();
