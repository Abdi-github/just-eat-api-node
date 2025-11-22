import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/AppError.js';
import { generateSlug } from '../../shared/utils/slug.helper.js';
import { cuisineRepository } from './cuisine.repository.js';
import type {
  TranslatedField,
  SupportedLanguage,
  CuisineQueryDto,
  CuisineCreateDto,
  CuisineUpdateDto,
  CuisineResponseDto,
} from './cuisine.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Cuisine Service
 * Business logic for Cuisine operations
 */
export class CuisineService {
  // ==================== HELPER METHODS ====================

  /**
   * Extract localized name based on language
   */
  private getLocalizedName(
    name: TranslatedField,
    lang?: SupportedLanguage
  ): string | TranslatedField {
    if (!lang) return name;
    return name[lang] || name.de || name.en || name.fr || name.it || '';
  }

  /**
   * Transform cuisine document to response DTO
   */
  private toCuisineResponse(
    cuisine: {
      _id: { toString(): string };
      name: TranslatedField;
      slug: string;
      image_url: string | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    lang?: SupportedLanguage,
    restaurantCount?: number
  ): CuisineResponseDto {
    return {
      id: cuisine._id.toString(),
      name: this.getLocalizedName(cuisine.name, lang),
      slug: cuisine.slug,
      image_url: cuisine.image_url,
      is_active: cuisine.is_active,
      ...(restaurantCount !== undefined && { restaurant_count: restaurantCount }),
      created_at: cuisine.created_at,
      updated_at: cuisine.updated_at,
    };
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get all cuisines with filtering, sorting, and pagination
   */
  async getAllCuisines(
    query: CuisineQueryDto
  ): Promise<{ data: CuisineResponseDto[]; pagination: PaginationMeta }> {
    const { cuisines, pagination } = await cuisineRepository.findAll(query);

    return {
      data: cuisines.map((cuisine) => this.toCuisineResponse(cuisine, query.lang)),
      pagination,
    };
  }

  /**
   * Get cuisine by ID (with restaurant count)
   */
  async getCuisineById(id: string, lang?: SupportedLanguage): Promise<CuisineResponseDto> {
    const cuisine = await cuisineRepository.findById(id);
    if (!cuisine) throw NotFoundError('Cuisine not found');

    const restaurantCount = await cuisineRepository.countRestaurantsForCuisine(id);
    return this.toCuisineResponse(cuisine, lang, restaurantCount);
  }

  /**
   * Get cuisine by slug (with restaurant count)
   */
  async getCuisineBySlug(slug: string, lang?: SupportedLanguage): Promise<CuisineResponseDto> {
    const cuisine = await cuisineRepository.findBySlug(slug);
    if (!cuisine) throw NotFoundError('Cuisine not found');

    const id = cuisine._id.toString();
    const restaurantCount = await cuisineRepository.countRestaurantsForCuisine(id);
    return this.toCuisineResponse(cuisine, lang, restaurantCount);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Create a new cuisine
   */
  async createCuisine(
    data: CuisineCreateDto,
    lang?: SupportedLanguage
  ): Promise<CuisineResponseDto> {
    // Generate slug from German name if not provided
    const slug = data.slug || generateSlug(data.name.de || data.name.en);

    // Check slug uniqueness
    const isUnique = await cuisineRepository.isSlugUnique(slug);
    if (!isUnique) {
      throw ConflictError(`Cuisine with slug '${slug}' already exists`);
    }

    const cuisine = await cuisineRepository.create({
      ...data,
      slug,
    });

    return this.toCuisineResponse(cuisine, lang);
  }

  /**
   * Update an existing cuisine
   */
  async updateCuisine(
    id: string,
    data: CuisineUpdateDto,
    lang?: SupportedLanguage
  ): Promise<CuisineResponseDto> {
    // Check cuisine exists
    const exists = await cuisineRepository.exists(id);
    if (!exists) throw NotFoundError('Cuisine not found');

    // Check slug uniqueness (if being changed)
    if (data.slug) {
      const isUnique = await cuisineRepository.isSlugUnique(data.slug, id);
      if (!isUnique) {
        throw ConflictError(`Cuisine with slug '${data.slug}' already exists`);
      }
    }

    const updated = await cuisineRepository.update(id, data);
    if (!updated) throw NotFoundError('Cuisine not found');

    return this.toCuisineResponse(updated, lang);
  }

  /**
   * Delete a cuisine
   */
  async deleteCuisine(id: string): Promise<void> {
    // Check cuisine exists
    const exists = await cuisineRepository.exists(id);
    if (!exists) throw NotFoundError('Cuisine not found');

    // Check if cuisine has restaurants linked
    const restaurantCount = await cuisineRepository.countRestaurantsForCuisine(id);
    if (restaurantCount > 0) {
      throw BadRequestError(
        `Cannot delete cuisine with ${restaurantCount} linked restaurant(s). Remove restaurant associations first.`
      );
    }

    await cuisineRepository.delete(id);
  }
}

// Singleton instance
export const cuisineService = new CuisineService();
