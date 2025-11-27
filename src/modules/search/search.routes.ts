import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { searchController } from './search.controller.js';
import { searchValidators } from './search.validator.js';

const router = Router();

// ============================================================================
// Public Search Routes — /api/v1/public/search/*
// No authentication required — these are public endpoints
// ============================================================================

/**
 * @route   GET /api/v1/public/search/restaurants
 * @desc    Search restaurants with filters, sorting, and pagination
 * @access  Public
 */
router.get(
  '/restaurants',
  searchValidators.searchRestaurants,
  validate,
  searchController.searchRestaurants
);

/**
 * @route   GET /api/v1/public/search/restaurants/:restaurantId/menu
 * @desc    Search menu items within a specific restaurant
 * @access  Public
 */
router.get(
  '/restaurants/:restaurantId/menu',
  searchValidators.searchMenuItems,
  validate,
  searchController.searchMenuItems
);

/**
 * @route   GET /api/v1/public/search/suggestions
 * @desc    Get autocomplete search suggestions for restaurants and cuisines
 * @access  Public
 */
router.get(
  '/suggestions',
  searchValidators.getSuggestions,
  validate,
  searchController.getSuggestions
);

export default router;
