/**
 * Stripe Service Module Entry Point
 *
 * Main export file for the BEAR AI Stripe production service
 * with comprehensive payment processing, security, and compliance features.
 */

// Core service exports
export { StripeProduction, createProductionStripeService, DEFAULT_PRODUCTION_CONFIG } from './StripeProduction';

// Configuration exports
export {
  StripeConfigManager,
  getStripeConfigManager,
  createProductionStripeConfig,
  validateEnvironmentVariables
} from './config';

// Middleware exports
export {
  StripeRateLimiter,
  createWebhookValidationMiddleware,
  sanitizeStripeRequest,
  createRequestLoggingMiddleware,
  stripeErrorHandler,
  createIPWhitelistMiddleware,
  createStripeCORSMiddleware,
  validatePaymentIntentRequest
} from './middleware';

// Type exports
export type {
  StripeConfig,
  PaymentIntentOptions,
  SubscriptionOptions,
  WebhookEvent,
  AuditLogEntry,
  PCIComplianceCheck,
  TaxCalculationOptions,
  StripeEnvironmentConfig,
  StripeSecurityConfig,
  ComplianceFlags,
  SubscriptionTier,
  BillingPortalSettings,
  InvoiceTemplate,
  WebhookEndpoint,
  PaymentIntentMetrics,
  SubscriptionMetrics,
  DisputeInfo,
  RefundRequest,
  ChargebackAlert,
  FraudDetection,
  StripeEventHandler,
  ConnectedAccountInfo,
  PlatformFeeConfig,
  MarketplaceConfig,
  StripeError,
  APIUsageMetrics,
  HealthCheckResult,
  StripeWebhookEventType,
  ConfigValidationResult,
  StripeServiceConfig,
  AuditLogContext,
  PaymentMethodValidation,
  TaxJurisdiction
} from './types';

// Re-export Stripe types for convenience
export type { Stripe } from 'stripe';

/**
 * Quick setup function for production Stripe service
 */
export async function setupStripeProduction() {
  const configManager = getStripeConfigManager();
  const config = configManager.getStripeConfig();

  // Validate environment
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    throw new Error(
      `Environment validation failed:\n` +
      `Missing: ${envValidation.missingVars.join(', ')}\n` +
      `Invalid: ${envValidation.invalidVars.join(', ')}`
    );
  }

  // Create production service
  const stripeService = createProductionStripeService(config);

  // Perform health check
  const healthCheck = await stripeService.healthCheck();
  if (healthCheck.status !== 'healthy') {
    throw new Error(`Stripe service health check failed: ${JSON.stringify(healthCheck.details)}`);
  }

  return {
    service: stripeService,
    config: configManager.getConfig(),
    featureFlags: configManager.getFeatureFlags()
  };
}

/**
 * Express.js integration helper
 */
export function createStripeExpressRoutes() {
  const configManager = getStripeConfigManager();
  const config = configManager.getConfig();

  return {
    rateLimiter: new StripeRateLimiter(
      config.security.rateLimitWindow,
      config.security.rateLimitMax
    ),
    corsMiddleware: createStripeCORSMiddleware(config.environment.allowedOrigins),
    ipWhitelist: config.security.ipWhitelist
      ? createIPWhitelistMiddleware(config.security.ipWhitelist)
      : null,
    webhookValidation: (stripeService: StripeProduction) =>
      createWebhookValidationMiddleware(stripeService, config.security.webhookTolerance),
    sanitizer: sanitizeStripeRequest(),
    errorHandler: stripeErrorHandler(),
    paymentValidation: validatePaymentIntentRequest()
  };
}

/**
 * Webhook event handlers factory
 */
export function createWebhookHandlers(
  stripeService: StripeProduction,
  customHandlers?: Record<string, (event: WebhookEvent) => Promise<void>>
): Record<string, (event: WebhookEvent) => Promise<void>> {
  const defaultHandlers = {
    'payment_intent.succeeded': async (event: WebhookEvent) => {
      console.log('Payment succeeded:', event.data.object.id);
      // Add your success handling logic here
    },

    'payment_intent.payment_failed': async (event: WebhookEvent) => {
      console.log('Payment failed:', event.data.object.id);
      // Add your failure handling logic here
    },

    'customer.subscription.created': async (event: WebhookEvent) => {
      console.log('Subscription created:', event.data.object.id);
      // Add subscription creation logic here
    },

    'customer.subscription.updated': async (event: WebhookEvent) => {
      console.log('Subscription updated:', event.data.object.id);
      // Add subscription update logic here
    },

    'customer.subscription.deleted': async (event: WebhookEvent) => {
      console.log('Subscription cancelled:', event.data.object.id);
      // Add subscription cancellation logic here
    },

    'invoice.paid': async (event: WebhookEvent) => {
      console.log('Invoice paid:', event.data.object.id);
      // Add invoice payment logic here
    },

    'invoice.payment_failed': async (event: WebhookEvent) => {
      console.log('Invoice payment failed:', event.data.object.id);
      // Add invoice failure logic here
    },

    'charge.dispute.created': async (event: WebhookEvent) => {
      console.log('Dispute created:', event.data.object.id);
      // Add dispute handling logic here
    }
  };

  return { ...defaultHandlers, ...customHandlers };
}

/**
 * Production deployment checklist validator
 */
export async function validateProductionDeployment(): Promise<{
  isReady: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
}> {
  const checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }> = [];

  try {
    // Environment validation
    const envValidation = validateEnvironmentVariables();
    checks.push({
      name: 'Environment Variables',
      status: envValidation.isValid ? 'pass' : 'fail',
      message: envValidation.isValid
        ? 'All required environment variables are set'
        : `Missing/invalid: ${[...envValidation.missingVars, ...envValidation.invalidVars].join(', ')}`
    });

    // Configuration validation
    const configManager = getStripeConfigManager();
    const config = configManager.getConfig();

    checks.push({
      name: 'API Keys',
      status: config.environment.apiKey.startsWith('sk_live_') ? 'pass' : 'fail',
      message: config.environment.apiKey.startsWith('sk_live_')
        ? 'Live API key configured'
        : 'Test API key detected in production'
    });

    // Webhook configuration
    checks.push({
      name: 'Webhook Configuration',
      status: config.webhooks[0].url.startsWith('https://') ? 'pass' : 'fail',
      message: config.webhooks[0].url.startsWith('https://')
        ? 'Webhook URL uses HTTPS'
        : 'Webhook URL must use HTTPS'
    });

    // Security settings
    const hasIPWhitelist = config.security.ipWhitelist && config.security.ipWhitelist.length > 0;
    checks.push({
      name: 'IP Whitelisting',
      status: hasIPWhitelist ? 'pass' : 'warning',
      message: hasIPWhitelist
        ? 'IP whitelisting configured'
        : 'Consider configuring IP whitelisting for sensitive operations'
    });

    // Service health check
    try {
      const stripeService = createProductionStripeService(configManager.getStripeConfig());
      const health = await stripeService.healthCheck();

      checks.push({
        name: 'Stripe Service Health',
        status: health.status === 'healthy' ? 'pass' : 'fail',
        message: health.status === 'healthy'
          ? 'Stripe service is healthy'
          : `Health check failed: ${JSON.stringify(health.details)}`
      });
    } catch (error) {
      checks.push({
        name: 'Stripe Service Health',
        status: 'fail',
        message: `Service initialization failed: ${(error as Error).message}`
      });
    }

    // Compliance checks
    const isKYCEnabled = config.compliance.requiresKYC;
    checks.push({
      name: 'KYC Compliance',
      status: isKYCEnabled ? 'pass' : 'warning',
      message: isKYCEnabled
        ? 'KYC compliance enabled'
        : 'Consider enabling KYC for production compliance'
    });

    // Transaction limits
    const maxAmount = config.environment.maxTransactionAmount;
    checks.push({
      name: 'Transaction Limits',
      status: maxAmount <= 10000000 ? 'pass' : 'warning', // $100k
      message: maxAmount <= 10000000
        ? 'Reasonable transaction limits configured'
        : 'High transaction limits may require additional compliance measures'
    });

  } catch (error) {
    checks.push({
      name: 'Configuration Loading',
      status: 'fail',
      message: `Configuration error: ${(error as Error).message}`
    });
  }

  const hasFailures = checks.some(check => check.status === 'fail');

  return {
    isReady: !hasFailures,
    checks
  };
}

/**
 * Example usage documentation
 */
export const USAGE_EXAMPLES = {
  basicSetup: `
// Basic production setup
import { setupStripeProduction } from './services/stripe';

const { service, config, featureFlags } = await setupStripeProduction();

// Create a payment intent
const paymentIntent = await service.createPaymentIntent({
  amount: 2000, // $20.00
  currency: 'usd',
  customerId: 'cus_customer123',
  metadata: {
    orderId: 'order_123',
    userId: 'user_456'
  }
});
`,

  expressIntegration: `
// Express.js integration
import express from 'express';
import { createStripeExpressRoutes, setupStripeProduction } from './services/stripe';

const app = express();
const { service } = await setupStripeProduction();
const middleware = createStripeExpressRoutes();

// Apply middleware
app.use('/api/stripe', middleware.rateLimiter.middleware());
app.use('/api/stripe', middleware.corsMiddleware);
app.use('/api/stripe', middleware.sanitizer);

// Webhook endpoint
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  middleware.webhookValidation(service),
  async (req, res) => {
    const event = req.stripeEvent;
    // Handle webhook event
    res.json({ received: true });
  }
);
`,

  subscriptionManagement: `
// Subscription lifecycle management
const subscription = await service.createSubscription({
  customerId: 'cus_customer123',
  priceId: 'price_premium_monthly',
  automaticTax: { enabled: true },
  metadata: {
    planType: 'premium',
    source: 'website'
  }
});

// Update subscription
const updated = await service.updateSubscription(subscription.id, {
  items: [{ price: 'price_premium_yearly' }],
  proration_behavior: 'create_prorations'
});

// Cancel subscription
const cancelled = await service.cancelSubscription(subscription.id, {
  immediately: false,
  reason: 'user_requested'
});
`
};