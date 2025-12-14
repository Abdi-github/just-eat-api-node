/**
 * Centralized Error Codes
 *
 * Follows the numeric scheme from project specifications:
 *   1xxx — Authentication errors
 *   2xxx — Authorization errors
 *   3xxx — Validation errors
 *   4xxx — Business Logic errors
 *   5xxx — External Service errors
 *
 * Usage:
 *   throw NotFoundError('Restaurant not found', EC.RESTAURANT_NOT_FOUND);
 *   throw UnauthorizedError('Invalid credentials', EC.AUTH_INVALID_CREDENTIALS);
 */

// ============================================================================
// 1xxx — Authentication
// ============================================================================
export const AUTH_INVALID_CREDENTIALS = 1001;
export const AUTH_TOKEN_EXPIRED = 1002;
export const AUTH_TOKEN_INVALID = 1003;
export const AUTH_REFRESH_TOKEN_EXPIRED = 1004;
export const AUTH_EMAIL_NOT_VERIFIED = 1005;
export const AUTH_EMAIL_EXISTS = 1006;
export const AUTH_ACCOUNT_DEACTIVATED = 1007;
export const AUTH_ACCOUNT_SUSPENDED = 1008;
export const AUTH_TOKEN_REVOKED = 1009;
export const AUTH_INVALID_RESET_TOKEN = 1010;
export const AUTH_RESET_TOKEN_EXPIRED = 1011;
export const AUTH_INVALID_VERIFICATION_TOKEN = 1012;
export const AUTH_PASSWORD_MISMATCH = 1013;

// ============================================================================
// 2xxx — Authorization
// ============================================================================
export const AUTHZ_INSUFFICIENT_PERMISSIONS = 2001;
export const AUTHZ_ROLE_REQUIRED = 2002;
export const AUTHZ_RESTAURANT_ACCESS_DENIED = 2003;
export const AUTHZ_ORDER_ACCESS_DENIED = 2004;
export const AUTHZ_DELIVERY_ACCESS_DENIED = 2005;
export const AUTHZ_REVIEW_ACCESS_DENIED = 2006;

// ============================================================================
// 3xxx — Validation
// ============================================================================
export const VALID_REQUIRED_FIELD = 3001;
export const VALID_INVALID_FORMAT = 3002;
export const VALID_DUPLICATE_ENTRY = 3003;
export const VALID_MINIMUM_ORDER_NOT_MET = 3004;
export const VALID_RESTAURANT_CLOSED = 3005;
export const VALID_ITEM_UNAVAILABLE = 3006;
export const VALID_INVALID_POSTAL_CODE = 3007;
export const VALID_INVALID_RATING = 3008;
export const VALID_INVALID_STATUS = 3009;
export const VALID_INVALID_QUANTITY = 3010;

// ============================================================================
// 4xxx — Business Logic
// ============================================================================
export const BIZ_RESTAURANT_NOT_FOUND = 4001;
export const BIZ_INVALID_STATUS_TRANSITION = 4002;
export const BIZ_ORDER_CANNOT_BE_CANCELLED = 4003;
export const BIZ_DELIVERY_ZONE_NOT_COVERED = 4004;
export const BIZ_REVIEW_ALREADY_EXISTS = 4005;
export const BIZ_MENU_ITEM_NOT_FOUND = 4006;
export const BIZ_RESTAURANT_NOT_ACCEPTING_ORDERS = 4007;
export const BIZ_MENU_CATEGORY_NOT_FOUND = 4008;
export const BIZ_ORDER_NOT_FOUND = 4009;
export const BIZ_USER_NOT_FOUND = 4010;
export const BIZ_CUISINE_NOT_FOUND = 4011;
export const BIZ_BRAND_NOT_FOUND = 4012;
export const BIZ_CITY_NOT_FOUND = 4013;
export const BIZ_CANTON_NOT_FOUND = 4014;
export const BIZ_ADDRESS_NOT_FOUND = 4015;
export const BIZ_FAVORITE_NOT_FOUND = 4016;
export const BIZ_REVIEW_NOT_FOUND = 4017;
export const BIZ_DELIVERY_NOT_FOUND = 4018;
export const BIZ_COUPON_NOT_FOUND = 4019;
export const BIZ_COUPON_EXPIRED = 4020;
export const BIZ_COUPON_USAGE_LIMIT = 4021;
export const BIZ_COUPON_MINIMUM_NOT_MET = 4022;
export const BIZ_STAMP_CARD_NOT_FOUND = 4023;
export const BIZ_NOTIFICATION_NOT_FOUND = 4024;
export const BIZ_ALREADY_FAVOURITE = 4025;
export const BIZ_SLUG_EXISTS = 4026;
export const BIZ_PAYMENT_NOT_FOUND = 4027;
export const BIZ_PAYMENT_ALREADY_COMPLETED = 4028;
export const BIZ_INVALID_PAYMENT_METHOD = 4029;
export const BIZ_CASH_NO_REFUND = 4030;

// ============================================================================
// 5xxx — External Services
// ============================================================================
export const EXT_DATABASE_ERROR = 5001;
export const EXT_REDIS_CONNECTION = 5002;
export const EXT_STRIPE_ERROR = 5003;
export const EXT_CLOUDINARY_ERROR = 5004;
export const EXT_EMAIL_SEND_FAILED = 5005;
export const EXT_TWINT_ERROR = 5006;
export const EXT_POSTFINANCE_ERROR = 5007;
export const EXT_PAYMENT_WEBHOOK_FAILED = 5008;

/**
 * Convenience namespace for importing all codes
 *
 * Usage:
 *   import * as EC from '@shared/errors/errorCodes.js';
 *   throw NotFoundError('Not found', EC.BIZ_RESTAURANT_NOT_FOUND);
 */
