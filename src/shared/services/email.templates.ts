/**
 * Email Templates
 *
 * HTML email templates for transactional emails.
 * All templates use inline styles for maximum email client compatibility.
 */

// ============================================================================
// Template Types
// ============================================================================

export type EmailTemplateName =
  | 'welcome'
  | 'emailVerification'
  | 'passwordReset'
  | 'orderPlaced'
  | 'orderStatusUpdate'
  | 'newOrderRestaurant';

export type EmailTemplateData = Record<string, unknown>;

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

// ============================================================================
// Base Layout
// ============================================================================

const baseLayout = (content: string, preheader = ''): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>just-eat.ch</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #FF8000; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🍔 just-eat.ch</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; color: #868e96; font-size: 13px;">
                © ${new Date().getFullYear()} just-eat.ch — Swiss Food Delivery
              </p>
              <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ============================================================================
// Button Component
// ============================================================================

const buttonComponent = (text: string, url: string, color = '#FF8000'): string => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto;">
  <tr>
    <td style="border-radius: 6px; background-color: ${color};">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 6px;">${text}</a>
    </td>
  </tr>
</table>`;

// ============================================================================
// Template Functions
// ============================================================================

const templates: Record<EmailTemplateName, (data: EmailTemplateData) => EmailTemplateResult> = {
  /**
   * Welcome email — sent after email verification
   */
  welcome: (data) => {
    const { firstName } = data as { firstName: string };
    return {
      subject: 'Welcome to just-eat.ch! 🎉',
      html: baseLayout(
        `
        <h2 style="margin: 0 0 16px; color: #212529; font-size: 22px;">Welcome, ${firstName}!</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          Your email has been verified and your account is now active. You're all set to discover amazing restaurants and order delicious food delivered to your door.
        </p>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          Here's what you can do:
        </p>
        <ul style="margin: 0 0 16px; padding-left: 24px; color: #495057; font-size: 15px; line-height: 1.8;">
          <li>🔍 Browse restaurants by cuisine, location, or rating</li>
          <li>🛒 Place delivery or pickup orders</li>
          <li>⭐ Rate and review your experience</li>
          <li>❤️ Save your favorite restaurants</li>
          <li>🎫 Collect stamps and use coupons</li>
        </ul>
        ${buttonComponent('Start Ordering', 'http://localhost:5173/restaurants')}
        <p style="margin: 0; color: #868e96; font-size: 13px;">
          Enjoy your meals! — The just-eat.ch team
        </p>
        `,
        'Welcome to just-eat.ch — start ordering delicious food today!'
      ),
      text: `Welcome, ${firstName}! Your email has been verified and your account is now active. Start browsing restaurants at http://localhost:5173/restaurants`,
    };
  },

  /**
   * Email verification — sent after registration
   */
  emailVerification: (data) => {
    const { firstName, verificationUrl } = data as { firstName: string; verificationUrl: string };
    return {
      subject: 'Verify your email — just-eat.ch',
      html: baseLayout(
        `
        <h2 style="margin: 0 0 16px; color: #212529; font-size: 22px;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          Thanks for registering on just-eat.ch! Please verify your email address by clicking the button below:
        </p>
        ${buttonComponent('Verify Email', verificationUrl)}
        <p style="margin: 0 0 8px; color: #868e96; font-size: 13px;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="margin: 0; color: #868e96; font-size: 12px;">
          Or copy and paste this URL: <a href="${verificationUrl}" style="color: #FF8000;">${verificationUrl}</a>
        </p>
        `,
        'Verify your email to activate your just-eat.ch account'
      ),
      text: `Hi ${firstName}, verify your email by visiting: ${verificationUrl}. This link expires in 24 hours.`,
    };
  },

  /**
   * Password reset — sent when user requests password reset
   */
  passwordReset: (data) => {
    const { firstName, resetUrl } = data as { firstName: string; resetUrl: string };
    return {
      subject: 'Reset your password — just-eat.ch',
      html: baseLayout(
        `
        <h2 style="margin: 0 0 16px; color: #212529; font-size: 22px;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new password:
        </p>
        ${buttonComponent('Reset Password', resetUrl, '#dc3545')}
        <p style="margin: 0 0 8px; color: #868e96; font-size: 13px;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="margin: 0; color: #868e96; font-size: 12px;">
          Or copy and paste this URL: <a href="${resetUrl}" style="color: #FF8000;">${resetUrl}</a>
        </p>
        `,
        'Reset your just-eat.ch password'
      ),
      text: `Hi ${firstName}, reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
    };
  },

  /**
   * Order placed — confirmation to customer
   */
  orderPlaced: (data) => {
    const { firstName, orderNumber, restaurantName, total } = data as {
      firstName: string;
      orderNumber: string;
      restaurantName: string;
      total: number;
    };
    return {
      subject: `Order ${orderNumber} confirmed — just-eat.ch`,
      html: baseLayout(
        `
        <h2 style="margin: 0 0 16px; color: #212529; font-size: 22px;">Order Confirmed! 🎉</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          Hi ${firstName}, your order from <strong>${restaurantName}</strong> has been placed successfully.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f8f9fa; border-radius: 8px; padding: 16px;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; color: #495057; font-size: 14px;">
                <strong>Order Number:</strong> ${orderNumber}
              </p>
              <p style="margin: 0 0 8px; color: #495057; font-size: 14px;">
                <strong>Restaurant:</strong> ${restaurantName}
              </p>
              <p style="margin: 0; color: #212529; font-size: 18px; font-weight: 600;">
                Total: CHF ${total.toFixed(2)}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          The restaurant will confirm your order shortly. You'll receive updates as your order progresses.
        </p>
        ${buttonComponent('Track Order', `http://localhost:5173/orders/${orderNumber}`)}
        `,
        `Your order ${orderNumber} from ${restaurantName} has been placed`
      ),
      text: `Hi ${firstName}, your order ${orderNumber} from ${restaurantName} has been placed. Total: CHF ${total.toFixed(2)}. Track it at http://localhost:5173/orders/${orderNumber}`,
    };
  },

  /**
   * Order status update — sent to customer on status changes
   */
  orderStatusUpdate: (data) => {
    const { firstName, orderNumber, status, restaurantName } = data as {
      firstName: string;
      orderNumber: string;
      status: string;
      restaurantName: string;
    };

    const statusMessages: Record<string, { emoji: string; message: string; color: string }> = {
      ACCEPTED: {
        emoji: '✅',
        message: 'Your order has been accepted by the restaurant.',
        color: '#28a745',
      },
      REJECTED: {
        emoji: '❌',
        message: 'Unfortunately, your order has been rejected.',
        color: '#dc3545',
      },
      PREPARING: { emoji: '👨‍🍳', message: 'Your food is being prepared!', color: '#FF8000' },
      READY: { emoji: '📦', message: 'Your order is ready!', color: '#17a2b8' },
      PICKED_UP: {
        emoji: '🚴',
        message: 'Your order has been picked up by the courier.',
        color: '#6f42c1',
      },
      IN_TRANSIT: { emoji: '🛵', message: 'Your order is on its way!', color: '#FF8000' },
      DELIVERED: {
        emoji: '🎉',
        message: 'Your order has been delivered. Enjoy your meal!',
        color: '#28a745',
      },
      CANCELLED: { emoji: '🚫', message: 'Your order has been cancelled.', color: '#dc3545' },
    };

    const statusInfo = statusMessages[status] || {
      emoji: '📋',
      message: `Status updated to ${status}`,
      color: '#6c757d',
    };

    return {
      subject: `${statusInfo.emoji} Order ${orderNumber} — ${status.replace(/_/g, ' ').toLowerCase()}`,
      html: baseLayout(
        `
        <h2 style="margin: 0 0 16px; color: #212529; font-size: 22px;">Order Update ${statusInfo.emoji}</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          Hi ${firstName}, here's an update on your order from <strong>${restaurantName}</strong>:
        </p>
        <div style="margin: 16px 0; padding: 16px; background-color: #f8f9fa; border-left: 4px solid ${statusInfo.color}; border-radius: 4px;">
          <p style="margin: 0 0 4px; color: ${statusInfo.color}; font-size: 16px; font-weight: 600;">
            ${status.replace(/_/g, ' ')}
          </p>
          <p style="margin: 0; color: #495057; font-size: 14px;">
            ${statusInfo.message}
          </p>
        </div>
        <p style="margin: 16px 0 0; color: #868e96; font-size: 13px;">
          Order: ${orderNumber}
        </p>
        `,
        `Order ${orderNumber}: ${statusInfo.message}`
      ),
      text: `Hi ${firstName}, your order ${orderNumber} from ${restaurantName}: ${statusInfo.message}`,
    };
  },

  /**
   * New order notification — sent to restaurant
   */
  newOrderRestaurant: (data) => {
    const { restaurantName, orderNumber, total } = data as {
      restaurantName: string;
      orderNumber: string;
      total: number;
    };
    return {
      subject: `🔔 New order ${orderNumber} — ${restaurantName}`,
      html: baseLayout(
        `
        <h2 style="margin: 0 0 16px; color: #212529; font-size: 22px;">New Order Received! 🔔</h2>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          A new order has been placed at <strong>${restaurantName}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #fff3cd; border-radius: 8px;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; color: #856404; font-size: 14px;">
                <strong>Order Number:</strong> ${orderNumber}
              </p>
              <p style="margin: 0; color: #856404; font-size: 18px; font-weight: 600;">
                Total: CHF ${total.toFixed(2)}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 16px; color: #495057; font-size: 15px; line-height: 1.6;">
          Please review and accept the order in your dashboard.
        </p>
        ${buttonComponent('View Order', `http://localhost:5174/orders/${orderNumber}`)}
        `,
        `New order ${orderNumber} at ${restaurantName} — CHF ${total.toFixed(2)}`
      ),
      text: `New order ${orderNumber} at ${restaurantName}. Total: CHF ${total.toFixed(2)}. Review in your dashboard.`,
    };
  },
};

// ============================================================================
// Template Resolver
// ============================================================================

export function getEmailTemplate(
  templateName: EmailTemplateName,
  data: EmailTemplateData
): EmailTemplateResult {
  const templateFn = templates[templateName];
  if (!templateFn) {
    throw new Error(`Email template "${templateName}" not found`);
  }
  return templateFn(data);
}
