import { NotificationRepository } from './notification.repository.js';
import { enqueueNotificationEmail } from '../../shared/queue/index.js';
import { enqueueWelcomeEmail } from '../../shared/queue/index.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import { User } from '../user/user.model.js';
import type {
  CreateNotificationDto,
  AdminSendNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationCountResponseDto,
} from './notification.types.js';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from './notification.types.js';
import type { INotification } from './notification.model.js';

/**
 * Notification Service
 *
 * Business logic for creating, reading, and managing notifications.
 * Also orchestrates email sending for notification types that require it.
 */
export class NotificationService {
  constructor(private notificationRepository: NotificationRepository) {}

  // =========================================================================
  // Core notification creation
  // =========================================================================

  /**
   * Create a notification and optionally send an email
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.create(dto);

    // Enqueue email if channel includes EMAIL
    if (dto.channel === NotificationChannel.EMAIL || dto.channel === NotificationChannel.BOTH) {
      // Look up user email + first_name for the email
      this.enqueueEmailForNotification(
        notification._id.toString(),
        dto.user_id,
        notification.type,
        notification.title,
        notification.body,
        (notification.data as Record<string, unknown>) || undefined
      ).catch((err) => {
        logger.error('Failed to enqueue notification email', {
          notificationId: notification._id,
          error: err,
        });
      });
    }

    return this.toResponseDto(notification);
  }

  /**
   * Create notifications for multiple users (admin broadcast)
   */
  async sendToMultipleUsers(dto: AdminSendNotificationDto): Promise<{ sent: number }> {
    if (!dto.user_ids || dto.user_ids.length === 0) {
      throw BadRequestError('At least one user ID is required');
    }

    const notifications: CreateNotificationDto[] = dto.user_ids.map((userId) => ({
      user_id: userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      channel: dto.channel || NotificationChannel.IN_APP,
      priority: dto.priority || NotificationPriority.NORMAL,
    }));

    const created = await this.notificationRepository.createMany(notifications);

    logger.info(`Sent ${created.length} notifications to ${dto.user_ids.length} users`, {
      type: dto.type,
    });

    return { sent: created.length };
  }

  // =========================================================================
  // User notification management
  // =========================================================================

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto
  ): Promise<{ data: NotificationResponseDto[]; total: number }> {
    const result = await this.notificationRepository.findByUserId(userId, query);

    return {
      data: result.data.map((n) => this.toResponseDto(n)),
      total: result.total,
    };
  }

  /**
   * Get notification count (total + unread) for a user
   */
  async getUserNotificationCount(userId: string): Promise<NotificationCountResponseDto> {
    return this.notificationRepository.countByUserId(userId);
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.markAsRead(notificationId, userId);
    if (!notification) {
      throw NotFoundError('Notification not found');
    }
    return this.toResponseDto(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const count = await this.notificationRepository.markAllAsRead(userId);
    return { updated: count };
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const deleted = await this.notificationRepository.deleteById(notificationId, userId);
    if (!deleted) {
      throw NotFoundError('Notification not found');
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<{ deleted: number }> {
    const count = await this.notificationRepository.deleteAllByUserId(userId);
    return { deleted: count };
  }

  // =========================================================================
  // Convenience methods for other modules
  // =========================================================================

  /**
   * Send order-related notification
   */
  async notifyOrderStatus(
    userId: string,
    orderNumber: string,
    status: string,
    restaurantName: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const typeMap: Record<string, NotificationType> = {
      PLACED: NotificationType.ORDER_PLACED,
      ACCEPTED: NotificationType.ORDER_ACCEPTED,
      REJECTED: NotificationType.ORDER_REJECTED,
      PREPARING: NotificationType.ORDER_PREPARING,
      READY: NotificationType.ORDER_READY,
      PICKED_UP: NotificationType.ORDER_PICKED_UP,
      IN_TRANSIT: NotificationType.ORDER_IN_TRANSIT,
      DELIVERED: NotificationType.ORDER_DELIVERED,
      CANCELLED: NotificationType.ORDER_CANCELLED,
    };

    const type = typeMap[status] || NotificationType.SYSTEM;

    const titleMap: Record<string, string> = {
      PLACED: `Order ${orderNumber} placed`,
      ACCEPTED: `Order ${orderNumber} accepted`,
      REJECTED: `Order ${orderNumber} rejected`,
      PREPARING: `Order ${orderNumber} is being prepared`,
      READY: `Order ${orderNumber} is ready`,
      PICKED_UP: `Order ${orderNumber} picked up`,
      IN_TRANSIT: `Order ${orderNumber} is on the way`,
      DELIVERED: `Order ${orderNumber} delivered`,
      CANCELLED: `Order ${orderNumber} cancelled`,
    };

    const bodyMap: Record<string, string> = {
      PLACED: `Your order from ${restaurantName} has been placed successfully.`,
      ACCEPTED: `${restaurantName} has accepted your order and will start preparing it soon.`,
      REJECTED: `Unfortunately, ${restaurantName} could not accept your order.`,
      PREPARING: `${restaurantName} is now preparing your delicious meal!`,
      READY: `Your order from ${restaurantName} is ready for pickup/delivery.`,
      PICKED_UP: `A courier has picked up your order from ${restaurantName}.`,
      IN_TRANSIT: `Your order from ${restaurantName} is on its way to you!`,
      DELIVERED: `Your order from ${restaurantName} has been delivered. Enjoy!`,
      CANCELLED: `Your order from ${restaurantName} has been cancelled.`,
    };

    await this.createNotification({
      user_id: userId,
      type,
      title: titleMap[status] || `Order ${orderNumber} updated`,
      body: bodyMap[status] || `Your order status has been updated to ${status}.`,
      data: { order_number: orderNumber, restaurant_name: restaurantName, ...data },
      channel: NotificationChannel.BOTH,
      priority:
        status === 'REJECTED' || status === 'CANCELLED'
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL,
    });
  }

  /**
   * Send welcome notification after email verification
   */
  async notifyWelcome(userId: string, firstName: string, email: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: NotificationType.WELCOME,
      title: 'Welcome to just-eat.ch! 🎉',
      body: `Hi ${firstName}, your account is now active. Start browsing restaurants and ordering delicious food!`,
      channel: NotificationChannel.BOTH,
      priority: NotificationPriority.NORMAL,
    });

    // Also send the welcome email via queue
    enqueueWelcomeEmail(email, firstName).catch((err) => {
      logger.error('Failed to enqueue welcome email', { email, error: err });
    });
  }

  /**
   * Send review reply notification
   */
  async notifyReviewReply(
    userId: string,
    restaurantName: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: NotificationType.REVIEW_REPLY,
      title: `${restaurantName} replied to your review`,
      body: `The restaurant has responded to your review. Check it out!`,
      data,
      channel: NotificationChannel.IN_APP,
      priority: NotificationPriority.NORMAL,
    });
  }

  /**
   * Send delivery assignment notification to courier
   */
  async notifyDeliveryAssigned(
    courierId: string,
    orderNumber: string,
    restaurantName: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.createNotification({
      user_id: courierId,
      type: NotificationType.DELIVERY_ASSIGNED,
      title: `New delivery: ${orderNumber}`,
      body: `You have been assigned a delivery from ${restaurantName}.`,
      data: { order_number: orderNumber, restaurant_name: restaurantName, ...data },
      channel: NotificationChannel.IN_APP,
      priority: NotificationPriority.HIGH,
    });
  }

  // =========================================================================
  // Email sending
  // =========================================================================

  /**
   * Look up the user's email and enqueue a notification email job
   */
  private async enqueueEmailForNotification(
    notificationId: string,
    userId: string,
    notificationType: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select('email first_name').lean().exec();
      if (!user || !user.email) {
        logger.warn('Cannot send notification email — user not found or no email', {
          notificationId,
          userId,
        });
        return;
      }

      await enqueueNotificationEmail(
        notificationId,
        userId,
        user.email,
        user.first_name || 'Customer',
        notificationType,
        title,
        body,
        data
      );
    } catch (err) {
      logger.error('Failed to enqueue notification email', {
        notificationId,
        userId,
        error: (err as Error).message,
      });
    }
  }

  // =========================================================================
  // DTO mapping
  // =========================================================================

  private toResponseDto(notification: INotification): NotificationResponseDto {
    return {
      id: notification._id.toString(),
      user_id: notification.user_id.toString(),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: (notification.data as Record<string, unknown>) || null,
      channel: notification.channel,
      priority: notification.priority,
      is_read: notification.is_read,
      read_at: notification.read_at || null,
      email_sent: notification.email_sent,
      email_sent_at: notification.email_sent_at || null,
      created_at: notification.created_at,
    };
  }
}
