import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { cityController } from './location.controller.js';
import { cityValidators } from './location.validator.js';

const router = Router();

// ============================================================================
// Public City Routes
// ============================================================================

/**
 * @route   GET /api/v1/locations/cities/search
 * @desc    Search locations (cantons + cities combined)
 * @access  Public
 */
router.get('/search', cityValidators.search, validate, cityController.search);

/**
 * @route   GET /api/v1/locations/cities/postal/:postalCode
 * @desc    Get cities by postal code
 * @access  Public
 */
router.get(
  '/postal/:postalCode',
  cityValidators.getByPostalCode,
  validate,
  cityController.getByPostalCode
);

/**
 * @route   GET /api/v1/locations/cities/slug/:slug
 * @desc    Get city by slug
 * @access  Public
 */
router.get('/slug/:slug', cityValidators.getBySlug, validate, cityController.getBySlug);

/**
 * @route   GET /api/v1/locations/cities
 * @desc    List all cities with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', cityValidators.getAll, validate, cityController.getAll);

/**
 * @route   GET /api/v1/locations/cities/:id
 * @desc    Get city by ID
 * @access  Public
 */
router.get('/:id', cityValidators.getById, validate, cityController.getById);

export default router;
