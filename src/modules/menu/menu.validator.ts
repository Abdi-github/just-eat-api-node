import { body, param, query, type ValidationChain } from 'express-validator';

import {
  MENU_CATEGORY_SORT_FIELDS,
  MENU_ITEM_SORT_FIELDS,
  VALID_ALLERGENS,
  VALID_DIETARY_FLAGS,
} from './menu.types.js';

// ============================================================================
// Shared Validators
// ============================================================================

const objectIdParamValidator = (paramName: string): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);

const paginationValidators: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const translatedFieldValidators = (fieldName: string, required = true): ValidationChain[] => {
  const validators: ValidationChain[] = [];
  const langs = ['en', 'fr', 'de', 'it'] as const;

  for (const lang of langs) {
    const v = body(`${fieldName}.${lang}`);
    if (required) {
      validators.push(
        v
          .notEmpty()
          .withMessage(`${fieldName}.${lang} is required`)
          .isString()
          .trim()
          .isLength({ min: 1, max: 200 })
          .withMessage(`${fieldName}.${lang} must be between 1 and 200 characters`)
      );
    } else {
      validators.push(
        v
          .optional()
          .isString()
          .trim()
          .isLength({ max: 500 })
          .withMessage(`${fieldName}.${lang} must be at most 500 characters`)
      );
    }
  }

  return validators;
};

// ============================================================================
// Menu Category Validators
// ============================================================================

export const menuCategoryValidators = {
  /**
   * GET /:restaurantId/menu/categories — List categories
   */
  getCategories: [
    objectIdParamValidator('restaurantId'),
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (MENU_CATEGORY_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${MENU_CATEGORY_SORT_FIELDS.join(', ')}`),
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),
  ],

  /**
   * GET /:restaurantId/menu/categories/:categoryId — Get category
   */
  getCategoryById: [objectIdParamValidator('restaurantId'), objectIdParamValidator('categoryId')],

  /**
   * POST /:restaurantId/menu/categories — Create category
   */
  createCategory: [
    objectIdParamValidator('restaurantId'),
    ...translatedFieldValidators('name', true),
    body('slug')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Slug must be between 1 and 100 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * PUT /:restaurantId/menu/categories/:categoryId — Update category
   */
  updateCategory: [
    objectIdParamValidator('restaurantId'),
    objectIdParamValidator('categoryId'),
    body('name.en')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.en must be between 1 and 200 characters'),
    body('name.fr')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.fr must be between 1 and 200 characters'),
    body('name.de')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.de must be between 1 and 200 characters'),
    body('name.it')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.it must be between 1 and 200 characters'),
    body('slug')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * DELETE /:restaurantId/menu/categories/:categoryId — Delete category
   */
  deleteCategory: [objectIdParamValidator('restaurantId'), objectIdParamValidator('categoryId')],

  /**
   * PATCH /:restaurantId/menu/categories/reorder — Reorder categories
   */
  reorderCategories: [
    objectIdParamValidator('restaurantId'),
    body('order').isArray({ min: 1 }).withMessage('Order must be a non-empty array'),
    body('order.*.id').isMongoId().withMessage('Each order item must have a valid id'),
    body('order.*.sort_order')
      .isInt({ min: 0 })
      .withMessage('Each order item must have a non-negative sort_order'),
  ],
};

// ============================================================================
// Menu Item Validators
// ============================================================================

export const menuItemValidators = {
  /**
   * GET /:restaurantId/menu/items — List items
   */
  getItems: [
    objectIdParamValidator('restaurantId'),
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (MENU_ITEM_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${MENU_ITEM_SORT_FIELDS.join(', ')}`),
    query('category_id')
      .optional()
      .isMongoId()
      .withMessage('category_id must be a valid MongoDB ObjectId'),
    query('is_available')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_available must be true or false'),
    query('is_popular')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_popular must be true or false'),
    query('min_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('min_price must be a non-negative number'),
    query('max_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('max_price must be a non-negative number'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),
  ],

  /**
   * GET /:restaurantId/menu/items/:itemId — Get item
   */
  getItemById: [objectIdParamValidator('restaurantId'), objectIdParamValidator('itemId')],

  /**
   * POST /:restaurantId/menu/items — Create item
   */
  createItem: [
    objectIdParamValidator('restaurantId'),
    body('category_id')
      .notEmpty()
      .withMessage('category_id is required')
      .isMongoId()
      .withMessage('category_id must be a valid MongoDB ObjectId'),
    ...translatedFieldValidators('name', true),
    ...translatedFieldValidators('description', false),
    body('price')
      .notEmpty()
      .withMessage('Price is required')
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    body('image_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('image_url must be a valid URL'),
    body('is_available').optional().isBoolean().withMessage('is_available must be a boolean'),
    body('is_popular').optional().isBoolean().withMessage('is_popular must be a boolean'),
    body('allergens').optional().isArray().withMessage('Allergens must be an array'),
    body('allergens.*')
      .optional()
      .isIn(VALID_ALLERGENS as unknown as string[])
      .withMessage(`Each allergen must be one of: ${VALID_ALLERGENS.join(', ')}`),
    body('dietary_flags').optional().isArray().withMessage('Dietary flags must be an array'),
    body('dietary_flags.*')
      .optional()
      .isIn(VALID_DIETARY_FLAGS as unknown as string[])
      .withMessage(`Each dietary flag must be one of: ${VALID_DIETARY_FLAGS.join(', ')}`),
    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
  ],

  /**
   * PUT /:restaurantId/menu/items/:itemId — Update item
   */
  updateItem: [
    objectIdParamValidator('restaurantId'),
    objectIdParamValidator('itemId'),
    body('category_id')
      .optional()
      .isMongoId()
      .withMessage('category_id must be a valid MongoDB ObjectId'),
    body('name.en')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.en must be between 1 and 200 characters'),
    body('name.fr')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.fr must be between 1 and 200 characters'),
    body('name.de')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.de must be between 1 and 200 characters'),
    body('name.it')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('name.it must be between 1 and 200 characters'),
    body('description.en')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('description.en must be at most 500 characters'),
    body('description.fr')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('description.fr must be at most 500 characters'),
    body('description.de')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('description.de must be at most 500 characters'),
    body('description.it')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('description.it must be at most 500 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('image_url')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('image_url must be a valid URL'),
    body('is_available').optional().isBoolean().withMessage('is_available must be a boolean'),
    body('is_popular').optional().isBoolean().withMessage('is_popular must be a boolean'),
    body('allergens').optional().isArray().withMessage('Allergens must be an array'),
    body('allergens.*')
      .optional()
      .isIn(VALID_ALLERGENS as unknown as string[])
      .withMessage(`Each allergen must be one of: ${VALID_ALLERGENS.join(', ')}`),
    body('dietary_flags').optional().isArray().withMessage('Dietary flags must be an array'),
    body('dietary_flags.*')
      .optional()
      .isIn(VALID_DIETARY_FLAGS as unknown as string[])
      .withMessage(`Each dietary flag must be one of: ${VALID_DIETARY_FLAGS.join(', ')}`),
    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
  ],

  /**
   * DELETE /:restaurantId/menu/items/:itemId — Delete item
   */
  deleteItem: [objectIdParamValidator('restaurantId'), objectIdParamValidator('itemId')],

  /**
   * PATCH /:restaurantId/menu/items/:itemId/availability — Toggle availability
   */
  toggleAvailability: [
    objectIdParamValidator('restaurantId'),
    objectIdParamValidator('itemId'),
    body('is_available')
      .notEmpty()
      .withMessage('is_available is required')
      .isBoolean()
      .withMessage('is_available must be a boolean'),
  ],

  /**
   * PATCH /:restaurantId/menu/items/reorder — Reorder items
   */
  reorderItems: [
    objectIdParamValidator('restaurantId'),
    body('order').isArray({ min: 1 }).withMessage('Order must be a non-empty array'),
    body('order.*.id').isMongoId().withMessage('Each order item must have a valid id'),
    body('order.*.sort_order')
      .isInt({ min: 0 })
      .withMessage('Each order item must have a non-negative sort_order'),
  ],

  /**
   * Public menu endpoint validators
   */
  getFullMenu: [objectIdParamValidator('restaurantId')],

  getPublicMenuItems: [
    objectIdParamValidator('restaurantId'),
    ...paginationValidators,
    query('sort')
      .optional()
      .custom((value: string) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return (MENU_ITEM_SORT_FIELDS as readonly string[]).includes(field);
      })
      .withMessage(`Sort must be one of: ${MENU_ITEM_SORT_FIELDS.join(', ')}`),
    query('category_id')
      .optional()
      .isMongoId()
      .withMessage('category_id must be a valid MongoDB ObjectId'),
    query('is_popular')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_popular must be true or false'),
    query('min_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('min_price must be a non-negative number'),
    query('max_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('max_price must be a non-negative number'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),
  ],
};
