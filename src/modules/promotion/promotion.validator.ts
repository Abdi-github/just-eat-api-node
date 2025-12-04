import { body, param, query } from 'express-validator';
import { DiscountType, PromotionScope, PROMOTION_CONSTANTS } from './promotion.types.js';

// ===========================================================================
// Coupon Validators
// ===========================================================================

export const createCouponValidator = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Code must be between 3 and 30 characters')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Code may only contain letters, numbers, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('discount_type')
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(Object.values(DiscountType))
    .withMessage(`Discount type must be one of: ${Object.values(DiscountType).join(', ')}`),
  body('discount_value')
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ min: 0.01 })
    .withMessage('Discount value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.discount_type === DiscountType.PERCENTAGE && value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      return true;
    }),
  body('minimum_order')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order must be a non-negative number'),
  body('maximum_discount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Maximum discount must be greater than 0'),
  body('scope')
    .notEmpty()
    .withMessage('Scope is required')
    .isIn(Object.values(PromotionScope))
    .withMessage(`Scope must be one of: ${Object.values(PromotionScope).join(', ')}`),
  body('restaurant_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid restaurant ID')
    .custom((value, { req }) => {
      if (req.body.scope === PromotionScope.RESTAURANT && !value) {
        throw new Error('Restaurant ID is required for restaurant-scoped coupons');
      }
      return true;
    }),
  body('valid_from').optional().isISO8601().withMessage('Valid from must be a valid ISO 8601 date'),
  body('valid_until')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.body.valid_from && new Date(value) <= new Date(req.body.valid_from)) {
        throw new Error('Valid until must be after valid from');
      }
      return true;
    }),
  body('usage_limit').optional().isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
  body('per_user_limit')
    .optional()
    .isInt({ min: 1, max: PROMOTION_CONSTANTS.MAX_PER_USER_LIMIT })
    .withMessage(`Per-user limit must be between 1 and ${PROMOTION_CONSTANTS.MAX_PER_USER_LIMIT}`),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

export const updateCouponValidator = [
  param('id').isMongoId().withMessage('Invalid coupon ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('discount_type')
    .optional()
    .isIn(Object.values(DiscountType))
    .withMessage(`Discount type must be one of: ${Object.values(DiscountType).join(', ')}`),
  body('discount_value')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Discount value must be greater than 0'),
  body('minimum_order')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order must be a non-negative number'),
  body('maximum_discount')
    .optional({ values: 'null' })
    .isFloat({ min: 0.01 })
    .withMessage('Maximum discount must be greater than 0'),
  body('valid_from')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Valid from must be a valid ISO 8601 date'),
  body('valid_until')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Valid until must be a valid ISO 8601 date'),
  body('usage_limit')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  body('per_user_limit')
    .optional()
    .isInt({ min: 1, max: PROMOTION_CONSTANTS.MAX_PER_USER_LIMIT })
    .withMessage(`Per-user limit must be between 1 and ${PROMOTION_CONSTANTS.MAX_PER_USER_LIMIT}`),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

export const validateCouponCodeValidator = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('restaurant_id')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  body('subtotal')
    .notEmpty()
    .withMessage('Subtotal is required')
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a non-negative number'),
];

// ===========================================================================
// Stamp Card Validators
// ===========================================================================

export const createStampCardValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Stamp card name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('restaurant_id')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  body('stamps_required')
    .notEmpty()
    .withMessage('Stamps required is required')
    .isInt({
      min: PROMOTION_CONSTANTS.MIN_STAMPS_REQUIRED,
      max: PROMOTION_CONSTANTS.MAX_STAMPS_REQUIRED,
    })
    .withMessage(
      `Stamps required must be between ${PROMOTION_CONSTANTS.MIN_STAMPS_REQUIRED} and ${PROMOTION_CONSTANTS.MAX_STAMPS_REQUIRED}`
    ),
  body('reward_description')
    .trim()
    .notEmpty()
    .withMessage('Reward description is required')
    .isLength({ max: 200 })
    .withMessage('Reward description must not exceed 200 characters'),
  body('reward_type')
    .notEmpty()
    .withMessage('Reward type is required')
    .isIn(Object.values(DiscountType))
    .withMessage(`Reward type must be one of: ${Object.values(DiscountType).join(', ')}`),
  body('reward_value')
    .notEmpty()
    .withMessage('Reward value is required')
    .isFloat({ min: 0.01 })
    .withMessage('Reward value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.reward_type === DiscountType.PERCENTAGE && value > 100) {
        throw new Error('Percentage reward cannot exceed 100%');
      }
      return true;
    }),
  body('valid_from').optional().isISO8601().withMessage('Valid from must be a valid ISO 8601 date'),
  body('valid_until')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid ISO 8601 date'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

export const updateStampCardValidator = [
  param('id').isMongoId().withMessage('Invalid stamp card ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('stamps_required')
    .optional()
    .isInt({
      min: PROMOTION_CONSTANTS.MIN_STAMPS_REQUIRED,
      max: PROMOTION_CONSTANTS.MAX_STAMPS_REQUIRED,
    })
    .withMessage(
      `Stamps required must be between ${PROMOTION_CONSTANTS.MIN_STAMPS_REQUIRED} and ${PROMOTION_CONSTANTS.MAX_STAMPS_REQUIRED}`
    ),
  body('reward_description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reward description must not exceed 200 characters'),
  body('reward_type')
    .optional()
    .isIn(Object.values(DiscountType))
    .withMessage(`Reward type must be one of: ${Object.values(DiscountType).join(', ')}`),
  body('reward_value')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Reward value must be greater than 0'),
  body('valid_from')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Valid from must be a valid ISO 8601 date'),
  body('valid_until')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Valid until must be a valid ISO 8601 date'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

// ===========================================================================
// Common Validators
// ===========================================================================

export const mongoIdParamValidator = [param('id').isMongoId().withMessage('Invalid ID format')];

export const couponListQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('scope')
    .optional()
    .isIn(Object.values(PromotionScope))
    .withMessage(`Scope must be one of: ${Object.values(PromotionScope).join(', ')}`),
  query('status')
    .optional()
    .isIn(Object.values(['active', 'inactive', 'expired']))
    .withMessage('Status must be one of: active, inactive, expired'),
  query('restaurant_id').optional().isMongoId().withMessage('Invalid restaurant ID'),
];

export const stampCardListQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('restaurant_id').optional().isMongoId().withMessage('Invalid restaurant ID'),
];
