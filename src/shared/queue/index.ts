/**
 * Queue Module — Barrel Export
 *
 * Provides a unified interface for initializing and shutting down
 * all BullMQ queues and workers.
 */

// Re-export queue config
export { QUEUE_NAMES, type QueueName } from './queue.config.js';

// Re-export job types
export type { EmailJobData, NotificationJobData, NotificationEmailJobData } from './job.types.js';
export { EMAIL_JOB_NAMES, NOTIFICATION_JOB_NAMES } from './job.types.js';

// Re-export email queue functions
export {
  getEmailQueue,
  enqueueRawEmail,
  enqueueTemplateEmail,
  enqueueWelcomeEmail,
  enqueueVerificationEmail,
  enqueuePasswordResetEmail,
  enqueueOrderPlacedEmail,
  enqueueOrderStatusEmail,
  enqueueNewOrderRestaurantEmail,
  closeEmailQueue,
} from './email.queue.js';

// Re-export notification queue functions
export {
  getNotificationQueue,
  enqueueNotificationEmail,
  closeNotificationQueue,
} from './notification.queue.js';

// Re-export worker functions
export { startEmailWorker, stopEmailWorker } from './email.worker.js';
export { startNotificationWorker, stopNotificationWorker } from './notification.worker.js';

// ============================================================================
// Lifecycle Management
// ============================================================================

import { getEmailQueue, closeEmailQueue } from './email.queue.js';
import { getNotificationQueue, closeNotificationQueue } from './notification.queue.js';
import { startEmailWorker, stopEmailWorker } from './email.worker.js';
import { startNotificationWorker, stopNotificationWorker } from './notification.worker.js';
import { logger } from '../logger/index.js';

/**
 * Initialize all queues and start all workers.
 * Call this during server startup, after Redis is connected.
 */
export const initializeQueues = (): void => {
  logger.info('Initializing BullMQ queues and workers...');

  // Initialize queues (creates the Queue instances)
  getEmailQueue();
  getNotificationQueue();

  // Start workers
  startEmailWorker();
  startNotificationWorker();

  logger.info('All BullMQ queues and workers initialized');
};

/**
 * Gracefully shut down all workers and close all queues.
 * Call this during server graceful shutdown.
 */
export const shutdownQueues = async (): Promise<void> => {
  logger.info('Shutting down BullMQ queues and workers...');

  // Stop workers first (let them finish current jobs)
  await Promise.all([stopEmailWorker(), stopNotificationWorker()]);

  // Then close queues
  await Promise.all([closeEmailQueue(), closeNotificationQueue()]);

  logger.info('All BullMQ queues and workers shut down');
};

/**
 * Get health status of all queues
 */
export const getQueueHealth = async (): Promise<{
  email: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  notification: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}> => {
  const emailQ = getEmailQueue();
  const notifQ = getNotificationQueue();

  const [emailCounts, notifCounts] = await Promise.all([
    emailQ.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    notifQ.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
  ]);

  return {
    email: emailCounts as {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    },
    notification: notifCounts as {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    },
  };
};
