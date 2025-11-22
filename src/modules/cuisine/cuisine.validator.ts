import { body, param, query, type ValidationChain } from 'express-validator';

import { CUISINE_SORT_FIELDS } from './cuisine.types.js';

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
// Cuisine Validators
// ============================================================================

export const cuisineValidators = {
  /**
   * GET / — List all cuisines
   */
  getAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (CUISINE_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${CUISINE_SORT_FIELDS.join(', ')}`),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),
  ] as ValidationChain[],

  /**
   * GET /:id — Get cuisine by ID
   */
  getById: [objectIdParamValidator()] as ValidationChain[],

  /**
   * GET /slug/:slug — Get cuisine by slug
   */
  getBySlug: [
    param('slug')
      .trim()
      .notEmpty()
      .withMessage('Slug is required')
      .isSlug()
      .withMessage('Invalid slug format'),
  ] as ValidationChain[],

  /**
   * POST / — Create a cuisine (Admin)
   */
  create: [
    ...translatedFieldValidator('name', true),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Invalid slug format')
      .isLength({ max: 100 })
      .withMessage('Slug cannot exceed 100 characters'),
    body('image_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('image_url must be a valid URL'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ] as ValidationChain[],

  /**
   * PUT /:id — Update a cuisine (Admin)
   */
  update: [
    objectIdParamValidator(),
    ...translatedFieldValidator('name', false),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Invalid slug format')
      .isLength({ max: 100 })
      .withMessage('Slug cannot exceed 100 characters'),
    body('image_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('image_url must be a valid URL'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ] as ValidationChain[],

  /**
   * DELETE /:id — Delete a cuisine (Admin)
   */
  delete: [objectIdParamValidator()] as ValidationChain[],
};
