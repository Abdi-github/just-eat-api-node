import { Canton, ICanton } from './canton.model.js';
import { City, ICity } from './city.model.js';
import type {
  CantonQueryDto,
  CityQueryDto,
  CantonCreateDto,
  CantonUpdateDto,
  CityCreateDto,
  CityUpdateDto,
  CityWithCanton,
} from './location.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Location Repository
 * Data access layer for Cantons and Cities
 */
export class LocationRepository {
  // ==================== CANTON METHODS ====================

  /**
   * Find all cantons with filtering, sorting, and pagination
   */
  async findAllCantons(
    query: CantonQueryDto
  ): Promise<{ cantons: ICanton[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 50, sort = 'code', order = 'asc', is_active, code, search } = query;

    const filter: Record<string, unknown> = {};

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    if (code) {
      filter.code = code.toUpperCase();
    }

    if (search) {
      filter.$or = [
        { code: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
        { 'name.en': new RegExp(search, 'i') },
        { 'name.fr': new RegExp(search, 'i') },
        { 'name.de': new RegExp(search, 'i') },
        { 'name.it': new RegExp(search, 'i') },
      ];
    }

    const total = await Canton.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;

    const cantons = await Canton.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<ICanton[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);

    return { cantons, pagination };
  }

  /**
   * Find canton by ID
   */
  async findCantonById(id: string): Promise<ICanton | null> {
    return Canton.findById(id).lean<ICanton>().exec();
  }

  /**
   * Find canton by slug
   */
  async findCantonBySlug(slug: string): Promise<ICanton | null> {
    return Canton.findOne({ slug }).lean<ICanton>().exec();
  }

  /**
   * Find canton by code
   */
  async findCantonByCode(code: string): Promise<ICanton | null> {
    return Canton.findOne({ code: code.toUpperCase() }).lean<ICanton>().exec();
  }

  /**
   * Create a canton
   */
  async createCanton(data: CantonCreateDto): Promise<ICanton> {
    const canton = new Canton({
      code: data.code.toUpperCase(),
      name: data.name,
      slug: data.slug,
      is_active: data.is_active ?? true,
    });
    await canton.save();
    return canton.toObject();
  }

  /**
   * Update a canton
   */
  async updateCanton(id: string, data: CantonUpdateDto): Promise<ICanton | null> {
    const updateData: Record<string, unknown> = {};

    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.name !== undefined) {
      // Support partial name updates
      if (data.name.en !== undefined) updateData['name.en'] = data.name.en;
      if (data.name.fr !== undefined) updateData['name.fr'] = data.name.fr;
      if (data.name.de !== undefined) updateData['name.de'] = data.name.de;
      if (data.name.it !== undefined) updateData['name.it'] = data.name.it;
    }
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return Canton.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .lean<ICanton>()
      .exec();
  }

  /**
   * Delete a canton
   */
  async deleteCanton(id: string): Promise<boolean> {
    const result = await Canton.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if canton exists
   */
  async cantonExists(id: string): Promise<boolean> {
    const count = await Canton.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if canton code is unique
   */
  async isCantonCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { code: code.toUpperCase() };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await Canton.countDocuments(filter);
    return count === 0;
  }

  /**
   * Check if canton slug is unique
   */
  async isCantonSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await Canton.countDocuments(filter);
    return count === 0;
  }

  // ==================== CITY METHODS ====================

  /**
   * Find all cities with filtering, sorting, and pagination
   */
  async findAllCities(
    query: CityQueryDto,
    populateCanton = false
  ): Promise<{ cities: (ICity | CityWithCanton)[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 50,
      sort = 'slug',
      order = 'asc',
      is_active,
      canton_id,
      postal_code,
      search,
    } = query;

    const filter: Record<string, unknown> = {};

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    if (canton_id) {
      filter.canton_id = canton_id;
    }

    if (postal_code) {
      filter.postal_codes = postal_code;
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

    const total = await City.countDocuments(filter);

    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;

    let cityQuery = City.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    if (populateCanton) {
      cityQuery = cityQuery.populate('canton_id', 'code name slug is_active created_at updated_at');
    }

    const cities = await cityQuery.lean<(ICity | CityWithCanton)[]>().exec();

    const pagination = calculatePaginationMeta(page, limit, total);

    return { cities, pagination };
  }

  /**
   * Find city by ID
   */
  async findCityById(id: string, populateCanton = false): Promise<ICity | CityWithCanton | null> {
    let query = City.findById(id);

    if (populateCanton) {
      query = query.populate('canton_id', 'code name slug is_active created_at updated_at');
    }

    return query.lean<ICity | CityWithCanton>().exec();
  }

  /**
   * Find city by slug
   */
  async findCityBySlug(
    slug: string,
    populateCanton = false
  ): Promise<ICity | CityWithCanton | null> {
    let query = City.findOne({ slug });

    if (populateCanton) {
      query = query.populate('canton_id', 'code name slug is_active created_at updated_at');
    }

    return query.lean<ICity | CityWithCanton>().exec();
  }

  /**
   * Find cities by canton ID
   */
  async findCitiesByCanton(cantonId: string): Promise<ICity[]> {
    return City.find({ canton_id: cantonId, is_active: true })
      .sort({ slug: 1 })
      .lean<ICity[]>()
      .exec();
  }

  /**
   * Find cities by postal code
   */
  async findCitiesByPostalCode(
    postalCode: number,
    populateCanton = false
  ): Promise<(ICity | CityWithCanton)[]> {
    let query = City.find({ postal_codes: postalCode, is_active: true }).sort({ slug: 1 });

    if (populateCanton) {
      query = query.populate('canton_id', 'code name slug');
    }

    return query.lean<(ICity | CityWithCanton)[]>().exec();
  }

  /**
   * Create a city
   */
  async createCity(data: CityCreateDto): Promise<ICity> {
    const city = new City({
      canton_id: data.canton_id,
      name: data.name,
      slug: data.slug,
      postal_codes: data.postal_codes ?? [],
      is_active: data.is_active ?? true,
    });
    await city.save();
    return city.toObject();
  }

  /**
   * Update a city
   */
  async updateCity(id: string, data: CityUpdateDto): Promise<ICity | null> {
    const updateData: Record<string, unknown> = {};

    if (data.canton_id !== undefined) updateData.canton_id = data.canton_id;
    if (data.name !== undefined) {
      if (data.name.en !== undefined) updateData['name.en'] = data.name.en;
      if (data.name.fr !== undefined) updateData['name.fr'] = data.name.fr;
      if (data.name.de !== undefined) updateData['name.de'] = data.name.de;
      if (data.name.it !== undefined) updateData['name.it'] = data.name.it;
    }
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.postal_codes !== undefined) updateData.postal_codes = data.postal_codes;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return City.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).lean<ICity>().exec();
  }

  /**
   * Delete a city
   */
  async deleteCity(id: string): Promise<boolean> {
    const result = await City.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if city exists
   */
  async cityExists(id: string): Promise<boolean> {
    const count = await City.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if city slug is unique
   */
  async isCitySlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await City.countDocuments(filter);
    return count === 0;
  }

  /**
   * Count cities in a canton
   */
  async countCitiesInCanton(cantonId: string): Promise<number> {
    return City.countDocuments({ canton_id: cantonId });
  }
}

// Export singleton instance
export const locationRepository = new LocationRepository();
