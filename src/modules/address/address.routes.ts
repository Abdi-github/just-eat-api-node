import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { addressController } from './address.controller.js';
import { addressValidators } from './address.validator.js';

const router = Router();

// All address routes require authentication
router.use(authenticate);

// ============================================================================
// Customer Address Routes — /api/v1/public/addresses/*
// ============================================================================

/**
 * @route   GET /api/v1/public/addresses
 * @desc    List all addresses for the authenticated user
 * @access  Customer (addresses:read)
 */
router.get(
  '/',
  requirePermission('addresses:read'),
  addressValidators.getAll,
  validate,
  addressController.getAll
);

/**
 * @route   GET /api/v1/public/addresses/:id
 * @desc    Get address by ID
 * @access  Customer (addresses:read)
 */
router.get(
  '/:id',
  requirePermission('addresses:read'),
  addressValidators.getById,
  validate,
  addressController.getById
);

/**
 * @route   POST /api/v1/public/addresses
 * @desc    Create a new delivery address
 * @access  Customer (addresses:create)
 */
router.post(
  '/',
  requirePermission('addresses:create'),
  addressValidators.create,
  validate,
  addressController.create
);

/**
 * @route   PUT /api/v1/public/addresses/:id
 * @desc    Update an existing address
 * @access  Customer (addresses:update)
 */
router.put(
  '/:id',
  requirePermission('addresses:update'),
  addressValidators.update,
  validate,
  addressController.update
);

/**
 * @route   DELETE /api/v1/public/addresses/:id
 * @desc    Delete an address
 * @access  Customer (addresses:delete)
 */
router.delete(
  '/:id',
  requirePermission('addresses:delete'),
  addressValidators.delete,
  validate,
  addressController.delete
);

/**
 * @route   PATCH /api/v1/public/addresses/:id/default
 * @desc    Set an address as the default delivery address
 * @access  Customer (addresses:update)
 */
router.patch(
  '/:id/default',
  requirePermission('addresses:update'),
  addressValidators.setDefault,
  validate,
  addressController.setDefault
);

export default router;
