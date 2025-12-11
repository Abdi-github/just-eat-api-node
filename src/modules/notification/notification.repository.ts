import { Notification, INotification } from './notification.model.js';
import type { CreateNotificationDto, NotificationQueryDto } from './notification.types.js';

/**
 * Notification Repository
 *
 * Data access layer for the notifications collection.
 */
export class NotificationRepository {
  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto): Promise<INotification> {
    return Notification.create(dto);
  }

  /**
   * Create multiple notifications at once (bulk)
   */
  async createMany(dtos: CreateNotificationDto[]): Promise<INotification[]> {
    return Notification.insertMany(dtos);
  }

  /**
   * Find a notification by ID
   */
  async findById(id: string): Promise<INotification | null> {
    return Notification.findById(id).exec();
  }

  /**
   * Find all notifications for a user with filtering and pagination
   */
  async findByUserId(
    userId: string,
    query: NotificationQueryDto
  ): Promise<{ data: INotification[]; total: number }> {
    const page = parseInt(String(query.page || '1'), 10);
    const limit = parseInt(String(query.limit || '20'), 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { user_id: userId };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.is_read === 'true') {
      filter.is_read = true;
    } else if (query.is_read === 'false') {
      filter.is_read = false;
    }

    const [data, total] = await Promise.all([
      Notification.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).exec(),
      Notification.countDocuments(filter),
    ]);

    return { data, total };
  }

  /**
   * Count total and unread notifications for a user
   */
  async countByUserId(userId: string): Promise<{ total: number; unread: number }> {
    const [total, unread] = await Promise.all([
      Notification.countDocuments({ user_id: userId }),
      Notification.countDocuments({ user_id: userId, is_read: false }),
    ]);

    return { total, unread };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string, userId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: id, user_id: userId },
      { is_read: true, read_at: new Date() },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() }
    );
    return result.modifiedCount;
  }

  /**
   * Delete a single notification
   */
  async deleteById(id: string, userId: string): Promise<INotification | null> {
    return Notification.findOneAndDelete({ _id: id, user_id: userId }).exec();
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await Notification.deleteMany({ user_id: userId });
    return result.deletedCount;
  }

  /**
   * Update email_sent status
   */
  async markEmailSent(id: string): Promise<void> {
    await Notification.findByIdAndUpdate(id, {
      email_sent: true,
      email_sent_at: new Date(),
    }).exec();
  }
}
