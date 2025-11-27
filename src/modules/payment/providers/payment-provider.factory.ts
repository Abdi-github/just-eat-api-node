// ──────────────────────────────────────────────
// Payment Provider Factory
// Resolves the correct provider by payment method
// ──────────────────────────────────────────────

import { PaymentMethodEnum } from '../payment.types.js';
import { IPaymentProvider } from './payment-provider.interface.js';
import { StripeProvider } from './stripe.provider.js';
import { TwintProvider } from './twint.provider.js';
import { PostFinanceProvider } from './postfinance.provider.js';
import { CashProvider } from './cash.provider.js';
import { BadRequestError } from '../../../shared/errors/AppError.js';

export class PaymentProviderFactory {
  private static providers = new Map<string, IPaymentProvider>();
  private static initialized = false;

  /**
   * Initialize all payment providers
   */
  static initialize(): void {
    if (this.initialized) return;

    this.providers.set(PaymentMethodEnum.STRIPE_CARD, new StripeProvider());
    this.providers.set(PaymentMethodEnum.TWINT, new TwintProvider());
    this.providers.set(PaymentMethodEnum.POSTFINANCE, new PostFinanceProvider());
    this.providers.set(PaymentMethodEnum.CASH, new CashProvider());

    this.initialized = true;
  }

  /**
   * Get provider by payment method
   */
  static getProvider(method: PaymentMethodEnum): IPaymentProvider {
    if (!this.initialized) {
      this.initialize();
    }

    const provider = this.providers.get(method);
    if (!provider) {
      throw BadRequestError(`Unsupported payment method: ${method}`);
    }
    return provider;
  }

  /**
   * Get all registered providers
   */
  static getAllProviders(): IPaymentProvider[] {
    if (!this.initialized) {
      this.initialize();
    }
    return Array.from(this.providers.values());
  }

  /**
   * Check if a payment method is supported
   */
  static isSupported(method: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }
    return this.providers.has(method);
  }
}
