/**
 * Order Module — Barrel Export
 */

// Model
export { Order } from './order.model.js';
export type { IOrder, IOrderItem } from './order.model.js';

// Types
export {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ORDER_STATUS_TRANSITIONS,
  STATUS_TIMESTAMP_FIELD,
  STATUS_ALLOWED_ROLES,
  ORDER_CONSTANTS,
} from './order.types.js';
export type {
  OrderCreateDto,
  OrderStatusUpdateDto,
  OrderQueryDto,
  RestaurantOrderQueryDto,
  AdminOrderQueryDto,
  OrderResponseDto,
  OrderItemDto,
  OrderItemStored,
} from './order.types.js';

// Repository
export { OrderRepository, orderRepository } from './order.repository.js';

// Service
export { OrderService, orderService } from './order.service.js';

// Controller
export { orderController } from './order.controller.js';

// Validators
export { orderValidators } from './order.validator.js';

// Routes
export { default as orderPublicRoutes } from './order.public.routes.js';
export { default as orderRestaurantRoutes } from './order.restaurant.routes.js';
export { default as orderCourierRoutes } from './order.courier.routes.js';
export { default as orderAdminRoutes } from './order.admin.routes.js';
