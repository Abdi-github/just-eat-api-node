import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { cantonController } from './location.controller.js';
import { cantonValidators, cityValidators } from './location.validator.js';

const router = Router();

// ============================================================================
// Public Canton Routes
// ============================================================================

/**
 * @route   GET /api/v1/locations/cantons
 * @desc    List all cantons with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', cantonValidators.getAll, validate, cantonController.getAll);

/**
 * @route   GET /api/v1/locations/cantons/code/:code
 * @desc    Get canton by code (e.g., ZH, BE)
 * @access  Public
 */
router.get('/code/:code', cantonValidators.getByCode, validate, cantonController.getByCode);

/**
 * @route   GET /api/v1/locations/cantons/slug/:slug
 * @desc    Get canton by slug
 * @access  Public
 */
router.get('/slug/:slug', cantonValidators.getBySlug, validate, cantonController.getBySlug);

/**
 * @route   GET /api/v1/locations/cantons/:id/cities
 * @desc    Get all cities within a canton
 * @access  Public
 */
router.get(
  '/:id/cities',
  cantonValidators.getById,
  cityValidators.getAll,
  validate,
  cantonController.getCities
);

/**
 * @route   GET /api/v1/locations/cantons/:id
 * @desc    Get canton by ID
 * @access  Public
 */
router.get('/:id', cantonValidators.getById, validate, cantonController.getById);

export default router;
