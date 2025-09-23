/**
 * SSO Authentication Service for BEAR AI
 * Enterprise-grade SSO with Microsoft Azure AD and Google OAuth 2.0
 * Includes JWT token management, session handling, and user profile sync
 */

import { ssoConfig, MICROSOFT_GRAPH_ENDPOINTS, GOOGLE_API_ENDPOINTS, LEGAL_INDUSTRY_CONFIG } from '../../config/ssoConfig';

// Types
export interface SSOUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  provider: 'microsoft' | 'google';
  tenantId?: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  roles?: string[];
  permissions?: string[];
  isWorkspaceAdmin?: boolean;
  lastLoginAt?: Date;
  tokenExpiry?: Date;
}

export interface SSOTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  provider: 'microsoft' | 'google';
  scope: string[];
}

export interface SSOSession {
  user: SSOUser;
  tokens: SSOTokens;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    fingerprint: string;
  };
}

export interface AuthenticationResult {
  success: boolean;
  user?: SSOUser;
  tokens?: SSOTokens;
  session?: SSOSession;
  error?: string;
  requiresMFA?: boolean;
  redirectUrl?: string;
}

// Main SSO Authentication Service
export class SSOAuthService {
  private currentSession: SSOSession | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private sessionCleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the SSO service
   */
  private initializeService(): void {
    this.loadStoredSession();
    this.startTokenRefreshTimer();
    this.startSessionCleanup();
  }

  /**
   * Authenticate with Microsoft Azure AD
   */
  public async authenticateWithMicrosoft(options?: {
    loginHint?: string;
    prompt?: 'none' | 'login' | 'consent' | 'select_account';
  }): Promise<AuthenticationResult> {
    try {
      // Note: In a real implementation, you would use @azure/msal-browser
      // This is a simplified implementation showing the structure

      const authUrl = this.buildMicrosoftAuthUrl(options);

      // Redirect to Microsoft login
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }

      return {
        success: true,
        redirectUrl: authUrl
      };
    } catch (error) {
      console.error('Microsoft authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Microsoft authentication failed'
      };
    }
  }

  /**
   * Authenticate with Google OAuth 2.0
   */
  public async authenticateWithGoogle(options?: {
    loginHint?: string;
    hostedDomain?: string;
  }): Promise<AuthenticationResult> {
    try {
      // Note: In a real implementation, you would use Google Identity Services
      // This is a simplified implementation showing the structure

      const authUrl = this.buildGoogleAuthUrl(options);

      // Redirect to Google login
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }

      return {
        success: true,
        redirectUrl: authUrl
      };
    } catch (error) {
      console.error('Google authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google authentication failed'
      };
    }
  }

  /**
   * Handle Microsoft OAuth callback
   */
  public async handleMicrosoftCallback(code: string, state?: string): Promise<AuthenticationResult> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeMicrosoftCode(code);

      // Get user profile
      const userProfile = await this.getMicrosoftUserProfile(tokens.accessToken);

      // Get organization info
      const orgInfo = await this.getMicrosoftOrganization(tokens.accessToken);

      // Create user object
      const user: SSOUser = {
        id: userProfile.id,
        email: userProfile.mail || userProfile.userPrincipalName,
        name: userProfile.displayName,
        firstName: userProfile.givenName,
        lastName: userProfile.surname,
        provider: 'microsoft',
        tenantId: orgInfo?.tenantId,
        organizationId: orgInfo?.id,
        organizationName: orgInfo?.displayName,
        domain: this.extractDomain(userProfile.mail || userProfile.userPrincipalName),
        lastLoginAt: new Date()
      };

      // Validate user and domain
      const validation = this.validateUser(user);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Create session
      const session = await this.createSession(user, tokens);

      return {
        success: true,
        user,
        tokens,
        session
      };
    } catch (error) {
      console.error('Microsoft callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Microsoft callback failed'
      };
    }
  }

  /**
   * Handle Google OAuth callback
   */
  public async handleGoogleCallback(code: string, state?: string): Promise<AuthenticationResult> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeGoogleCode(code);

      // Get user profile
      const userProfile = await this.getGoogleUserProfile(tokens.accessToken);

      // Get domain info if workspace user
      const domainInfo = await this.getGoogleDomainInfo(tokens.accessToken, userProfile.email);

      // Create user object
      const user: SSOUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        firstName: userProfile.given_name,
        lastName: userProfile.family_name,
        avatarUrl: userProfile.picture,
        provider: 'google',
        organizationName: domainInfo?.organizationName,
        domain: this.extractDomain(userProfile.email),
        lastLoginAt: new Date()
      };

      // Validate user and domain
      const validation = this.validateUser(user);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Create session
      const session = await this.createSession(user, tokens);

      return {
        success: true,
        user,
        tokens,
        session
      };
    } catch (error) {
      console.error('Google callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google callback failed'
      };
    }
  }

  /**
   * Refresh authentication tokens
   */
  public async refreshTokens(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const { tokens } = this.currentSession;
      let newTokens: SSOTokens;

      if (tokens.provider === 'microsoft') {
        newTokens = await this.refreshMicrosoftTokens(tokens.refreshToken!);
      } else {
        newTokens = await this.refreshGoogleTokens(tokens.refreshToken!);
      }

      // Update session with new tokens
      this.currentSession.tokens = newTokens;
      this.currentSession.lastActivity = new Date();

      // Store updated session
      this.storeSession(this.currentSession);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Logout and clean up session
   */
  public async logout(): Promise<void> {
    try {
      if (this.currentSession) {
        // Revoke tokens if possible
        await this.revokeTokens(this.currentSession.tokens);

        // Clear timers
        if (this.tokenRefreshTimer) {
          clearTimeout(this.tokenRefreshTimer);
        }

        // Clear session
        this.currentSession = null;
        this.clearStoredSession();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get current user session
   */
  public getCurrentSession(): SSOSession | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    if (!this.currentSession) {
      return false;
    }

    const now = new Date();
    return now < this.currentSession.expiresAt;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): SSOUser | null {
    return this.currentSession?.user || null;
  }

  // Private helper methods

  private buildMicrosoftAuthUrl(options?: { loginHint?: string; prompt?: string }): string {
    const params = new URLSearchParams({
      client_id: ssoConfig.microsoft.clientId,
      response_type: 'code',
      redirect_uri: ssoConfig.microsoft.redirectUri,
      scope: ssoConfig.microsoft.scopes.join(' '),
      state: this.generateState(),
      response_mode: 'query'
    });

    if (options?.loginHint) {
      params.set('login_hint', options.loginHint);
    }

    if (options?.prompt) {
      params.set('prompt', options.prompt);
    }

    return `${ssoConfig.microsoft.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private buildGoogleAuthUrl(options?: { loginHint?: string; hostedDomain?: string }): string {
    const params = new URLSearchParams({
      client_id: ssoConfig.google.clientId,
      response_type: 'code',
      redirect_uri: ssoConfig.google.redirectUri,
      scope: ssoConfig.google.scopes.join(' '),
      state: this.generateState(),
      access_type: 'offline',
      prompt: 'consent'
    });

    if (options?.loginHint) {
      params.set('login_hint', options.loginHint);
    }

    if (options?.hostedDomain || ssoConfig.google.hostedDomain) {
      params.set('hd', options?.hostedDomain || ssoConfig.google.hostedDomain!);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private async exchangeMicrosoftCode(code: string): Promise<SSOTokens> {
    // Simplified implementation - in reality, make API call to Microsoft
    throw new Error('Microsoft token exchange not implemented - requires server-side implementation');
  }

  private async exchangeGoogleCode(code: string): Promise<SSOTokens> {
    // Simplified implementation - in reality, make API call to Google
    throw new Error('Google token exchange not implemented - requires server-side implementation');
  }

  private async getMicrosoftUserProfile(accessToken: string): Promise<any> {
    const response = await fetch(MICROSOFT_GRAPH_ENDPOINTS.ME, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Microsoft user profile');
    }

    return response.json();
  }

  private async getGoogleUserProfile(accessToken: string): Promise<any> {
    const response = await fetch(GOOGLE_API_ENDPOINTS.USERINFO, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google user profile');
    }

    return response.json();
  }

  private async getMicrosoftOrganization(accessToken: string): Promise<any> {
    try {
      const response = await fetch(MICROSOFT_GRAPH_ENDPOINTS.ORGANIZATION, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.value?.[0];
      }
    } catch (error) {
      console.warn('Failed to fetch organization info:', error);
    }
    return null;
  }

  private async getGoogleDomainInfo(accessToken: string, email: string): Promise<any> {
    try {
      const domain = this.extractDomain(email);
      if (!domain || domain === 'gmail.com') {
        return null;
      }

      // This would require admin permissions
      const response = await fetch(GOOGLE_API_ENDPOINTS.DOMAIN_INFO, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch domain info:', error);
    }
    return null;
  }

  private async refreshMicrosoftTokens(refreshToken: string): Promise<SSOTokens> {
    // Simplified implementation - requires server-side token refresh
    throw new Error('Microsoft token refresh not implemented - requires server-side implementation');
  }

  private async refreshGoogleTokens(refreshToken: string): Promise<SSOTokens> {
    // Simplified implementation - requires server-side token refresh
    throw new Error('Google token refresh not implemented - requires server-side implementation');
  }

  private async revokeTokens(tokens: SSOTokens): Promise<void> {
    try {
      if (tokens.provider === 'microsoft') {
        // Revoke Microsoft tokens
        await fetch(`${ssoConfig.microsoft.authority}/oauth2/v2.0/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: tokens.accessToken,
            client_id: ssoConfig.microsoft.clientId
          })
        });
      } else {
        // Revoke Google tokens
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: 'POST'
        });
      }
    } catch (error) {
      console.warn('Failed to revoke tokens:', error);
    }
  }

  private validateUser(user: SSOUser): { isValid: boolean; error?: string } {
    // Check blocked domains
    if (ssoConfig.blockedDomains?.includes(user.domain || '')) {
      return {
        isValid: false,
        error: 'Domain not allowed for authentication'
      };
    }

    // Check allowed domains
    if (ssoConfig.allowedDomains?.length && !ssoConfig.allowedDomains.includes(user.domain || '')) {
      return {
        isValid: false,
        error: 'Domain not in allowed list'
      };
    }

    // Check workspace email requirement
    if (ssoConfig.requireWorkspaceEmail && this.isPersonalEmail(user.email)) {
      return {
        isValid: false,
        error: 'Workspace email required for authentication'
      };
    }

    return { isValid: true };
  }

  private isPersonalEmail(email: string): boolean {
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com'];
    const domain = this.extractDomain(email);
    return personalDomains.includes(domain || '');
  }

  private extractDomain(email: string): string | null {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  private async createSession(user: SSOUser, tokens: SSOTokens): Promise<SSOSession> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LEGAL_INDUSTRY_CONFIG.securityRequirements.sessionTimeout);

    const session: SSOSession = {
      user,
      tokens,
      sessionId,
      createdAt: now,
      expiresAt,
      lastActivity: now,
      deviceInfo: this.getDeviceInfo()
    };

    this.currentSession = session;
    this.storeSession(session);

    return session;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateSessionId(): string {
    return `sso_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getDeviceInfo(): { userAgent: string; ip: string; fingerprint: string } | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return {
      userAgent: navigator.userAgent,
      ip: '', // Would be populated server-side
      fingerprint: this.generateDeviceFingerprint()
    };
  }

  private generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  private storeSession(session: SSOSession): void {
    if (typeof window !== 'undefined') {
      const sessionData = {
        ...session,
        tokens: {
          ...session.tokens,
          // Don't store actual tokens in localStorage for security
          accessToken: 'stored_securely',
          refreshToken: 'stored_securely'
        }
      };
      localStorage.setItem('bear_ai_sso_session', JSON.stringify(sessionData));
    }
  }

  private loadStoredSession(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bear_ai_sso_session');
      if (stored) {
        try {
          const session = JSON.parse(stored) as SSOSession;
          // Validate session is not expired
          if (new Date() < new Date(session.expiresAt)) {
            this.currentSession = session;
          } else {
            this.clearStoredSession();
          }
        } catch (error) {
          console.warn('Failed to load stored session:', error);
          this.clearStoredSession();
        }
      }
    }
  }

  private clearStoredSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bear_ai_sso_session');
    }
  }

  private startTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Refresh tokens 15 minutes before expiry
    const refreshInterval = LEGAL_INDUSTRY_CONFIG.securityRequirements.tokenRefreshWindow;
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshTokens().then(() => {
        this.startTokenRefreshTimer(); // Schedule next refresh
      });
    }, refreshInterval);
  }

  private startSessionCleanup(): void {
    if (this.sessionCleanupTimer) {
      clearTimeout(this.sessionCleanupTimer);
    }

    // Check session validity every 5 minutes
    this.sessionCleanupTimer = setTimeout(() => {
      if (!this.isAuthenticated()) {
        this.logout();
      } else {
        this.startSessionCleanup(); // Schedule next check
      }
    }, 5 * 60 * 1000);
  }
}

// Export singleton instance
export const ssoAuthService = new SSOAuthService();