import { body, param, query, type ValidationChain } from 'express-validator';

import { RESTAURANT_SORT_FIELDS, RESTAURANT_STATUSES } from './restaurant.types.js';

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
// Restaurant Validators
// ============================================================================

export const restaurantValidators = {
  /**
   * GET / — List restaurants (public)
   */
  getAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (RESTAURANT_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${RESTAURANT_SORT_FIELDS.join(', ')}`),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search must be between 1 and 200 characters'),
    query('city_id').optional().isMongoId().withMessage('city_id must be a valid ID'),
    query('canton_id').optional().isMongoId().withMessage('canton_id must be a valid ID'),
    query('cuisine_id').optional().isMongoId().withMessage('cuisine_id must be a valid ID'),
    query('brand_id').optional().isMongoId().withMessage('brand_id must be a valid ID'),
    query('postal_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
    query('min_rating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('min_rating must be between 0 and 5'),
  ] as ValidationChain[],

  /**
   * GET /cursor — List restaurants with cursor-based pagination
   */
  getAllCursor: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('cursor')
      .optional()
      .isString()
      .withMessage('Cursor must be a string'),
    query('direction')
      .optional()
      .isIn(['next', 'prev'])
      .withMessage('Direction must be next or prev'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (RESTAURANT_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${RESTAURANT_SORT_FIELDS.join(', ')}`),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search must be between 1 and 200 characters'),
    query('city_id').optional().isMongoId().withMessage('city_id must be a valid ID'),
    query('canton_id').optional().isMongoId().withMessage('canton_id must be a valid ID'),
    query('cuisine_id').optional().isMongoId().withMessage('cuisine_id must be a valid ID'),
    query('brand_id').optional().isMongoId().withMessage('brand_id must be a valid ID'),
    query('postal_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
    query('min_rating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('min_rating must be between 0 and 5'),
  ] as ValidationChain[],

  /**
   * GET /:id — Get restaurant by ID
   */
  getById: [objectIdParamValidator()] as ValidationChain[],

  /**
   * GET /slug/:slug — Get restaurant by slug
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
   * POST / — Create a restaurant (Owner)
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Restaurant name is required')
      .isLength({ min: 1, max: 300 })
      .withMessage('Restaurant name must be between 1 and 300 characters'),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Invalid slug format')
      .isLength({ max: 300 })
      .withMessage('Slug cannot exceed 300 characters'),
    body('description').optional().isObject().withMessage('Description must be an object'),
    body('description.en')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('English description cannot exceed 2000 characters'),
    body('description.fr')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('French description cannot exceed 2000 characters'),
    body('description.de')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('German description cannot exceed 2000 characters'),
    body('description.it')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Italian description cannot exceed 2000 characters'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ min: 1, max: 500 })
      .withMessage('Address must be between 1 and 500 characters'),
    body('postal_code')
      .trim()
      .notEmpty()
      .withMessage('Postal code is required')
      .isLength({ min: 4, max: 4 })
      .withMessage('Swiss postal code must be 4 characters'),
    body('city_id')
      .notEmpty()
      .withMessage('city_id is required')
      .isMongoId()
      .withMessage('city_id must be a valid ID'),
    body('canton_id')
      .notEmpty()
      .withMessage('canton_id is required')
      .isMongoId()
      .withMessage('canton_id must be a valid ID'),
    body('brand_id').optional().isMongoId().withMessage('brand_id must be a valid ID'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Phone cannot exceed 30 characters'),
    body('email').optional().trim().isEmail().withMessage('email must be a valid email address'),
    body('delivery_fee')
      .optional({ values: 'null' })
      .isFloat({ min: 0 })
      .withMessage('delivery_fee must be a non-negative number'),
    body('minimum_order')
      .optional({ values: 'null' })
      .isFloat({ min: 0 })
      .withMessage('minimum_order must be a non-negative number'),
    body('estimated_delivery_minutes')
      .optional()
      .isObject()
      .withMessage('estimated_delivery_minutes must be an object'),
    body('estimated_delivery_minutes.min')
      .optional()
      .isInt({ min: 0 })
      .withMessage('estimated_delivery_minutes.min must be a non-negative integer'),
    body('estimated_delivery_minutes.max')
      .optional()
      .isInt({ min: 0 })
      .withMessage('estimated_delivery_minutes.max must be a non-negative integer'),
    body('supports_delivery')
      .optional()
      .isBoolean()
      .withMessage('supports_delivery must be a boolean'),
    body('supports_pickup').optional().isBoolean().withMessage('supports_pickup must be a boolean'),
    body('is_partner_delivery')
      .optional()
      .isBoolean()
      .withMessage('is_partner_delivery must be a boolean'),
  ] as ValidationChain[],

  /**
   * PUT /:id — Update a restaurant (Owner or Admin)
   */
  update: [
    objectIdParamValidator(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 300 })
      .withMessage('Restaurant name must be between 1 and 300 characters'),
    body('slug')
      .optional()
      .trim()
      .isSlug()
      .withMessage('Invalid slug format')
      .isLength({ max: 300 })
      .withMessage('Slug cannot exceed 300 characters'),
    body('description').optional().isObject().withMessage('Description must be an object'),
    body('description.en')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('English description cannot exceed 2000 characters'),
    body('description.fr')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('French description cannot exceed 2000 characters'),
    body('description.de')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('German description cannot exceed 2000 characters'),
    body('description.it')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Italian description cannot exceed 2000 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Address must be between 1 and 500 characters'),
    body('postal_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 4 })
      .withMessage('Swiss postal code must be 4 characters'),
    body('city_id').optional().isMongoId().withMessage('city_id must be a valid ID'),
    body('canton_id').optional().isMongoId().withMessage('canton_id must be a valid ID'),
    body('brand_id')
      .optional({ values: 'null' })
      .isMongoId()
      .withMessage('brand_id must be a valid ID'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Phone cannot exceed 30 characters'),
    body('email').optional().trim().isEmail().withMessage('email must be a valid email address'),
    body('logo_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('logo_url must be a valid URL'),
    body('cover_image_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('cover_image_url must be a valid URL'),
    body('delivery_fee')
      .optional({ values: 'null' })
      .isFloat({ min: 0 })
      .withMessage('delivery_fee must be a non-negative number'),
    body('minimum_order')
      .optional({ values: 'null' })
      .isFloat({ min: 0 })
      .withMessage('minimum_order must be a non-negative number'),
    body('estimated_delivery_minutes')
      .optional()
      .isObject()
      .withMessage('estimated_delivery_minutes must be an object'),
    body('estimated_delivery_minutes.min')
      .optional()
      .isInt({ min: 0 })
      .withMessage('estimated_delivery_minutes.min must be a non-negative integer'),
    body('estimated_delivery_minutes.max')
      .optional()
      .isInt({ min: 0 })
      .withMessage('estimated_delivery_minutes.max must be a non-negative integer'),
    body('supports_delivery')
      .optional()
      .isBoolean()
      .withMessage('supports_delivery must be a boolean'),
    body('supports_pickup').optional().isBoolean().withMessage('supports_pickup must be a boolean'),
    body('is_partner_delivery')
      .optional()
      .isBoolean()
      .withMessage('is_partner_delivery must be a boolean'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body('is_featured').optional().isBoolean().withMessage('is_featured must be a boolean'),
  ] as ValidationChain[],

  /**
   * PATCH /:id/toggle-active — Toggle active status (Owner)
   */
  toggleActive: [
    objectIdParamValidator(),
    body('is_active')
      .notEmpty()
      .withMessage('is_active is required')
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ] as ValidationChain[],

  /**
   * PATCH /:id/status — Change restaurant status (Admin)
   */
  changeStatus: [
    objectIdParamValidator(),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(RESTAURANT_STATUSES as unknown as string[])
      .withMessage(`Status must be one of: ${RESTAURANT_STATUSES.join(', ')}`),
    body('rejection_reason')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Rejection reason must be between 1 and 1000 characters'),
  ] as ValidationChain[],

  /**
   * DELETE /:id — Delete restaurant (Admin)
   */
  delete: [objectIdParamValidator()] as ValidationChain[],

  /**
   * Admin GET / — List all restaurants (admin view with extra filters)
   */
  adminGetAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (RESTAURANT_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${RESTAURANT_SORT_FIELDS.join(', ')}`),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search must be between 1 and 200 characters'),
    query('status')
      .optional()
      .isIn(RESTAURANT_STATUSES as unknown as string[])
      .withMessage(`Status must be one of: ${RESTAURANT_STATUSES.join(', ')}`),
    query('city_id').optional().isMongoId().withMessage('city_id must be a valid ID'),
    query('canton_id').optional().isMongoId().withMessage('canton_id must be a valid ID'),
    query('cuisine_id').optional().isMongoId().withMessage('cuisine_id must be a valid ID'),
    query('brand_id').optional().isMongoId().withMessage('brand_id must be a valid ID'),
    query('postal_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
    query('min_rating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('min_rating must be between 0 and 5'),
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),
  ] as ValidationChain[],
};
