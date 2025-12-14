/**
 * Queue Job Types
 *
 * Type definitions for all queue job payloads.
 * Each queue has its own job data interface.
 */

import type { EmailTemplateName, EmailTemplateData } from '../services/email.templates.js';

// ============================================================================
// Email Job Types
// ============================================================================

/**
 * Raw email job — sends a pre-built HTML email
 */
export interface RawEmailJobData {
  type: 'raw';
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Template email job — sends a templated email
 */
export interface TemplateEmailJobData {
  type: 'template';
  to: string | string[];
  template: EmailTemplateName;
  data: EmailTemplateData;
  replyTo?: string;
}

/**
 * Union type for all email job payloads
 */
export type EmailJobData = RawEmailJobData | TemplateEmailJobData;

/**
 * Email job names for semantic grouping
 */
export const EMAIL_JOB_NAMES = {
  SEND_RAW: 'send-raw',
  SEND_TEMPLATE: 'send-template',
  SEND_WELCOME: 'send-welcome',
  SEND_VERIFICATION: 'send-verification',
  SEND_PASSWORD_RESET: 'send-password-reset',
  SEND_ORDER_PLACED: 'send-order-placed',
  SEND_ORDER_STATUS: 'send-order-status',
  SEND_NEW_ORDER_RESTAURANT: 'send-new-order-restaurant',
} as const;

// ============================================================================
// Notification Job Types
// ============================================================================

/**
 * Notification email job — send email for a notification that requires it
 */
export interface NotificationEmailJobData {
  type: 'notification-email';
  notificationId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  notificationType: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Union type for all notification job payloads
 */
export type NotificationJobData = NotificationEmailJobData;

/**
 * Notification job names
 */
export const NOTIFICATION_JOB_NAMES = {
  SEND_NOTIFICATION_EMAIL: 'send-notification-email',
} as const;
