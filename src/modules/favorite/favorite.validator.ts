import { body, param, query } from 'express-validator';
import { isValidObjectId } from 'mongoose';

/**
 * Favorite Validators
 *
 * express-validator rules for favorite endpoints.
 */
export const favoriteValidators = {
  /**
   * POST /favorites/toggle
   */
  validateToggleFavorite: [
    body('restaurant_id')
      .notEmpty()
      .withMessage('Restaurant ID is required')
      .custom((value: string) => isValidObjectId(value))
      .withMessage('Invalid restaurant ID'),
  ],

  /**
   * GET /favorites
   */
  validateGetMyFavorites: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],

  /**
   * GET /favorites/check/:restaurantId
   */
  validateCheckFavorite: [
    param('restaurantId')
      .notEmpty()
      .withMessage('Restaurant ID is required')
      .custom((value: string) => isValidObjectId(value))
      .withMessage('Invalid restaurant ID'),
  ],

  /**
   * DELETE /favorites/:restaurantId
   */
  validateRemoveFavorite: [
    param('restaurantId')
      .notEmpty()
      .withMessage('Restaurant ID is required')
      .custom((value: string) => isValidObjectId(value))
      .withMessage('Invalid restaurant ID'),
  ],
};
