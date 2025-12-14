/**
 * Email Queue
 *
 * BullMQ queue for asynchronous email delivery.
 * All email sends go through this queue for reliability, retries, and monitoring.
 */

import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  getQueueConnection,
  DEFAULT_EMAIL_JOB_OPTIONS,
} from './queue.config.js';
import type { EmailJobData } from './job.types.js';
import { EMAIL_JOB_NAMES } from './job.types.js';
import { logger } from '../logger/index.js';
import type { EmailTemplateName, EmailTemplateData } from '../services/email.templates.js';

let emailQueue: Queue<EmailJobData> | null = null;

/**
 * Get or create the email queue instance
 */
export const getEmailQueue = (): Queue<EmailJobData> => {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
      connection: getQueueConnection(),
      defaultJobOptions: DEFAULT_EMAIL_JOB_OPTIONS,
    });

    emailQueue.on('error', (error) => {
      logger.error('Email queue error', { error: error.message });
    });

    logger.info('Email queue initialized');
  }

  return emailQueue;
};

// ============================================================================
// Convenience Methods — Enqueue specific email types
// ============================================================================

/**
 * Enqueue a raw email
 */
export const enqueueRawEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  text?: string,
  replyTo?: string
): Promise<void> => {
  const queue = getEmailQueue();
  await queue.add(EMAIL_JOB_NAMES.SEND_RAW, {
    type: 'raw',
    to,
    subject,
    html,
    text,
    replyTo,
  });
  logger.debug('Raw email enqueued', { to, subject });
};

/**
 * Enqueue a template-based email
 */
export const enqueueTemplateEmail = async (
  to: string | string[],
  template: EmailTemplateName,
  data: EmailTemplateData,
  replyTo?: string
): Promise<void> => {
  const queue = getEmailQueue();
  await queue.add(EMAIL_JOB_NAMES.SEND_TEMPLATE, {
    type: 'template',
    to,
    template,
    data,
    replyTo,
  });
  logger.debug('Template email enqueued', { to, template });
};

/**
 * Enqueue welcome email
 */
export const enqueueWelcomeEmail = async (to: string, firstName: string): Promise<void> => {
  await enqueueTemplateEmail(to, 'welcome', { firstName });
};

/**
 * Enqueue verification email
 */
export const enqueueVerificationEmail = async (
  to: string,
  firstName: string,
  verificationUrl: string
): Promise<void> => {
  await enqueueTemplateEmail(to, 'emailVerification', { firstName, verificationUrl });
};

/**
 * Enqueue password reset email
 */
export const enqueuePasswordResetEmail = async (
  to: string,
  firstName: string,
  resetUrl: string
): Promise<void> => {
  await enqueueTemplateEmail(to, 'passwordReset', { firstName, resetUrl });
};

/**
 * Enqueue order placed email
 */
export const enqueueOrderPlacedEmail = async (
  to: string,
  firstName: string,
  orderNumber: string,
  restaurantName: string,
  total: number
): Promise<void> => {
  await enqueueTemplateEmail(to, 'orderPlaced', { firstName, orderNumber, restaurantName, total });
};

/**
 * Enqueue order status update email
 */
export const enqueueOrderStatusEmail = async (
  to: string,
  firstName: string,
  orderNumber: string,
  status: string,
  restaurantName: string
): Promise<void> => {
  await enqueueTemplateEmail(to, 'orderStatusUpdate', {
    firstName,
    orderNumber,
    status,
    restaurantName,
  });
};

/**
 * Enqueue new order notification to restaurant
 */
export const enqueueNewOrderRestaurantEmail = async (
  to: string,
  restaurantName: string,
  orderNumber: string,
  total: number
): Promise<void> => {
  await enqueueTemplateEmail(to, 'newOrderRestaurant', { restaurantName, orderNumber, total });
};

/**
 * Close the email queue
 */
export const closeEmailQueue = async (): Promise<void> => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    logger.info('Email queue closed');
  }
};
