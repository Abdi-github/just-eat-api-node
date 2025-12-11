import { Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import { NotificationRepository } from './notification.repository.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  calculatePaginationMeta,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { NotificationQueryDto, AdminSendNotificationDto } from './notification.types.js';

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);

// ============================================================================
// USER ENDPOINTS (Customer / any authenticated user)
// ============================================================================

/**
 * GET /api/v1/public/notifications
 * Get authenticated user's notifications
 */
const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { page, limit } = parsePaginationParams(req.query as { page?: string; limit?: string });

  const query: NotificationQueryDto = {
    page: String(page),
    limit: String(limit),
    type: req.query.type as NotificationQueryDto['type'],
    is_read: req.query.is_read as string | undefined,
  };

  const result = await notificationService.getUserNotifications(user.id, query);
  const meta = calculatePaginationMeta(page, limit, result.total);

  sendPaginatedResponse(res, 200, 'Notifications retrieved successfully', result.data, meta);
});

/**
 * GET /api/v1/public/notifications/count
 * Get notification count (total + unread)
 */
const getNotificationCount = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const count = await notificationService.getUserNotificationCount(user.id);
  sendSuccessResponse(res, 200, 'Notification count retrieved', count);
});

/**
 * PATCH /api/v1/public/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { id } = req.params;
  const notification = await notificationService.markAsRead(id, user.id);
  sendSuccessResponse(res, 200, 'Notification marked as read', notification);
});

/**
 * PATCH /api/v1/public/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await notificationService.markAllAsRead(user.id);
  sendSuccessResponse(res, 200, 'All notifications marked as read', result);
});

/**
 * DELETE /api/v1/public/notifications/:id
 * Delete a single notification
 */
const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const { id } = req.params;
  await notificationService.deleteNotification(id, user.id);
  sendSuccessResponse(res, 200, 'Notification deleted');
});

/**
 * DELETE /api/v1/public/notifications
 * Delete all notifications for the user
 */
const deleteAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await notificationService.deleteAllNotifications(user.id);
  sendSuccessResponse(res, 200, 'All notifications deleted', result);
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/admin/notifications/send
 * Send notification to one or more users (admin only)
 */
const adminSendNotification = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as AdminSendNotificationDto;
  const result = await notificationService.sendToMultipleUsers(dto);
  sendSuccessResponse(res, 201, 'Notifications sent successfully', result);
});

export const notificationController = {
  getMyNotifications,
  getNotificationCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  adminSendNotification,
};

// Export the service instance for use by other modules
export { notificationService };
