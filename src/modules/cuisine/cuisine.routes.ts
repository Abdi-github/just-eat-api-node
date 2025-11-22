import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { cuisineController } from './cuisine.controller.js';
import { cuisineValidators } from './cuisine.validator.js';

const router = Router();

// ============================================================================
// Public Cuisine Routes
// ============================================================================

/**
 * @route   GET /api/v1/public/cuisines
 * @desc    List all cuisines with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', cuisineValidators.getAll, validate, cuisineController.getAll);

/**
 * @route   GET /api/v1/public/cuisines/slug/:slug
 * @desc    Get cuisine by slug
 * @access  Public
 */
router.get('/slug/:slug', cuisineValidators.getBySlug, validate, cuisineController.getBySlug);

/**
 * @route   GET /api/v1/public/cuisines/:id
 * @desc    Get cuisine by ID
 * @access  Public
 */
router.get('/:id', cuisineValidators.getById, validate, cuisineController.getById);

export default router;
