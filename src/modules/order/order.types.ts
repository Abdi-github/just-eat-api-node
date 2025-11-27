/**
 * Order Types & DTOs
 *
 * Type definitions for the order module including status enums,
 * status transition rules, and Data Transfer Objects.
 */

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Order status enum — follows the order lifecycle state machine
 */
export enum OrderStatus {
  PLACED = 'PLACED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

/**
 * Order type — delivery or pickup
 */
export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

/**
 * Payment method enum
 */
export enum PaymentMethod {
  CARD = 'card',
  TWINT = 'twint',
  POSTFINANCE = 'postfinance',
  CASH = 'cash',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================================================
// Status Transition Rules
// ============================================================================

/**
 * Valid status transitions map.
 * Key = current status, Value = array of valid next statuses
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.PICKED_UP, OrderStatus.DELIVERED],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Map of status → the timestamp field that gets set when transitioning INTO that status
 */
export const STATUS_TIMESTAMP_FIELD: Record<string, string> = {
  [OrderStatus.PLACED]: 'placed_at',
  [OrderStatus.ACCEPTED]: 'accepted_at',
  [OrderStatus.REJECTED]: 'rejected_at',
  [OrderStatus.PREPARING]: 'preparing_at',
  [OrderStatus.READY]: 'ready_at',
  [OrderStatus.PICKED_UP]: 'picked_up_at',
  [OrderStatus.IN_TRANSIT]: 'in_transit_at',
  [OrderStatus.DELIVERED]: 'delivered_at',
  [OrderStatus.CANCELLED]: 'cancelled_at',
};

/**
 * Who can transition to each status
 */
export const STATUS_ALLOWED_ROLES: Record<string, string[]> = {
  [OrderStatus.ACCEPTED]: ['restaurant_owner', 'restaurant_staff', 'super_admin'],
  [OrderStatus.REJECTED]: ['restaurant_owner', 'restaurant_staff', 'super_admin'],
  [OrderStatus.PREPARING]: ['restaurant_owner', 'restaurant_staff', 'super_admin'],
  [OrderStatus.READY]: ['restaurant_owner', 'restaurant_staff', 'super_admin'],
  [OrderStatus.PICKED_UP]: ['courier', 'super_admin'],
  [OrderStatus.IN_TRANSIT]: ['courier', 'super_admin'],
  [OrderStatus.DELIVERED]: ['courier', 'restaurant_staff', 'restaurant_owner', 'super_admin'],
  [OrderStatus.CANCELLED]: ['customer', 'super_admin'],
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Order-related constants
 */
export const ORDER_CONSTANTS = {
  /** Order number prefix */
  ORDER_NUMBER_PREFIX: 'JE',
  /** Maximum items per order */
  MAX_ITEMS_PER_ORDER: 50,
  /** Maximum quantity per item */
  MAX_ITEM_QUANTITY: 20,
  /** Default service fee in CHF */
  DEFAULT_SERVICE_FEE: 1.5,
  /** Minimum tip in CHF */
  MIN_TIP: 0,
  /** Maximum tip in CHF */
  MAX_TIP: 100,
  /** Maximum special instructions length */
  MAX_SPECIAL_INSTRUCTIONS_LENGTH: 500,
  /** Default sort field */
  DEFAULT_SORT: '-created_at',
  /** Default page size */
  DEFAULT_LIMIT: 20,
  /** Maximum page size */
  MAX_LIMIT: 100,
  /** Redis cache TTL for order status (seconds) */
  ORDER_STATUS_CACHE_TTL: 86400, // 24 hours
} as const;

/**
 * Valid sort fields for order listing
 */
export const ORDER_SORT_FIELDS = ['created_at', 'total', 'placed_at', 'status'] as const;

// ============================================================================
// Sub-document Types
// ============================================================================

/**
 * Order item option (e.g., size, extras)
 */
export interface OrderItemOption {
  name: string;
  price: number;
}

/**
 * Order item — snapshot of menu item at time of ordering
 */
export interface OrderItemDto {
  menu_item_id: string;
  quantity: number;
  special_instructions?: string;
  options?: OrderItemOption[];
}

/**
 * Order item as stored in the database
 */
export interface OrderItemStored {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string | null;
  options?: OrderItemOption[];
}

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * DTO for placing a new order
 */
export interface OrderCreateDto {
  restaurant_id: string;
  delivery_address_id?: string;
  order_type: OrderType;
  items: OrderItemDto[];
  payment_method: PaymentMethod;
  special_instructions?: string;
  tip?: number;
  coupon_code?: string;
}

/**
 * DTO for updating order status
 */
export interface OrderStatusUpdateDto {
  status: OrderStatus;
  rejection_reason?: string;
  cancellation_reason?: string;
}

/**
 * DTO for assigning a courier to an order
 */
export interface OrderAssignCourierDto {
  courier_id: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

/**
 * Customer order query parameters
 */
export interface OrderQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  status?: OrderStatus;
  order_type?: OrderType;
}

/**
 * Restaurant order query parameters
 */
export interface RestaurantOrderQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  status?: OrderStatus;
  order_type?: OrderType;
  date_from?: string;
  date_to?: string;
}

/**
 * Admin order query parameters
 */
export interface AdminOrderQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  status?: OrderStatus;
  order_type?: OrderType;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  restaurant_id?: string;
  user_id?: string;
  courier_id?: string;
  date_from?: string;
  date_to?: string;
  order_number?: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Order item response
 */
export interface OrderItemResponseDto {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string | null;
  options?: OrderItemOption[];
}

/**
 * Order response DTO
 */
export interface OrderResponseDto {
  id: string;
  order_number: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name?: string;
  courier_id?: string | null;
  delivery_address_id?: string | null;
  order_type: string;
  status: string;
  items: OrderItemResponseDto[];
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tip: number;
  discount: number;
  total: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  special_instructions?: string | null;
  estimated_delivery_at?: string | null;
  placed_at: string;
  accepted_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  picked_up_at?: string | null;
  in_transit_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;
}
