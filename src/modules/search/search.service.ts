import { searchRepository, SearchRepository } from './search.repository.js';
import { logger } from '../../shared/logger/index.js';
import type {
  RestaurantSearchQueryDto,
  MenuItemSearchQueryDto,
  SearchSuggestionsQueryDto,
  RestaurantSearchResultDto,
  MenuItemSearchResultDto,
  SearchSuggestionsResponseDto,
  SupportedLanguage,
} from './search.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Search Service
 * Business logic for search operations
 */
export class SearchService {
  constructor(private searchRepo: SearchRepository) {}

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
   * Localize a populated ref's name field
   */
  private localizePopulatedName(
    refObj: Record<string, unknown> | null,
    lang: SupportedLanguage
  ): string {
    if (!refObj || typeof refObj !== 'object') return '';
    const nameField = refObj.name as
      | { en?: string; fr?: string; de?: string; it?: string }
      | string
      | undefined;
    if (!nameField) return '';
    if (typeof nameField === 'string') return nameField;
    return this.localizeField(nameField, lang) || '';
  }

  // ==================== RESTAURANT SEARCH ====================

  /**
   * Search restaurants with filtering, sorting, pagination, and localization
   */
  async searchRestaurants(
    query: RestaurantSearchQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ restaurants: RestaurantSearchResultDto[]; pagination: PaginationMeta }> {
    const { restaurants, pagination } = await this.searchRepo.searchRestaurants(query);

    // Get cuisines for all restaurants in batch
    const restaurantIds = restaurants.map((r: Record<string, unknown>) => String(r._id));
    const cuisineMap = await this.searchRepo.getCuisinesForRestaurants(restaurantIds);

    // Transform to localized response DTOs
    const localizedRestaurants = restaurants.map((r: Record<string, unknown>) => {
      const rId = String(r._id);

      // Localize city
      const cityRaw = r.city_id as Record<string, unknown> | null;
      let city = null;
      if (cityRaw && typeof cityRaw === 'object' && '_id' in cityRaw) {
        city = {
          id: String(cityRaw._id),
          name: this.localizePopulatedName(cityRaw, lang),
          slug: String(cityRaw.slug || ''),
        };
      }

      // Localize canton
      const cantonRaw = r.canton_id as Record<string, unknown> | null;
      let canton = null;
      if (cantonRaw && typeof cantonRaw === 'object' && '_id' in cantonRaw) {
        canton = {
          id: String(cantonRaw._id),
          name: this.localizePopulatedName(cantonRaw, lang),
          slug: String(cantonRaw.slug || ''),
          code: cantonRaw.code ? String(cantonRaw.code) : undefined,
        };
      }

      // Brand
      const brandRaw = r.brand_id as Record<string, unknown> | null;
      let brand = null;
      if (brandRaw && typeof brandRaw === 'object' && '_id' in brandRaw) {
        brand = {
          id: String(brandRaw._id),
          name: String(brandRaw.name || ''),
          slug: String(brandRaw.slug || ''),
          logo_url: brandRaw.logo_url ? String(brandRaw.logo_url) : null,
        };
      }

      // Cuisines (localized)
      const rawCuisines = cuisineMap.get(rId) || [];
      const localizedCuisines = rawCuisines.map((c) => ({
        id: c.id,
        name: this.localizeField(c.name as Record<string, string>, lang) || '',
        slug: c.slug,
      }));

      const estMinutes = r.estimated_delivery_minutes as { min: number; max: number } | undefined;

      return {
        id: rId,
        name: String(r.name || ''),
        slug: String(r.slug || ''),
        address: String(r.address || ''),
        postal_code: String(r.postal_code || ''),
        rating: Number(r.rating || 0),
        review_count: Number(r.review_count || 0),
        logo_url: r.logo_url ? String(r.logo_url) : null,
        cover_image_url: r.cover_image_url ? String(r.cover_image_url) : null,
        delivery_fee: r.delivery_fee != null ? Number(r.delivery_fee) : null,
        minimum_order: r.minimum_order != null ? Number(r.minimum_order) : null,
        estimated_delivery_minutes: estMinutes || null,
        supports_delivery: Boolean(r.supports_delivery),
        supports_pickup: Boolean(r.supports_pickup),
        is_featured: Boolean(r.is_featured),
        city,
        canton,
        brand,
        cuisines: localizedCuisines,
      } as RestaurantSearchResultDto;
    });

    return { restaurants: localizedRestaurants, pagination };
  }

  // ==================== MENU ITEM SEARCH ====================

  /**
   * Search menu items within a specific restaurant
   */
  async searchMenuItems(
    restaurantId: string,
    query: MenuItemSearchQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<{ items: MenuItemSearchResultDto[]; pagination: PaginationMeta }> {
    const { items, pagination } = await this.searchRepo.searchMenuItems(restaurantId, query);

    // Transform to localized response DTOs
    const localizedItems = items.map((item: Record<string, unknown>) => {
      const nameField = item.name as Record<string, string> | undefined;
      const descField = item.description as Record<string, string> | undefined;

      // Localize category
      const catRaw = item.category_id as Record<string, unknown> | null;
      let category = null;
      if (catRaw && typeof catRaw === 'object' && '_id' in catRaw) {
        category = {
          id: String(catRaw._id),
          name: this.localizePopulatedName(catRaw, lang),
          slug: String(catRaw.slug || ''),
        };
      }

      return {
        id: String(item._id),
        name: this.localizeField(nameField, lang) || '',
        description: this.localizeField(descField, lang),
        price: Number(item.price || 0),
        currency: String(item.currency || 'CHF'),
        image_url: item.image_url ? String(item.image_url) : null,
        is_available: Boolean(item.is_available),
        is_popular: Boolean(item.is_popular),
        allergens: (item.allergens as string[]) || [],
        dietary_flags: (item.dietary_flags as string[]) || [],
        category,
        restaurant_id: String(item.restaurant_id),
      } as MenuItemSearchResultDto;
    });

    return { items: localizedItems, pagination };
  }

  // ==================== SEARCH SUGGESTIONS ====================

  /**
   * Get autocomplete suggestions for restaurants and cuisines
   */
  async getSuggestions(
    query: SearchSuggestionsQueryDto,
    lang: SupportedLanguage = 'de'
  ): Promise<SearchSuggestionsResponseDto> {
    const raw = await this.searchRepo.getSuggestions(query);

    const restaurants = raw.restaurants.map((r) => ({
      type: 'restaurant' as const,
      id: r._id,
      name: r.name,
      slug: r.slug,
      extra: r.city_name,
    }));

    const cuisines = raw.cuisines.map((c) => ({
      type: 'cuisine' as const,
      id: c._id,
      name: this.localizeField(c.name as Record<string, string>, lang) || '',
      slug: c.slug,
      extra: `${c.count} restaurant${c.count !== 1 ? 's' : ''}`,
    }));

    return { restaurants, cuisines };
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Invalidate all search caches
   */
  async invalidateSearchCache(): Promise<void> {
    await this.searchRepo.invalidateCache('search:*');
    logger.info('All search caches invalidated');
  }
}

// Singleton
export const searchService = new SearchService(searchRepository);
