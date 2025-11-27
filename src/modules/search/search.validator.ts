import { param, query, type ValidationChain } from 'express-validator';
import {
  RESTAURANT_SEARCH_SORT_FIELDS,
  MENU_ITEM_SEARCH_SORT_FIELDS,
  MAX_SEARCH_QUERY_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
  MAX_SEARCH_LIMIT,
} from './search.types.js';

// ============================================================================
// Shared Validators
// ============================================================================

const paginationValidators: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: MAX_SEARCH_LIMIT })
    .withMessage(`Limit must be between 1 and ${MAX_SEARCH_LIMIT}`),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
];

const searchQueryValidator: ValidationChain = query('q')
  .optional()
  .isString()
  .trim()
  .isLength({ min: MIN_SEARCH_QUERY_LENGTH, max: MAX_SEARCH_QUERY_LENGTH })
  .withMessage(
    `Search query must be between ${MIN_SEARCH_QUERY_LENGTH} and ${MAX_SEARCH_QUERY_LENGTH} characters`
  );

// ============================================================================
// Search Validators
// ============================================================================

export const searchValidators = {
  /**
   * GET /search/restaurants — Search restaurants
   */
  searchRestaurants: [
    searchQueryValidator,
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (RESTAURANT_SEARCH_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${RESTAURANT_SEARCH_SORT_FIELDS.join(', ')}`),
    query('city_id').optional().isMongoId().withMessage('Invalid city_id format'),
    query('canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
    query('cuisine_id').optional().isMongoId().withMessage('Invalid cuisine_id format'),
    query('brand_id').optional().isMongoId().withMessage('Invalid brand_id format'),
    query('postal_code')
      .optional()
      .matches(/^\d{4}$/)
      .withMessage('Postal code must be a 4-digit Swiss postal code'),
    query('min_rating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('Minimum rating must be between 0 and 5'),
    query('max_delivery_fee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum delivery fee must be a non-negative number'),
    query('order_type')
      .optional()
      .isIn(['delivery', 'pickup'])
      .withMessage('Order type must be delivery or pickup'),
    query('is_featured').optional().isBoolean().withMessage('is_featured must be a boolean'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ] as ValidationChain[],

  /**
   * GET /search/restaurants/:restaurantId/menu — Search menu items in a restaurant
   */
  searchMenuItems: [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
    searchQueryValidator,
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (MENU_ITEM_SEARCH_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${MENU_ITEM_SEARCH_SORT_FIELDS.join(', ')}`),
    query('category_id').optional().isMongoId().withMessage('Invalid category_id format'),
    query('min_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a non-negative number'),
    query('max_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a non-negative number'),
    query('is_available').optional().isBoolean().withMessage('is_available must be a boolean'),
    query('is_popular').optional().isBoolean().withMessage('is_popular must be a boolean'),
    query('allergens')
      .optional()
      .isString()
      .withMessage('Allergens must be a comma-separated string'),
    query('dietary_flags')
      .optional()
      .isString()
      .withMessage('Dietary flags must be a comma-separated string'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ] as ValidationChain[],

  /**
   * GET /search/suggestions — Get search suggestions
   */
  getSuggestions: [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .trim()
      .isLength({ min: MIN_SEARCH_QUERY_LENGTH, max: MAX_SEARCH_QUERY_LENGTH })
      .withMessage(
        `Search query must be between ${MIN_SEARCH_QUERY_LENGTH} and ${MAX_SEARCH_QUERY_LENGTH} characters`
      ),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ] as ValidationChain[],
};
