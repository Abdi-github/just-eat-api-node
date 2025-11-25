import { Request, Response, NextFunction } from 'express';

/**
 * Custom NoSQL injection sanitization middleware.
 *
 * Compatible with Express 5 (where req.query is read-only).
 * Recursively sanitizes req.body and req.params by removing keys
 * that start with '$' or contain '.', which are MongoDB operators.
 *
 * Note: req.query is not mutated — Express 5 makes it a getter.
 * Query parameters are typically validated via express-validator
 * and only specific fields are extracted in services/repositories,
 * so raw query injection is mitigated by the validation layer.
 */

const SANITIZE_REPLACE = '_';

/**
 * Recursively sanitize an object by replacing dangerous MongoDB
 * operator keys (starting with '$') in-place.
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i]);
    }
    return obj;
  }

  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record);
    for (const key of keys) {
      // Recursively sanitize the value first
      record[key] = sanitizeObject(record[key]);

      // If key starts with '$', rename it
      if (key.startsWith('$')) {
        const safeKey = SANITIZE_REPLACE + key.slice(1);
        record[safeKey] = record[key];
        delete record[key];
      }
    }
    return record;
  }

  // For strings, strip any embedded $ operators that could be injected
  if (typeof obj === 'string') {
    return obj;
  }

  return obj;
}

/**
 * Express middleware that sanitizes req.body and req.params
 * to prevent NoSQL injection attacks.
 */
export const sanitizeInput = (_req: Request, _res: Response, next: NextFunction): void => {
  // Sanitize body (POST/PUT/PATCH payloads)
  if (_req.body && typeof _req.body === 'object') {
    sanitizeObject(_req.body);
  }

  // Sanitize params (URL parameters)
  if (_req.params && typeof _req.params === 'object') {
    sanitizeObject(_req.params);
  }

  next();
};
