import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { brandController } from './brand.controller.js';
import { brandValidators } from './brand.validator.js';

const router = Router();

// ============================================================================
// Public Brand Routes
// ============================================================================

/**
 * @route   GET /api/v1/public/brands
 * @desc    List all brands with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', brandValidators.getAll, validate, brandController.getAll);

/**
 * @route   GET /api/v1/public/brands/slug/:slug
 * @desc    Get brand by slug
 * @access  Public
 */
router.get('/slug/:slug', brandValidators.getBySlug, validate, brandController.getBySlug);

/**
 * @route   GET /api/v1/public/brands/:id
 * @desc    Get brand by ID
 * @access  Public
 */
router.get('/:id', brandValidators.getById, validate, brandController.getById);

export default router;
