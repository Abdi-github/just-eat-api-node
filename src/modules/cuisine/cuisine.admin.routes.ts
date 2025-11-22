import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { cuisineController } from './cuisine.controller.js';
import { cuisineValidators } from './cuisine.validator.js';

const router = Router();

// All admin cuisine routes require authentication
router.use(authenticate);

// ============================================================================
// Admin Cuisine Routes
// ============================================================================

/**
 * @route   POST /api/v1/admin/cuisines
 * @desc    Create a new cuisine
 * @access  Admin (cuisines:create)
 */
router.post(
  '/',
  requirePermission('cuisines:create'),
  cuisineValidators.create,
  validate,
  cuisineController.create
);

/**
 * @route   PUT /api/v1/admin/cuisines/:id
 * @desc    Update a cuisine
 * @access  Admin (cuisines:update)
 */
router.put(
  '/:id',
  requirePermission('cuisines:update'),
  cuisineValidators.update,
  validate,
  cuisineController.update
);

/**
 * @route   DELETE /api/v1/admin/cuisines/:id
 * @desc    Delete a cuisine
 * @access  Admin (cuisines:delete)
 */
router.delete(
  '/:id',
  requirePermission('cuisines:delete'),
  cuisineValidators.delete,
  validate,
  cuisineController.delete
);

export default router;
