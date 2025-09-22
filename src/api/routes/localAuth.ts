// Local authentication routes - Tauri-only implementation
// This replaces the HTTP-based auth routes with local Tauri commands

import { localApiClient, LocalAuthCredentials, LocalAuthResponse } from '../localClient';

/**
 * Local authentication service using Tauri commands instead of HTTP endpoints
 * All authentication happens locally without external server dependencies
 */
export class LocalAuthService {
  private static instance: LocalAuthService;

  private constructor() {}

  static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }

  /**
   * Login with local credentials
   * @param credentials - Username and password for local authentication
   */
  async login(credentials: LocalAuthCredentials): Promise<LocalAuthResponse> {
    try {
      const response = await localApiClient.login(credentials);
      
      if (response.success && response.session_id) {
        // Store session locally for persistence
        localApiClient.saveSessionToStorage();
        console.log('Local authentication successful');
      }

      return response;
    } catch (error) {
      console.error('Local authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Logout and clear local session
   */
  async logout(): Promise<boolean> {
    try {
      const success = await localApiClient.logout();
      
      if (success) {
        localApiClient.clearSessionFromStorage();
        console.log('Local logout successful');
      }

      return success;
    } catch (error) {
      console.error('Local logout failed:', error);
      return false;
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      return await localApiClient.validateSession();
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<LocalAuthResponse> {
    try {
      const response = await localApiClient.refreshSession();
      
      if (response.success) {
        localApiClient.saveSessionToStorage();
        console.log('Session refresh successful');
      }

      return response;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      };
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return localApiClient.isAuthenticated();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return localApiClient.getSessionId();
  }
}

// Export singleton instance
export const localAuthService = LocalAuthService.getInstance();

// Export convenience methods that match the original HTTP API interface
export const auth = {
  /**
   * Login - replaces POST /auth/login
   */
  login: async (email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    expiresIn?: number;
    error?: string;
  }> => {
    const response = await localAuthService.login({
      username: email,
      password
    });

    if (response.success && response.session_id) {
      return {
        success: true,
        token: response.token ?? undefined,
        user: {
          id: response.session_id,
          email,
          role: 'attorney',
          firm: 'Local Firm'
        },
        expiresIn: response.expires_in ?? undefined,
        error: undefined
      };
    }

    return {
      success: false,
      token: undefined,
      user: undefined,
      expiresIn: undefined,
      error: response.error || 'Authentication failed'
    };
  },

  /**
   * Logout - replaces POST /auth/logout
   */
  logout: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const success = await localAuthService.logout();
    return {
      success,
      message: success ? 'Logged out successfully' : undefined,
      error: success ? undefined : 'Logout failed'
    };
  },

  /**
   * Verify token - replaces GET /auth/verify
   */
  verify: async (): Promise<{ valid: boolean; user?: any; error?: string }> => {
    const valid = await localAuthService.validateSession();
    return {
      valid,
      user: valid ? {
        id: localAuthService.getSessionId(),
        email: 'local@user.com',
        role: 'attorney',
        firm: 'Local Firm'
      } : undefined,
      error: valid ? undefined : 'Invalid session'
    };
  },

  /**
   * Refresh token - replaces POST /auth/refresh
   */
  refresh: async (): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> => {
    const response = await localAuthService.refreshSession();
    return {
      success: response.success,
      token: response.token,
      refreshToken: response.token, // Same as token in local implementation
      expiresIn: response.expires_in,
      error: response.error
    };
  },

  /**
   * Check authentication status
   */
  isAuthenticated: (): boolean => {
    return localAuthService.isAuthenticated();
  }
};

// Initialize session restoration on module load
if (typeof window !== 'undefined') {
  // Try to restore session from localStorage
  const restored = localApiClient.loadSessionFromStorage();
  if (restored) {
    // Validate the restored session
    localAuthService.validateSession().then(isValid => {
      if (!isValid) {
        // Clear invalid session
        localApiClient.clearSessionFromStorage();
        console.log('Cleared invalid session from storage');
      } else {
        console.log('Session restored from storage');
      }
    });
  }
}

export default localAuthService;