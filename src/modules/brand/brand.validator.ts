import { body, param, query, type ValidationChain } from 'express-validator';

import { BRAND_SORT_FIELDS } from './brand.types.js';

// ============================================================================
// Shared Validators
// ============================================================================

const objectIdParamValidator = (paramName = 'id'): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);

const paginationValidators: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
];

// ============================================================================
// Brand Validators
// ============================================================================

export const brandValidators = {
  /**
   * GET / — List all brands
   */
  getAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (BRAND_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${BRAND_SORT_FIELDS.join(', ')}`),
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
   * GET /:id — Get brand by ID
   */
  getById: [objectIdParamValidator()] as ValidationChain[],

  /**
   * GET /slug/:slug — Get brand by slug
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
   * POST / — Create a brand (Admin)
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Brand name is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Brand name must be between 1 and 200 characters'),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Invalid slug format')
      .isLength({ max: 100 })
      .withMessage('Slug cannot exceed 100 characters'),
    body('logo_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('logo_url must be a valid URL'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ] as ValidationChain[],

  /**
   * PUT /:id — Update a brand (Admin)
   */
  update: [
    objectIdParamValidator(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Brand name must be between 1 and 200 characters'),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Invalid slug format')
      .isLength({ max: 100 })
      .withMessage('Slug cannot exceed 100 characters'),
    body('logo_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('logo_url must be a valid URL'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ] as ValidationChain[],

  /**
   * DELETE /:id — Delete a brand (Admin)
   */
  delete: [objectIdParamValidator()] as ValidationChain[],
};
