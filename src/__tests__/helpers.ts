/**
 * Test Helpers
 *
 * Common utilities and factory functions for testing.
 * Model-specific factories will be added as modules are implemented.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Generate a JWT token for testing
 */
export const generateTestToken = (
  userId: string,
  roles: string[] = [],
  permissions: string[] = [],
  extra: Record<string, unknown> = {}
): string => {
  return jwt.sign(
    {
      sub: userId,
      roles,
      permissions,
      lang: 'en',
      ...extra,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

/**
 * Generate an expired token for testing
 */
export const generateExpiredToken = (userId: string): string => {
  return jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, { expiresIn: -1 });
};

/**
 * Generate random email
 */
export const randomEmail = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
};

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Assert success response structure
 */
export const assertSuccessResponse = (body: unknown): void => {
  const response = body as { success: boolean; message?: string; data?: unknown };
  expect(response.success).toBe(true);
  expect(response.message).toBeDefined();
};

/**
 * Assert error response structure
 */
export const assertErrorResponse = (body: unknown): void => {
  const response = body as { success: boolean; error: { message: string; code?: number } };
  expect(response.success).toBe(false);
  expect(response.error).toBeDefined();
  expect(response.error.message).toBeDefined();
};

/**
 * Assert paginated response structure
 */
export const assertPaginatedResponse = (body: unknown): void => {
  const response = body as {
    success: boolean;
    data: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  expect(response.success).toBe(true);
  expect(Array.isArray(response.data)).toBe(true);
  expect(response.pagination).toBeDefined();
  expect(response.pagination.page).toBeDefined();
  expect(response.pagination.limit).toBeDefined();
  expect(response.pagination.total).toBeDefined();
  expect(response.pagination.total_pages).toBeDefined();
  expect(typeof response.pagination.has_next).toBe('boolean');
  expect(typeof response.pagination.has_prev).toBe('boolean');
};
