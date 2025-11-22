import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import { uploadMenuItemImage } from '../../shared/middlewares/upload.middleware.js';
import { menuController } from './menu.controller.js';
import { menuCategoryValidators, menuItemValidators } from './menu.validator.js';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Menu Category Routes — /api/v1/restaurant/:restaurantId/menu/categories
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/menu/categories
 * @desc    List all menu categories (owner view, includes inactive)
 * @access  Restaurant Owner (menu_categories:read)
 */
router.get(
  '/categories',
  requirePermission('menu_categories:read'),
  menuCategoryValidators.getCategories,
  validate,
  menuController.getCategories
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/menu/categories/:categoryId
 * @desc    Get a single category
 * @access  Restaurant Owner (menu_categories:read)
 */
router.get(
  '/categories/:categoryId',
  requirePermission('menu_categories:read'),
  menuCategoryValidators.getCategoryById,
  validate,
  menuController.getCategoryById
);

/**
 * @route   POST /api/v1/restaurant/:restaurantId/menu/categories
 * @desc    Create a new menu category
 * @access  Restaurant Owner (menu_categories:create)
 */
router.post(
  '/categories',
  requirePermission('menu_categories:create'),
  menuCategoryValidators.createCategory,
  validate,
  menuController.createCategory
);

/**
 * @route   PUT /api/v1/restaurant/:restaurantId/menu/categories/:categoryId
 * @desc    Update a menu category
 * @access  Restaurant Owner (menu_categories:update)
 */
router.put(
  '/categories/:categoryId',
  requirePermission('menu_categories:update'),
  menuCategoryValidators.updateCategory,
  validate,
  menuController.updateCategory
);

/**
 * @route   DELETE /api/v1/restaurant/:restaurantId/menu/categories/:categoryId
 * @desc    Delete a menu category (and all its items)
 * @access  Restaurant Owner (menu_categories:delete)
 */
router.delete(
  '/categories/:categoryId',
  requirePermission('menu_categories:delete'),
  menuCategoryValidators.deleteCategory,
  validate,
  menuController.deleteCategory
);

/**
 * @route   PATCH /api/v1/restaurant/:restaurantId/menu/categories/reorder
 * @desc    Reorder menu categories (drag & drop)
 * @access  Restaurant Owner (menu_categories:update)
 */
router.patch(
  '/categories/reorder',
  requirePermission('menu_categories:update'),
  menuCategoryValidators.reorderCategories,
  validate,
  menuController.reorderCategories
);

// ============================================================================
// Menu Item Routes — /api/v1/restaurant/:restaurantId/menu/items
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/:restaurantId/menu/items
 * @desc    List all menu items (owner view, includes unavailable)
 * @access  Restaurant Owner/Staff (menu_items:read)
 */
router.get(
  '/items',
  requirePermission('menu_items:read'),
  menuItemValidators.getItems,
  validate,
  menuController.getItems
);

/**
 * @route   GET /api/v1/restaurant/:restaurantId/menu/items/:itemId
 * @desc    Get a single menu item
 * @access  Restaurant Owner/Staff (menu_items:read)
 */
router.get(
  '/items/:itemId',
  requirePermission('menu_items:read'),
  menuItemValidators.getItemById,
  validate,
  menuController.getItemById
);

/**
 * @route   POST /api/v1/restaurant/:restaurantId/menu/items
 * @desc    Create a new menu item
 * @access  Restaurant Owner (menu_items:create)
 */
router.post(
  '/items',
  requirePermission('menu_items:create'),
  menuItemValidators.createItem,
  validate,
  menuController.createItem
);

/**
 * @route   PUT /api/v1/restaurant/:restaurantId/menu/items/:itemId
 * @desc    Update a menu item
 * @access  Restaurant Owner/Staff (menu_items:update)
 */
router.put(
  '/items/:itemId',
  requirePermission('menu_items:update'),
  menuItemValidators.updateItem,
  validate,
  menuController.updateItem
);

/**
 * @route   DELETE /api/v1/restaurant/:restaurantId/menu/items/:itemId
 * @desc    Delete a menu item
 * @access  Restaurant Owner (menu_items:delete)
 */
router.delete(
  '/items/:itemId',
  requirePermission('menu_items:delete'),
  menuItemValidators.deleteItem,
  validate,
  menuController.deleteItem
);

/**
 * @route   PATCH /api/v1/restaurant/:restaurantId/menu/items/:itemId/availability
 * @desc    Toggle menu item availability (quick action)
 * @access  Restaurant Owner/Staff (menu_items:update)
 */
router.patch(
  '/items/:itemId/availability',
  requirePermission('menu_items:update'),
  menuItemValidators.toggleAvailability,
  validate,
  menuController.toggleItemAvailability
);

/**
 * @route   PATCH /api/v1/restaurant/:restaurantId/menu/items/reorder
 * @desc    Reorder menu items (drag & drop)
 * @access  Restaurant Owner (menu_items:update)
 */
router.patch(
  '/items/reorder',
  requirePermission('menu_items:update'),
  menuItemValidators.reorderItems,
  validate,
  menuController.reorderItems
);

// ============================================================================
// Menu Item Image Routes
// ============================================================================

/**
 * @route   POST /api/v1/restaurant/:restaurantId/menu/items/:itemId/image
 * @desc    Upload image for a menu item
 * @access  Restaurant Owner (menu_items:update)
 */
router.post(
  '/items/:itemId/image',
  requirePermission('menu_items:update'),
  uploadMenuItemImage,
  menuController.uploadItemImage
);

/**
 * @route   DELETE /api/v1/restaurant/:restaurantId/menu/items/:itemId/image
 * @desc    Remove image for a menu item
 * @access  Restaurant Owner (menu_items:update)
 */
router.delete(
  '/items/:itemId/image',
  requirePermission('menu_items:update'),
  menuController.deleteItemImage
);

export default router;
