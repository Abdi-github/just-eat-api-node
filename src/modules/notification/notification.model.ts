import { Schema, model, Document } from 'mongoose';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CHANNEL_VALUES,
  NOTIFICATION_PRIORITY_VALUES,
} from './notification.types.js';

/**
 * Notification Document Interface
 */
export interface INotification extends Document {
  _id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel: NotificationChannel;
  priority: NotificationPriority;
  is_read: boolean;
  read_at?: Date;
  email_sent: boolean;
  email_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Notification Schema
 *
 * Stores in-app notifications for users. Supports filtering by type/read status,
 * tracking email delivery, and priority levels.
 */
const notificationSchema = new Schema<INotification>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPE_VALUES,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNEL_VALUES,
      default: NotificationChannel.BOTH,
    },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITY_VALUES,
      default: NotificationPriority.NORMAL,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
    email_sent: {
      type: Boolean,
      default: false,
    },
    email_sent_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'notifications',
    versionKey: false,
  }
);

// Compound index for user's notifications sorted by date
notificationSchema.index({ user_id: 1, created_at: -1 });

// Index for filtering by type
notificationSchema.index({ user_id: 1, type: 1 });

// Index for unread notifications count
notificationSchema.index({ user_id: 1, is_read: 1 });

// TTL index — auto-delete notifications older than 90 days
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification = model<INotification>('Notification', notificationSchema);
