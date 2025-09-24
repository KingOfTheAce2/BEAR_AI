# Mollie Payment Integration for BEAR AI

This directory contains a complete Mollie payment integration that serves as an EU-based, GDPR-compliant alternative to Stripe. Mollie is perfect for European customers and supports all major European payment methods.

## Features

- ✅ **Complete Payment Management**: One-time payments, subscriptions, refunds, chargebacks
- ✅ **European Payment Methods**: SEPA Direct Debit, iDEAL, Bancontact, EPS, Giropay, SOFORT
- ✅ **GDPR Compliant**: EU-based payment processor with full GDPR compliance
- ✅ **Webhook Security**: Secure webhook signature verification using HMAC-SHA256
- ✅ **Environment Support**: Test and production environment switching
- ✅ **Error Handling**: Comprehensive error handling with retry logic
- ✅ **TypeScript Support**: Full TypeScript interfaces and type safety

## Architecture

### Backend (Rust)
- `src-tauri/src/mollie_integration.rs` - Complete Mollie API client implementation
- Full REST API v2 support with all payment operations
- Secure credential management and webhook verification
- Comprehensive error handling and logging

### Frontend (TypeScript)
- `src/services/payments/MollieService.ts` - Main service class
- `src/services/payments/types.ts` - Complete TypeScript type definitions
- `src/services/payments/index.ts` - Main export with utilities and constants

## Quick Start

### 1. Initialize the Service

```typescript
import { createMollieService, DEFAULT_MOLLIE_CONFIG } from '@/services/payments';

// Create service with test configuration
const mollieService = createMollieService(DEFAULT_MOLLIE_CONFIG.test);

// Initialize with API credentials
await mollieService.initialize(
    'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM', // Test API key
    'your_webhook_secret'
);
```

### 2. Create a Customer

```typescript
const customer = await mollieService.createCustomer({
    name: 'John Doe',
    email: 'john@example.com',
    locale: 'en_US'
});
```

### 3. Create a Payment

```typescript
// iDEAL payment (Netherlands)
const idealPayment = await mollieService.createIdealPayment(
    { currency: 'EUR', value: '10.00' },
    'Legal consultation fee'
);

// SEPA Direct Debit payment
const sepaPayment = await mollieService.createSepaDirectDebitPayment(
    customer.id,
    { currency: 'EUR', value: '50.00' },
    'Monthly subscription',
    {
        consumerName: 'John Doe',
        consumerAccount: 'NL53INGB0654422370',
        consumerBic: 'INGBNL2A'
    }
);

// Bancontact payment (Belgium)
const bancontactPayment = await mollieService.createBancontactPayment(
    { currency: 'EUR', value: '25.00' },
    'Document analysis fee'
);
```

### 4. Create a Subscription

```typescript
const subscription = await mollieService.createRecurringSubscription(
    customer.id,
    { currency: 'EUR', value: '49.99' },
    '1 month',
    'BEAR AI Pro Subscription'
);
```

### 5. Handle Webhooks

```typescript
// In your webhook endpoint
await mollieService.handleWebhook(
    request.body, // Raw webhook payload
    request.headers['mollie-signature'] // Webhook signature
);
```

## Supported Payment Methods

### Core European Methods
- **iDEAL** (Netherlands) - Most popular online payment method in NL
- **Bancontact** (Belgium) - Belgium's most popular payment method
- **SEPA Direct Debit** - Direct bank account debiting across EU
- **SOFORT** (Germany, Austria) - Real-time bank transfers
- **EPS** (Austria) - Austrian online banking payments
- **Giropay** (Germany) - German online banking payments

### International Methods
- **Credit Card** (Visa, Mastercard, American Express)
- **PayPal** - Global digital wallet
- **Apple Pay** - Mobile payments
- **Bank Transfer** - Traditional bank transfers

### Regional Methods
- **Przelewy24** (Poland) - Polish online payments
- **MyBank** (Italy) - Italian online banking
- **KBC/CBC** (Belgium) - Belgian banking payments
- **Belfius** (Belgium) - Belgian banking payments

## Configuration Examples

### Test Environment Configuration

```typescript
const testConfig = {
    environment: 'test',
    locale: 'en_US',
    defaultCurrency: 'EUR',
    enabledMethods: ['ideal', 'bancontact', 'directdebit', 'creditcard'],
    redirectUrl: 'http://localhost:3000/payment/return',
    webhookUrl: 'http://localhost:3000/webhooks/mollie'
};
```

### Production Environment Configuration

```typescript
const productionConfig = {
    environment: 'live',
    locale: 'en_US',
    defaultCurrency: 'EUR',
    enabledMethods: ['ideal', 'bancontact', 'directdebit', 'creditcard'],
    redirectUrl: 'https://yourdomain.com/payment/return',
    webhookUrl: 'https://yourdomain.com/webhooks/mollie'
};
```

### Country-Specific Configuration

```typescript
// Netherlands configuration
const nlConfig = {
    ...testConfig,
    locale: 'nl_NL',
    enabledMethods: ['ideal', 'directdebit', 'creditcard']
};

// Belgium configuration
const beConfig = {
    ...testConfig,
    locale: 'nl_BE',
    enabledMethods: ['bancontact', 'belfius', 'kbc', 'directdebit']
};

// Germany configuration
const deConfig = {
    ...testConfig,
    locale: 'de_DE',
    enabledMethods: ['sofort', 'giropay', 'directdebit', 'creditcard']
};
```

## Error Handling

The service includes comprehensive error handling with automatic retries:

```typescript
try {
    const payment = await mollieService.createPayment(paymentRequest);
} catch (error) {
    if (error instanceof MollieError) {
        console.error('Mollie error:', error.code, error.message);
        // Handle specific error types
        switch (error.code) {
            case 'INSUFFICIENT_FUNDS':
                // Handle insufficient funds
                break;
            case 'INVALID_PAYMENT_METHOD':
                // Handle invalid payment method
                break;
            default:
                // Handle general error
        }
    }
}
```

## Webhook Security

Webhooks are secured using HMAC-SHA256 signature verification:

```typescript
// Express.js webhook endpoint example
app.post('/webhooks/mollie', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['mollie-signature'];
        await mollieService.handleWebhook(req.body.toString(), signature);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook verification failed:', error);
        res.status(400).send('Bad Request');
    }
});
```

## GDPR Compliance

Mollie is EU-based and fully GDPR compliant:

- **Data Processing**: All payment data is processed within the EU
- **Data Protection**: Full compliance with GDPR requirements
- **Customer Rights**: Support for data access, portability, and deletion requests
- **Privacy by Design**: Built-in privacy protection mechanisms

## Utilities

The service includes helpful utility functions:

```typescript
import { MollieUtils } from '@/services/payments';

// Format amount
const amount = MollieUtils.formatAmount(2500, 'EUR'); // { currency: 'EUR', value: '25.00' }

// Parse amount
const cents = MollieUtils.parseAmount({ currency: 'EUR', value: '25.00' }); // 2500

// Check payment status
const isSuccess = MollieUtils.isPaymentSuccessful(payment);
const isPending = MollieUtils.isPaymentPending(payment);
const isFailed = MollieUtils.isPaymentFailed(payment);

// Validate European banking details
const validIBAN = MollieUtils.validateIBAN('NL53INGB0654422370');
const validBIC = MollieUtils.validateBIC('INGBNL2A');

// Get payment method recommendations by country
const methods = MollieUtils.getRecommendedPaymentMethodsByCountry('NL');
// Returns: ['ideal', 'directdebit', 'creditcard']
```

## Testing

Use Mollie's test API keys and test payment methods:

- **Test API Key**: `test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM`
- **Test Credit Card**: 4242 4242 4242 4242
- **Test iDEAL**: Select any test bank in the iDEAL flow
- **Test SEPA**: Use test IBAN: NL53INGB0654422370

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Use webhook signature verification** for all webhook endpoints
3. **Validate all input data** before sending to Mollie API
4. **Use HTTPS** for all webhook and redirect URLs
5. **Store credentials securely** using environment variables or secure vaults
6. **Implement proper error handling** to prevent information leakage
7. **Log all payment operations** for audit trails

## Integration with BEAR AI

This Mollie integration is specifically designed for BEAR AI's legal document analysis platform:

- **Subscription Management**: Perfect for recurring legal service subscriptions
- **One-time Payments**: Document analysis fees, consultation charges
- **European Focus**: Ideal for European legal compliance and GDPR requirements
- **Multi-currency Support**: Support for all major European currencies
- **Professional Services**: Tailored for B2B legal service transactions

## Support and Documentation

- **Mollie API Documentation**: https://docs.mollie.com/
- **Mollie Dashboard**: https://my.mollie.com/
- **Payment Methods Guide**: https://docs.mollie.com/payments/payment-methods
- **Webhook Documentation**: https://docs.mollie.com/webhooks/overview

## Migration from Stripe

If migrating from Stripe, this Mollie integration provides:

- **Similar API structure** for easy migration
- **Better European payment method support**
- **GDPR compliance by default**
- **Lower fees for European transactions**
- **Local EU support and compliance**

The service methods mirror Stripe's API patterns while providing Mollie-specific features and European payment method support.