import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { userController } from './user.controller.js';
import { userValidators } from './user.validator.js';

const router = Router();

// All admin user routes require authentication + appropriate permission
router.use(authenticate);

// ============================================================================
// Admin User Management Routes
// ============================================================================

/**
 * @route   GET /api/v1/admin/users/statistics
 * @desc    Get user statistics for admin dashboard
 * @access  Admin (users:read)
 */
router.get('/statistics', requirePermission('users:read'), userController.getStatistics);

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with filtering, sorting, and pagination
 * @access  Admin (users:read)
 */
router.get(
  '/',
  requirePermission('users:read'),
  userValidators.getAll,
  validate,
  userController.getAll
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin (users:read)
 */
router.get(
  '/:id',
  requirePermission('users:read'),
  userValidators.getById,
  validate,
  userController.getById
);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create a new user
 * @access  Admin (users:create)
 */
router.post(
  '/',
  requirePermission('users:create'),
  userValidators.create,
  validate,
  userController.create
);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update a user
 * @access  Admin (users:update)
 */
router.put(
  '/:id',
  requirePermission('users:update'),
  userValidators.updateAdmin,
  validate,
  userController.update
);

/**
 * @route   PATCH /api/v1/admin/users/:id/activate
 * @desc    Activate a user
 * @access  Admin (users:update)
 */
router.patch(
  '/:id/activate',
  requirePermission('users:update'),
  userValidators.activate,
  validate,
  userController.activate
);

/**
 * @route   PATCH /api/v1/admin/users/:id/suspend
 * @desc    Suspend a user
 * @access  Admin (users:update)
 */
router.patch(
  '/:id/suspend',
  requirePermission('users:update'),
  userValidators.suspend,
  validate,
  userController.suspend
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete a user
 * @access  Admin (users:delete)
 */
router.delete(
  '/:id',
  requirePermission('users:delete'),
  userValidators.deleteById,
  validate,
  userController.delete
);

// ============================================================================
// Role Management Routes
// ============================================================================

/**
 * @route   POST /api/v1/admin/users/:id/roles
 * @desc    Assign a role to a user
 * @access  Admin (users:manage)
 */
router.post(
  '/:id/roles',
  requirePermission('users:manage'),
  userValidators.assignRole,
  validate,
  userController.assignRole
);

/**
 * @route   DELETE /api/v1/admin/users/:id/roles/:role
 * @desc    Remove a role from a user
 * @access  Admin (users:manage)
 */
router.delete(
  '/:id/roles/:role',
  requirePermission('users:manage'),
  userValidators.removeRole,
  validate,
  userController.removeRole
);

export default router;
