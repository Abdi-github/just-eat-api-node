import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { restaurantController } from './restaurant.controller.js';
import { restaurantValidators } from './restaurant.validator.js';

const router = Router();

// All admin restaurant routes require authentication
router.use(authenticate);

// ============================================================================
// Admin Restaurant Routes
// ============================================================================

/**
 * @route   GET /api/v1/admin/restaurants/pending
 * @desc    Get restaurants pending approval
 * @access  Admin (restaurants:approve)
 */
router.get(
  '/pending',
  requirePermission('restaurants:approve'),
  restaurantController.getPendingApprovals
);

/**
 * @route   GET /api/v1/admin/restaurants
 * @desc    List all restaurants (admin view, all statuses)
 * @access  Admin (restaurants:read)
 */
router.get(
  '/',
  requirePermission('restaurants:read'),
  restaurantValidators.adminGetAll,
  validate,
  restaurantController.adminGetAll
);

/**
 * @route   GET /api/v1/admin/restaurants/:id
 * @desc    Get restaurant by ID (admin, any status)
 * @access  Admin (restaurants:read)
 */
router.get(
  '/:id',
  requirePermission('restaurants:read'),
  restaurantValidators.getById,
  validate,
  restaurantController.adminGetById
);

/**
 * @route   PUT /api/v1/admin/restaurants/:id
 * @desc    Update any restaurant (admin)
 * @access  Admin (restaurants:update)
 */
router.put(
  '/:id',
  requirePermission('restaurants:update'),
  restaurantValidators.update,
  validate,
  restaurantController.adminUpdate
);

/**
 * @route   PATCH /api/v1/admin/restaurants/:id/status
 * @desc    Change restaurant status (approval workflow)
 * @access  Admin (restaurants:approve or restaurants:reject or restaurants:publish)
 */
router.patch(
  '/:id/status',
  requirePermission('restaurants:approve'),
  restaurantValidators.changeStatus,
  validate,
  restaurantController.changeStatus
);

/**
 * @route   DELETE /api/v1/admin/restaurants/:id
 * @desc    Delete a restaurant
 * @access  Admin (restaurants:delete)
 */
router.delete(
  '/:id',
  requirePermission('restaurants:delete'),
  restaurantValidators.delete,
  validate,
  restaurantController.adminDelete
);

export default router;
