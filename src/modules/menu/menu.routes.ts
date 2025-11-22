import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { menuController } from './menu.controller.js';
import { menuItemValidators } from './menu.validator.js';

const router = Router({ mergeParams: true });

// ============================================================================
// Public Menu Routes — mounted at /api/v1/public/restaurants/:restaurantId/menu
// ============================================================================

/**
 * @route   GET /api/v1/public/restaurants/:restaurantId/menu
 * @desc    Get full restaurant menu (categories with nested items)
 * @access  Public
 */
router.get('/', menuItemValidators.getFullMenu, validate, menuController.getFullMenu);

/**
 * @route   GET /api/v1/public/restaurants/:restaurantId/menu/items
 * @desc    Get menu items (flat list, filterable)
 * @access  Public
 */
router.get(
  '/items',
  menuItemValidators.getPublicMenuItems,
  validate,
  menuController.getPublicMenuItems
);

export default router;
