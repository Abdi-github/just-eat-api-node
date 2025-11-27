// ==================== ADDRESS MODULE ====================
// Barrel exports

// Models
export { Address, type IAddress } from './address.model.js';

// Repository
export { AddressRepository, addressRepository } from './address.repository.js';

// Service
export { AddressService, addressService } from './address.service.js';

// Controller
export { addressController } from './address.controller.js';

// Validators
export { addressValidators } from './address.validator.js';

// Routes
export { default as addressRoutes } from './address.routes.js';

// Types
export type {
  AddressQueryDto,
  AddressCreateDto,
  AddressUpdateDto,
  AddressResponseDto,
  AddressPopulatedResponseDto,
} from './address.types.js';
