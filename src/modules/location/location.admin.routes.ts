import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { cantonController, cityController } from './location.controller.js';
import { cantonValidators, cityValidators } from './location.validator.js';

const router = Router();

// All admin location routes require authentication
router.use(authenticate);

// ============================================================================
// Admin Canton Routes
// ============================================================================

/**
 * @route   POST /api/v1/admin/locations/cantons
 * @desc    Create a canton
 * @access  Admin (locations:create)
 */
router.post(
  '/cantons',
  requirePermission('locations:create'),
  cantonValidators.create,
  validate,
  cantonController.create
);

/**
 * @route   PUT /api/v1/admin/locations/cantons/:id
 * @desc    Update a canton
 * @access  Admin (locations:update)
 */
router.put(
  '/cantons/:id',
  requirePermission('locations:update'),
  cantonValidators.update,
  validate,
  cantonController.update
);

/**
 * @route   DELETE /api/v1/admin/locations/cantons/:id
 * @desc    Delete a canton
 * @access  Admin (locations:delete)
 */
router.delete(
  '/cantons/:id',
  requirePermission('locations:delete'),
  cantonValidators.delete,
  validate,
  cantonController.delete
);

// ============================================================================
// Admin City Routes
// ============================================================================

/**
 * @route   POST /api/v1/admin/locations/cities
 * @desc    Create a city
 * @access  Admin (locations:create)
 */
router.post(
  '/cities',
  requirePermission('locations:create'),
  cityValidators.create,
  validate,
  cityController.create
);

/**
 * @route   PUT /api/v1/admin/locations/cities/:id
 * @desc    Update a city
 * @access  Admin (locations:update)
 */
router.put(
  '/cities/:id',
  requirePermission('locations:update'),
  cityValidators.update,
  validate,
  cityController.update
);

/**
 * @route   DELETE /api/v1/admin/locations/cities/:id
 * @desc    Delete a city
 * @access  Admin (locations:delete)
 */
router.delete(
  '/cities/:id',
  requirePermission('locations:delete'),
  cityValidators.delete,
  validate,
  cityController.delete
);

export default router;
