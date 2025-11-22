import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import menuPublicRoutes from '../menu/menu.routes.js';

import { restaurantController } from './restaurant.controller.js';
import { restaurantValidators } from './restaurant.validator.js';

const router = Router();

// ============================================================================
// Public Restaurant Routes
// ============================================================================

/**
 * @route   GET /api/v1/public/restaurants
 * @desc    List restaurants with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', restaurantValidators.getAll, validate, restaurantController.getAll);

/**
 * @route   GET /api/v1/public/restaurants/cursor
 * @desc    List restaurants with cursor-based pagination
 * @access  Public
 */
router.get('/cursor', restaurantValidators.getAllCursor, validate, restaurantController.getAllCursor);

/**
 * @route   GET /api/v1/public/restaurants/slug/:slug
 * @desc    Get restaurant by slug (with cuisine list)
 * @access  Public
 */
router.get('/slug/:slug', restaurantValidators.getBySlug, validate, restaurantController.getBySlug);

/**
 * @route   GET /api/v1/public/restaurants/:id
 * @desc    Get restaurant by ID (with cuisine list)
 * @access  Public
 */
router.get('/:id', restaurantValidators.getById, validate, restaurantController.getById);

// ============================================================================
// Public Menu Sub-Routes — /api/v1/public/restaurants/:restaurantId/menu
// ============================================================================
router.use('/:restaurantId/menu', menuPublicRoutes);

export default router;
