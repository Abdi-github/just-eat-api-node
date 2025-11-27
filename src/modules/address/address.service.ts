import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import { addressRepository } from './address.repository.js';
import { locationRepository } from '../location/location.repository.js';
import type {
  AddressQueryDto,
  AddressCreateDto,
  AddressUpdateDto,
  AddressPopulatedResponseDto,
} from './address.types.js';
import { MAX_ADDRESSES_PER_USER } from './address.types.js';
import type { IAddress } from './address.model.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type { SupportedLanguage } from '../location/location.types.js';

/**
 * Address Service
 * Business logic for customer delivery addresses
 */
export class AddressService {
  // ==================== HELPER METHODS ====================

  /**
   * Transform address document to response DTO with localized city/canton names
   */
  private toAddressResponse(
    address: IAddress,
    lang?: SupportedLanguage
  ): AddressPopulatedResponseDto {
    const cityDoc = address.city_id as unknown as Record<string, unknown> | null;
    const cantonDoc = address.canton_id as unknown as Record<string, unknown> | null;

    // Resolve localized name for city
    let city: AddressPopulatedResponseDto['city'] = null;
    if (cityDoc && typeof cityDoc === 'object' && '_id' in cityDoc) {
      const nameObj = cityDoc.name as Record<string, string> | string | undefined;
      const resolvedName =
        typeof nameObj === 'string'
          ? nameObj
          : nameObj && lang
            ? nameObj[lang] || nameObj.de || Object.values(nameObj)[0] || ''
            : typeof nameObj === 'object' && nameObj
              ? nameObj.de || Object.values(nameObj)[0] || ''
              : '';
      city = {
        id: (cityDoc._id as { toString(): string }).toString(),
        name: resolvedName,
        slug: (cityDoc.slug as string) || '',
      };
    }

    // Resolve localized name for canton
    let canton: AddressPopulatedResponseDto['canton'] = null;
    if (cantonDoc && typeof cantonDoc === 'object' && '_id' in cantonDoc) {
      const nameObj = cantonDoc.name as Record<string, string> | string | undefined;
      const resolvedName =
        typeof nameObj === 'string'
          ? nameObj
          : nameObj && lang
            ? nameObj[lang] || nameObj.de || Object.values(nameObj)[0] || ''
            : typeof nameObj === 'object' && nameObj
              ? nameObj.de || Object.values(nameObj)[0] || ''
              : '';
      canton = {
        id: (cantonDoc._id as { toString(): string }).toString(),
        name: resolvedName,
        slug: (cantonDoc.slug as string) || '',
        code: (cantonDoc.code as string) || '',
      };
    }

    return {
      id: (address._id as { toString(): string }).toString(),
      user_id: (address.user_id as { toString(): string }).toString(),
      label: address.label,
      street: address.street,
      street_number: address.street_number,
      floor: address.floor,
      postal_code: address.postal_code,
      city,
      canton,
      country: address.country,
      instructions: address.instructions,
      is_default: address.is_default ?? false,
      created_at: address.created_at,
      updated_at: address.updated_at,
    };
  }

  // ==================== CUSTOMER METHODS ====================

  /**
   * Get all addresses for the authenticated user
   */
  async getMyAddresses(
    userId: string,
    query: AddressQueryDto,
    lang?: SupportedLanguage
  ): Promise<{ data: AddressPopulatedResponseDto[]; pagination: PaginationMeta }> {
    const { addresses, pagination } = await addressRepository.findAllByUser(userId, query);

    return {
      data: addresses.map((address) => this.toAddressResponse(address, lang)),
      pagination,
    };
  }

  /**
   * Get a single address by ID (must belong to the user)
   */
  async getAddressById(
    id: string,
    userId: string,
    lang?: SupportedLanguage
  ): Promise<AddressPopulatedResponseDto> {
    const address = await addressRepository.findByIdAndUser(id, userId);
    if (!address) {
      throw NotFoundError('Address not found');
    }
    return this.toAddressResponse(address, lang);
  }

  /**
   * Create a new address for the authenticated user
   */
  async createAddress(
    userId: string,
    data: AddressCreateDto,
    lang?: SupportedLanguage
  ): Promise<AddressPopulatedResponseDto> {
    // Check address limit
    const count = await addressRepository.countByUser(userId);
    if (count >= MAX_ADDRESSES_PER_USER) {
      throw BadRequestError(
        `Maximum of ${MAX_ADDRESSES_PER_USER} addresses reached. Please delete an existing address first.`
      );
    }

    // Validate city exists
    const cityExists = await locationRepository.cityExists(data.city_id);
    if (!cityExists) {
      throw NotFoundError('City not found');
    }

    // Validate canton exists
    const cantonExists = await locationRepository.cantonExists(data.canton_id);
    if (!cantonExists) {
      throw NotFoundError('Canton not found');
    }

    // If this address is set as default, unset previous default
    if (data.is_default) {
      await addressRepository.unsetDefaultForUser(userId);
    }

    // If this is the user's first address, auto-set as default
    if (count === 0) {
      data.is_default = true;
    }

    const address = await addressRepository.create(userId, data);
    return this.toAddressResponse(address, lang);
  }

  /**
   * Update an existing address
   */
  async updateAddress(
    id: string,
    userId: string,
    data: AddressUpdateDto,
    lang?: SupportedLanguage
  ): Promise<AddressPopulatedResponseDto> {
    // Verify address exists and belongs to user
    const existing = await addressRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw NotFoundError('Address not found');
    }

    // Validate city if being updated
    if (data.city_id) {
      const cityExists = await locationRepository.cityExists(data.city_id);
      if (!cityExists) {
        throw NotFoundError('City not found');
      }
    }

    // Validate canton if being updated
    if (data.canton_id) {
      const cantonExists = await locationRepository.cantonExists(data.canton_id);
      if (!cantonExists) {
        throw NotFoundError('Canton not found');
      }
    }

    // If setting as default, unset previous default
    if (data.is_default === true) {
      await addressRepository.unsetDefaultForUser(userId);
    }

    const address = await addressRepository.update(id, userId, data);
    if (!address) {
      throw NotFoundError('Address not found');
    }

    return this.toAddressResponse(address, lang);
  }

  /**
   * Delete an address
   */
  async deleteAddress(id: string, userId: string): Promise<void> {
    // Verify address exists and belongs to user
    const existing = await addressRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw NotFoundError('Address not found');
    }

    const wasDefault = existing.is_default ?? false;

    const deleted = await addressRepository.delete(id, userId);
    if (!deleted) {
      throw NotFoundError('Address not found');
    }

    // If the deleted address was default, set the most recent remaining as default
    if (wasDefault) {
      const remaining = await addressRepository.findAllByUser(userId, {
        page: 1,
        limit: 1,
        sort: '-created_at',
      });
      if (remaining.addresses.length > 0) {
        const nextDefault = remaining.addresses[0];
        await addressRepository.setDefault(
          (nextDefault._id as { toString(): string }).toString(),
          userId
        );
      }
    }
  }

  /**
   * Set an address as the default
   */
  async setDefaultAddress(
    id: string,
    userId: string,
    lang?: SupportedLanguage
  ): Promise<AddressPopulatedResponseDto> {
    // Verify address exists and belongs to user
    const existing = await addressRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw NotFoundError('Address not found');
    }

    // Unset all defaults, then set the new one
    await addressRepository.unsetDefaultForUser(userId);
    const address = await addressRepository.setDefault(id, userId);
    if (!address) {
      throw NotFoundError('Address not found');
    }

    return this.toAddressResponse(address, lang);
  }
}

// Singleton instance
export const addressService = new AddressService();
