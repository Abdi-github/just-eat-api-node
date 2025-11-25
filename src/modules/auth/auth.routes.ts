import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { authController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import {
  loginValidator,
  registerValidator,
  registerRestaurantValidator,
  registerCourierValidator,
  changePasswordValidator,
  updateProfileValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from './auth.validator.js';

const router = Router();

// ===================================================
// Public Auth Routes
// ===================================================

/**
 * @route   POST /api/v1/public/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post('/login', loginValidator, validate, authController.login);

/**
 * @route   POST /api/v1/public/auth/register
 * @desc    Register a new customer user
 * @access  Public
 */
router.post('/register', registerValidator, validate, authController.register);

/**
 * @route   POST /api/v1/public/auth/register-restaurant
 * @desc    Register as a restaurant owner (creates user + DRAFT restaurant)
 * @access  Public
 */
router.post(
  '/register-restaurant',
  registerRestaurantValidator,
  validate,
  authController.registerRestaurant
);

/**
 * @route   POST /api/v1/public/auth/register-courier
 * @desc    Register as a courier
 * @access  Public
 */
router.post(
  '/register-courier',
  registerCourierValidator,
  validate,
  authController.registerCourier
);

/**
 * @route   POST /api/v1/public/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

// ===================================================
// Authenticated Routes
// ===================================================

/**
 * @route   POST /api/v1/public/auth/logout
 * @desc    Logout user (invalidate tokens)
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/public/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @route   PATCH /api/v1/public/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.patch('/me', authenticate, updateProfileValidator, validate, authController.updateProfile);

/**
 * @route   GET /api/v1/public/auth/application-status
 * @desc    Get current user's application status
 * @access  Private
 */
router.get('/application-status', authenticate, authController.getApplicationStatus);

/**
 * @route   POST /api/v1/public/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  changePasswordValidator,
  validate,
  authController.changePassword
);

// ===================================================
// Email Verification Routes
// ===================================================

/**
 * @route   POST /api/v1/public/auth/verify-email
 * @desc    Verify user email with token
 * @access  Public
 */
router.post('/verify-email', verifyEmailValidator, validate, authController.verifyEmail);

/**
 * @route   POST /api/v1/public/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post(
  '/resend-verification',
  resendVerificationValidator,
  validate,
  authController.resendVerificationEmail
);

// ===================================================
// Password Reset Routes
// ===================================================

/**
 * @route   POST /api/v1/public/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);

/**
 * @route   POST /api/v1/public/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

export default router;
