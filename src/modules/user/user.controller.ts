import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
  calculatePaginationMeta,
} from '../../shared/utils/response.helper.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import { AuthenticatedRequest } from '../auth/auth.types.js';

import { userService } from './user.service.js';
import type { UserQueryDto, USER_SORT_FIELDS } from './user.types.js';

/**
 * User Controller
 * Handles HTTP requests for user management endpoints
 */
export class UserController {
  // ============================================================================
  // Admin Operations
  // ============================================================================

  /**
   * @route   GET /api/v1/admin/users
   * @desc    List all users with filtering, sorting, and pagination
   * @access  Admin (users:read)
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);

    const query: UserQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || 'created_at',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
      search: req.query.search as string,
      status: req.query.status as UserQueryDto['status'],
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      is_verified:
        req.query.is_verified !== undefined ? req.query.is_verified === 'true' : undefined,
    };

    const result = await userService.findAll(query);
    const meta = calculatePaginationMeta(page, limit, result.total);

    sendPaginatedResponse(res, 200, 'Users retrieved successfully', result.data, meta);
  });

  /**
   * @route   GET /api/v1/admin/users/statistics
   * @desc    Get user statistics for admin dashboard
   * @access  Admin (users:read)
   */
  getStatistics = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await userService.getStatistics();
    sendSuccessResponse(res, 200, 'User statistics retrieved successfully', stats);
  });

  /**
   * @route   GET /api/v1/admin/users/:id
   * @desc    Get user by ID
   * @access  Admin (users:read)
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(req.params.id);
    sendSuccessResponse(res, 200, 'User retrieved successfully', user);
  });

  /**
   * @route   POST /api/v1/admin/users
   * @desc    Create a new user
   * @access  Admin (users:create)
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    sendSuccessResponse(res, 201, 'User created successfully', user);
  });

  /**
   * @route   PUT /api/v1/admin/users/:id
   * @desc    Update a user (admin)
   * @access  Admin (users:update)
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateAdmin(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'User updated successfully', user);
  });

  /**
   * @route   PATCH /api/v1/admin/users/:id/activate
   * @desc    Activate a user
   * @access  Admin (users:update)
   */
  activate = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.activate(req.params.id);
    sendSuccessResponse(res, 200, 'User activated successfully', user);
  });

  /**
   * @route   PATCH /api/v1/admin/users/:id/suspend
   * @desc    Suspend a user
   * @access  Admin (users:update)
   */
  suspend = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.suspend(req.params.id);
    sendSuccessResponse(res, 200, 'User suspended successfully', user);
  });

  /**
   * @route   DELETE /api/v1/admin/users/:id
   * @desc    Delete a user
   * @access  Admin (users:delete)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    await userService.delete(req.params.id);
    sendSuccessResponse(res, 200, 'User deleted successfully');
  });

  /**
   * @route   POST /api/v1/admin/users/:id/roles
   * @desc    Assign a role to a user
   * @access  Admin (users:manage)
   */
  assignRole = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.assignRole(req.params.id, req.body.role, authReq.user!.id);
    sendSuccessResponse(res, 200, 'Role assigned successfully', user);
  });

  /**
   * @route   DELETE /api/v1/admin/users/:id/roles/:role
   * @desc    Remove a role from a user
   * @access  Admin (users:manage)
   */
  removeRole = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.removeRole(req.params.id, req.params.role);
    sendSuccessResponse(res, 200, 'Role removed successfully', user);
  });

  // ============================================================================
  // Profile Operations (Authenticated User — Self)
  // ============================================================================

  /**
   * @route   GET /api/v1/public/users/profile
   * @desc    Get own profile
   * @access  Authenticated
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.getProfile(authReq.user!.id);
    sendSuccessResponse(res, 200, 'Profile retrieved successfully', user);
  });

  /**
   * @route   PUT /api/v1/public/users/profile
   * @desc    Update own profile
   * @access  Authenticated
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.updateProfile(authReq.user!.id, req.body);
    sendSuccessResponse(res, 200, 'Profile updated successfully', user);
  });

  /**
   * @route   PUT /api/v1/public/users/password
   * @desc    Change own password
   * @access  Authenticated
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await userService.changePassword(authReq.user!.id, req.body);
    sendSuccessResponse(res, 200, 'Password changed successfully');
  });

  /**
   * @route   POST /api/v1/public/users/deactivate
   * @desc    Deactivate own account
   * @access  Authenticated
   */
  deactivateAccount = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await userService.deactivateAccount(authReq.user!.id);
    sendSuccessResponse(res, 200, 'Account deactivated successfully');
  });

  // ============================================================================
  // Settings Operations (Authenticated User — Self)
  // ============================================================================

  /**
   * @route   GET /api/v1/public/users/settings
   * @desc    Get notification preferences
   * @access  Authenticated
   */
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const settings = await userService.getSettings(authReq.user!.id);
    sendSuccessResponse(res, 200, 'Settings retrieved successfully', settings);
  });

  /**
   * @route   PUT /api/v1/public/users/settings
   * @desc    Update notification preferences
   * @access  Authenticated
   */
  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const settings = await userService.updateSettings(authReq.user!.id, req.body);
    sendSuccessResponse(res, 200, 'Settings updated successfully', settings);
  });

  // ============================================================================
  // Avatar Operations (Authenticated User — Self)
  // ============================================================================

  /**
   * @route   POST /api/v1/public/users/avatar
   * @desc    Upload own avatar
   * @access  Authenticated
   */
  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    if (!req.file) throw BadRequestError('Avatar image file is required');

    const result = await userService.uploadAvatar(
      authReq.user!.id,
      req.file.buffer,
      req.file.originalname
    );
    sendSuccessResponse(res, 200, 'Avatar uploaded successfully', result);
  });

  /**
   * @route   DELETE /api/v1/public/users/avatar
   * @desc    Remove own avatar
   * @access  Authenticated
   */
  deleteAvatar = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await userService.deleteAvatar(authReq.user!.id);
    sendSuccessResponse(res, 200, 'Avatar deleted successfully');
  });
}

// Export singleton instance
export const userController = new UserController();
