# SSO Setup Guide for BEAR AI

This comprehensive guide covers setting up Single Sign-On (SSO) authentication for BEAR AI with Microsoft Azure AD and Google OAuth 2.0, integrated with Stripe for workspace billing.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Microsoft Azure AD Setup](#microsoft-azure-ad-setup)
4. [Google Cloud Console Setup](#google-cloud-console-setup)
5. [Stripe Configuration](#stripe-configuration)
6. [Environment Configuration](#environment-configuration)
7. [Implementation Guide](#implementation-guide)
8. [Testing SSO Integration](#testing-sso-integration)
9. [Legal Industry Compliance](#legal-industry-compliance)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

## Overview

BEAR AI's SSO system provides enterprise-grade authentication with the following features:

- **Microsoft Azure AD Integration** - Support for Microsoft 365 and Azure AD
- **Google OAuth 2.0** - Support for Google Workspace and personal Gmail
- **Workspace Billing** - Centralized billing per organization domain
- **Legal Industry Compliance** - HIPAA, GDPR, and legal industry standards
- **Session Management** - Secure session handling with automatic token refresh
- **Domain Validation** - Restrict access to specific domains
- **Organization Detection** - Automatic workspace setup for enterprise users

## Prerequisites

### Required Accounts
- Microsoft Azure account with Azure Active Directory access
- Google Cloud Platform account
- Stripe account for payment processing
- Domain ownership verification (for workspace features)

### Development Environment
- Node.js 18+
- React 18+
- TypeScript 4.9+
- Stripe CLI (for webhook testing)

## Microsoft Azure AD Setup

### Step 1: Register Application in Azure Portal

1. **Navigate to Azure Portal**
   - Go to [https://portal.azure.com/](https://portal.azure.com/)
   - Sign in with your Azure account

2. **Create App Registration**
   ```
   Navigate to: Azure Active Directory > App registrations > New registration

   Name: BEAR AI Legal Assistant
   Supported account types: Accounts in any organizational directory (Any Azure AD directory - Multitenant)
   Redirect URI: Web > http://localhost:3000/auth/microsoft/callback
   ```

3. **Configure Authentication**
   ```
   Navigate to: App registrations > BEAR AI Legal Assistant > Authentication

   Platform configurations:
   - Add platform: Web
   - Redirect URIs:
     * http://localhost:3000/auth/microsoft/callback (development)
     * https://yourdomain.com/auth/microsoft/callback (production)
   - Front-channel logout URL: http://localhost:3000/auth/logout

   Advanced settings:
   - Allow public client flows: No
   - Supported account types: Multitenant
   ```

4. **API Permissions**
   ```
   Navigate to: App registrations > BEAR AI Legal Assistant > API permissions

   Add permissions:
   - Microsoft Graph (Delegated permissions):
     * openid
     * profile
     * email
     * User.Read
     * Directory.Read.All (for organization info)
     * Organization.Read.All (for billing)

   Grant admin consent for your organization
   ```

5. **Certificates & Secrets**
   ```
   Navigate to: App registrations > BEAR AI Legal Assistant > Certificates & secrets

   Client secrets:
   - New client secret
   - Description: BEAR AI SSO Secret
   - Expires: 24 months (recommended)
   - Copy the value immediately (you won't see it again)
   ```

6. **Branding (Optional)**
   ```
   Navigate to: App registrations > BEAR AI Legal Assistant > Branding

   Publisher domain: yourdomain.com
   Home page URL: https://yourdomain.com
   Privacy statement URL: https://yourdomain.com/privacy
   Terms of service URL: https://yourdomain.com/terms
   ```

### Step 2: Configure for Multi-Tenant Support

For enterprise customers across different Azure AD tenants:

```json
{
  "authority": "https://login.microsoftonline.com/common",
  "clientId": "your-azure-client-id",
  "knownAuthorities": [
    "login.microsoftonline.com"
  ],
  "cloudInstance": "https://login.microsoftonline.com/"
}
```

### Step 3: Enterprise Application Settings

For large organizations, configure additional settings:

1. **Enterprise Applications**
   ```
   Navigate to: Azure Active Directory > Enterprise applications > BEAR AI Legal Assistant

   Properties:
   - Assignment required: Yes (recommended for security)
   - Visible to users: Yes
   - Notes: BEAR AI Legal Assistant - Document Analysis Platform
   ```

2. **User Assignment**
   ```
   Navigate to: Enterprise applications > BEAR AI Legal Assistant > Users and groups

   Add appropriate users or groups who should have access
   ```

## Google Cloud Console Setup

### Step 1: Create Project and Enable APIs

1. **Create New Project**
   ```
   Navigate to: https://console.cloud.google.com/

   Project name: BEAR AI Legal Assistant
   Organization: Your organization
   ```

2. **Enable Required APIs**
   ```
   Navigate to: APIs & Services > Library

   Enable these APIs:
   - Google+ API (for user profile)
   - Admin SDK API (for organization info)
   - Google Identity Services
   ```

### Step 2: Configure OAuth 2.0

1. **OAuth Consent Screen**
   ```
   Navigate to: APIs & Services > OAuth consent screen

   User Type: External (for multi-organization support)

   App information:
   - App name: BEAR AI Legal Assistant
   - User support email: support@yourdomain.com
   - App logo: Upload BEAR AI logo
   - App domain: yourdomain.com
   - Privacy policy link: https://yourdomain.com/privacy
   - Terms of service link: https://yourdomain.com/terms

   Scopes:
   - Add or remove scopes:
     * ../auth/userinfo.email
     * ../auth/userinfo.profile
     * openid
     * ../auth/admin.directory.user.readonly (for org info)

   Test users (during development):
   - Add your test email addresses
   ```

2. **Create OAuth 2.0 Credentials**
   ```
   Navigate to: APIs & Services > Credentials > Create credentials > OAuth 2.0 Client IDs

   Application type: Web application
   Name: BEAR AI Web Client

   Authorized JavaScript origins:
   - http://localhost:3000 (development)
   - https://yourdomain.com (production)

   Authorized redirect URIs:
   - http://localhost:3000/auth/google/callback (development)
   - https://yourdomain.com/auth/google/callback (production)
   ```

### Step 3: Google Workspace Configuration (Optional)

For Google Workspace organizations:

1. **Domain Verification**
   ```
   Navigate to: Google Admin Console > Security > API controls

   Domain-wide delegation:
   - Add BEAR AI service account
   - OAuth scopes required for organization data
   ```

2. **Workspace Settings**
   ```json
   {
     "hostedDomain": "yourcompany.com",
     "restrictToWorkspace": true,
     "requireWorkspaceEmail": true
   }
   ```

## Stripe Configuration

### Step 1: Create Stripe Account and Products

1. **Stripe Dashboard Setup**
   ```
   Navigate to: https://dashboard.stripe.com/

   Create account or sign in
   Switch to Test mode for development
   ```

2. **Create Products and Prices**
   ```
   Navigate to: Products > Add product

   Product 1: BEAR AI Basic
   - Description: Essential features for small legal teams
   - Pricing: $29/month or $290/year

   Product 2: BEAR AI Pro
   - Description: Advanced features for growing practices
   - Pricing: $79/month or $790/year

   Product 3: BEAR AI Enterprise
   - Description: Full feature set for large organizations
   - Pricing: $199/month or $1990/year
   ```

3. **Configure Webhooks**
   ```
   Navigate to: Webhooks > Add endpoint

   Endpoint URL: https://yourdomain.com/api/stripe/webhook
   Events to send:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
   ```

### Step 2: API Keys and Configuration

```bash
# Test Keys (development)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Live Keys (production)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 3: Customer Portal Configuration

```
Navigate to: Settings > Customer portal

Customize:
- Business information
- Link to privacy policy and terms
- Invoice information
- Feature availability:
  * Invoice history
  * Update payment method
  * Cancel subscription
```

## Environment Configuration

### Development Environment (.env)

```bash
# SSO Configuration
SSO_ENABLED=true
SSO_ENABLED_PROVIDERS=microsoft,google
SSO_SESSION_TIMEOUT=28800000
SSO_AUTO_REFRESH_TOKENS=true

# Microsoft Azure AD
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_tenant_id_or_common
AZURE_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# React App Variables
REACT_APP_AZURE_CLIENT_ID=your_azure_client_id
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_SSO_ENABLED=true
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production Environment

```bash
# Update URLs for production
AZURE_REDIRECT_URI=https://yourdomain.com/auth/microsoft/callback
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
APP_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com

# Use live Stripe keys
STRIPE_ENVIRONMENT=live
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Enhanced security
SSO_REQUIRE_WORKSPACE_EMAIL=true
SSO_ALLOWED_DOMAINS=lawfirm.com,legalcorp.com
JWT_EXPIRATION=1h
SESSION_SECURE=true
```

## Implementation Guide

### Step 1: Install Dependencies

```bash
# Core SSO packages
npm install @azure/msal-browser @azure/msal-react
npm install google-auth-library

# Stripe integration
npm install stripe @stripe/stripe-js

# Type definitions
npm install --save-dev @types/google-auth-library
```

### Step 2: Basic SSO Integration

```typescript
// App.tsx
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { ssoConfig } from './config/ssoConfig';

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: ssoConfig.microsoft.clientId,
    authority: ssoConfig.microsoft.authority,
    redirectUri: ssoConfig.microsoft.redirectUri
  }
});

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      {/* Your app components */}
    </MsalProvider>
  );
}
```

### Step 3: Add SSO Components to Login Page

```tsx
// LoginPage.tsx
import { MicrosoftSignIn } from './components/auth/MicrosoftSignIn';
import { GoogleSignIn } from './components/auth/GoogleSignIn';

export const LoginPage = () => {
  return (
    <div className=\"login-container\">
      <h1>Sign in to BEAR AI</h1>

      <MicrosoftSignIn
        onSuccess={(result) => {
          // Handle successful authentication
          console.log('Microsoft login success:', result);
        }}
        onError={(error) => {
          // Handle authentication error
          console.error('Microsoft login error:', error);
        }}
      />

      <GoogleSignIn
        onSuccess={(result) => {
          // Handle successful authentication
          console.log('Google login success:', result);
        }}
        onError={(error) => {
          // Handle authentication error
          console.error('Google login error:', error);
        }}
      />
    </div>
  );
};
```

### Step 4: Configure Routing

```tsx
// App.tsx or Routes.tsx
import { SSOCallback } from './components/auth/SSOCallback';

<Routes>
  <Route path=\"/auth/microsoft/callback\" element={<SSOCallback />} />
  <Route path=\"/auth/google/callback\" element={<SSOCallback />} />
  <Route path=\"/billing\" element={<WorkspaceBilling domain={userDomain} />} />
</Routes>
```

### Step 5: Server-Side API Implementation

```typescript
// server/auth/microsoft.ts
import { ConfidentialClientApplication } from '@azure/msal-node';

export const exchangeMicrosoftCode = async (code: string) => {
  const clientApp = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      authority: process.env.AZURE_AUTHORITY!
    }
  });

  const tokenRequest = {
    code,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri: process.env.AZURE_REDIRECT_URI!
  };

  try {
    const response = await clientApp.acquireTokenByCode(tokenRequest);
    return response;
  } catch (error) {
    throw new Error('Failed to exchange Microsoft authorization code');
  }
};
```

## Testing SSO Integration

### Step 1: Local Development Testing

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Microsoft SSO**
   - Navigate to `/auth/login`
   - Click \"Sign in with Microsoft\"
   - Complete Microsoft authentication flow
   - Verify redirect to callback handler
   - Check for successful user profile retrieval

3. **Test Google SSO**
   - Click \"Sign in with Google\"
   - Complete Google authentication flow
   - Verify organization detection for Workspace users
   - Test personal Gmail account handling

### Step 2: Workspace Billing Testing

1. **Use Stripe Test Mode**
   ```bash
   # Test card numbers
   4242 4242 4242 4242 # Visa
   4000 0025 0000 3155 # Visa (3D Secure)
   5555 5555 5555 4444 # Mastercard
   ```

2. **Test Subscription Flow**
   - Sign in with workspace email (e.g., test@company.com)
   - Trigger workspace billing setup
   - Complete Stripe Checkout flow
   - Verify subscription creation in Stripe Dashboard

3. **Test Webhook Handling**
   ```bash
   # Install Stripe CLI
   stripe listen --forward-to localhost:1420/api/stripe/webhook

   # Test webhook events
   stripe trigger customer.subscription.created
   ```

### Step 3: End-to-End Testing

```typescript
// tests/sso.test.ts
describe('SSO Integration', () => {
  test('Microsoft SSO flow', async () => {
    // Test Microsoft authentication
    const result = await testMicrosoftAuth();
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });

  test('Google Workspace detection', async () => {
    // Test workspace user detection
    const result = await testGoogleWorkspace();
    expect(result.isWorkspace).toBe(true);
    expect(result.domain).not.toBe('gmail.com');
  });

  test('Stripe billing integration', async () => {
    // Test billing setup
    const billing = await testStripeBilling();
    expect(billing.success).toBe(true);
    expect(billing.subscriptionId).toBeDefined();
  });
});
```

## Legal Industry Compliance

### HIPAA Compliance

1. **Data Encryption**
   ```typescript
   // All SSO tokens encrypted in transit and at rest
   const encryptedToken = encrypt(accessToken, process.env.ENCRYPTION_KEY);
   ```

2. **Audit Logging**
   ```typescript
   // Log all authentication events
   await auditLog.record({
     event: 'sso_login',
     userId: user.id,
     provider: 'microsoft',
     timestamp: new Date(),
     ipAddress: req.ip,
     userAgent: req.headers['user-agent']
   });
   ```

3. **Session Management**
   ```typescript
   // 4-hour session timeout for legal compliance
   const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
   ```

### GDPR Compliance

1. **Data Minimization**
   ```typescript
   // Only collect necessary SSO data
   const userData = {
     id: profile.id,
     email: profile.email,
     name: profile.name,
     // Don't store unnecessary personal data
   };
   ```

2. **Right to Deletion**
   ```typescript
   // Implement user data deletion
   export const deleteUserData = async (userId: string) => {
     await Promise.all([
       deleteUserProfile(userId),
       deleteSSOTokens(userId),
       deleteAuditLogs(userId),
       notifyStripe(userId)
     ]);
   };
   ```

### Legal Industry Standards

1. **Multi-Factor Authentication**
   ```typescript
   // Require MFA for legal industry
   const legalIndustryConfig = {
     requireMFA: true,
     sessionTimeout: 4 * 60 * 60 * 1000, // 4 hours
     maxConcurrentSessions: 2,
     requireDeviceVerification: true
   };
   ```

2. **Data Retention**
   ```typescript
   // 7-year retention for legal documents
   const retentionPolicy = {
     documents: '7 years',
     auditLogs: '10 years',
     billingRecords: '7 years'
   };
   ```

## Troubleshooting

### Common Microsoft SSO Issues

1. **AADSTS50011: The redirect URI is not valid**
   ```
   Solution: Verify redirect URI in Azure App Registration exactly matches
   your application URL including protocol (http/https)
   ```

2. **AADSTS700016: Application not found**
   ```
   Solution: Check Azure Client ID in environment variables
   Ensure app registration is in correct tenant
   ```

3. **AADSTS65001: The user or administrator has not consented**
   ```
   Solution: Grant admin consent for required permissions
   Or modify app to use incremental consent
   ```

### Common Google SSO Issues

1. **Error 400: redirect_uri_mismatch**
   ```
   Solution: Verify redirect URI in Google Cloud Console
   matches exactly (case-sensitive)
   ```

2. **Error 403: access_denied**
   ```
   Solution: Check OAuth consent screen configuration
   Ensure app is verified for external users
   ```

3. **Invalid client: Unauthorized**
   ```
   Solution: Verify Google Client ID and Secret
   Check API is enabled in Google Cloud Console
   ```

### Stripe Integration Issues

1. **Invalid API Key**
   ```
   Solution: Verify Stripe keys are correct for environment
   Test keys for development, live keys for production
   ```

2. **Webhook Signature Verification Failed**
   ```
   Solution: Check webhook endpoint secret
   Ensure raw request body is used for verification
   ```

3. **Customer Creation Failed**
   ```
   Solution: Verify customer email format
   Check for duplicate customers
   ```

### General SSO Issues

1. **CORS Errors**
   ```typescript
   // Configure CORS for development
   const corsOptions = {
     origin: ['http://localhost:3000', 'https://yourdomain.com'],
     credentials: true
   };
   ```

2. **Token Refresh Failed**
   ```typescript
   // Implement proper token refresh logic
   const refreshToken = async () => {
     try {
       const newTokens = await ssoAuthService.refreshTokens();
       return newTokens;
     } catch (error) {
       // Redirect to login if refresh fails
       window.location.href = '/auth/login';
     }
   };
   ```

3. **Session Persistence Issues**
   ```typescript
   // Use secure session storage
   const sessionConfig = {
     secure: process.env.NODE_ENV === 'production',
     httpOnly: true,
     sameSite: 'lax' as const,
     maxAge: 4 * 60 * 60 * 1000 // 4 hours
   };
   ```

## Security Best Practices

### 1. Token Security

```typescript
// Never expose sensitive tokens to client
const clientSafeUser = {
  id: user.id,
  email: user.email,
  name: user.name,
  // Don't send actual tokens to frontend
  hasValidToken: true,
  tokenExpiry: user.tokenExpiry
};
```

### 2. HTTPS Enforcement

```typescript
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect('https://' + req.headers.host + req.url);
}
```

### 3. Rate Limiting

```typescript
// Implement rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts'
});
```

### 4. Input Validation

```typescript
// Validate all SSO inputs
const validateSSOCallback = (req: Request) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    throw new Error('Invalid authorization code');
  }

  if (state && typeof state !== 'string') {
    throw new Error('Invalid state parameter');
  }

  return { code, state };
};
```

### 5. Audit Logging

```typescript
// Comprehensive audit logging
const auditLogger = {
  logAuthEvent: (event: string, user: any, req: Request) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      userId: user?.id,
      email: user?.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    }));
  }
};
```

## Production Deployment Checklist

### Pre-Deployment

- [ ] Update all redirect URIs to production URLs
- [ ] Switch to live Stripe keys
- [ ] Configure production webhook endpoints
- [ ] Enable HTTPS enforcement
- [ ] Set secure session configuration
- [ ] Update CORS origins
- [ ] Configure monitoring and alerting

### Security Configuration

- [ ] Enable rate limiting
- [ ] Configure audit logging
- [ ] Set up error reporting (Sentry)
- [ ] Enable security headers (Helmet.js)
- [ ] Configure CSP headers
- [ ] Set up IP allowlisting (if required)

### Monitoring Setup

- [ ] Configure application monitoring
- [ ] Set up SSO-specific alerts
- [ ] Monitor authentication success rates
- [ ] Track subscription metrics
- [ ] Set up uptime monitoring

This completes the comprehensive SSO setup guide for BEAR AI. The implementation provides enterprise-grade authentication with legal industry compliance and integrated billing management.