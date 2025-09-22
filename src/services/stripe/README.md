# Stripe Production Service

A comprehensive, production-ready Stripe integration for BEAR AI with enterprise security, compliance, and audit features.

## Features

### 🔒 Security & Compliance
- **PCI DSS Compliance**: Built-in validation helpers and secure data handling
- **Webhook Signature Verification**: Cryptographic verification with timing-safe comparison
- **IP Whitelisting**: Configurable IP restrictions for sensitive operations
- **Rate Limiting**: Advanced rate limiting with exponential backoff
- **Data Sanitization**: Automatic removal of sensitive data from logs and metadata

### 💳 Payment Processing
- **Production-Ready API Integration**: Live Stripe API with proper error handling
- **Multi-Currency Support**: Handle payments in multiple currencies with validation
- **Retry Logic**: Exponential backoff for network resilience
- **Transaction Validation**: Amount, currency, and customer validation
- **Fraud Detection**: Risk assessment and compliance checks

### 📊 Subscription Management
- **Full Lifecycle Support**: Create, update, pause, and cancel subscriptions
- **Proration Handling**: Automatic proration for subscription changes
- **Trial Management**: Flexible trial period configuration
- **Automatic Tax**: Stripe Tax integration for multi-jurisdiction compliance
- **Billing Portal**: Self-service customer billing management

### 🧾 Invoicing & Receipts
- **Professional Invoices**: Customizable invoice templates with company branding
- **Automatic Generation**: PDF receipt generation and email delivery
- **Tax Calculation**: Multi-jurisdiction tax calculation with Stripe Tax
- **Custom Fields**: Configurable invoice fields and metadata

### 📝 Audit & Logging
- **Comprehensive Audit Trail**: Every transaction logged with sanitized data
- **Performance Monitoring**: Response time and error rate tracking
- **Compliance Reporting**: Built-in reports for regulatory requirements
- **Error Analytics**: Detailed error tracking and categorization

## Quick Start

### 1. Environment Setup

Create a `.env` file with required configuration:

```bash
# Required - Stripe API Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_URL=https://yourdomain.com/api/stripe/webhook

# Optional - Security Configuration
STRIPE_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
STRIPE_MAX_TRANSACTION_AMOUNT=1000000
STRIPE_IP_WHITELIST=203.0.113.0/24,198.51.100.0/24
STRIPE_RATE_LIMIT_MAX=100
STRIPE_REQUIRES_KYC=true

# Optional - Company Information
STRIPE_COMPANY_NAME=Your Company Name
STRIPE_COMPANY_ADDRESS_LINE1=123 Business St
STRIPE_COMPANY_CITY=Business City
STRIPE_COMPANY_STATE=CA
STRIPE_COMPANY_POSTAL_CODE=90210
STRIPE_COMPANY_COUNTRY=US
STRIPE_COMPANY_TAX_ID=12-3456789
```

### 2. Basic Usage

```typescript
import { setupStripeProduction } from './services/stripe';

// Initialize the service
const { service, config, featureFlags } = await setupStripeProduction();

// Create a payment intent
const paymentIntent = await service.createPaymentIntent({
  amount: 2000, // $20.00
  currency: 'usd',
  customerId: 'cus_customer123',
  automaticTax: { enabled: true },
  metadata: {
    orderId: 'order_123',
    userId: 'user_456'
  }
});

console.log('Payment Intent:', paymentIntent.id);
```

### 3. Express.js Integration

```typescript
import express from 'express';
import {
  setupStripeProduction,
  createStripeExpressRoutes,
  createWebhookHandlers
} from './services/stripe';

const app = express();

// Initialize Stripe service
const { service } = await setupStripeProduction();
const middleware = createStripeExpressRoutes();
const webhookHandlers = createWebhookHandlers(service);

// Apply middleware
app.use('/api/stripe', middleware.rateLimiter.middleware());
app.use('/api/stripe', middleware.corsMiddleware);
app.use('/api/stripe', middleware.sanitizer);

// Payment endpoint
app.post('/api/stripe/payment-intent',
  middleware.paymentValidation,
  async (req, res) => {
    try {
      const paymentIntent = await service.createPaymentIntent(req.body);
      res.json({ paymentIntent });
    } catch (error) {
      next(error);
    }
  }
);

// Webhook endpoint
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  middleware.webhookValidation(service),
  async (req, res) => {
    const event = req.stripeEvent;
    const handler = webhookHandlers[event.type];

    if (handler) {
      await handler(event);
    }

    res.json({ received: true });
  }
);

// Error handling
app.use(middleware.errorHandler);
```

## Advanced Features

### Subscription Management

```typescript
// Create subscription with automatic tax
const subscription = await service.createSubscription({
  customerId: 'cus_customer123',
  priceId: 'price_premium_monthly',
  automaticTax: { enabled: true },
  trialEnd: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60), // 14 days
  metadata: {
    planType: 'premium',
    source: 'website',
    promocode: 'WELCOME20'
  }
});

// Update subscription with proration
const updated = await service.updateSubscription(subscription.id, {
  items: [{ price: 'price_premium_yearly' }],
  proration_behavior: 'create_prorations',
  metadata: {
    upgradeDate: new Date().toISOString(),
    previousPlan: 'monthly'
  }
});

// Cancel subscription
const cancelled = await service.cancelSubscription(subscription.id, {
  immediately: false,
  reason: 'user_requested'
});
```

### Multi-Jurisdiction Tax Handling

```typescript
// Calculate taxes for international transaction
const taxCalculation = await service.calculateTax({
  currency: 'eur',
  lineItems: [
    {
      amount: 10000, // €100.00
      reference: 'premium_subscription',
      taxBehavior: 'exclusive',
      taxCode: 'txcd_10000000' // Software as a Service
    }
  ],
  customerDetails: {
    address: {
      line1: 'Friedrichstraße 123',
      city: 'Berlin',
      postal_code: '10117',
      country: 'DE'
    },
    taxIds: [{
      type: 'eu_vat',
      value: 'DE123456789'
    }]
  }
});

console.log('Tax Amount:', taxCalculation.tax_amount_exclusive);
```

### Customer Billing Portal

```typescript
// Create billing portal session
const portalSession = await service.createBillingPortalSession(
  'cus_customer123',
  'https://app.yourdomain.com/billing/return'
);

// Redirect customer to billing portal
res.redirect(portalSession.url);
```

### Invoice Generation

```typescript
// Create and finalize invoice
const invoice = await service.createInvoice('cus_customer123', {
  description: 'Premium subscription - Monthly',
  metadata: {
    subscriptionId: 'sub_123',
    billingPeriod: '2024-01-01 to 2024-01-31'
  },
  custom_fields: [
    {
      name: 'Purchase Order',
      value: 'PO-123456'
    }
  ]
});

console.log('Invoice URL:', invoice.hosted_invoice_url);
```

## Security Best Practices

### 1. Environment Configuration
- Always use live API keys (`sk_live_*`) in production
- Store secrets in environment variables, never in code
- Use HTTPS for all webhook endpoints
- Implement IP whitelisting for sensitive operations

### 2. Data Protection
- Sensitive data is automatically sanitized from logs
- Payment card data is never stored or logged
- All API responses exclude sensitive information
- Audit logs track operations without exposing PII

### 3. Error Handling
- Errors are logged with sanitized messages
- Stack traces are limited in production
- Rate limiting prevents abuse
- Retry logic handles temporary failures

### 4. Compliance
- PCI DSS compliance validation built-in
- GDPR-compliant data handling
- SOX audit trail requirements met
- Multi-jurisdiction tax compliance

## Monitoring & Health Checks

### Health Check Endpoint

```typescript
app.get('/api/stripe/health', async (req, res) => {
  const health = await service.healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### Production Deployment Validation

```typescript
import { validateProductionDeployment } from './services/stripe';

const validation = await validateProductionDeployment();

if (!validation.isReady) {
  console.error('Production deployment not ready:');
  validation.checks
    .filter(check => check.status === 'fail')
    .forEach(check => console.error(`❌ ${check.name}: ${check.message}`));
  process.exit(1);
}

console.log('✅ Production deployment validated');
```

## Error Handling

The service includes comprehensive error handling with proper categorization:

```typescript
try {
  const paymentIntent = await service.createPaymentIntent(options);
} catch (error) {
  if (error.type === 'card_error') {
    // Handle declined cards
    console.log('Card declined:', error.code);
  } else if (error.type === 'rate_limit_error') {
    // Handle rate limiting
    console.log('Rate limited, retrying...');
  } else {
    // Handle other errors
    console.error('Payment error:', error.message);
  }
}
```

## Configuration Reference

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook endpoint secret | `whsec_...` |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_URL` | Yes | Webhook endpoint URL | `https://api.example.com/stripe/webhook` |
| `STRIPE_ALLOWED_ORIGINS` | No | CORS allowed origins | `https://app.example.com,https://example.com` |
| `STRIPE_MAX_TRANSACTION_AMOUNT` | No | Maximum transaction amount in cents | `1000000` |
| `STRIPE_IP_WHITELIST` | No | Allowed IP addresses/CIDR blocks | `203.0.113.0/24,198.51.100.1` |
| `STRIPE_RATE_LIMIT_MAX` | No | Maximum requests per window | `100` |
| `STRIPE_REQUIRES_KYC` | No | Enable KYC compliance | `true` |
| `STRIPE_COMPANY_NAME` | No | Company name for invoices | `BEAR AI` |

### Feature Flags

Feature flags are automatically configured based on environment and settings:

- `enableAdvancedFraudDetection`: Enabled in production
- `enableAutomaticTax`: Enabled for multi-currency setups
- `enableKYC`: Based on compliance configuration
- `enableVelocityLimits`: Enabled in production
- `enableDetailedLogging`: Enabled in production

## Support & Documentation

- **Stripe API Documentation**: https://stripe.com/docs/api
- **BEAR AI Documentation**: Internal documentation portal
- **Security Guidelines**: Follow PCI DSS compliance requirements
- **Issue Tracking**: Use GitHub issues for bug reports and feature requests

## License

Proprietary - BEAR AI Team. All rights reserved.