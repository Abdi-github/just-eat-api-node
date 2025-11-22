import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/AppError.js';
import { generateSlug } from '../../shared/utils/slug.helper.js';
import { brandRepository } from './brand.repository.js';
import { cloudinaryService, CLOUDINARY_FOLDERS } from '../../shared/services/cloudinary.service.js';
import type {
  BrandQueryDto,
  BrandCreateDto,
  BrandUpdateDto,
  BrandResponseDto,
} from './brand.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Brand Service
 * Business logic for Brand operations
 */
export class BrandService {
  // ==================== HELPER METHODS ====================

  /**
   * Transform brand document to response DTO
   */
  private toBrandResponse(
    brand: {
      _id: { toString(): string };
      name: string;
      slug: string;
      logo_url: string | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    restaurantCount?: number
  ): BrandResponseDto {
    return {
      id: brand._id.toString(),
      name: brand.name,
      slug: brand.slug,
      logo_url: brand.logo_url,
      is_active: brand.is_active,
      ...(restaurantCount !== undefined && { restaurant_count: restaurantCount }),
      created_at: brand.created_at,
      updated_at: brand.updated_at,
    };
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get all brands with filtering, sorting, and pagination
   */
  async getAllBrands(
    query: BrandQueryDto
  ): Promise<{ data: BrandResponseDto[]; pagination: PaginationMeta }> {
    const { brands, pagination } = await brandRepository.findAll(query);

    return {
      data: brands.map((brand) => this.toBrandResponse(brand)),
      pagination,
    };
  }

  /**
   * Get brand by ID (with restaurant count)
   */
  async getBrandById(id: string): Promise<BrandResponseDto> {
    const brand = await brandRepository.findById(id);
    if (!brand) throw NotFoundError('Brand not found');

    const restaurantCount = await brandRepository.countRestaurantsForBrand(id);
    return this.toBrandResponse(brand, restaurantCount);
  }

  /**
   * Get brand by slug (with restaurant count)
   */
  async getBrandBySlug(slug: string): Promise<BrandResponseDto> {
    const brand = await brandRepository.findBySlug(slug);
    if (!brand) throw NotFoundError('Brand not found');

    const id = brand._id.toString();
    const restaurantCount = await brandRepository.countRestaurantsForBrand(id);
    return this.toBrandResponse(brand, restaurantCount);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Create a new brand
   */
  async createBrand(data: BrandCreateDto): Promise<BrandResponseDto> {
    // Generate slug from name if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check slug uniqueness
    const isUnique = await brandRepository.isSlugUnique(slug);
    if (!isUnique) {
      throw ConflictError(`Brand with slug '${slug}' already exists`);
    }

    const brand = await brandRepository.create({ ...data, slug });
    return this.toBrandResponse(brand);
  }

  /**
   * Update a brand
   */
  async updateBrand(id: string, data: BrandUpdateDto): Promise<BrandResponseDto> {
    // Check existence
    const exists = await brandRepository.exists(id);
    if (!exists) throw NotFoundError('Brand not found');

    // Check slug uniqueness if changing slug
    if (data.slug) {
      const isUnique = await brandRepository.isSlugUnique(data.slug, id);
      if (!isUnique) {
        throw ConflictError(`Brand with slug '${data.slug}' already exists`);
      }
    }

    // Auto-generate slug from name if name is changing but slug is not provided
    if (data.name && !data.slug) {
      const newSlug = generateSlug(data.name);
      const isUnique = await brandRepository.isSlugUnique(newSlug, id);
      if (isUnique) {
        data.slug = newSlug;
      }
    }

    const brand = await brandRepository.update(id, data);
    if (!brand) throw NotFoundError('Brand not found');

    return this.toBrandResponse(brand);
  }

  /**
   * Delete a brand
   */
  async deleteBrand(id: string): Promise<void> {
    // Check existence
    const exists = await brandRepository.exists(id);
    if (!exists) throw NotFoundError('Brand not found');

    // Check if brand is linked to any restaurants
    const restaurantCount = await brandRepository.countRestaurantsForBrand(id);
    if (restaurantCount > 0) {
      throw BadRequestError(
        `Cannot delete brand with ${restaurantCount} linked restaurant(s). Remove the brand from all restaurants first.`
      );
    }

    await brandRepository.delete(id);
  }

  // ==================== IMAGE UPLOAD METHODS ====================

  /**
   * Upload brand logo image
   */
  async uploadBrandLogo(
    brandId: string,
    buffer: Buffer,
    originalname: string
  ): Promise<{ url: string; thumbnail_url?: string }> {
    const brand = await brandRepository.findById(brandId);
    if (!brand) throw NotFoundError('Brand not found');

    // Delete old logo if it exists
    if (brand.logo_url) {
      const oldPublicId = cloudinaryService.extractPublicId(brand.logo_url);
      if (oldPublicId) await cloudinaryService.deleteSingle(oldPublicId);
    }

    // Upload new logo
    const result = await cloudinaryService.uploadSingle(buffer, originalname, {
      folder: CLOUDINARY_FOLDERS.brands.logos,
      preset: 'brandLogo',
      publicId: `${brandId}_logo`,
      tags: ['brand', 'logo', brandId],
      overwrite: true,
    });

    // Update brand with new URL
    await brandRepository.update(brandId, { logo_url: result.url });

    return { url: result.url, thumbnail_url: result.thumbnail_url };
  }

  /**
   * Delete brand logo image
   */
  async deleteBrandLogo(brandId: string): Promise<void> {
    const brand = await brandRepository.findById(brandId);
    if (!brand) throw NotFoundError('Brand not found');

    if (brand.logo_url) {
      const publicId = cloudinaryService.extractPublicId(brand.logo_url);
      if (publicId) await cloudinaryService.deleteSingle(publicId);
    }

    await brandRepository.update(brandId, { logo_url: null });
  }
}

// Singleton
export const brandService = new BrandService();
