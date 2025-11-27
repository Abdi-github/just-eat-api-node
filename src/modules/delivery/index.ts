// Delivery Module — Barrel Export

// Types & Enums
export {
  DeliveryStatus,
  DELIVERY_STATUS_TRANSITIONS,
  DELIVERY_STATUS_TIMESTAMP,
  DELIVERY_CONSTANTS,
} from './delivery.types.js';

export type {
  DeliveryAddressSnapshot,
  CourierLocation,
  UpdateLocationDto,
  AdminAssignCourierDto,
  CancelDeliveryDto,
  AvailableDeliveriesQueryDto,
  CourierDeliveryHistoryDto,
  AdminDeliveryQueryDto,
  DeliveryResponseDto,
} from './delivery.types.js';

// Model
export { DeliveryAssignment } from './delivery.model.js';
export type { IDeliveryAssignment } from './delivery.model.js';

// Repository & Service
export { DeliveryRepository } from './delivery.repository.js';
export { DeliveryService } from './delivery.service.js';

// Controller
export { deliveryController } from './delivery.controller.js';

// Validators
export { deliveryValidators } from './delivery.validator.js';

// Routes
export { default as deliveryCourierRoutes } from './delivery.courier.routes.js';
export { default as deliveryPublicRoutes } from './delivery.public.routes.js';
export { default as deliveryAdminRoutes } from './delivery.admin.routes.js';
