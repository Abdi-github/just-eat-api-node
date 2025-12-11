/**
 * Analytics Types & DTOs
 *
 * Type definitions for the analytics module including
 * enums, constants, request/query DTOs, and response DTOs.
 *
 * Analytics is a read-only module — no create/update DTOs needed.
 */

// ============================================================================
// Enums
// ============================================================================

export enum DatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  THIS_YEAR = 'this_year',
}

export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// ============================================================================
// Constants
// ============================================================================

export const DATE_PRESET_VALUES = Object.values(DatePreset);
export const ANALYTICS_PERIOD_VALUES = Object.values(AnalyticsPeriod);

export const ANALYTICS_CONSTANTS = {
  DEFAULT_TOP_ITEMS_LIMIT: 10,
  MAX_TOP_ITEMS_LIMIT: 50,
  DEFAULT_TOP_RESTAURANTS_LIMIT: 10,
  MAX_TOP_RESTAURANTS_LIMIT: 50,
} as const;

// ============================================================================
// Query DTOs
// ============================================================================

/**
 * Date range query parameters — used by all analytics endpoints
 */
export interface AnalyticsDateQueryDto {
  preset?: string; // DatePreset value
  from?: string; // ISO date (YYYY-MM-DD)
  to?: string; // ISO date (YYYY-MM-DD)
}

/**
 * Revenue over time query
 */
export interface RevenueTimeSeriesQueryDto extends AnalyticsDateQueryDto {
  period?: string; // AnalyticsPeriod value (default: daily)
}

/**
 * Top items / top restaurants query
 */
export interface TopItemsQueryDto extends AnalyticsDateQueryDto {
  limit?: string; // number of results (default: 10)
}

// ============================================================================
// Helper types
// ============================================================================

export interface DateRange {
  from: Date;
  to: Date;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface OrderStatusBreakdown {
  PLACED: number;
  ACCEPTED: number;
  REJECTED: number;
  PREPARING: number;
  READY: number;
  PICKED_UP: number;
  IN_TRANSIT: number;
  DELIVERED: number;
  CANCELLED: number;
}

export interface OrderTypeBreakdown {
  delivery: number;
  pickup: number;
}

export interface PaymentMethodBreakdown {
  card: number;
  twint: number;
  postfinance: number;
  cash: number;
}

// ---- Restaurant Dashboard ----

export interface RestaurantDashboardOverview {
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number; // CHF from DELIVERED orders
  avg_order_value: number; // CHF average of DELIVERED orders
  avg_rating: number; // Restaurant's current rating
  review_count: number; // Restaurant's total reviews
}

export interface RestaurantDashboardResponseDto {
  restaurant_id: string;
  date_range: { from: string; to: string };
  overview: RestaurantDashboardOverview;
  order_status_breakdown: OrderStatusBreakdown;
  order_type_breakdown: OrderTypeBreakdown;
  payment_method_breakdown: PaymentMethodBreakdown;
}

export interface RevenueTimeSeriesPoint {
  date: string; // date key (YYYY-MM-DD, YYYY-Www, YYYY-MM)
  revenue: number; // CHF
  orders: number; // count of delivered orders
}

export interface TopItemResponseDto {
  menu_item_id: string;
  name: string; // resolved from menu_items or order snapshot
  total_ordered: number; // total quantity ordered
  total_revenue: number; // total CHF from this item
}

// ---- Platform Dashboard ----

export interface RestaurantStatusBreakdown {
  DRAFT: number;
  PENDING_APPROVAL: number;
  APPROVED: number;
  PUBLISHED: number;
  REJECTED: number;
  SUSPENDED: number;
  ARCHIVED: number;
}

export interface PlatformDashboardOverview {
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  avg_order_value: number;
  total_restaurants: number;
  active_restaurants: number; // PUBLISHED + is_active
  new_users_period: number; // users created in date range
  total_users: number;
}

export interface PlatformDashboardResponseDto {
  date_range: { from: string; to: string };
  overview: PlatformDashboardOverview;
  order_status_breakdown: OrderStatusBreakdown;
  order_type_breakdown: OrderTypeBreakdown;
  payment_method_breakdown: PaymentMethodBreakdown;
  restaurant_status_breakdown: RestaurantStatusBreakdown;
}

export interface TopRestaurantResponseDto {
  restaurant_id: string;
  name: string;
  slug: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
}
