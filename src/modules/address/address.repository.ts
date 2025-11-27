import { Address, IAddress } from './address.model.js';
import type { AddressQueryDto, AddressCreateDto, AddressUpdateDto } from './address.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Address Repository
 * Data access layer for customer delivery addresses
 */
export class AddressRepository {
  // ==================== QUERY METHODS ====================

  /**
   * Find all addresses for a user with sorting and pagination
   */
  async findAllByUser(
    userId: string,
    query: AddressQueryDto
  ): Promise<{ addresses: IAddress[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 20, sort = '-is_default', order = 'desc' } = query;

    const filter: Record<string, unknown> = { user_id: userId };

    const total = await Address.countDocuments(filter);

    // Build sort — default addresses first, then by created_at
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : order === 'desc' ? -1 : 1;
    sortObj[sortField] = sortDir;
    // Secondary sort
    if (sortField !== 'created_at') {
      sortObj.created_at = -1;
    }

    const addresses = await Address.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .lean<IAddress[]>()
      .exec();

    const pagination = calculatePaginationMeta(page, limit, total);

    return { addresses, pagination };
  }

  /**
   * Find address by ID
   */
  async findById(id: string): Promise<IAddress | null> {
    return Address.findById(id)
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .lean<IAddress>()
      .exec();
  }

  /**
   * Find address by ID (owned by a specific user)
   */
  async findByIdAndUser(id: string, userId: string): Promise<IAddress | null> {
    return Address.findOne({ _id: id, user_id: userId })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .lean<IAddress>()
      .exec();
  }

  /**
   * Count addresses for a user
   */
  async countByUser(userId: string): Promise<number> {
    return Address.countDocuments({ user_id: userId });
  }

  /**
   * Find the current default address for a user
   */
  async findDefaultByUser(userId: string): Promise<IAddress | null> {
    return Address.findOne({ user_id: userId, is_default: true }).lean<IAddress>().exec();
  }

  // ==================== MUTATION METHODS ====================

  /**
   * Create a new address
   */
  async create(userId: string, data: AddressCreateDto): Promise<IAddress> {
    const address = new Address({
      user_id: userId,
      label: data.label,
      street: data.street,
      street_number: data.street_number,
      floor: data.floor ?? null,
      postal_code: data.postal_code,
      city_id: data.city_id,
      canton_id: data.canton_id,
      country: 'CH',
      instructions: data.instructions ?? null,
      is_default: data.is_default ?? false,
    });
    await address.save();

    // Return populated
    return this.findById(address._id.toString()) as Promise<IAddress>;
  }

  /**
   * Update an address
   */
  async update(id: string, userId: string, data: AddressUpdateDto): Promise<IAddress | null> {
    const updateData: Record<string, unknown> = {};

    if (data.label !== undefined) updateData.label = data.label;
    if (data.street !== undefined) updateData.street = data.street;
    if (data.street_number !== undefined) updateData.street_number = data.street_number;
    if (data.floor !== undefined) updateData.floor = data.floor;
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code;
    if (data.city_id !== undefined) updateData.city_id = data.city_id;
    if (data.canton_id !== undefined) updateData.canton_id = data.canton_id;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.is_default !== undefined) updateData.is_default = data.is_default;

    const address = await Address.findOneAndUpdate({ _id: id, user_id: userId }, updateData, {
      returnDocument: 'after',
    })
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .lean<IAddress>()
      .exec();

    return address;
  }

  /**
   * Delete an address (owned by a specific user)
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await Address.findOneAndDelete({ _id: id, user_id: userId }).exec();
    return result !== null;
  }

  /**
   * Unset default flag on all user's addresses
   */
  async unsetDefaultForUser(userId: string): Promise<void> {
    await Address.updateMany({ user_id: userId, is_default: true }, { is_default: false }).exec();
  }

  /**
   * Set a specific address as default
   */
  async setDefault(id: string, userId: string): Promise<IAddress | null> {
    return Address.findOneAndUpdate(
      { _id: id, user_id: userId },
      { is_default: true },
      { returnDocument: 'after' }
    )
      .populate('city_id', 'name slug')
      .populate('canton_id', 'name slug code')
      .lean<IAddress>()
      .exec();
  }
}

// Singleton instance
export const addressRepository = new AddressRepository();
