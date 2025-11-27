import { body, param, query, type ValidationChain } from 'express-validator';
import { ADDRESS_SORT_FIELDS } from './address.types.js';

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
// Address Validators
// ============================================================================

export const addressValidators = {
  /**
   * GET / — List all addresses
   */
  getAll: [
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (ADDRESS_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${ADDRESS_SORT_FIELDS.join(', ')}`),
  ] as ValidationChain[],

  /**
   * GET /:id — Get address by ID
   */
  getById: [objectIdParamValidator()] as ValidationChain[],

  /**
   * POST / — Create address
   */
  create: [
    body('label')
      .trim()
      .notEmpty()
      .withMessage('Label is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Label must be between 1 and 50 characters'),
    body('street')
      .trim()
      .notEmpty()
      .withMessage('Street is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Street must be between 1 and 200 characters'),
    body('street_number')
      .trim()
      .notEmpty()
      .withMessage('Street number is required')
      .isLength({ min: 1, max: 20 })
      .withMessage('Street number must be between 1 and 20 characters'),
    body('floor')
      .optional({ values: 'null' })
      .trim()
      .isLength({ max: 20 })
      .withMessage('Floor must be at most 20 characters'),
    body('postal_code')
      .trim()
      .notEmpty()
      .withMessage('Postal code is required')
      .matches(/^\d{4}$/)
      .withMessage('Postal code must be a 4-digit Swiss postal code'),
    body('city_id')
      .notEmpty()
      .withMessage('City is required')
      .isMongoId()
      .withMessage('Invalid city_id format'),
    body('canton_id')
      .notEmpty()
      .withMessage('Canton is required')
      .isMongoId()
      .withMessage('Invalid canton_id format'),
    body('instructions')
      .optional({ values: 'null' })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Instructions must be at most 500 characters'),
    body('is_default').optional().isBoolean().withMessage('is_default must be a boolean'),
  ] as ValidationChain[],

  /**
   * PUT /:id — Update address
   */
  update: [
    objectIdParamValidator(),
    body('label')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Label must be between 1 and 50 characters'),
    body('street')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Street must be between 1 and 200 characters'),
    body('street_number')
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Street number must be between 1 and 20 characters'),
    body('floor')
      .optional({ values: 'null' })
      .trim()
      .isLength({ max: 20 })
      .withMessage('Floor must be at most 20 characters'),
    body('postal_code')
      .optional()
      .trim()
      .matches(/^\d{4}$/)
      .withMessage('Postal code must be a 4-digit Swiss postal code'),
    body('city_id').optional().isMongoId().withMessage('Invalid city_id format'),
    body('canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
    body('instructions')
      .optional({ values: 'null' })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Instructions must be at most 500 characters'),
    body('is_default').optional().isBoolean().withMessage('is_default must be a boolean'),
  ] as ValidationChain[],

  /**
   * DELETE /:id — Delete address
   */
  delete: [objectIdParamValidator()] as ValidationChain[],

  /**
   * PATCH /:id/default — Set as default
   */
  setDefault: [objectIdParamValidator()] as ValidationChain[],
};
