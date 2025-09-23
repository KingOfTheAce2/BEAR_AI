/**
 * SSO Configuration for BEAR AI
 * Supports Microsoft Azure AD and Google OAuth 2.0
 * Enterprise-grade configuration with legal industry compliance
 */

export interface MicrosoftSSOConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: string[];
  tenantId?: string;
  cloudInstance?: string;
}

export interface GoogleSSOConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  hostedDomain?: string;
  loginHint?: string;
}

export interface SSOConfig {
  microsoft: MicrosoftSSOConfig;
  google: GoogleSSOConfig;
  enabledProviders: ('microsoft' | 'google')[];
  sessionTimeout: number;
  autoRefreshTokens: boolean;
  requireWorkspaceEmail: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
}

// Microsoft Azure AD Configuration
const getMicrosoftConfig = (): MicrosoftSSOConfig => ({
  clientId: process.env.AZURE_CLIENT_ID || '',
  authority: process.env.AZURE_AUTHORITY || 'https://login.microsoftonline.com/common',
  redirectUri: process.env.AZURE_REDIRECT_URI || `${window.location.origin}/auth/microsoft/callback`,
  postLogoutRedirectUri: process.env.AZURE_POST_LOGOUT_REDIRECT_URI || `${window.location.origin}/auth/logout`,
  tenantId: process.env.AZURE_TENANT_ID,
  cloudInstance: process.env.AZURE_CLOUD_INSTANCE || 'https://login.microsoftonline.com/',
  scopes: [
    'openid',
    'profile',
    'email',
    'User.Read',
    'Directory.Read.All', // For organization info
    'Organization.Read.All' // For workspace billing
  ]
});

// Google OAuth 2.0 Configuration
const getGoogleConfig = (): GoogleSSOConfig => ({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`,
  hostedDomain: process.env.GOOGLE_HOSTED_DOMAIN, // For Google Workspace
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/admin.directory.user.readonly', // For org info
    'https://www.googleapis.com/auth/admin.directory.domain.readonly' // For domain verification
  ]
});

// Main SSO Configuration
export const ssoConfig: SSOConfig = {
  microsoft: getMicrosoftConfig(),
  google: getGoogleConfig(),
  enabledProviders: (process.env.SSO_ENABLED_PROVIDERS?.split(',') as ('microsoft' | 'google')[]) || ['microsoft', 'google'],
  sessionTimeout: parseInt(process.env.SSO_SESSION_TIMEOUT || '28800000'), // 8 hours in ms
  autoRefreshTokens: process.env.SSO_AUTO_REFRESH_TOKENS !== 'false',
  requireWorkspaceEmail: process.env.SSO_REQUIRE_WORKSPACE_EMAIL === 'true',
  allowedDomains: process.env.SSO_ALLOWED_DOMAINS?.split(',').filter(Boolean),
  blockedDomains: process.env.SSO_BLOCKED_DOMAINS?.split(',').filter(Boolean)
};

// Microsoft Graph API endpoints
export const MICROSOFT_GRAPH_ENDPOINTS = {
  ME: 'https://graph.microsoft.com/v1.0/me',
  ORGANIZATION: 'https://graph.microsoft.com/v1.0/organization',
  MY_ORGANIZATION: 'https://graph.microsoft.com/v1.0/me/memberOf',
  PHOTO: 'https://graph.microsoft.com/v1.0/me/photo/$value'
};

// Google API endpoints
export const GOOGLE_API_ENDPOINTS = {
  USERINFO: 'https://www.googleapis.com/oauth2/v2/userinfo',
  ADMIN_DIRECTORY: 'https://admin.googleapis.com/admin/directory/v1',
  DOMAIN_INFO: 'https://www.googleapis.com/admin/directory/v1/customer/my_customer/domains'
};

// Validation functions
export const validateSSOConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (ssoConfig.enabledProviders.includes('microsoft')) {
    if (!ssoConfig.microsoft.clientId) {
      errors.push('Microsoft Azure Client ID is required');
    }
    if (!ssoConfig.microsoft.authority) {
      errors.push('Microsoft Azure Authority URL is required');
    }
  }

  if (ssoConfig.enabledProviders.includes('google')) {
    if (!ssoConfig.google.clientId) {
      errors.push('Google OAuth Client ID is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Legal industry specific configuration
export const LEGAL_INDUSTRY_CONFIG = {
  // Common legal firm domains for enhanced security
  commonLegalDomains: [
    'law.com',
    'legal.com',
    'lawfirm.com',
    'attorneys.com'
  ],

  // Enhanced security requirements for legal industry
  securityRequirements: {
    requireMFA: true,
    sessionTimeout: 4 * 60 * 60 * 1000, // 4 hours for legal compliance
    tokenRefreshWindow: 15 * 60 * 1000, // 15 minutes
    maxConcurrentSessions: 2,
    requireDeviceVerification: true
  },

  // Compliance settings
  compliance: {
    dataRetention: '7 years', // Legal industry standard
    auditLogRetention: '10 years',
    encryptionStandard: 'AES-256',
    requireSignedBAA: true, // Business Associate Agreement
    hipaaCompliant: true,
    gdprCompliant: true
  }
};

export default ssoConfig;