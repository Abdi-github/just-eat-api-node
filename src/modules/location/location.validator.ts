import { body, param, query, type ValidationChain } from 'express-validator';

import { CANTON_SORT_FIELDS, CITY_SORT_FIELDS } from './location.types.js';

// ============================================================================
// Shared Validators
// ============================================================================

const objectIdParamValidator = (paramName = 'id'): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);

const translatedFieldValidator = (field: string, required = false): ValidationChain[] => {
  const langs = ['en', 'fr', 'de', 'it'];
  return langs.map((lang) => {
    const chain = body(`${field}.${lang}`).trim();
    if (required) {
      return chain
        .notEmpty()
        .withMessage(`${field}.${lang} is required`)
        .isLength({ max: 200 })
        .withMessage(`${field}.${lang} cannot exceed 200 characters`);
    }
    return chain
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage(`${field}.${lang} must be between 1 and 200 characters`);
  });
};

const paginationValidators: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
];

// ============================================================================
// Canton Validators
// ============================================================================

export const cantonValidators = {
  // --------------------------------------------------------------------------
  // Public: List cantons query params
  // --------------------------------------------------------------------------
  getAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .isIn(CANTON_SORT_FIELDS)
      .withMessage(`Sort must be one of: ${CANTON_SORT_FIELDS.join(', ')}`),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),
    query('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  // --------------------------------------------------------------------------
  // Params
  // --------------------------------------------------------------------------
  getById: [objectIdParamValidator('id')],

  getBySlug: [
    param('slug')
      .trim()
      .notEmpty()
      .withMessage('Slug is required')
      .isSlug()
      .withMessage('Invalid slug format'),
  ],

  getByCode: [
    param('code')
      .trim()
      .notEmpty()
      .withMessage('Canton code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters')
      .isAlpha()
      .withMessage('Canton code must contain only letters'),
  ],

  // --------------------------------------------------------------------------
  // Admin: Create canton
  // --------------------------------------------------------------------------
  create: [
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Canton code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters')
      .isAlpha()
      .withMessage('Canton code must contain only letters')
      .toUpperCase(),
    ...translatedFieldValidator('name', true),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Slug must be URL-friendly (lowercase letters, numbers, hyphens)'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  // --------------------------------------------------------------------------
  // Admin: Update canton
  // --------------------------------------------------------------------------
  update: [
    objectIdParamValidator('id'),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters')
      .isAlpha()
      .withMessage('Canton code must contain only letters')
      .toUpperCase(),
    ...translatedFieldValidator('name', false),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Slug must be URL-friendly (lowercase letters, numbers, hyphens)'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  // --------------------------------------------------------------------------
  // Admin: Delete canton
  // --------------------------------------------------------------------------
  delete: [objectIdParamValidator('id')],
};

// ============================================================================
// City Validators
// ============================================================================

export const cityValidators = {
  // --------------------------------------------------------------------------
  // Public: List cities query params
  // --------------------------------------------------------------------------
  getAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .isIn(CITY_SORT_FIELDS)
      .withMessage(`Sort must be one of: ${CITY_SORT_FIELDS.join(', ')}`),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),
    query('canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
    query('postal_code')
      .optional()
      .isInt({ min: 1000, max: 9999 })
      .withMessage('Postal code must be a 4-digit Swiss postal code'),
    query('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  // --------------------------------------------------------------------------
  // Params
  // --------------------------------------------------------------------------
  getById: [objectIdParamValidator('id')],

  getBySlug: [
    param('slug')
      .trim()
      .notEmpty()
      .withMessage('Slug is required')
      .isSlug()
      .withMessage('Invalid slug format'),
  ],

  getByPostalCode: [
    param('postalCode')
      .isInt({ min: 1000, max: 9999 })
      .withMessage('Postal code must be a 4-digit Swiss postal code'),
  ],

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------
  search: [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('Search query (q) is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
  ],

  // --------------------------------------------------------------------------
  // Admin: Create city
  // --------------------------------------------------------------------------
  create: [
    body('canton_id')
      .notEmpty()
      .withMessage('Canton ID is required')
      .isMongoId()
      .withMessage('Invalid canton_id format'),
    ...translatedFieldValidator('name', true),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Slug must be URL-friendly (lowercase letters, numbers, hyphens)'),
    body('postal_codes').optional().isArray().withMessage('Postal codes must be an array'),
    body('postal_codes.*')
      .optional()
      .isInt({ min: 1000, max: 9999 })
      .withMessage('Each postal code must be a 4-digit number'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  // --------------------------------------------------------------------------
  // Admin: Update city
  // --------------------------------------------------------------------------
  update: [
    objectIdParamValidator('id'),
    body('canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
    ...translatedFieldValidator('name', false),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Slug must be URL-friendly (lowercase letters, numbers, hyphens)'),
    body('postal_codes').optional().isArray().withMessage('Postal codes must be an array'),
    body('postal_codes.*')
      .optional()
      .isInt({ min: 1000, max: 9999 })
      .withMessage('Each postal code must be a 4-digit number'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  // --------------------------------------------------------------------------
  // Admin: Delete city
  // --------------------------------------------------------------------------
  delete: [objectIdParamValidator('id')],
};
