import { body, param, query, type ValidationChain } from 'express-validator';

import { USER_STATUSES } from './user.model.js';
import { USER_SORT_FIELDS } from './user.types.js';

// ============================================================================
// Shared Validators
// ============================================================================

const firstNameValidator = (required = false): ValidationChain => {
  const chain = body('first_name').trim();
  if (required) {
    return chain
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 100 })
      .withMessage('First name cannot exceed 100 characters')
      .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes');
  }
  return chain
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes');
};

const lastNameValidator = (required = false): ValidationChain => {
  const chain = body('last_name').trim();
  if (required) {
    return chain
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 100 })
      .withMessage('Last name cannot exceed 100 characters')
      .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes');
  }
  return chain
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes');
};

const phoneValidator = (): ValidationChain =>
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number');

const languageValidator = (): ValidationChain =>
  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it');

const objectIdParamValidator = (paramName = 'id'): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);

// ============================================================================
// User Validators
// ============================================================================

export const userValidators = {
  // --------------------------------------------------------------------------
  // Admin: List users query params
  // --------------------------------------------------------------------------
  getAll: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(USER_SORT_FIELDS)
      .withMessage(`Sort must be one of: ${USER_SORT_FIELDS.join(', ')}`),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('status')
      .optional()
      .isIn(USER_STATUSES)
      .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),
    query('is_verified')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_verified must be true or false'),
  ] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Admin: Get/Delete user by ID
  // --------------------------------------------------------------------------
  getById: [objectIdParamValidator()] as ValidationChain[],

  deleteById: [objectIdParamValidator()] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Admin: Create user
  // --------------------------------------------------------------------------
  create: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),

    firstNameValidator(true),
    lastNameValidator(true),
    phoneValidator(),
    languageValidator(),

    body('status')
      .optional()
      .isIn(USER_STATUSES)
      .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),

    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Admin: Update user
  // --------------------------------------------------------------------------
  updateAdmin: [
    objectIdParamValidator(),
    firstNameValidator(false),
    lastNameValidator(false),
    phoneValidator(),
    languageValidator(),

    body('status')
      .optional()
      .isIn(USER_STATUSES)
      .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),

    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),

    body('is_verified').optional().isBoolean().withMessage('is_verified must be a boolean'),
  ] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Admin: Activate / Suspend user
  // --------------------------------------------------------------------------
  activate: [objectIdParamValidator()] as ValidationChain[],

  suspend: [objectIdParamValidator()] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Admin: Assign / Remove role
  // --------------------------------------------------------------------------
  assignRole: [
    objectIdParamValidator(),
    body('role')
      .trim()
      .notEmpty()
      .withMessage('Role name is required')
      .isString()
      .withMessage('Role must be a string'),
  ] as ValidationChain[],

  removeRole: [
    objectIdParamValidator(),
    param('role')
      .trim()
      .notEmpty()
      .withMessage('Role name is required')
      .isString()
      .withMessage('Role must be a string'),
  ] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Self: Update profile
  // --------------------------------------------------------------------------
  updateProfile: [
    firstNameValidator(false),
    lastNameValidator(false),
    phoneValidator(),
    languageValidator(),
  ] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Self: Change password
  // --------------------------------------------------------------------------
  changePassword: [
    body('current_password').notEmpty().withMessage('Current password is required'),

    body('new_password')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      )
      .custom((value, { req }) => {
        if (value === req.body.current_password) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),
  ] as ValidationChain[],

  // --------------------------------------------------------------------------
  // Self: Update settings (notification preferences)
  // --------------------------------------------------------------------------
  updateSettings: [
    body('email_order_updates')
      .optional()
      .isBoolean()
      .withMessage('email_order_updates must be a boolean'),

    body('email_promotions')
      .optional()
      .isBoolean()
      .withMessage('email_promotions must be a boolean'),

    body('email_newsletter')
      .optional()
      .isBoolean()
      .withMessage('email_newsletter must be a boolean'),

    body('push_enabled').optional().isBoolean().withMessage('push_enabled must be a boolean'),
  ] as ValidationChain[],
};

export default userValidators;
