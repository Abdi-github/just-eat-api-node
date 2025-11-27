// ──────────────────────────────────────────────
// Payment Module — Types, Enums & DTOs
// ──────────────────────────────────────────────

import { Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────

/**
 * Payment method enum — matches order.types.ts PaymentMethod
 * but scoped to payment module usage
 */
export enum PaymentMethodEnum {
  STRIPE_CARD = 'card',
  TWINT = 'twint',
  POSTFINANCE = 'postfinance',
  CASH = 'cash',
}

/**
 * Payment transaction status lifecycle
 */
export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Provider names for internal tracking
 */
export enum PaymentProviderName {
  STRIPE = 'stripe',
  TWINT = 'twint',
  POSTFINANCE = 'postfinance',
  CASH = 'cash',
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_CANCELLED = 'payment.cancelled',
}

// ─── Provider Interfaces ────────────────────────

export interface CreatePaymentParams {
  order_id: string;
  user_id: string;
  amount: number;
  currency: 'CHF';
  description: string;
  customer_email: string;
  metadata?: Record<string, string>;
  return_url?: string;
  cancel_url?: string;
}

export interface PaymentInitResult {
  provider_transaction_id: string;
  status: PaymentTransactionStatus;
  redirect_url?: string;
  client_secret?: string;
  expires_at?: Date;
}

export interface PaymentConfirmResult {
  provider_transaction_id: string;
  status: PaymentTransactionStatus;
  paid_at?: Date;
  provider_response?: Record<string, unknown>;
}

export interface PaymentRefundResult {
  refund_id: string;
  status: 'REFUNDED' | 'PARTIAL_REFUND' | 'FAILED';
  refunded_amount: number;
  refunded_at: Date;
}

export interface WebhookEvent {
  event_type: WebhookEventType;
  provider_transaction_id: string;
  amount: number;
  metadata?: Record<string, string>;
}

export interface PaymentStatusResult {
  provider_transaction_id: string;
  status: PaymentTransactionStatus;
  amount: number;
  paid_at?: Date;
}

// ─── Request DTOs ───────────────────────────────

export interface InitiatePaymentDto {
  order_id: string;
  payment_method: PaymentMethodEnum;
  return_url?: string;
  cancel_url?: string;
}

export interface RefundPaymentDto {
  amount?: number;
  reason?: string;
}

export interface ConfirmCashPaymentDto {
  collected_by: string;
}

export interface SimulateConfirmDto {
  // No body needed — transaction ID comes from URL param
}

// ─── Response DTOs ──────────────────────────────

export interface PaymentTransactionResponseDto {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  provider_name: string;
  provider_transaction_id?: string;
  status: string;
  redirect_url?: string;
  client_secret?: string;
  session_expires_at?: string;
  refund_amount?: number;
  refund_reason?: string;
  refunded_at?: string;
  cash_confirmed?: boolean;
  cash_collected_at?: string;
  error_message?: string;
  error_code?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

// ─── Query DTOs ─────────────────────────────────

export interface PaymentQueryDto {
  page?: number;
  limit?: number;
  status?: PaymentTransactionStatus;
  payment_method?: PaymentMethodEnum;
  order_id?: string;
  user_id?: string;
}

// ─── Constants ──────────────────────────────────

export const PAYMENT_CONSTANTS = {
  DEFAULT_CURRENCY: 'CHF' as const,
  MAX_PAYMENT_ATTEMPTS: 3,
  SESSION_TTL_SECONDS: 1800, // 30 minutes
  TWINT_SESSION_TIMEOUT_MINUTES: 5,
  POSTFINANCE_SESSION_TIMEOUT_MINUTES: 15,
};
