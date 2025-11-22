import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import {
  uploadRestaurantLogo,
  uploadRestaurantCover,
} from '../../shared/middlewares/upload.middleware.js';

import { restaurantController } from './restaurant.controller.js';
import { restaurantValidators } from './restaurant.validator.js';

const router = Router();

// All restaurant owner routes require authentication
router.use(authenticate);

// ============================================================================
// Restaurant Owner Routes
// ============================================================================

/**
 * @route   GET /api/v1/restaurant/my
 * @desc    List restaurants owned by the logged-in user
 * @access  Restaurant Owner (restaurants:read)
 */
router.get('/my', requirePermission('restaurants:read'), restaurantController.getMyRestaurants);

/**
 * @route   POST /api/v1/restaurant
 * @desc    Create a new restaurant (starts as DRAFT)
 * @access  Restaurant Owner (restaurants:create)
 */
router.post(
  '/',
  requirePermission('restaurants:create'),
  restaurantValidators.create,
  validate,
  restaurantController.create
);

/**
 * @route   PUT /api/v1/restaurant/:id
 * @desc    Update own restaurant
 * @access  Restaurant Owner (restaurants:update)
 */
router.put(
  '/:id',
  requirePermission('restaurants:update'),
  restaurantValidators.update,
  validate,
  restaurantController.update
);

/**
 * @route   PATCH /api/v1/restaurant/:id/toggle-active
 * @desc    Toggle restaurant active status
 * @access  Restaurant Owner (restaurants:update)
 */
router.patch(
  '/:id/toggle-active',
  requirePermission('restaurants:update'),
  restaurantValidators.toggleActive,
  validate,
  restaurantController.toggleActive
);

// ============================================================================
// Image Upload Routes
// ============================================================================

/**
 * @route   POST /api/v1/restaurant/:id/logo
 * @desc    Upload restaurant logo image
 * @access  Restaurant Owner (restaurants:update)
 */
router.post(
  '/:id/logo',
  requirePermission('restaurants:update'),
  uploadRestaurantLogo,
  restaurantController.uploadLogo
);

/**
 * @route   POST /api/v1/restaurant/:id/cover-image
 * @desc    Upload restaurant cover image
 * @access  Restaurant Owner (restaurants:update)
 */
router.post(
  '/:id/cover-image',
  requirePermission('restaurants:update'),
  uploadRestaurantCover,
  restaurantController.uploadCoverImage
);

/**
 * @route   DELETE /api/v1/restaurant/:id/logo
 * @desc    Remove restaurant logo image
 * @access  Restaurant Owner (restaurants:update)
 */
router.delete(
  '/:id/logo',
  requirePermission('restaurants:update'),
  restaurantController.deleteLogo
);

/**
 * @route   DELETE /api/v1/restaurant/:id/cover-image
 * @desc    Remove restaurant cover image
 * @access  Restaurant Owner (restaurants:update)
 */
router.delete(
  '/:id/cover-image',
  requirePermission('restaurants:update'),
  restaurantController.deleteCoverImage
);

export default router;
