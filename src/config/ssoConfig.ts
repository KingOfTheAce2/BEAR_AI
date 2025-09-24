/**
 * EU-Sovereign SSO Configuration for BEAR AI
 * GDPR-compliant authentication with European identity providers
 * Zero dependency on Big Tech (no Microsoft/Google)
 */

export interface KeycloakConfig {
  realm: string;
  serverUrl: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: string[];
  sslRequired: 'all' | 'external' | 'none';
}

export interface Auth0EUConfig {
  domain: string; // Must be EU region (e.g., eu.auth0.com)
  clientId: string;
  redirectUri: string;
  audience: string;
  scopes: string[];
  region: 'eu-central' | 'eu-west';
}

export interface GenericOIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  userInfoEndpoint?: string;
  tokenEndpoint?: string;
}

export interface SSOConfig {
  keycloak?: KeycloakConfig;
  auth0EU?: Auth0EUConfig;
  genericOIDC?: GenericOIDCConfig;
  enabledProviders: ('keycloak' | 'auth0EU' | 'genericOIDC')[];
  sessionTimeout: number;
  autoRefreshTokens: boolean;
  requireWorkspaceEmail: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  dataResidency: 'eu' | 'de' | 'fr' | 'nl';
}

// Keycloak Configuration (Self-hosted or EU-hosted)
const getKeycloakConfig = (): KeycloakConfig | undefined => {
  if (!process.env.KEYCLOAK_SERVER_URL) return undefined;

  return {
    realm: process.env.KEYCLOAK_REALM || 'bear-ai',
    serverUrl: process.env.KEYCLOAK_SERVER_URL,
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'bear-ai-client',
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI || `${window.location.origin}/auth/keycloak/callback`,
    postLogoutRedirectUri: process.env.KEYCLOAK_POST_LOGOUT_URI || `${window.location.origin}/auth/logout`,
    sslRequired: (process.env.KEYCLOAK_SSL_REQUIRED as 'all' | 'external' | 'none') || 'all',
    scopes: [
      'openid',
      'profile',
      'email',
      'organization',
      'legal-practice'
    ]
  };
};

// Auth0 EU Configuration
const getAuth0EUConfig = (): Auth0EUConfig | undefined => {
  if (!process.env.AUTH0_EU_DOMAIN) return undefined;

  return {
    domain: process.env.AUTH0_EU_DOMAIN,
    clientId: process.env.AUTH0_EU_CLIENT_ID || '',
    redirectUri: process.env.AUTH0_EU_REDIRECT_URI || `${window.location.origin}/auth/auth0/callback`,
    audience: process.env.AUTH0_EU_AUDIENCE || '',
    region: (process.env.AUTH0_EU_REGION as 'eu-central' | 'eu-west') || 'eu-central',
    scopes: [
      'openid',
      'profile',
      'email',
      'read:organization',
      'read:legal_documents'
    ]
  };
};

// Generic OIDC Configuration (for any EU-sovereign provider)
const getGenericOIDCConfig = (): GenericOIDCConfig | undefined => {
  if (!process.env.OIDC_ISSUER) return undefined;

  return {
    issuer: process.env.OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    redirectUri: process.env.OIDC_REDIRECT_URI || `${window.location.origin}/auth/oidc/callback`,
    userInfoEndpoint: process.env.OIDC_USERINFO_ENDPOINT,
    tokenEndpoint: process.env.OIDC_TOKEN_ENDPOINT,
    scopes: process.env.OIDC_SCOPES?.split(',') || ['openid', 'profile', 'email']
  };
};

// Main SSO Configuration
export const ssoConfig: SSOConfig = {
  keycloak: getKeycloakConfig(),
  auth0EU: getAuth0EUConfig(),
  genericOIDC: getGenericOIDCConfig(),
  enabledProviders: (process.env.SSO_ENABLED_PROVIDERS?.split(',') as ('keycloak' | 'auth0EU' | 'genericOIDC')[]) || [],
  sessionTimeout: parseInt(process.env.SSO_SESSION_TIMEOUT || '28800000'), // 8 hours in ms
  autoRefreshTokens: process.env.SSO_AUTO_REFRESH_TOKENS !== 'false',
  requireWorkspaceEmail: process.env.SSO_REQUIRE_WORKSPACE_EMAIL === 'true',
  allowedDomains: process.env.SSO_ALLOWED_DOMAINS?.split(',').filter(Boolean),
  blockedDomains: process.env.SSO_BLOCKED_DOMAINS?.split(',').filter(Boolean),
  dataResidency: (process.env.SSO_DATA_RESIDENCY as 'eu' | 'de' | 'fr' | 'nl') || 'eu'
};

// EU-Sovereign Identity Providers
export const EU_SOVEREIGN_PROVIDERS = {
  // German providers
  VERIMI: 'https://verimi.de',
  YES_COM: 'https://yes.com',

  // French providers
  FRANCE_CONNECT: 'https://franceconnect.gouv.fr',

  // Dutch providers
  DIGID: 'https://www.digid.nl',
  EHERKENNING: 'https://www.eherkenning.nl',

  // EU-wide providers
  EIDAS: 'https://ec.europa.eu/digital-single-market/en/trust-services-and-eid',

  // Self-hosted options
  KEYCLOAK: 'Self-hosted or EU-cloud hosted',
  FUSIONAUTH: 'EU data center deployment',
  OIDC_PROVIDER: 'Any EU-compliant OIDC provider'
};

// Validation functions
export const validateSSOConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (ssoConfig.enabledProviders.length === 0) {
    errors.push('At least one SSO provider must be enabled');
  }

  if (ssoConfig.enabledProviders.includes('keycloak') && !ssoConfig.keycloak?.serverUrl) {
    errors.push('Keycloak server URL is required');
  }

  if (ssoConfig.enabledProviders.includes('auth0EU') && !ssoConfig.auth0EU?.domain) {
    errors.push('Auth0 EU domain is required');
  }

  if (ssoConfig.enabledProviders.includes('genericOIDC') && !ssoConfig.genericOIDC?.issuer) {
    errors.push('OIDC issuer URL is required');
  }

  // Validate data residency
  if (!['eu', 'de', 'fr', 'nl'].includes(ssoConfig.dataResidency)) {
    errors.push('Invalid data residency region');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// GDPR Compliance Settings
export const GDPR_COMPLIANCE = {
  // Data processing requirements
  dataProcessing: {
    purpose: 'Authentication and authorization for legal document management',
    legalBasis: 'Legitimate interest and consent',
    dataMinimization: true,
    encryptionInTransit: true,
    encryptionAtRest: true
  },

  // Data retention policies
  retention: {
    authenticationLogs: '30 days',
    sessionData: '8 hours',
    refreshTokens: '30 days',
    auditLogs: '7 years' // Legal requirement
  },

  // User rights
  userRights: {
    dataAccess: true,
    dataPortability: true,
    dataErasure: true,
    dataRectification: true,
    restrictProcessing: true,
    objectToProcessing: true
  },

  // Data residency
  dataResidency: {
    servers: 'EU only',
    backups: 'EU only',
    processing: 'EU only',
    subProcessors: 'EU only'
  }
};

// Legal industry specific configuration
export const LEGAL_INDUSTRY_CONFIG = {
  // Common legal firm domains for enhanced security
  commonLegalDomains: [
    'law.eu',
    'legal.de',
    'avocat.fr',
    'advocaat.nl',
    'rechtsanwalt.de'
  ],

  // Enhanced security requirements for legal industry
  securityRequirements: {
    requireMFA: true,
    sessionTimeout: 4 * 60 * 60 * 1000, // 4 hours for legal compliance
    tokenRefreshWindow: 15 * 60 * 1000, // 15 minutes
    maxConcurrentSessions: 2,
    requireDeviceVerification: true,
    requireIPWhitelisting: false,
    requireCertificateAuth: false
  },

  // Compliance settings
  compliance: {
    dataRetention: '7 years', // Legal industry standard
    auditLogRetention: '10 years',
    encryptionStandard: 'AES-256',
    requireSignedDPA: true, // Data Processing Agreement
    requireLegalBasisDocument: true,
    gdprCompliant: true,
    nationalDataProtectionLaws: true
  }
};

export default ssoConfig;