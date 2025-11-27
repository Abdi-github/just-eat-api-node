/**
 * Delivery Types & DTOs
 *
 * Type definitions for the delivery module including status enums,
 * assignment lifecycle, and Data Transfer Objects.
 */

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Delivery assignment status
 */
export enum DeliveryStatus {
  PENDING = 'PENDING', // Awaiting courier assignment
  ASSIGNED = 'ASSIGNED', // Courier accepted / was assigned
  PICKED_UP = 'PICKED_UP', // Courier picked up the order
  IN_TRANSIT = 'IN_TRANSIT', // Courier en route to customer
  DELIVERED = 'DELIVERED', // Successfully delivered
  CANCELLED = 'CANCELLED', // Delivery cancelled
  FAILED = 'FAILED', // Delivery failed (unable to reach customer, etc.)
}

/**
 * Valid delivery status transitions
 */
export const DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.PENDING]: [DeliveryStatus.ASSIGNED, DeliveryStatus.CANCELLED],
  [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
  [DeliveryStatus.PICKED_UP]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED],
  [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
  [DeliveryStatus.DELIVERED]: [],
  [DeliveryStatus.CANCELLED]: [],
  [DeliveryStatus.FAILED]: [],
};

/**
 * Map of delivery status → the timestamp field set when entering that status
 */
export const DELIVERY_STATUS_TIMESTAMP: Record<string, string> = {
  [DeliveryStatus.ASSIGNED]: 'assigned_at',
  [DeliveryStatus.PICKED_UP]: 'picked_up_at',
  [DeliveryStatus.IN_TRANSIT]: 'in_transit_at',
  [DeliveryStatus.DELIVERED]: 'delivered_at',
  [DeliveryStatus.CANCELLED]: 'cancelled_at',
};

/**
 * Delivery-related constants
 */
export const DELIVERY_CONSTANTS = {
  /** Default page size */
  DEFAULT_LIMIT: 20,
  /** Maximum page size */
  MAX_LIMIT: 100,
  /** Default sort */
  DEFAULT_SORT: '-created_at',
  /** Maximum radius in km for available deliveries */
  MAX_SEARCH_RADIUS_KM: 15,
  /** Location update staleness threshold (minutes) */
  LOCATION_STALE_MINUTES: 10,
} as const;

// ============================================================================
// Embedded Types
// ============================================================================

/**
 * Snapshot of delivery address at time of assignment
 */
export interface DeliveryAddressSnapshot {
  street: string;
  street_number: string;
  postal_code: string;
  city: string;
  floor?: string;
  instructions?: string;
}

/**
 * Courier location update
 */
export interface CourierLocation {
  lat: number;
  lng: number;
  updated_at: Date;
}

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * DTO for updating courier location
 */
export interface UpdateLocationDto {
  lat: number;
  lng: number;
}

/**
 * DTO for admin assigning courier manually
 */
export interface AdminAssignCourierDto {
  courier_id: string;
}

/**
 * DTO for cancelling a delivery
 */
export interface CancelDeliveryDto {
  reason?: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

/**
 * Query params for available deliveries
 */
export interface AvailableDeliveriesQueryDto {
  page?: number;
  limit?: number;
  city?: string;
  postal_code?: string;
}

/**
 * Courier delivery history query
 */
export interface CourierDeliveryHistoryDto {
  page?: number;
  limit?: number;
  sort?: string;
  status?: DeliveryStatus;
  date_from?: string;
  date_to?: string;
}

/**
 * Admin delivery query
 */
export interface AdminDeliveryQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  status?: DeliveryStatus;
  courier_id?: string;
  restaurant_id?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Delivery assignment response DTO
 */
export interface DeliveryResponseDto {
  id: string;
  order_id: string;
  order_number?: string;
  restaurant_id: string;
  restaurant_name?: string;
  restaurant_address?: string;
  courier_id: string | null;
  status: string;
  pickup_address: string;
  delivery_address: DeliveryAddressSnapshot;
  delivery_fee: number;
  distance_km: number | null;
  estimated_pickup_at: string | null;
  estimated_delivery_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  courier_location: CourierLocation | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
