import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  InternalServerError,
} from '../../shared/errors/AppError.js';
import { generateSlug } from '../../shared/utils/slug.helper.js';
import { locationRepository } from './location.repository.js';
import type {
  TranslatedField,
  SupportedLanguage,
  CantonQueryDto,
  CityQueryDto,
  CantonCreateDto,
  CantonUpdateDto,
  CityCreateDto,
  CityUpdateDto,
  CantonResponseDto,
  CityResponseDto,
  CantonListResponseDto,
  CityListResponseDto,
  CityWithCanton,
  PopulatedCanton,
} from './location.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Location Service
 * Business logic for Canton and City operations
 */
export class LocationService {
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
   * Transform canton document to response DTO
   */
  private toCantonResponse(
    canton: {
      _id: { toString(): string };
      code: string;
      name: TranslatedField;
      slug: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    lang?: SupportedLanguage,
    cityCount?: number
  ): CantonResponseDto {
    return {
      id: canton._id.toString(),
      code: canton.code,
      name: this.getLocalizedName(canton.name, lang),
      slug: canton.slug,
      is_active: canton.is_active,
      ...(cityCount !== undefined && { city_count: cityCount }),
      created_at: canton.created_at,
      updated_at: canton.updated_at,
    };
  }

  /**
   * Transform city document to response DTO
   */
  private toCityResponse(
    city: CityWithCanton | Record<string, unknown>,
    lang?: SupportedLanguage,
    includeCanton = false
  ): CityResponseDto {
    const c = city as CityWithCanton;
    const cantonId = c.canton_id;
    const isPopulated = typeof cantonId === 'object' && '_id' in cantonId;

    const response: CityResponseDto = {
      id: c._id.toString(),
      canton_id: isPopulated
        ? (cantonId as PopulatedCanton)._id.toString()
        : (cantonId as { toString(): string }).toString(),
      name: this.getLocalizedName(c.name, lang),
      slug: c.slug,
      postal_codes: c.postal_codes,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };

    if (includeCanton && isPopulated) {
      response.canton = this.toCantonResponse(cantonId as PopulatedCanton, lang);
    }

    return response;
  }

  // ==================== CANTON METHODS ====================

  /**
   * Get all cantons
   */
  async getAllCantons(
    query: CantonQueryDto
  ): Promise<{ data: CantonResponseDto[]; pagination: PaginationMeta }> {
    const { cantons, pagination } = await locationRepository.findAllCantons(query);

    return {
      data: cantons.map((canton) => this.toCantonResponse(canton, query.lang)),
      pagination,
    };
  }

  /**
   * Get canton by ID
   */
  async getCantonById(id: string, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    const canton = await locationRepository.findCantonById(id);
    if (!canton) throw NotFoundError('Canton not found');

    const cityCount = await locationRepository.countCitiesInCanton(id);
    return this.toCantonResponse(canton, lang, cityCount);
  }

  /**
   * Get canton by slug
   */
  async getCantonBySlug(slug: string, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    const canton = await locationRepository.findCantonBySlug(slug);
    if (!canton) throw NotFoundError('Canton not found');

    const cityCount = await locationRepository.countCitiesInCanton(canton._id.toString());
    return this.toCantonResponse(canton, lang, cityCount);
  }

  /**
   * Get canton by code
   */
  async getCantonByCode(code: string, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    const canton = await locationRepository.findCantonByCode(code);
    if (!canton) throw NotFoundError('Canton not found');

    const cityCount = await locationRepository.countCitiesInCanton(canton._id.toString());
    return this.toCantonResponse(canton, lang, cityCount);
  }

  /**
   * Create a canton (Admin only)
   */
  async createCanton(data: CantonCreateDto, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    // Check code uniqueness
    const isCodeUnique = await locationRepository.isCantonCodeUnique(data.code);
    if (!isCodeUnique) throw ConflictError('Canton code already exists');

    // Generate slug from German name (default language)
    if (!data.slug) {
      data.slug = generateSlug(data.name.de || data.name.en);
    }

    // Check slug uniqueness
    const isSlugUnique = await locationRepository.isCantonSlugUnique(data.slug);
    if (!isSlugUnique) throw ConflictError('Canton slug already exists');

    const canton = await locationRepository.createCanton(data);
    return this.toCantonResponse(canton, lang);
  }

  /**
   * Update a canton (Admin only)
   */
  async updateCanton(
    id: string,
    data: CantonUpdateDto,
    lang?: SupportedLanguage
  ): Promise<CantonResponseDto> {
    const exists = await locationRepository.cantonExists(id);
    if (!exists) throw NotFoundError('Canton not found');

    // Check code uniqueness if changed
    if (data.code) {
      const isCodeUnique = await locationRepository.isCantonCodeUnique(data.code, id);
      if (!isCodeUnique) throw ConflictError('Canton code already exists');
    }

    // Check slug uniqueness if changed
    if (data.slug) {
      const isSlugUnique = await locationRepository.isCantonSlugUnique(data.slug, id);
      if (!isSlugUnique) throw ConflictError('Canton slug already exists');
    }

    const canton = await locationRepository.updateCanton(id, data);
    if (!canton) throw InternalServerError('Failed to update canton');

    return this.toCantonResponse(canton, lang);
  }

  /**
   * Delete a canton (Admin only)
   */
  async deleteCanton(id: string): Promise<void> {
    const exists = await locationRepository.cantonExists(id);
    if (!exists) throw NotFoundError('Canton not found');

    // Prevent deletion if canton has cities
    const cityCount = await locationRepository.countCitiesInCanton(id);
    if (cityCount > 0) {
      throw BadRequestError(
        `Cannot delete canton with ${cityCount} cities. Delete or reassign cities first.`
      );
    }

    const deleted = await locationRepository.deleteCanton(id);
    if (!deleted) throw InternalServerError('Failed to delete canton');
  }

  // ==================== CITY METHODS ====================

  /**
   * Get all cities
   */
  async getAllCities(
    query: CityQueryDto,
    populateCanton = true
  ): Promise<{ data: CityResponseDto[]; pagination: PaginationMeta }> {
    const { cities, pagination } = await locationRepository.findAllCities(query, populateCanton);

    return {
      data: cities.map((city) =>
        this.toCityResponse(city as CityWithCanton, query.lang, populateCanton)
      ),
      pagination,
    };
  }

  /**
   * Get city by ID
   */
  async getCityById(
    id: string,
    lang?: SupportedLanguage,
    populateCanton = true
  ): Promise<CityResponseDto> {
    const city = await locationRepository.findCityById(id, populateCanton);
    if (!city) throw NotFoundError('City not found');

    return this.toCityResponse(city as CityWithCanton, lang, populateCanton);
  }

  /**
   * Get city by slug
   */
  async getCityBySlug(
    slug: string,
    lang?: SupportedLanguage,
    populateCanton = true
  ): Promise<CityResponseDto> {
    const city = await locationRepository.findCityBySlug(slug, populateCanton);
    if (!city) throw NotFoundError('City not found');

    return this.toCityResponse(city as CityWithCanton, lang, populateCanton);
  }

  /**
   * Get cities by canton ID
   */
  async getCitiesByCanton(
    cantonId: string,
    query: CityQueryDto
  ): Promise<{ data: CityResponseDto[]; pagination: PaginationMeta }> {
    const cantonExists = await locationRepository.cantonExists(cantonId);
    if (!cantonExists) throw NotFoundError('Canton not found');

    const { cities, pagination } = await locationRepository.findAllCities(
      { ...query, canton_id: cantonId },
      true
    );

    return {
      data: cities.map((city) => this.toCityResponse(city as CityWithCanton, query.lang, true)),
      pagination,
    };
  }

  /**
   * Get cities by postal code
   */
  async getCitiesByPostalCode(
    postalCode: number,
    lang?: SupportedLanguage
  ): Promise<CityResponseDto[]> {
    const cities = await locationRepository.findCitiesByPostalCode(postalCode, true);
    return cities.map((city) => this.toCityResponse(city as CityWithCanton, lang, true));
  }

  /**
   * Create a city (Admin only)
   */
  async createCity(data: CityCreateDto, lang?: SupportedLanguage): Promise<CityResponseDto> {
    // Check if canton exists
    const cantonExists = await locationRepository.cantonExists(data.canton_id);
    if (!cantonExists) throw NotFoundError('Canton not found');

    // Generate slug from German name
    if (!data.slug) {
      data.slug = generateSlug(data.name.de || data.name.en);
    }

    // Check slug uniqueness
    const isSlugUnique = await locationRepository.isCitySlugUnique(data.slug);
    if (!isSlugUnique) throw ConflictError('City slug already exists');

    const city = await locationRepository.createCity(data);
    const populatedCity = await locationRepository.findCityById(city._id.toString(), true);

    return this.toCityResponse(populatedCity as CityWithCanton, lang, true);
  }

  /**
   * Update a city (Admin only)
   */
  async updateCity(
    id: string,
    data: CityUpdateDto,
    lang?: SupportedLanguage
  ): Promise<CityResponseDto> {
    const exists = await locationRepository.cityExists(id);
    if (!exists) throw NotFoundError('City not found');

    // Check canton if changed
    if (data.canton_id) {
      const cantonExists = await locationRepository.cantonExists(data.canton_id);
      if (!cantonExists) throw NotFoundError('Canton not found');
    }

    // Check slug uniqueness if changed
    if (data.slug) {
      const isSlugUnique = await locationRepository.isCitySlugUnique(data.slug, id);
      if (!isSlugUnique) throw ConflictError('City slug already exists');
    }

    const city = await locationRepository.updateCity(id, data);
    if (!city) throw InternalServerError('Failed to update city');

    const populatedCity = await locationRepository.findCityById(city._id.toString(), true);
    return this.toCityResponse(populatedCity as CityWithCanton, lang, true);
  }

  /**
   * Delete a city (Admin only)
   */
  async deleteCity(id: string): Promise<void> {
    const exists = await locationRepository.cityExists(id);
    if (!exists) throw NotFoundError('City not found');

    // TODO: Check if city is used by restaurants before deleting

    const deleted = await locationRepository.deleteCity(id);
    if (!deleted) throw InternalServerError('Failed to delete city');
  }

  /**
   * Search locations (cantons and cities combined)
   */
  async searchLocations(
    search: string,
    lang?: SupportedLanguage
  ): Promise<{
    cantons: CantonResponseDto[];
    cities: CityResponseDto[];
  }> {
    const [cantonsResult, citiesResult] = await Promise.all([
      locationRepository.findAllCantons({ search, limit: 10, lang }),
      locationRepository.findAllCities({ search, limit: 20, lang }, true),
    ]);

    return {
      cantons: cantonsResult.cantons.map((canton) => this.toCantonResponse(canton, lang)),
      cities: citiesResult.cities.map((city) =>
        this.toCityResponse(city as CityWithCanton, lang, true)
      ),
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();
