/**
 * Queue Configuration
 *
 * Centralized configuration for BullMQ queues.
 * Queue names, default job options, and connection settings.
 */

import type { ConnectionOptions, DefaultJobOptions } from 'bullmq';
import config from '../../config/index.js';

// ============================================================================
// Queue Names
// ============================================================================

export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ============================================================================
// Redis Connection (for BullMQ)
// ============================================================================

/**
 * BullMQ connection options derived from app Redis config.
 * BullMQ uses ioredis internally, so the format is compatible.
 */
export const getQueueConnection = (): ConnectionOptions => ({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db,
  maxRetriesPerRequest: null, // BullMQ requires this to be null for workers
});

// ============================================================================
// Default Job Options
// ============================================================================

export const DEFAULT_EMAIL_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep at most 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

export const DEFAULT_NOTIFICATION_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 2,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s
  },
  removeOnComplete: {
    age: 12 * 3600, // Keep completed jobs for 12 hours
    count: 500,
  },
  removeOnFail: {
    age: 3 * 24 * 3600, // Keep failed jobs for 3 days
  },
};

// ============================================================================
// Worker Options
// ============================================================================

export const WORKER_CONCURRENCY = {
  EMAIL: 5, // Process up to 5 emails concurrently
  NOTIFICATION: 10, // Process up to 10 notifications concurrently
} as const;
