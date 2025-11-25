import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../auth/auth.middleware.js';
import { uploadAvatar } from '../../shared/middlewares/upload.middleware.js';

import { userController } from './user.controller.js';
import { userValidators } from './user.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Profile Routes (Self)
// ============================================================================

/**
 * @route   GET /api/v1/public/users/profile
 * @desc    Get own profile
 * @access  Authenticated
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/v1/public/users/profile
 * @desc    Update own profile
 * @access  Authenticated
 */
router.put('/profile', userValidators.updateProfile, validate, userController.updateProfile);

/**
 * @route   PUT /api/v1/public/users/password
 * @desc    Change own password
 * @access  Authenticated
 */
router.put('/password', userValidators.changePassword, validate, userController.changePassword);

/**
 * @route   POST /api/v1/public/users/deactivate
 * @desc    Deactivate own account
 * @access  Authenticated
 */
router.post('/deactivate', userController.deactivateAccount);

// ============================================================================
// Settings Routes (Self)
// ============================================================================

/**
 * @route   GET /api/v1/public/users/settings
 * @desc    Get notification preferences
 * @access  Authenticated
 */
router.get('/settings', userController.getSettings);

/**
 * @route   PUT /api/v1/public/users/settings
 * @desc    Update notification preferences
 * @access  Authenticated
 */
router.put('/settings', userValidators.updateSettings, validate, userController.updateSettings);

// ============================================================================
// Avatar Routes (Self)
// ============================================================================

/**
 * @route   POST /api/v1/public/users/avatar
 * @desc    Upload own avatar
 * @access  Authenticated
 */
router.post('/avatar', uploadAvatar, userController.uploadAvatar);

/**
 * @route   DELETE /api/v1/public/users/avatar
 * @desc    Remove own avatar
 * @access  Authenticated
 */
router.delete('/avatar', userController.deleteAvatar);

export default router;
