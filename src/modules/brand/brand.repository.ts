import { Brand, IBrand } from './brand.model.js';
import type { BrandQueryDto, BrandCreateDto, BrandUpdateDto } from './brand.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Brand Repository
 * Data access layer for Brands
 */
export class BrandRepository {
  // ==================== BRAND CRUD METHODS ====================

  /**
   * Find all brands with filtering, sorting, and pagination
   */
  async findAll(query: BrandQueryDto): Promise<{ brands: IBrand[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 50, sort = 'name', order = 'asc', is_active, search } = query;

    const filter: Record<string, unknown> = {};

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    if (search) {
      filter.$or = [{ slug: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }];
    }

    const total = await Brand.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;

    const brands = await Brand.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IBrand[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);

    return { brands, pagination };
  }

  /**
   * Find brand by ID
   */
  async findById(id: string): Promise<IBrand | null> {
    return Brand.findById(id).lean<IBrand>().exec();
  }

  /**
   * Find brand by slug
   */
  async findBySlug(slug: string): Promise<IBrand | null> {
    return Brand.findOne({ slug }).lean<IBrand>().exec();
  }

  /**
   * Create a brand
   */
  async create(data: BrandCreateDto): Promise<IBrand> {
    const brand = new Brand({
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url ?? null,
      is_active: data.is_active ?? true,
    });
    await brand.save();
    return brand.toObject();
  }

  /**
   * Update a brand
   */
  async update(id: string, data: BrandUpdateDto): Promise<IBrand | null> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return Brand.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .lean<IBrand>()
      .exec();
  }

  /**
   * Delete a brand
   */
  async delete(id: string): Promise<boolean> {
    const result = await Brand.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if brand exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await Brand.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if slug is unique (excluding a given ID for updates)
   */
  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await Brand.countDocuments(filter);
    return count === 0;
  }

  // ==================== RESTAURANT-BRAND METHODS ====================

  /**
   * Count restaurants linked to a brand.
   * Uses lazy import to avoid circular dependency (Restaurant module may not exist yet).
   */
  async countRestaurantsForBrand(brandId: string): Promise<number> {
    try {
      const mongoose = await import('mongoose');
      const RestaurantModel = mongoose.default.models['Restaurant'];
      if (!RestaurantModel) return 0;
      return RestaurantModel.countDocuments({ brand_id: brandId });
    } catch {
      return 0;
    }
  }
}

// Singleton
export const brandRepository = new BrandRepository();
