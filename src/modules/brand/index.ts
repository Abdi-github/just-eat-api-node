// ==================== BRAND MODULE ====================
// Barrel exports

// Models
export { Brand, type IBrand } from './brand.model.js';

// Repository
export { BrandRepository, brandRepository } from './brand.repository.js';

// Service
export { BrandService, brandService } from './brand.service.js';

// Controller
export { brandController } from './brand.controller.js';

// Validators
export { brandValidators } from './brand.validator.js';

// Routes
export { default as brandRoutes } from './brand.routes.js';
export { default as brandAdminRoutes } from './brand.admin.routes.js';

// Types
export type {
  BrandQueryDto,
  BrandCreateDto,
  BrandUpdateDto,
  BrandResponseDto,
  BrandListResponseDto,
} from './brand.types.js';
