/**
 * Notification Worker
 *
 * BullMQ worker that processes notification email jobs.
 * When a notification's channel is EMAIL or BOTH, this worker
 * sends the actual email via the email service and updates
 * the notification's email_sent flag.
 */

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, getQueueConnection, WORKER_CONCURRENCY } from './queue.config.js';
import type { NotificationJobData, NotificationEmailJobData } from './job.types.js';
import { emailService } from '../services/email.service.js';
import { logger } from '../logger/index.js';

let notificationWorker: Worker<NotificationJobData> | null = null;

/**
 * Process a notification email job
 *
 * Sends a generic notification email to the user and marks
 * the notification as email_sent in the database.
 */
const processNotificationJob = async (job: Job<NotificationJobData>): Promise<boolean> => {
  const { data } = job;

  logger.info('Processing notification job', {
    jobId: job.id,
    jobName: job.name,
    type: data.type,
    notificationId: data.notificationId,
    attempt: job.attemptsMade + 1,
  });

  if (data.type === 'notification-email') {
    return processNotificationEmail(data);
  }

  logger.error('Unknown notification job type', { jobId: job.id, type: data.type });
  return false;
};

/**
 * Send a notification email and update the database
 */
const processNotificationEmail = async (data: NotificationEmailJobData): Promise<boolean> => {
  // Send a simple notification email using the raw email approach
  // We build a basic but branded notification email
  const html = buildNotificationEmailHtml(data);

  const success = await emailService.send({
    to: data.userEmail,
    subject: data.title,
    html,
    text: `${data.title}\n\n${data.body}`,
  });

  if (success) {
    // Mark email as sent in the notification record
    try {
      const { NotificationRepository } = await import(
        '../../modules/notification/notification.repository.js'
      );
      const repo = new NotificationRepository();
      await repo.markEmailSent(data.notificationId);

      logger.info('Notification email sent and marked', {
        notificationId: data.notificationId,
        userId: data.userId,
      });
    } catch (err) {
      // Email was sent but marking failed — not critical
      logger.warn('Failed to mark notification email_sent', {
        notificationId: data.notificationId,
        error: (err as Error).message,
      });
    }
  }

  return success;
};

/**
 * Build a branded notification email HTML
 */
const buildNotificationEmailHtml = (data: NotificationEmailJobData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background-color: #ff8000; padding: 24px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">just-eat.ch</h1>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding: 32px;">
            <p style="color: #2e3333; font-size: 16px; margin: 0 0 8px;">
              Hi ${data.userFirstName},
            </p>
            <h2 style="color: #2e3333; font-size: 20px; margin: 16px 0 8px;">${data.title}</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              ${data.body}
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color: #f7f7f7; padding: 24px 32px; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} just-eat.ch — All rights reserved
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Start the notification worker
 */
export const startNotificationWorker = (): Worker<NotificationJobData> => {
  if (notificationWorker) {
    logger.warn('Notification worker already running');
    return notificationWorker;
  }

  notificationWorker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATION,
    processNotificationJob,
    {
      connection: getQueueConnection(),
      concurrency: WORKER_CONCURRENCY.NOTIFICATION,
    }
  );

  // Event handlers
  notificationWorker.on('completed', (job) => {
    logger.info('Notification job completed', {
      jobId: job.id,
      jobName: job.name,
      notificationId: job.data.notificationId,
    });
  });

  notificationWorker.on('failed', (job, error) => {
    logger.error('Notification job failed', {
      jobId: job?.id,
      jobName: job?.name,
      notificationId: job?.data.notificationId,
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });

  notificationWorker.on('error', (error) => {
    logger.error('Notification worker error', { error: error.message });
  });

  notificationWorker.on('stalled', (jobId) => {
    logger.warn('Notification job stalled', { jobId });
  });

  logger.info('Notification worker started', {
    concurrency: WORKER_CONCURRENCY.NOTIFICATION,
  });

  return notificationWorker;
};

/**
 * Stop the notification worker gracefully
 */
export const stopNotificationWorker = async (): Promise<void> => {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
    logger.info('Notification worker stopped');
  }
};
