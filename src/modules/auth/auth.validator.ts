import { body, ValidationChain } from 'express-validator';

/**
 * Login validation rules
 */
export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Register validation rules
 */
export const registerValidator: ValidationChain[] = [
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

  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number'),

  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it'),
];

/**
 * Restaurant owner registration validation rules
 */
export const registerRestaurantValidator: ValidationChain[] = [
  // Personal info
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

  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required for restaurant owners')
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number'),

  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it'),

  // Restaurant info
  body('restaurant_name')
    .trim()
    .notEmpty()
    .withMessage('Restaurant name is required')
    .isLength({ max: 200 })
    .withMessage('Restaurant name cannot exceed 200 characters'),

  body('restaurant_address')
    .trim()
    .notEmpty()
    .withMessage('Restaurant address is required')
    .isLength({ max: 500 })
    .withMessage('Restaurant address cannot exceed 500 characters'),

  body('restaurant_postal_code')
    .trim()
    .notEmpty()
    .withMessage('Restaurant postal code is required')
    .isLength({ max: 10 })
    .withMessage('Postal code cannot exceed 10 characters'),

  body('restaurant_city_id')
    .notEmpty()
    .withMessage('Restaurant city is required')
    .isMongoId()
    .withMessage('Invalid city ID'),

  body('restaurant_canton_id')
    .notEmpty()
    .withMessage('Restaurant canton is required')
    .isMongoId()
    .withMessage('Invalid canton ID'),

  body('restaurant_phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid restaurant phone number'),

  body('restaurant_email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid restaurant email address')
    .normalizeEmail(),

  body('application_note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Application note cannot exceed 1000 characters'),
];

/**
 * Courier registration validation rules
 */
export const registerCourierValidator: ValidationChain[] = [
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

  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required for couriers')
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number'),

  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it'),

  body('vehicle_type')
    .notEmpty()
    .withMessage('Vehicle type is required')
    .isIn(['bicycle', 'motorcycle', 'car', 'scooter'])
    .withMessage('Vehicle type must be one of: bicycle, motorcycle, car, scooter'),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18) {
        throw new Error('You must be at least 18 years old to register as a courier');
      }
      return true;
    }),

  body('application_note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Application note cannot exceed 1000 characters'),
];

/**
 * Refresh token validation rules
 */
export const refreshTokenValidator: ValidationChain[] = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

/**
 * Password change validation rules
 */
export const changePasswordValidator: ValidationChain[] = [
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
];

/**
 * Profile update validation rules
 */
export const updateProfileValidator: ValidationChain[] = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number'),

  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it'),
];

/**
 * Email verification validation rules
 */
export const verifyEmailValidator: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isString()
    .withMessage('Verification token must be a string')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid verification token format'),
];

/**
 * Resend verification email validation rules
 */
export const resendVerificationValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Forgot password validation rules
 */
export const forgotPasswordValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Reset password validation rules
 */
export const resetPasswordValidator: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];
