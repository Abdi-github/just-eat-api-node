/**
 * Notification Queue
 *
 * BullMQ queue for asynchronous notification email delivery.
 * When a notification's channel is EMAIL or BOTH, an email job is
 * enqueued here to be processed by the notification worker.
 */

import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  getQueueConnection,
  DEFAULT_NOTIFICATION_JOB_OPTIONS,
} from './queue.config.js';
import type { NotificationJobData } from './job.types.js';
import { NOTIFICATION_JOB_NAMES } from './job.types.js';
import { logger } from '../logger/index.js';

let notificationQueue: Queue<NotificationJobData> | null = null;

/**
 * Get or create the notification queue instance
 */
export const getNotificationQueue = (): Queue<NotificationJobData> => {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATION, {
      connection: getQueueConnection(),
      defaultJobOptions: DEFAULT_NOTIFICATION_JOB_OPTIONS,
    });

    notificationQueue.on('error', (error) => {
      logger.error('Notification queue error', { error: error.message });
    });

    logger.info('Notification queue initialized');
  }

  return notificationQueue;
};

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Enqueue a notification email job
 */
export const enqueueNotificationEmail = async (
  notificationId: string,
  userId: string,
  userEmail: string,
  userFirstName: string,
  notificationType: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  const queue = getNotificationQueue();
  await queue.add(NOTIFICATION_JOB_NAMES.SEND_NOTIFICATION_EMAIL, {
    type: 'notification-email',
    notificationId,
    userId,
    userEmail,
    userFirstName,
    notificationType,
    title,
    body,
    data,
  });
  logger.debug('Notification email enqueued', { notificationId, userId, notificationType });
};

/**
 * Close the notification queue
 */
export const closeNotificationQueue = async (): Promise<void> => {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
    logger.info('Notification queue closed');
  }
};
