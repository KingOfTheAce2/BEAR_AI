/**
 * Stripe Service Type Definitions
 *
 * Comprehensive type definitions for Stripe production service
 * with enhanced security and compliance features.
 */

export interface StripeEnvironmentConfig {
  apiKey: string;
  webhookSecret: string;
  publishableKey: string;
  environment: 'production' | 'test';
  allowedOrigins: string[];
  maxTransactionAmount: number;
  defaultCurrency: string;
  supportedCurrencies: string[];
}

export interface StripeSecurityConfig {
  webhookTolerance: number;
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  ipWhitelist?: string[];
  requiresAuthentication: boolean;
}

export interface AuditLogContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  apiVersion?: string;
  requestId?: string;
  correlationId?: string;
}

export interface PaymentMethodValidation {
  type: 'card' | 'bank_account' | 'ideal' | 'sepa_debit';
  country: string;
  currency: string;
  minimumAmount?: number;
  maximumAmount?: number;
  supportedCards?: string[];
}

export interface ComplianceFlags {
  requiresKYC: boolean;
  requiresAMLCheck: boolean;
  restrictedCountries: string[];
  highRiskThreshold: number;
  velocityLimits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface TaxJurisdiction {
  country: string;
  state?: string;
  taxType: 'vat' | 'gst' | 'sales_tax' | 'other';
  rate: number;
  taxCode?: string;
  registrationNumber?: string;
  isReverseCharge: boolean;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  priceId: string;
  currency: string;
  amount: number;
  interval: 'month' | 'year' | 'week' | 'day';
  features: string[];
  limits: {
    apiCalls?: number;
    storage?: number;
    users?: number;
  };
  trialDays?: number;
}

export interface BillingPortalSettings {
  allowedFeatures: Array<
    'customer_update' |
    'payment_method_update' |
    'invoice_history' |
    'subscription_pause' |
    'subscription_cancel' |
    'subscription_update'
  >;
  returnUrl: string;
  customMessage?: string;
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
}

export interface InvoiceTemplate {
  logoUrl?: string;
  companyName: string;
  companyAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  taxId?: string;
  footerText?: string;
  customFields?: Array<{
    name: string;
    value: string;
  }>;
}

export interface WebhookEndpoint {
  url: string;
  enabledEvents: string[];
  description?: string;
  metadata?: Record<string, string>;
  apiVersion?: string;
}

export interface PaymentIntentMetrics {
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  averageProcessingTime: number;
  topFailureReasons: Array<{
    reason: string;
    count: number;
  }>;
  currencyBreakdown: Record<string, number>;
}

export interface SubscriptionMetrics {
  activeSubscriptions: number;
  totalRevenue: number;
  churnRate: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  tierBreakdown: Record<string, number>;
  averageLifetimeValue: number;
}

export interface DisputeInfo {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  evidence?: {
    accessActivityLog?: string;
    billingAddress?: string;
    cancellationPolicy?: string;
    cancellationPolicyDisclosure?: string;
    cancellationRebuttal?: string;
    customerCommunication?: string;
    customerEmailAddress?: string;
    customerName?: string;
    customerPurchaseIp?: string;
    customerSignature?: string;
    duplicateChargeDocumentation?: string;
    duplicateChargeExplanation?: string;
    duplicateChargeId?: string;
    productDescription?: string;
    receipt?: string;
    refundPolicy?: string;
    refundPolicyDisclosure?: string;
    refundRefusalExplanation?: string;
    serviceDate?: string;
    serviceDocumentation?: string;
    shippingAddress?: string;
    shippingCarrier?: string;
    shippingDate?: string;
    shippingDocumentation?: string;
    shippingTrackingNumber?: string;
    uncategorizedFile?: string;
    uncategorizedText?: string;
  };
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
  refundApplicationFee?: boolean;
  reverseTransfer?: boolean;
}

export interface ChargebackAlert {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  reason: string;
  created: number;
  riskScore?: number;
  evidence?: {
    hasEvidence: boolean;
    evidenceDetails?: Record<string, string>;
    pastDue: boolean;
    submissionCount: number;
  };
}

export interface FraudDetection {
  riskLevel: 'low' | 'medium' | 'high' | 'highest';
  riskScore: number;
  checks: {
    cvcCheck: 'pass' | 'fail' | 'unavailable' | 'unchecked';
    addressLineCheck: 'pass' | 'fail' | 'unavailable' | 'unchecked';
    addressPostalCodeCheck: 'pass' | 'fail' | 'unavailable' | 'unchecked';
  };
  outcome: {
    networkStatus: string;
    reason?: string;
    riskLevel: string;
    riskScore: number;
    type: string;
  };
  recommendations: string[];
}

export interface StripeEventHandler {
  eventType: string;
  handler: (event: any, context: AuditLogContext) => Promise<void>;
  retryAttempts?: number;
  backoffMs?: number;
}

export interface ConnectedAccountInfo {
  accountId: string;
  type: 'standard' | 'express' | 'custom';
  country: string;
  defaultCurrency: string;
  capabilities: Record<string, string>;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

export interface PlatformFeeConfig {
  applicationFeePercent?: number;
  applicationFeeAmount?: number;
  destinationAccount: string;
  onBehalfOf?: string;
  transferGroup?: string;
  metadata?: Record<string, string>;
}

export interface MarketplaceConfig {
  enabledFeatures: Array<
    'payments' | 'payouts' | 'card_payments' | 'transfers' | 'legacy_payments'
  >;
  defaultCountry: string;
  supportedCountries: string[];
  onboardingFlowConfig: {
    collectBusinessType: boolean;
    collectCompanyInfo: boolean;
    collectIndividualInfo: boolean;
    collectBankAccount: boolean;
    collectSSN: boolean;
  };
}

export interface StripeError {
  type: 'api_error' | 'card_error' | 'idempotency_error' | 'invalid_request_error' | 'rate_limit_error' | 'authentication_error' | 'api_connection_error';
  code?: string;
  message: string;
  param?: string;
  statusCode?: number;
  requestId?: string;
  charge?: string;
  paymentIntent?: string;
  paymentMethod?: string;
  setup_intent?: string;
  source?: string;
}

export interface APIUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    averageTime: number;
  }>;
  errorBreakdown: Record<string, number>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  details: {
    apiConnectivity: boolean;
    webhookEndpoint: boolean;
    databaseConnection: boolean;
    auditLogSystem: boolean;
    responseTime: number;
    errorRate: number;
  };
  dependencies: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
  }>;
}

// Event types for webhook handling
export type StripeWebhookEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'payment_intent.requires_action'
  | 'payment_method.attached'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.created'
  | 'invoice.finalized'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.upcoming'
  | 'charge.dispute.created'
  | 'charge.dispute.funds_withdrawn'
  | 'charge.dispute.funds_reinstated'
  | 'setup_intent.succeeded'
  | 'setup_intent.setup_failed'
  | 'account.updated'
  | 'capability.updated'
  | 'person.created'
  | 'person.updated'
  | 'payout.paid'
  | 'payout.failed'
  | 'transfer.created'
  | 'transfer.reversed'
  | 'radar.early_fraud_warning.created';

// Configuration validation schema
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
  recommendations: string[];
}

export interface StripeServiceConfig {
  environment: StripeEnvironmentConfig;
  security: StripeSecurityConfig;
  compliance: ComplianceFlags;
  billing: BillingPortalSettings;
  invoicing: InvoiceTemplate;
  webhooks: WebhookEndpoint[];
  marketplace?: MarketplaceConfig;
}