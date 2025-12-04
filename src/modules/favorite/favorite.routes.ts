import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { favoriteController } from './favorite.controller.js';
import { favoriteValidators } from './favorite.validator.js';

const router = Router();

/**
 * Favorite Routes
 * Base path: /api/v1/public/favorites
 *
 * All routes require authentication — favorites are a customer feature.
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Toggle favorite (add/remove)
// ============================================================================

/**
 * @route   POST /api/v1/public/favorites/toggle
 * @desc    Toggle a restaurant in favorites (add if not exists, remove if exists)
 * @access  Customer (favorites:create)
 */
router.post(
  '/toggle',
  requirePermission('favorites:create'),
  favoriteValidators.validateToggleFavorite,
  validate,
  favoriteController.toggleFavorite
);

// ============================================================================
// List favorites
// ============================================================================

/**
 * @route   GET /api/v1/public/favorites
 * @desc    Get authenticated user's favorite restaurants
 * @access  Customer (favorites:read)
 */
router.get(
  '/',
  requirePermission('favorites:read'),
  favoriteValidators.validateGetMyFavorites,
  validate,
  favoriteController.getMyFavorites
);

// ============================================================================
// Check if favorited
// ============================================================================

/**
 * @route   GET /api/v1/public/favorites/check/:restaurantId
 * @desc    Check if a restaurant is in user's favorites
 * @access  Customer (favorites:read)
 */
router.get(
  '/check/:restaurantId',
  requirePermission('favorites:read'),
  favoriteValidators.validateCheckFavorite,
  validate,
  favoriteController.checkFavorite
);

// ============================================================================
// Remove favorite
// ============================================================================

/**
 * @route   DELETE /api/v1/public/favorites/:restaurantId
 * @desc    Remove a restaurant from favorites
 * @access  Customer (favorites:delete)
 */
router.delete(
  '/:restaurantId',
  requirePermission('favorites:delete'),
  favoriteValidators.validateRemoveFavorite,
  validate,
  favoriteController.removeFavorite
);

export default router;
