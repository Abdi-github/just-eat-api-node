import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response } from 'express';

import config from '../../config/index.js';
import { getRedisClient, isRedisConnected } from '../../config/redis.js';
import { sendErrorResponse } from '../utils/response.helper.js';
import { logger } from '../logger/index.js';

/**
 * Create rate limiter for different user types
 */
/**
 * Get Redis store for rate limiting (shared across instances)
 * Falls back to in-memory store if Redis is unavailable
 */
const getRedisStore = (keyPrefix: string) => {
  try {
    if (isRedisConnected()) {
      const client = getRedisClient();
      return new RedisStore({
        sendCommand: async (...args: string[]) => {
          // ioredis .call() expects (command, ...args) — spread the rest
          const [command, ...rest] = args;
          return client.call(command, ...rest) as any;
        },
        prefix: `rl:${keyPrefix}:`,
      });
    }
  } catch {
    logger.warn(`Rate limiter: Redis unavailable for prefix '${keyPrefix}', using in-memory store`);
  }
  return undefined;
};

const createRateLimiter = (maxRequests: number, keyPrefix: string) => {
  const options: Parameters<typeof rateLimit>[0] = {
    windowMs: config.rateLimit.windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    store: getRedisStore(keyPrefix),
    message: async (_req: Request, res: Response) => {
      sendErrorResponse(res, 429, 'Too many requests, please try again later.');
    },
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      return userId ? `${keyPrefix}:user:${userId}` : `${keyPrefix}:ip:${req.ip}`;
    },
    skip: (_req: Request) => {
      return config.isTest;
    },
  };

  return rateLimit(options);
};

/**
 * Rate limiter for guest users
 */
export const guestRateLimiter = createRateLimiter(config.rateLimit.maxRequestsGuest, 'guest');

/**
 * Rate limiter for authenticated users
 */
export const authRateLimiter = createRateLimiter(config.rateLimit.maxRequestsAuth, 'auth');

/**
 * Rate limiter for restaurant owners
 */
export const restaurantRateLimiter = createRateLimiter(
  config.rateLimit.maxRequestsRestaurant,
  'restaurant'
);

/**
 * Rate limiter for admin users
 */
export const adminRateLimiter = createRateLimiter(config.rateLimit.maxRequestsAdmin, 'admin');

/**
 * Strict rate limiter for sensitive endpoints (login, register, password reset)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: async (_req: Request, res: Response) => {
    sendErrorResponse(res, 429, 'Too many attempts, please try again after 15 minutes.');
  },
  keyGenerator: (req: Request) => {
    return `strict:${req.ip}:${req.path}`;
  },
  skip: () => config.isTest,
});

export default {
  guestRateLimiter,
  authRateLimiter,
  restaurantRateLimiter,
  adminRateLimiter,
  strictRateLimiter,
};
