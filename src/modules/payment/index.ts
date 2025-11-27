// ──────────────────────────────────────────────
// Payment Module — Barrel Export
// ──────────────────────────────────────────────

// Model
export { PaymentTransaction } from './payment.model.js';
export type { IPaymentTransaction } from './payment.model.js';

// Types & DTOs
export {
  PaymentMethodEnum,
  PaymentTransactionStatus,
  PaymentProviderName,
  WebhookEventType,
  PAYMENT_CONSTANTS,
} from './payment.types.js';
export type {
  CreatePaymentParams,
  PaymentInitResult,
  PaymentConfirmResult,
  PaymentRefundResult,
  WebhookEvent,
  PaymentStatusResult,
  InitiatePaymentDto,
  RefundPaymentDto,
  ConfirmCashPaymentDto,
  PaymentTransactionResponseDto,
  PaymentQueryDto,
} from './payment.types.js';

// Providers
export type { IPaymentProvider } from './providers/payment-provider.interface.js';
export { PaymentProviderFactory } from './providers/payment-provider.factory.js';

// Repository & Service
export { paymentRepository } from './payment.repository.js';
export { paymentService } from './payment.service.js';

// Routes
export { default as paymentPublicRoutes } from './payment.public.routes.js';
export { default as paymentAdminRoutes } from './payment.admin.routes.js';
export { default as paymentWebhookRoutes } from './payment.webhook.routes.js';
