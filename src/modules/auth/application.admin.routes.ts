import { Router } from 'express';
import { body } from 'express-validator';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from './auth.middleware.js';
import { authController } from './auth.controller.js';

const router = Router();

// All routes require authentication and admin permissions
router.use(authenticate);
router.use(requirePermission('users:read'));

/**
 * @route   GET /api/v1/admin/applications
 * @desc    Get list of applications (with optional filters)
 * @query   status - pending_approval | approved | rejected
 * @query   type - restaurant_owner | courier
 * @query   page - page number (default: 1)
 * @query   limit - items per page (default: 20)
 * @access  Admin
 */
router.get('/', authController.getApplications);

/**
 * @route   PATCH /api/v1/admin/applications/:userId/approve
 * @desc    Approve an application
 * @access  Admin
 */
router.patch(
  '/:userId/approve',
  requirePermission('users:update'),
  authController.approveApplication
);

/**
 * @route   PATCH /api/v1/admin/applications/:userId/reject
 * @desc    Reject an application
 * @access  Admin
 */
router.patch(
  '/:userId/reject',
  requirePermission('users:update'),
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Rejection reason cannot exceed 500 characters'),
  ],
  validate,
  authController.rejectApplication
);

export default router;
