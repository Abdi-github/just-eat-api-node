/**
 * Notification Types & DTOs
 *
 * Type definitions for the notification module including
 * enums, constants, request DTOs, response DTOs, and query parameters.
 */

// ============================================================================
// Enums
// ============================================================================

export enum NotificationType {
  // Order lifecycle
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  ORDER_PREPARING = 'ORDER_PREPARING',
  ORDER_READY = 'ORDER_READY',
  ORDER_PICKED_UP = 'ORDER_PICKED_UP',
  ORDER_IN_TRANSIT = 'ORDER_IN_TRANSIT',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',

  // Auth
  WELCOME = 'WELCOME',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // Reviews
  REVIEW_REPLY = 'REVIEW_REPLY',
  REVIEW_APPROVED = 'REVIEW_APPROVED',

  // Promotions
  PROMOTION_NEW = 'PROMOTION_NEW',
  STAMP_COMPLETED = 'STAMP_COMPLETED',

  // Delivery
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',

  // Restaurant
  RESTAURANT_APPROVED = 'RESTAURANT_APPROVED',
  RESTAURANT_REJECTED = 'RESTAURANT_REJECTED',

  // System
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ============================================================================
// Constants
// ============================================================================

export const NOTIFICATION_CONSTANTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_CHANNEL: NotificationChannel.BOTH,
  DEFAULT_PRIORITY: NotificationPriority.NORMAL,
  MAX_TITLE_LENGTH: 200,
  MAX_BODY_LENGTH: 2000,
} as const;

export const NOTIFICATION_TYPE_VALUES = Object.values(NotificationType);
export const NOTIFICATION_CHANNEL_VALUES = Object.values(NotificationChannel);
export const NOTIFICATION_PRIORITY_VALUES = Object.values(NotificationPriority);

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Create a notification (internal / admin)
 */
export interface CreateNotificationDto {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
}

/**
 * Admin: Send notification to one or multiple users
 */
export interface AdminSendNotificationDto {
  user_ids: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
}

// ============================================================================
// Query DTOs
// ============================================================================

export interface NotificationQueryDto {
  page?: string;
  limit?: string;
  type?: NotificationType;
  is_read?: string; // 'true' | 'false'
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface NotificationResponseDto {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: NotificationChannel;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: Date | null;
  email_sent: boolean;
  email_sent_at: Date | null;
  created_at: Date;
}

export interface NotificationCountResponseDto {
  total: number;
  unread: number;
}
