/**
 * EU Sovereign SSO Authentication Service
 * GDPR-compliant SSO with Keycloak, Auth0 EU, and generic OIDC
 * No Big Tech dependencies - fully EU data sovereignty compliant
 */

import { invoke } from '@tauri-apps/api/tauri';
import jwt from 'jsonwebtoken';

export interface SSOProvider {
  id: string;
  name: string;
  type: 'keycloak' | 'auth0-eu' | 'oidc' | 'saml';
  region: 'eu' | 'de' | 'fr' | 'nl'; // EU regions only
  endpoints: SSOEndpoints;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  audience?: string;
  gdprCompliant: boolean;
  dataResidency: string; // Physical location of data
}

export interface SSOEndpoints {
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  logoutUrl: string;
  jwksUrl?: string;
  introspectionUrl?: string;
  revocationUrl?: string;
}

export interface SSOUser {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  emailVerified: boolean;
  locale?: string;
  organization?: string;
  department?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface SSOTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export interface SSOSession {
  user: SSOUser;
  tokens: SSOTokens;
  provider: string;
  createdAt: Date;
  expiresAt: Date;
  gdprConsent: boolean;
  dataProcessingAgreement: boolean;
}

/**
 * EU Sovereign SSO Service
 * Compliant with GDPR, ePrivacy Directive, and EU data sovereignty requirements
 */
export class EUSovereignSSOService {
  private static instance: EUSovereignSSOService;
  private providers: Map<string, SSOProvider> = new Map();
  private currentSession: SSOSession | null = null;
  private sessionKey = 'eu_sso_session';
  private consentKey = 'gdpr_consent';

  // Pre-configured EU-sovereign providers
  private readonly EU_PROVIDERS: SSOProvider[] = [
    {
      id: 'keycloak-eu',
      name: 'Keycloak EU',
      type: 'keycloak',
      region: 'eu',
      endpoints: {
        authorizationUrl: '',
        tokenUrl: '',
        userInfoUrl: '',
        logoutUrl: '',
        jwksUrl: ''
      },
      clientId: '',
      gdprCompliant: true,
      dataResidency: 'EU - Frankfurt'
    },
    {
      id: 'auth0-eu',
      name: 'Auth0 Europe',
      type: 'auth0-eu',
      region: 'eu',
      endpoints: {
        authorizationUrl: 'https://YOUR_TENANT.eu.auth0.com/authorize',
        tokenUrl: 'https://YOUR_TENANT.eu.auth0.com/oauth/token',
        userInfoUrl: 'https://YOUR_TENANT.eu.auth0.com/userinfo',
        logoutUrl: 'https://YOUR_TENANT.eu.auth0.com/v2/logout',
        jwksUrl: 'https://YOUR_TENANT.eu.auth0.com/.well-known/jwks.json'
      },
      clientId: '',
      gdprCompliant: true,
      dataResidency: 'EU - Frankfurt/Dublin'
    }
  ];

  private constructor() {
    this.initializeProviders();
    this.loadSession();
  }

  public static getInstance(): EUSovereignSSOService {
    if (!EUSovereignSSOService.instance) {
      EUSovereignSSOService.instance = new EUSovereignSSOService();
    }
    return EUSovereignSSOService.instance;
  }

  /**
   * Initialize EU-sovereign providers
   */
  private initializeProviders(): void {
    // Load provider configurations from environment
    this.EU_PROVIDERS.forEach(provider => {
      const configured = this.configureProvider(provider);
      if (configured.clientId) {
        this.providers.set(provider.id, configured);
      }
    });
  }

  /**
   * Configure provider from environment variables
   */
  private configureProvider(provider: SSOProvider): SSOProvider {
    const envPrefix = provider.id.toUpperCase().replace('-', '_');

    return {
      ...provider,
      clientId: process.env[`${envPrefix}_CLIENT_ID`] || provider.clientId,
      clientSecret: process.env[`${envPrefix}_CLIENT_SECRET`] || provider.clientSecret,
      endpoints: {
        authorizationUrl: process.env[`${envPrefix}_AUTH_URL`] || provider.endpoints.authorizationUrl,
        tokenUrl: process.env[`${envPrefix}_TOKEN_URL`] || provider.endpoints.tokenUrl,
        userInfoUrl: process.env[`${envPrefix}_USERINFO_URL`] || provider.endpoints.userInfoUrl,
        logoutUrl: process.env[`${envPrefix}_LOGOUT_URL`] || provider.endpoints.logoutUrl,
        jwksUrl: process.env[`${envPrefix}_JWKS_URL`] || provider.endpoints.jwksUrl,
        introspectionUrl: process.env[`${envPrefix}_INTROSPECTION_URL`],
        revocationUrl: process.env[`${envPrefix}_REVOCATION_URL`]
      }
    };
  }

  /**
   * Add custom OIDC provider (must be EU-based)
   */
  public addOIDCProvider(config: {
    id: string;
    name: string;
    discoveryUrl?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    clientId: string;
    clientSecret?: string;
    scope?: string;
    region: 'eu' | 'de' | 'fr' | 'nl';
    dataResidency: string;
  }): void {
    // Validate EU data residency
    if (!this.validateEUDataResidency(config.dataResidency)) {
      throw new Error('Provider must guarantee EU data residency');
    }

    const provider: SSOProvider = {
      id: config.id,
      name: config.name,
      type: 'oidc',
      region: config.region,
      endpoints: {
        authorizationUrl: config.authorizationUrl || '',
        tokenUrl: config.tokenUrl || '',
        userInfoUrl: config.userInfoUrl || '',
        logoutUrl: ''
      },
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      scope: config.scope || 'openid profile email',
      gdprCompliant: true,
      dataResidency: config.dataResidency
    };

    // Auto-discover endpoints if discovery URL provided
    if (config.discoveryUrl) {
      this.discoverOIDCEndpoints(config.discoveryUrl).then(endpoints => {
        provider.endpoints = { ...provider.endpoints, ...endpoints };
      });
    }

    this.providers.set(provider.id, provider);
  }

  /**
   * Add Keycloak provider
   */
  public addKeycloakProvider(config: {
    realm: string;
    serverUrl: string;
    clientId: string;
    clientSecret?: string;
    region?: 'eu' | 'de' | 'fr' | 'nl';
    dataResidency?: string;
  }): void {
    const provider: SSOProvider = {
      id: `keycloak-${config.realm}`,
      name: `Keycloak ${config.realm}`,
      type: 'keycloak',
      region: config.region || 'eu',
      endpoints: {
        authorizationUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/auth`,
        tokenUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/token`,
        userInfoUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/userinfo`,
        logoutUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/logout`,
        jwksUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/certs`,
        introspectionUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/token/introspect`,
        revocationUrl: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/revoke`
      },
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      scope: 'openid profile email',
      gdprCompliant: true,
      dataResidency: config.dataResidency || 'On-premises EU'
    };

    this.providers.set(provider.id, provider);
  }

  /**
   * Initiate SSO login flow
   */
  public async login(providerId: string, options: {
    prompt?: 'none' | 'login' | 'consent' | 'select_account';
    maxAge?: number;
    loginHint?: string;
    gdprConsent?: boolean;
  } = {}): Promise<SSOSession> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not configured`);
    }

    // Check GDPR consent
    if (!options.gdprConsent && !this.hasGDPRConsent()) {
      throw new Error('GDPR consent required for authentication');
    }

    // Build authorization URL
    const authUrl = this.buildAuthorizationUrl(provider, options);

    // Open auth window and wait for callback
    const authCode = await this.openAuthWindow(authUrl);

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(provider, authCode);

    // Get user info
    const user = await this.getUserInfo(provider, tokens.accessToken);

    // Create session
    const session: SSOSession = {
      user,
      tokens,
      provider: providerId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      gdprConsent: true,
      dataProcessingAgreement: true
    };

    // Store session
    this.currentSession = session;
    this.saveSession(session);

    // Store GDPR consent
    this.storeGDPRConsent();

    return session;
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    if (!this.currentSession) return;

    const provider = this.providers.get(this.currentSession.provider);
    if (!provider) return;

    try {
      // Revoke tokens if endpoint available
      if (provider.endpoints.revocationUrl && this.currentSession.tokens.refreshToken) {
        await this.revokeToken(
          provider,
          this.currentSession.tokens.refreshToken,
          'refresh_token'
        );
      }

      // Call provider logout endpoint
      if (provider.endpoints.logoutUrl) {
        const logoutUrl = new URL(provider.endpoints.logoutUrl);
        logoutUrl.searchParams.append('client_id', provider.clientId);

        if (this.currentSession.tokens.idToken) {
          logoutUrl.searchParams.append('id_token_hint', this.currentSession.tokens.idToken);
        }

        await this.openAuthWindow(logoutUrl.toString());
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local session
      this.currentSession = null;
      this.clearSession();
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(): Promise<SSOTokens> {
    if (!this.currentSession || !this.currentSession.tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const provider = this.providers.get(this.currentSession.provider);
    if (!provider) {
      throw new Error('Provider not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.currentSession.tokens.refreshToken,
      client_id: provider.clientId
    });

    if (provider.clientSecret) {
      params.append('client_secret', provider.clientSecret);
    }

    const response = await fetch(provider.endpoints.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    const tokens: SSOTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.currentSession.tokens.refreshToken,
      idToken: data.id_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope
    };

    // Update session
    this.currentSession.tokens = tokens;
    this.currentSession.expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    this.saveSession(this.currentSession);

    return tokens;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): SSOUser | null {
    return this.currentSession?.user || null;
  }

  /**
   * Get current session
   */
  public getSession(): SSOSession | null {
    if (this.currentSession && this.currentSession.expiresAt > new Date()) {
      return this.currentSession;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Validate token
   */
  public async validateToken(token: string, providerId?: string): Promise<boolean> {
    const provider = providerId ?
      this.providers.get(providerId) :
      this.currentSession ? this.providers.get(this.currentSession.provider) : null;

    if (!provider) return false;

    // Try introspection endpoint if available
    if (provider.endpoints.introspectionUrl) {
      return await this.introspectToken(provider, token);
    }

    // Validate JWT locally
    if (provider.endpoints.jwksUrl) {
      return await this.validateJWT(token, provider.endpoints.jwksUrl);
    }

    // Fallback: check with userinfo endpoint
    try {
      const response = await fetch(provider.endpoints.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * GDPR compliance methods
   */

  public hasGDPRConsent(): boolean {
    return localStorage.getItem(this.consentKey) === 'true';
  }

  public storeGDPRConsent(): void {
    localStorage.setItem(this.consentKey, 'true');
    localStorage.setItem(`${this.consentKey}_timestamp`, new Date().toISOString());
  }

  public revokeGDPRConsent(): void {
    localStorage.removeItem(this.consentKey);
    localStorage.removeItem(`${this.consentKey}_timestamp`);
    this.logout();
  }

  public async exportUserData(): Promise<any> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    return {
      user: this.currentSession.user,
      provider: this.currentSession.provider,
      consentTimestamp: localStorage.getItem(`${this.consentKey}_timestamp`),
      sessionCreated: this.currentSession.createdAt,
      dataProcessingAgreement: this.currentSession.dataProcessingAgreement
    };
  }

  public async deleteUserData(): Promise<void> {
    // Clear all local data
    this.clearSession();
    this.revokeGDPRConsent();

    // Request deletion from provider
    if (this.currentSession) {
      await invoke('request_data_deletion', {
        provider: this.currentSession.provider,
        userId: this.currentSession.user.id
      });
    }
  }

  /**
   * Private helper methods
   */

  private validateEUDataResidency(location: string): boolean {
    const euLocations = [
      'EU', 'Europe', 'Frankfurt', 'Dublin', 'Amsterdam',
      'Paris', 'Brussels', 'Luxembourg', 'Berlin', 'Munich',
      'Vienna', 'Stockholm', 'Copenhagen', 'Helsinki'
    ];

    return euLocations.some(loc =>
      location.toLowerCase().includes(loc.toLowerCase())
    );
  }

  private async discoverOIDCEndpoints(discoveryUrl: string): Promise<Partial<SSOEndpoints>> {
    try {
      const response = await fetch(discoveryUrl);
      const config = await response.json();

      return {
        authorizationUrl: config.authorization_endpoint,
        tokenUrl: config.token_endpoint,
        userInfoUrl: config.userinfo_endpoint,
        logoutUrl: config.end_session_endpoint,
        jwksUrl: config.jwks_uri,
        introspectionUrl: config.introspection_endpoint,
        revocationUrl: config.revocation_endpoint
      };
    } catch (error) {
      console.error('OIDC discovery failed:', error);
      return {};
    }
  }

  private buildAuthorizationUrl(provider: SSOProvider, options: any): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      response_type: 'code',
      redirect_uri: this.getRedirectUri(),
      scope: provider.scope || 'openid profile email',
      state: this.generateState(),
      nonce: this.generateNonce()
    });

    if (options.prompt) params.append('prompt', options.prompt);
    if (options.maxAge) params.append('max_age', options.maxAge.toString());
    if (options.loginHint) params.append('login_hint', options.loginHint);
    if (provider.audience) params.append('audience', provider.audience);

    return `${provider.endpoints.authorizationUrl}?${params.toString()}`;
  }

  private async openAuthWindow(url: string): Promise<string> {
    // Use Tauri to open auth window
    return await invoke<string>('open_auth_window', { url });
  }

  private async exchangeCodeForTokens(
    provider: SSOProvider,
    code: string
  ): Promise<SSOTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.getRedirectUri(),
      client_id: provider.clientId
    });

    if (provider.clientSecret) {
      params.append('client_secret', provider.clientSecret);
    }

    const response = await fetch(provider.endpoints.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope
    };
  }

  private async getUserInfo(provider: SSOProvider, accessToken: string): Promise<SSOUser> {
    const response = await fetch(provider.endpoints.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const data = await response.json();

    return {
      id: data.sub || data.id,
      email: data.email,
      name: data.name,
      givenName: data.given_name,
      familyName: data.family_name,
      picture: data.picture,
      emailVerified: data.email_verified || false,
      locale: data.locale,
      organization: data.organization,
      department: data.department,
      roles: data.roles || [],
      permissions: data.permissions || [],
      metadata: data
    };
  }

  private async revokeToken(
    provider: SSOProvider,
    token: string,
    tokenType: 'access_token' | 'refresh_token'
  ): Promise<void> {
    if (!provider.endpoints.revocationUrl) return;

    const params = new URLSearchParams({
      token: token,
      token_type_hint: tokenType,
      client_id: provider.clientId
    });

    if (provider.clientSecret) {
      params.append('client_secret', provider.clientSecret);
    }

    await fetch(provider.endpoints.revocationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
  }

  private async introspectToken(provider: SSOProvider, token: string): Promise<boolean> {
    if (!provider.endpoints.introspectionUrl) return false;

    const params = new URLSearchParams({
      token: token,
      client_id: provider.clientId
    });

    if (provider.clientSecret) {
      params.append('client_secret', provider.clientSecret);
    }

    const response = await fetch(provider.endpoints.introspectionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.active === true;
  }

  private async validateJWT(token: string, jwksUrl: string): Promise<boolean> {
    try {
      // This is a simplified validation - in production use a proper JWT library
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) return false;

      // Check expiration
      const payload = decoded.payload as any;
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private getRedirectUri(): string {
    return process.env.SSO_REDIRECT_URI || 'http://localhost:1420/auth/callback';
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private saveSession(session: SSOSession): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private loadSession(): void {
    const stored = localStorage.getItem(this.sessionKey);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        session.createdAt = new Date(session.createdAt);
        session.expiresAt = new Date(session.expiresAt);

        if (session.expiresAt > new Date()) {
          this.currentSession = session;
        } else {
          this.clearSession();
        }
      } catch {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }
}

// Export singleton instance
export const euSSO = EUSovereignSSOService.getInstance();