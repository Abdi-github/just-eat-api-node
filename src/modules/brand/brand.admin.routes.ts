import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import { uploadBrandLogo } from '../../shared/middlewares/upload.middleware.js';

import { brandController } from './brand.controller.js';
import { brandValidators } from './brand.validator.js';

const router = Router();

// All admin brand routes require authentication
router.use(authenticate);

// ============================================================================
// Admin Brand Routes
// ============================================================================

/**
 * @route   POST /api/v1/admin/brands
 * @desc    Create a new brand
 * @access  Admin (brands:create)
 */
router.post(
  '/',
  requirePermission('brands:create'),
  brandValidators.create,
  validate,
  brandController.create
);

/**
 * @route   PUT /api/v1/admin/brands/:id
 * @desc    Update a brand
 * @access  Admin (brands:update)
 */
router.put(
  '/:id',
  requirePermission('brands:update'),
  brandValidators.update,
  validate,
  brandController.update
);

/**
 * @route   DELETE /api/v1/admin/brands/:id
 * @desc    Delete a brand
 * @access  Admin (brands:delete)
 */
router.delete(
  '/:id',
  requirePermission('brands:delete'),
  brandValidators.delete,
  validate,
  brandController.delete
);

// ============================================================================
// Brand Image Routes
// ============================================================================

/**
 * @route   POST /api/v1/admin/brands/:id/logo
 * @desc    Upload logo for a brand
 * @access  Admin (brands:update)
 */
router.post(
  '/:id/logo',
  requirePermission('brands:update'),
  uploadBrandLogo,
  brandController.uploadLogo
);

/**
 * @route   DELETE /api/v1/admin/brands/:id/logo
 * @desc    Remove logo for a brand
 * @access  Admin (brands:update)
 */
router.delete('/:id/logo', requirePermission('brands:update'), brandController.deleteLogo);

export default router;
