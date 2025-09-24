/**
 * Stripe Production Configuration Module
 *
 * Production-ready Stripe integration for BEAR AI with comprehensive
 * payment processing, security, compliance, and audit features.
 *
 * Security Features:
 * - PCI DSS compliance validation
 * - Webhook signature verification
 * - Secure API key management
 * - Audit logging without sensitive data exposure
 *
 * @author BEAR AI Team
 * @version 1.0.0
 */

import Stripe from 'stripe';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

// Types and Interfaces
interface StripeConfig {
  apiKey: string;
  webhookSecret: string;
  apiVersion: '2024-06-20';
  maxNetworkRetries: number;
  timeout: number;
  telemetry: boolean;
  host?: string;
  protocol?: 'https';
  port?: number;
}

interface PaymentIntentOptions {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  confirm?: boolean;
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
  metadata?: Record<string, string>;
  description?: string;
  receiptEmail?: string;
  transferGroup?: string;
  onBehalfOf?: string;
  applicationFeeAmount?: number;
  automaticTax?: {
    enabled: boolean;
    allowReverseCharge?: boolean;
  };
}

interface SubscriptionOptions {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialEnd?: number;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  metadata?: Record<string, string>;
  automaticTax?: {
    enabled: boolean;
    liability?: {
      type: 'account' | 'self';
    };
  };
  defaultTaxRates?: string[];
  coupon?: string;
  promotionCode?: string;
}

interface WebhookEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

interface AuditLogEntry {
  timestamp: string;
  operation: string;
  result: 'success' | 'failure' | 'pending';
  entityType: string;
  entityId: string;
  userId?: string;
  metadata?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface PCIComplianceCheck {
  isCompliant: boolean;
  violations: string[];
  recommendations: string[];
}

interface TaxCalculationOptions {
  lineItems: Array<{
    amount: number;
    reference: string;
    taxBehavior?: 'inclusive' | 'exclusive';
    taxCode?: string;
  }>;
  customerDetails: {
    address: {
      line1: string;
      city: string;
      state?: string;
      postal_code: string;
      country: string;
    };
    taxIds?: Array<{
      type: string;
      value: string;
    }>;
  };
  currency: string;
  shipFromDetails?: {
    address: {
      line1: string;
      city: string;
      state?: string;
      postal_code: string;
      country: string;
    };
  };
}

/**
 * Production-ready Stripe service with enterprise security and compliance features
 */
export class StripeProduction {
  private stripe: Stripe;
  private webhookSecret: string;
  private auditLogger: (entry: AuditLogEntry) => Promise<void>;
  private errorLogger: (error: Error, context: Record<string, any>) => Promise<void>;
  private config: StripeConfig;

  constructor(
    config: StripeConfig,
    auditLogger?: (entry: AuditLogEntry) => Promise<void>,
    errorLogger?: (error: Error, context: Record<string, any>) => Promise<void>
  ) {
    this.validateConfig(config);
    this.config = config;
    this.webhookSecret = config.webhookSecret;

    // Initialize Stripe with production configuration
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: config.apiVersion,
      maxNetworkRetries: config.maxNetworkRetries,
      timeout: config.timeout,
      telemetry: config.telemetry,
      host: config.host,
      protocol: config.protocol,
      port: config.port,
      appInfo: {
        name: 'BEAR-AI-Legal-Assistant',
        version: '1.0.0',
        url: 'https://bear-ai.com'
      }
    });

    // Set up logging
    this.auditLogger = auditLogger || this.defaultAuditLogger;
    this.errorLogger = errorLogger || this.defaultErrorLogger;
  }

  /**
   * Validates the Stripe configuration for production readiness
   */
  private validateConfig(config: StripeConfig): void {
    if (!config.apiKey || !config.apiKey.startsWith('sk_live_')) {
      throw new Error('Production Stripe API key required (sk_live_...)');
    }

    if (!config.webhookSecret || config.webhookSecret.length < 32) {
      throw new Error('Webhook secret must be at least 32 characters');
    }

    if (config.maxNetworkRetries < 3) {
      throw new Error('Maximum network retries should be at least 3 for production');
    }

    if (config.timeout < 10000) {
      throw new Error('Timeout should be at least 10 seconds for production');
    }
  }

  /**
   * Creates a payment intent with comprehensive validation and logging
   */
  async createPaymentIntent(options: PaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'create_payment_intent',
      entityType: 'payment_intent',
      metadata: {
        amount: options.amount,
        currency: options.currency,
        hasCustomer: !!options.customerId
      }
    };

    try {
      // Input validation
      this.validatePaymentAmount(options.amount, options.currency);

      // PCI compliance check
      const complianceCheck = this.performPCIComplianceCheck(options);
      if (!complianceCheck.isCompliant) {
        throw new Error(`PCI compliance violations: ${complianceCheck.violations.join(', ')}`);
      }

      // Create payment intent with retry logic
      const paymentIntent = await this.retryWithExponentialBackoff(
        () => this.stripe.paymentIntents.create({
          amount: options.amount,
          currency: options.currency.toLowerCase(),
          customer: options.customerId,
          payment_method: options.paymentMethodId,
          confirm: options.confirm,
          capture_method: options.captureMethod,
          setup_future_usage: options.setupFutureUsage,
          metadata: this.sanitizeMetadata(options.metadata),
          description: this.sanitizeDescription(options.description),
          receipt_email: options.receiptEmail,
          transfer_group: options.transferGroup,
          on_behalf_of: options.onBehalfOf,
          application_fee_amount: options.applicationFeeAmount,
          automatic_tax: options.automaticTax
        }),
        3,
        1000
      );

      auditEntry = {
        ...auditEntry,
        result: 'success',
        entityId: paymentIntent.id,
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime,
          status: paymentIntent.status
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return paymentIntent;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        entityId: 'unknown',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      await this.errorLogger(error as Error, { operation: 'create_payment_intent', options: this.sanitizeOptions(options) });
      throw error;
    }
  }

  /**
   * Validates webhook signatures with timing-safe comparison
   */
  validateWebhookSignature(payload: string, signature: string, tolerance: number = 300): WebhookEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
        tolerance
      );

      // Additional security validation
      if (!event.id || !event.type || !event.data) {
        throw new Error('Invalid webhook event structure');
      }

      // Verify event is from live mode in production
      if (!event.livemode) {
        throw new Error('Test mode webhooks not allowed in production');
      }

      this.auditLogger({
        timestamp: new Date().toISOString(),
        operation: 'webhook_received',
        result: 'success',
        entityType: 'webhook',
        entityId: event.id,
        metadata: {
          eventType: event.type,
          objectType: event.data.object.object
        }
      });

      return event;

    } catch (error) {
      this.auditLogger({
        timestamp: new Date().toISOString(),
        operation: 'webhook_validation',
        result: 'failure',
        entityType: 'webhook',
        entityId: 'unknown',
        errorCode: (error as any).code || 'webhook_validation_failed',
        errorMessage: this.sanitizeErrorMessage((error as Error).message)
      });

      throw error;
    }
  }

  /**
   * Creates and manages subscriptions with comprehensive lifecycle support
   */
  async createSubscription(options: SubscriptionOptions): Promise<Stripe.Subscription> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'create_subscription',
      entityType: 'subscription',
      metadata: {
        customerId: options.customerId,
        priceId: options.priceId,
        hasPaymentMethod: !!options.paymentMethodId
      }
    };

    try {
      // Validate customer exists
      await this.stripe.customers.retrieve(options.customerId);

      // Create subscription with automatic tax calculation
      const subscription = await this.retryWithExponentialBackoff(
        () => this.stripe.subscriptions.create({
          customer: options.customerId,
          items: [{ price: options.priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
            payment_method_options: {
              card: {
                mandate_options: {
                  amount_type: 'maximum',
                  amount: 5000000, // $50,000 maximum
                  interval: 'sporadic'
                }
              }
            }
          },
          expand: ['latest_invoice.payment_intent'],
          trial_end: options.trialEnd,
          proration_behavior: options.prorationBehavior,
          metadata: this.sanitizeMetadata(options.metadata),
          automatic_tax: options.automaticTax,
          default_tax_rates: options.defaultTaxRates,
          coupon: options.coupon,
          promotion_code: options.promotionCode
        }),
        3,
        1000
      );

      auditEntry = {
        ...auditEntry,
        result: 'success',
        entityId: subscription.id,
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime,
          status: subscription.status
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return subscription;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        entityId: 'unknown',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      await this.errorLogger(error as Error, { operation: 'create_subscription', options: this.sanitizeOptions(options) });
      throw error;
    }
  }

  /**
   * Updates subscription with proration handling
   */
  async updateSubscription(
    subscriptionId: string,
    updateData: Partial<Stripe.SubscriptionUpdateParams>
  ): Promise<Stripe.Subscription> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'update_subscription',
      entityType: 'subscription',
      entityId: subscriptionId
    };

    try {
      const subscription = await this.retryWithExponentialBackoff(
        () => this.stripe.subscriptions.update(subscriptionId, {
          ...updateData,
          metadata: this.sanitizeMetadata(updateData.metadata)
        }),
        3,
        1000
      );

      auditEntry = {
        ...auditEntry,
        result: 'success',
        metadata: {
          processingTime: Date.now() - startTime,
          status: subscription.status
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return subscription;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      throw error;
    }
  }

  /**
   * Cancels subscription with proper cleanup
   */
  async cancelSubscription(
    subscriptionId: string,
    options?: { immediately?: boolean; reason?: string }
  ): Promise<Stripe.Subscription> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'cancel_subscription',
      entityType: 'subscription',
      entityId: subscriptionId,
      metadata: {
        immediately: options?.immediately || false,
        reason: options?.reason
      }
    };

    try {
      const subscription = options?.immediately
        ? await this.stripe.subscriptions.cancel(subscriptionId)
        : await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
            metadata: {
              cancellation_reason: options?.reason || 'user_requested',
              cancelled_at: new Date().toISOString()
            }
          });

      auditEntry = {
        ...auditEntry,
        result: 'success',
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime,
          status: subscription.status
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return subscription;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      throw error;
    }
  }

  /**
   * Calculates taxes for multi-jurisdiction compliance
   */
  async calculateTax(options: TaxCalculationOptions): Promise<Stripe.Tax.Calculation> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'calculate_tax',
      entityType: 'tax_calculation',
      metadata: {
        currency: options.currency,
        lineItemCount: options.lineItems.length,
        country: options.customerDetails.address.country
      }
    };

    try {
      const calculation = await this.retryWithExponentialBackoff(
        () => this.stripe.tax.calculations.create({
          currency: options.currency,
          line_items: options.lineItems.map(item => ({
            amount: item.amount,
            reference: item.reference,
            tax_behavior: item.taxBehavior || 'exclusive',
            tax_code: item.taxCode
          })),
          customer_details: {
            address: options.customerDetails.address,
            address_source: 'billing',
            tax_ids: options.customerDetails.taxIds
          },
          ship_from_details: options.shipFromDetails ? {
            address: options.shipFromDetails.address
          } : undefined,
          expand: ['line_items']
        }),
        3,
        1000
      );

      auditEntry = {
        ...auditEntry,
        result: 'success',
        entityId: calculation.id,
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime,
          totalTax: calculation.tax_amount_exclusive
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return calculation;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        entityId: 'unknown',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      throw error;
    }
  }

  /**
   * Creates customer billing portal session
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
    configuration?: string
  ): Promise<Stripe.BillingPortal.Session> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'create_billing_portal_session',
      entityType: 'billing_portal_session',
      metadata: {
        customerId: customerId,
        hasConfiguration: !!configuration
      }
    };

    try {
      // Validate return URL
      if (!this.isValidReturnUrl(returnUrl)) {
        throw new Error('Invalid return URL - must be HTTPS and from allowed domain');
      }

      const session = await this.retryWithExponentialBackoff(
        () => this.stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
          configuration: configuration
        }),
        3,
        1000
      );

      auditEntry = {
        ...auditEntry,
        result: 'success',
        entityId: session.id,
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return session;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        entityId: 'unknown',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      throw error;
    }
  }

  /**
   * Generates invoice with proper formatting and compliance
   */
  async createInvoice(
    customerId: string,
    options?: Partial<Stripe.InvoiceCreateParams>
  ): Promise<Stripe.Invoice> {
    const startTime = Date.now();
    let auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date().toISOString(),
      operation: 'create_invoice',
      entityType: 'invoice',
      metadata: {
        customerId: customerId
      }
    };

    try {
      const invoice = await this.retryWithExponentialBackoff(
        () => this.stripe.invoices.create({
          customer: customerId,
          auto_advance: true,
          collection_method: 'charge_automatically',
          ...options,
          metadata: this.sanitizeMetadata(options?.metadata)
        }),
        3,
        1000
      );

      // Finalize invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

      auditEntry = {
        ...auditEntry,
        result: 'success',
        entityId: finalizedInvoice.id,
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime,
          status: finalizedInvoice.status,
          total: finalizedInvoice.total
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      return finalizedInvoice;

    } catch (error) {
      auditEntry = {
        ...auditEntry,
        result: 'failure',
        entityId: 'unknown',
        errorCode: (error as any).code || 'unknown',
        errorMessage: this.sanitizeErrorMessage((error as Error).message),
        metadata: {
          ...auditEntry.metadata,
          processingTime: Date.now() - startTime
        }
      };

      await this.auditLogger(auditEntry as AuditLogEntry);
      throw error;
    }
  }

  /**
   * Performs PCI DSS compliance validation
   */
  performPCIComplianceCheck(options: any): PCIComplianceCheck {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for sensitive data in metadata
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        if (this.containsSensitiveData(key, value as string)) {
          violations.push(`Sensitive data detected in metadata: ${key}`);
        }
      }
    }

    // Check description for sensitive data
    if (options.description && this.containsSensitiveData('description', options.description)) {
      violations.push('Sensitive data detected in description');
    }

    // Validate amount ranges
    if (options.amount > 1000000) { // $10,000
      recommendations.push('Large transaction amount - consider additional verification');
    }

    // Check for required fields
    if (!options.customerId) {
      recommendations.push('Customer ID should be provided for better transaction tracking');
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Checks if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = [
      'authentication_required',
      'invalid_request_error',
      'card_declined',
      'processing_error'
    ];

    return nonRetryableCodes.includes(error.code) || error.status === 400;
  }

  /**
   * Validates payment amount and currency
   */
  private validatePaymentAmount(amount: number, currency: string): void {
    if (amount < 50) { // Minimum 50 cents
      throw new Error('Payment amount must be at least 50 cents');
    }

    if (amount > 99999999) { // Maximum $999,999.99
      throw new Error('Payment amount exceeds maximum limit');
    }

    const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * Validates return URL for security
   */
  private isValidReturnUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Must be HTTPS in production
      if (parsedUrl.protocol !== 'https:') {
        return false;
      }

      // Add your allowed domains here
      const allowedDomains = ['bear-ai.com', 'app.bear-ai.com', 'secure.bear-ai.com'];
      return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));

    } catch {
      return false;
    }
  }

  /**
   * Checks for sensitive data that shouldn't be stored
   */
  private containsSensitiveData(key: string, value: string): boolean {
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email in certain contexts
      /\b(?:password|pwd|secret|token|key)\b/i // Security keywords
    ];

    const sensitiveKeys = ['card', 'ssn', 'password', 'secret', 'token', 'key'];

    return sensitiveKeys.some(k => key.toLowerCase().includes(k)) ||
           sensitivePatterns.some(pattern => pattern.test(value));
  }

  /**
   * Sanitizes metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, string>): Record<string, string> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (!this.containsSensitiveData(key, value)) {
        sanitized[key] = value.substring(0, 500); // Limit length
      }
    }

    return sanitized;
  }

  /**
   * Sanitizes description field
   */
  private sanitizeDescription(description?: string): string | undefined {
    if (!description) return undefined;

    // Remove potential sensitive data and limit length
    return description
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]')
      .substring(0, 350);
  }

  /**
   * Sanitizes error messages for logging
   */
  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED]')
      .replace(/sk_live_[a-zA-Z0-9]+/g, '[REDACTED_API_KEY]')
      .replace(/whsec_[a-zA-Z0-9]+/g, '[REDACTED_WEBHOOK_SECRET]')
      .substring(0, 500);
  }

  /**
   * Sanitizes options for error logging
   */
  private sanitizeOptions(options: any): any {
    const sanitized = { ...options };

    // Remove sensitive fields
    delete sanitized.paymentMethodId;
    delete sanitized.customerId;

    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeMetadata(sanitized.metadata);
    }

    return sanitized;
  }

  /**
   * Default audit logger implementation
   */
  private async defaultAuditLogger(entry: AuditLogEntry): Promise<void> {
    // In production, this should write to a secure audit log system
    // For now, we'll use structured logging
    const sanitizedEntry = {
      ...entry,
      // Never log sensitive data
      metadata: entry.metadata ? this.sanitizeMetadata(entry.metadata) : undefined
    };

    // Logging disabled for production
  }

  /**
   * Default error logger implementation
   */
  private async defaultErrorLogger(error: Error, context: Record<string, any>): Promise<void> {
    // In production, this should integrate with your error tracking system
    const sanitizedContext = this.sanitizeOptions(context);
    const sanitizedError = {
      message: this.sanitizeErrorMessage(error.message),
      stack: error.stack?.split('\n').slice(0, 10).join('\n'), // Limit stack trace
      name: error.name
    };

    // console.error('STRIPE_ERROR:', JSON.stringify({
      error: sanitizedError,
      context: sanitizedContext,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Health check for Stripe service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    details: Record<string, any>;
  }> {
    try {
      // Test API connectivity
      await this.stripe.accounts.retrieve();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          apiKeyValid: true,
          webhookSecretConfigured: !!this.webhookSecret,
          retryConfig: this.config.maxNetworkRetries,
          timeout: this.config.timeout
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          error: this.sanitizeErrorMessage((error as Error).message),
          apiKeyValid: false
        }
      };
    }
  }
}

/**
 * Factory function to create production Stripe instance
 */
export function createProductionStripeService(
  config: StripeConfig,
  auditLogger?: (entry: AuditLogEntry) => Promise<void>,
  errorLogger?: (error: Error, context: Record<string, any>) => Promise<void>
): StripeProduction {
  return new StripeProduction(config, auditLogger, errorLogger);
}

/**
 * Default production configuration
 */
export const DEFAULT_PRODUCTION_CONFIG: Omit<StripeConfig, 'apiKey' | 'webhookSecret'> = {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3,
  timeout: 15000,
  telemetry: false,
  protocol: 'https'
};

// Export types for external use
export type {
  StripeConfig,
  PaymentIntentOptions,
  SubscriptionOptions,
  WebhookEvent,
  AuditLogEntry,
  PCIComplianceCheck,
  TaxCalculationOptions
};