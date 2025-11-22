import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../../shared/errors/AppError.js';
import { generateSlug } from '../../shared/utils/slug.helper.js';
import { cloudinaryService, CLOUDINARY_FOLDERS } from '../../shared/services/cloudinary.service.js';
import { restaurantRepository } from './restaurant.repository.js';
import { cuisineRepository } from '../cuisine/cuisine.repository.js';
import type { IRestaurant } from './restaurant.model.js';
import type {
  RestaurantQueryDto,
  RestaurantCursorQueryDto,
  RestaurantCreateDto,
  RestaurantUpdateDto,
  RestaurantStatusChangeDto,
  RestaurantResponseDto,
  RestaurantStatus,
  SupportedLanguage,
} from './restaurant.types.js';
import { RESTAURANT_STATUS_TRANSITIONS } from './restaurant.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Restaurant Service
 * Business logic for Restaurant operations
 */
export class RestaurantService {
  // ==================== HELPER METHODS ====================

  /**
   * Localize a translated field to a single language
   */
  private localizeField(
    field: { en?: string; fr?: string; de?: string; it?: string } | undefined | null,
    lang: SupportedLanguage = 'de'
  ): string | null {
    if (!field) return null;
    return field[lang] || field.en || field.de || null;
  }

  /**
   * Transform a restaurant document to a response DTO
   */
  private toRestaurantResponse(
    restaurant: IRestaurant | Record<string, unknown>,
    lang: SupportedLanguage = 'de',
    cuisines?: { id: string; name: string; slug: string }[]
  ): RestaurantResponseDto {
    const r = restaurant as Record<string, unknown>;
    const description = r.description as
      | { en?: string; fr?: string; de?: string; it?: string }
      | undefined;

    // Handle populated city
    const cityRaw = r.city_id as Record<string, unknown> | null;
    let city = null;
    if (cityRaw && typeof cityRaw === 'object' && '_id' in cityRaw) {
      const cityName = cityRaw.name as
        | { en?: string; fr?: string; de?: string; it?: string }
        | string;
      city = {
        id: (cityRaw._id as { toString(): string }).toString(),
        name:
          typeof cityName === 'object'
            ? this.localizeField(cityName, lang) || ''
            : String(cityName),
        slug: String(cityRaw.slug || ''),
      };
    }

    // Handle populated canton
    const cantonRaw = r.canton_id as Record<string, unknown> | null;
    let canton = null;
    if (cantonRaw && typeof cantonRaw === 'object' && '_id' in cantonRaw) {
      const cantonName = cantonRaw.name as
        | { en?: string; fr?: string; de?: string; it?: string }
        | string;
      canton = {
        id: (cantonRaw._id as { toString(): string }).toString(),
        name:
          typeof cantonName === 'object'
            ? this.localizeField(cantonName, lang) || ''
            : String(cantonName),
        slug: String(cantonRaw.slug || ''),
        code: cantonRaw.code ? String(cantonRaw.code) : undefined,
      };
    }

    // Handle populated brand
    const brandRaw = r.brand_id as Record<string, unknown> | null;
    let brand = null;
    if (brandRaw && typeof brandRaw === 'object' && '_id' in brandRaw) {
      brand = {
        id: (brandRaw._id as { toString(): string }).toString(),
        name: String(brandRaw.name || ''),
        slug: String(brandRaw.slug || ''),
        logo_url: brandRaw.logo_url ? String(brandRaw.logo_url) : null,
      };
    }

    const estMinutes = r.estimated_delivery_minutes as { min: number; max: number } | undefined;

    return {
      id: (r._id as { toString(): string }).toString(),
      name: String(r.name || ''),
      slug: String(r.slug || ''),
      description: this.localizeField(description, lang),
      address: String(r.address || ''),
      postal_code: String(r.postal_code || ''),
      city_id:
        cityRaw && typeof cityRaw === 'object' && '_id' in cityRaw
          ? (cityRaw._id as { toString(): string }).toString()
          : String(r.city_id || ''),
      canton_id:
        cantonRaw && typeof cantonRaw === 'object' && '_id' in cantonRaw
          ? (cantonRaw._id as { toString(): string }).toString()
          : String(r.canton_id || ''),
      city,
      canton,
      brand_id:
        brandRaw && typeof brandRaw === 'object' && '_id' in brandRaw
          ? (brandRaw._id as { toString(): string }).toString()
          : r.brand_id
            ? String(r.brand_id)
            : null,
      brand,
      owner_id: r.owner_id ? String(r.owner_id) : null,
      rating: Number(r.rating || 0),
      review_count: Number(r.review_count || 0),
      logo_url: r.logo_url ? String(r.logo_url) : null,
      cover_image_url: r.cover_image_url ? String(r.cover_image_url) : null,
      delivery_fee: r.delivery_fee != null ? Number(r.delivery_fee) : null,
      minimum_order: r.minimum_order != null ? Number(r.minimum_order) : null,
      estimated_delivery_minutes: estMinutes || null,
      supports_delivery: Boolean(r.supports_delivery),
      supports_pickup: Boolean(r.supports_pickup),
      is_partner_delivery: Boolean(r.is_partner_delivery),
      phone: r.phone ? String(r.phone) : null,
      email: r.email ? String(r.email) : null,
      status: String(r.status || 'DRAFT') as RestaurantStatus,
      is_active: Boolean(r.is_active),
      is_featured: Boolean(r.is_featured),
      cuisines,
      published_at: r.published_at ? (r.published_at as Date) : null,
      created_at: r.created_at as Date,
      updated_at: r.updated_at as Date,
    };
  }

  /**
   * Get cuisines for a restaurant
   */
  private async getCuisinesForRestaurant(
    restaurantId: string,
    lang: SupportedLanguage = 'de'
  ): Promise<{ id: string; name: string; slug: string }[]> {
    const cuisineIds = await cuisineRepository.getCuisineIdsForRestaurant(restaurantId);
    if (cuisineIds.length === 0) return [];

    // Fetch cuisine details
    const { Cuisine } = await import('../cuisine/cuisine.model.js');
    const cuisines = await Cuisine.find({ _id: { $in: cuisineIds } })
      .select('name slug')
      .lean()
      .exec();

    return cuisines.map((c: Record<string, unknown>) => {
      const name = c.name as { en?: string; fr?: string; de?: string; it?: string };
      return {
        id: (c._id as { toString(): string }).toString(),
        name: this.localizeField(name, lang) || '',
        slug: String(c.slug || ''),
      };
    });
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get all restaurants with filtering, sorting, and pagination (public listing)
   * By default shows only PUBLISHED + is_active restaurants
   */
  async getAllRestaurants(
    query: RestaurantQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ data: RestaurantResponseDto[]; pagination: PaginationMeta }> {
    // Public listings default to PUBLISHED + active
    const effectiveQuery: RestaurantQueryDto = {
      ...query,
      status: query.status || 'PUBLISHED',
      is_active: query.is_active !== undefined ? query.is_active : true,
    };

    const { restaurants, pagination } = await restaurantRepository.findAll(effectiveQuery);

    const data = restaurants.map((r) => this.toRestaurantResponse(r, lang));

    return { data, pagination };
  }

  /**
   * Get all restaurants with cursor-based pagination (public listing)
   */
  async getAllRestaurantsCursor(
    query: RestaurantCursorQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{
    data: RestaurantResponseDto[];
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const effectiveQuery: RestaurantCursorQueryDto = {
      ...query,
      status: query.status || ('PUBLISHED' as RestaurantStatus),
      is_active: query.is_active !== undefined ? query.is_active : true,
    };

    const { restaurants, nextCursor, prevCursor, hasMore, total } =
      await restaurantRepository.findAllCursor(effectiveQuery);

    const data = restaurants.map((r) => this.toRestaurantResponse(r, lang));

    return { data, nextCursor, prevCursor, hasMore, total };
  }

  /**
   * Get all restaurants for admin (no status/active filtering by default)
   */
  async getAllRestaurantsAdmin(
    query: RestaurantQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ data: RestaurantResponseDto[]; pagination: PaginationMeta }> {
    const { restaurants, pagination } = await restaurantRepository.findAll(query);

    const data = restaurants.map((r) => this.toRestaurantResponse(r, lang));

    return { data, pagination };
  }

  /**
   * Get restaurant by ID (with cuisine list)
   */
  async getRestaurantById(
    id: string,
    lang: SupportedLanguage = 'de'
  ): Promise<RestaurantResponseDto> {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    const cuisines = await this.getCuisinesForRestaurant(id, lang);
    return this.toRestaurantResponse(restaurant, lang, cuisines);
  }

  /**
   * Get restaurant by slug (with cuisine list)
   */
  async getRestaurantBySlug(
    slug: string,
    lang: SupportedLanguage = 'de'
  ): Promise<RestaurantResponseDto> {
    const restaurant = await restaurantRepository.findBySlug(slug);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    const id = (restaurant._id as { toString(): string }).toString();
    const cuisines = await this.getCuisinesForRestaurant(id, lang);
    return this.toRestaurantResponse(restaurant, lang, cuisines);
  }

  // ==================== OWNER METHODS ====================

  /**
   * Create a new restaurant (owner creates as DRAFT)
   */
  async createRestaurant(
    data: RestaurantCreateDto,
    ownerId: string
  ): Promise<RestaurantResponseDto> {
    // Generate slug from name if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check slug uniqueness
    const isUnique = await restaurantRepository.isSlugUnique(slug);
    if (!isUnique) {
      throw ConflictError(`Restaurant with slug '${slug}' already exists`);
    }

    const restaurant = await restaurantRepository.create({
      ...data,
      slug,
      owner_id: ownerId,
      status: 'DRAFT',
    });

    return this.toRestaurantResponse(restaurant);
  }

  /**
   * Update own restaurant (owner can only edit own restaurants)
   */
  async updateRestaurant(
    id: string,
    data: RestaurantUpdateDto,
    userId: string,
    isAdmin = false
  ): Promise<RestaurantResponseDto> {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    // Owner can only edit own restaurant
    if (!isAdmin) {
      const ownerId = restaurant.owner_id
        ? (restaurant.owner_id as { toString(): string }).toString()
        : null;
      if (ownerId !== userId) {
        throw ForbiddenError('You can only update your own restaurant');
      }
    }

    // Check slug uniqueness if changing slug
    if (data.slug) {
      const isUnique = await restaurantRepository.isSlugUnique(data.slug, id);
      if (!isUnique) {
        throw ConflictError(`Restaurant with slug '${data.slug}' already exists`);
      }
    }

    // Auto-generate slug from name if name is changing but slug is not provided
    if (data.name && !data.slug) {
      const newSlug = generateSlug(data.name);
      const isUnique = await restaurantRepository.isSlugUnique(newSlug, id);
      if (isUnique) {
        data.slug = newSlug;
      }
    }

    // Non-admin owners cannot update certain admin-only fields
    if (!isAdmin) {
      delete data.is_featured;
    }

    const updated = await restaurantRepository.update(id, data);
    if (!updated) throw NotFoundError('Restaurant not found');

    const lang: SupportedLanguage = 'de';
    const restaurantId = (updated._id as { toString(): string }).toString();
    const cuisines = await this.getCuisinesForRestaurant(restaurantId, lang);
    return this.toRestaurantResponse(updated, lang, cuisines);
  }

  /**
   * Get restaurants owned by a user
   */
  async getMyRestaurants(
    ownerId: string,
    lang: SupportedLanguage = 'de'
  ): Promise<RestaurantResponseDto[]> {
    const restaurants = await restaurantRepository.findByOwnerId(ownerId);
    return restaurants.map((r) => this.toRestaurantResponse(r, lang));
  }

  /**
   * Toggle restaurant active status (owner can toggle own restaurant)
   */
  async toggleMyRestaurantActive(
    id: string,
    isActive: boolean,
    userId: string
  ): Promise<RestaurantResponseDto> {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    const ownerId = restaurant.owner_id
      ? (restaurant.owner_id as { toString(): string }).toString()
      : null;
    if (ownerId !== userId) {
      throw ForbiddenError('You can only toggle your own restaurant');
    }

    // Can only toggle PUBLISHED restaurants
    if (restaurant.status !== 'PUBLISHED') {
      throw BadRequestError('Can only toggle active status for published restaurants');
    }

    const updated = await restaurantRepository.toggleActive(id, isActive);
    if (!updated) throw NotFoundError('Restaurant not found');

    return this.toRestaurantResponse(updated);
  }

  // ==================== IMAGE UPLOAD METHODS ====================

  /**
   * Upload restaurant image (logo or cover)
   */
  async uploadRestaurantImage(
    restaurantId: string,
    userId: string,
    buffer: Buffer,
    originalname: string,
    type: 'logo' | 'cover'
  ): Promise<{ url: string; thumbnail_url?: string }> {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    // Ownership check
    const ownerId = restaurant.owner_id
      ? (restaurant.owner_id as { toString(): string }).toString()
      : null;
    if (ownerId !== userId) {
      throw ForbiddenError('You can only upload images for your own restaurant');
    }

    // Delete old image if it exists
    const oldUrl =
      type === 'logo'
        ? ((restaurant as Record<string, unknown>).logo_url as string | null)
        : ((restaurant as Record<string, unknown>).cover_image_url as string | null);
    if (oldUrl) {
      const oldPublicId = cloudinaryService.extractPublicId(oldUrl);
      if (oldPublicId) await cloudinaryService.deleteSingle(oldPublicId);
    }

    // Upload new image
    const folder =
      type === 'logo'
        ? CLOUDINARY_FOLDERS.restaurants.logos
        : CLOUDINARY_FOLDERS.restaurants.covers;
    const preset = type === 'logo' ? 'restaurantLogo' : 'restaurantCover';

    const result = await cloudinaryService.uploadSingle(buffer, originalname, {
      folder,
      preset,
      publicId: `${restaurantId}_${type}`,
      tags: ['restaurant', type, restaurantId],
      overwrite: true,
    });

    // Update restaurant with new URL
    const updateField = type === 'logo' ? 'logo_url' : 'cover_image_url';
    await restaurantRepository.update(restaurantId, { [updateField]: result.url });

    return { url: result.url, thumbnail_url: result.thumbnail_url };
  }

  /**
   * Delete restaurant image (logo or cover)
   */
  async deleteRestaurantImage(
    restaurantId: string,
    userId: string,
    type: 'logo' | 'cover'
  ): Promise<void> {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    const ownerId = restaurant.owner_id
      ? (restaurant.owner_id as { toString(): string }).toString()
      : null;
    if (ownerId !== userId) {
      throw ForbiddenError('You can only delete images for your own restaurant');
    }

    const url =
      type === 'logo'
        ? ((restaurant as Record<string, unknown>).logo_url as string | null)
        : ((restaurant as Record<string, unknown>).cover_image_url as string | null);

    if (url) {
      const publicId = cloudinaryService.extractPublicId(url);
      if (publicId) await cloudinaryService.deleteSingle(publicId);
    }

    const updateField = type === 'logo' ? 'logo_url' : 'cover_image_url';
    await restaurantRepository.update(restaurantId, { [updateField]: null });
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Change restaurant status (admin workflow)
   */
  async changeRestaurantStatus(
    id: string,
    dto: RestaurantStatusChangeDto,
    adminId: string
  ): Promise<RestaurantResponseDto> {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) throw NotFoundError('Restaurant not found');

    const currentStatus = restaurant.status as RestaurantStatus;
    const newStatus = dto.status;

    // Validate status transition
    const allowedTransitions = RESTAURANT_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw BadRequestError(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions?.join(', ') || 'none'}`
      );
    }

    // Require rejection reason when rejecting
    if (newStatus === 'REJECTED' && !dto.rejection_reason) {
      throw BadRequestError('Rejection reason is required when rejecting a restaurant');
    }

    const updated = await restaurantRepository.updateStatus(
      id,
      newStatus,
      adminId,
      dto.rejection_reason
    );
    if (!updated) throw NotFoundError('Restaurant not found');

    return this.toRestaurantResponse(updated);
  }

  /**
   * Get restaurants pending approval (admin approval queue)
   */
  async getPendingApprovals(
    page = 1,
    limit = 20,
    lang: SupportedLanguage = 'de'
  ): Promise<{ data: RestaurantResponseDto[]; pagination: PaginationMeta }> {
    const { restaurants, pagination } = await restaurantRepository.findByStatus(
      'PENDING_APPROVAL',
      page,
      limit
    );

    const data = restaurants.map((r) => this.toRestaurantResponse(r, lang));
    return { data, pagination };
  }

  /**
   * Delete a restaurant (admin only)
   */
  async deleteRestaurant(id: string): Promise<void> {
    const exists = await restaurantRepository.exists(id);
    if (!exists) throw NotFoundError('Restaurant not found');

    // Clean up cuisine junction links
    await cuisineRepository.removeAllCuisinesFromRestaurant(id);

    // Delete the restaurant
    await restaurantRepository.delete(id);
  }
}

// Singleton
export const restaurantService = new RestaurantService();
