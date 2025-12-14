/**
 * Email Worker
 *
 * BullMQ worker that processes email jobs from the email queue.
 * Uses the existing EmailService for actual email delivery.
 * Supports both raw and template-based emails.
 */

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, getQueueConnection, WORKER_CONCURRENCY } from './queue.config.js';
import type { EmailJobData } from './job.types.js';
import { emailService } from '../services/email.service.js';
import { logger } from '../logger/index.js';

let emailWorker: Worker<EmailJobData> | null = null;

/**
 * Process a single email job
 */
const processEmailJob = async (job: Job<EmailJobData>): Promise<boolean> => {
  const { data } = job;

  logger.info('Processing email job', {
    jobId: job.id,
    jobName: job.name,
    type: data.type,
    to: data.to,
    attempt: job.attemptsMade + 1,
  });

  if (data.type === 'raw') {
    return emailService.send({
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      replyTo: data.replyTo,
    });
  }

  if (data.type === 'template') {
    return emailService.sendTemplate({
      to: data.to,
      template: data.template,
      data: data.data,
      replyTo: data.replyTo,
    });
  }

  logger.error('Unknown email job type', { jobId: job.id, type: (data as { type: string }).type });
  return false;
};

/**
 * Start the email worker
 */
export const startEmailWorker = (): Worker<EmailJobData> => {
  if (emailWorker) {
    logger.warn('Email worker already running');
    return emailWorker;
  }

  emailWorker = new Worker<EmailJobData>(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection: getQueueConnection(),
    concurrency: WORKER_CONCURRENCY.EMAIL,
  });

  // Event handlers
  emailWorker.on('completed', (job) => {
    logger.info('Email job completed', {
      jobId: job.id,
      jobName: job.name,
      to: job.data.to,
    });
  });

  emailWorker.on('failed', (job, error) => {
    logger.error('Email job failed', {
      jobId: job?.id,
      jobName: job?.name,
      to: job?.data.to,
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });

  emailWorker.on('error', (error) => {
    logger.error('Email worker error', { error: error.message });
  });

  emailWorker.on('stalled', (jobId) => {
    logger.warn('Email job stalled', { jobId });
  });

  logger.info('Email worker started', {
    concurrency: WORKER_CONCURRENCY.EMAIL,
  });

  return emailWorker;
};

/**
 * Stop the email worker gracefully
 */
export const stopEmailWorker = async (): Promise<void> => {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info('Email worker stopped');
  }
};
