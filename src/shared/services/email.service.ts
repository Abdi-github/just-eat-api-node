/**
 * Email Service
 *
 * Centralized email sending service using Nodemailer.
 * Uses Mailpit in development for email capture/preview.
 * Provides template-based email sending for transactional emails.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../logger/index.js';
import {
  getEmailTemplate,
  type EmailTemplateName,
  type EmailTemplateData,
} from './email.templates.js';

// ============================================================================
// Types
// ============================================================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendTemplateEmailOptions {
  to: string | string[];
  template: EmailTemplateName;
  data: EmailTemplateData;
  replyTo?: string;
}

// ============================================================================
// Email Service Class
// ============================================================================

class EmailService {
  private transporter: Transporter | null = null;
  private initialized = false;

  /**
   * Initialize the nodemailer transporter
   */
  private initialize(): void {
    if (this.initialized) return;

    try {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth:
          config.email.auth.user && config.email.auth.pass
            ? { user: config.email.auth.user, pass: config.email.auth.pass }
            : undefined,
      });

      this.initialized = true;
      logger.info('Email service initialized', {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
      });
    } catch (error) {
      logger.error('Failed to initialize email service', { error });
    }
  }

  /**
   * Send a raw email
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    this.initialize();

    if (!this.transporter) {
      logger.error('Email transporter not available');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${config.email.from.name}" <${config.email.from.address}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || config.email.replyTo,
      });

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Send a template-based email
   */
  async sendTemplate(options: SendTemplateEmailOptions): Promise<boolean> {
    const { subject, html, text } = getEmailTemplate(options.template, options.data);

    return this.send({
      to: options.to,
      subject,
      html,
      text,
      replyTo: options.replyTo,
    });
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
    return this.sendTemplate({
      to,
      template: 'welcome',
      data: { firstName },
    });
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(to: string, firstName: string, token: string): Promise<boolean> {
    const verificationUrl = `${config.frontend.baseUrl}${config.frontend.verifyEmailPath}?token=${token}`;

    return this.sendTemplate({
      to,
      template: 'emailVerification',
      data: { firstName, verificationUrl },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, firstName: string, token: string): Promise<boolean> {
    const resetUrl = `${config.frontend.baseUrl}${config.frontend.resetPasswordPath}?token=${token}`;

    return this.sendTemplate({
      to,
      template: 'passwordReset',
      data: { firstName, resetUrl },
    });
  }

  /**
   * Send order placed confirmation to customer
   */
  async sendOrderPlacedEmail(
    to: string,
    firstName: string,
    orderNumber: string,
    restaurantName: string,
    total: number
  ): Promise<boolean> {
    return this.sendTemplate({
      to,
      template: 'orderPlaced',
      data: { firstName, orderNumber, restaurantName, total },
    });
  }

  /**
   * Send order status update to customer
   */
  async sendOrderStatusEmail(
    to: string,
    firstName: string,
    orderNumber: string,
    status: string,
    restaurantName: string
  ): Promise<boolean> {
    return this.sendTemplate({
      to,
      template: 'orderStatusUpdate',
      data: { firstName, orderNumber, status, restaurantName },
    });
  }

  /**
   * Send new order notification to restaurant
   */
  async sendNewOrderToRestaurant(
    to: string,
    restaurantName: string,
    orderNumber: string,
    total: number
  ): Promise<boolean> {
    return this.sendTemplate({
      to,
      template: 'newOrderRestaurant',
      data: { restaurantName, orderNumber, total },
    });
  }

  /**
   * Verify the transporter connection (health check)
   */
  async verifyConnection(): Promise<boolean> {
    this.initialize();

    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }
}

// Singleton instance
export const emailService = new EmailService();
