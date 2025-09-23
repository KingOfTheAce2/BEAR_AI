/**
 * Google SignIn Component for BEAR AI
 * Enterprise-grade Google OAuth 2.0 integration
 * Supports Google Workspace authentication and organization billing
 */

import React, { useState, useEffect } from 'react';
import { ssoAuthService, AuthenticationResult } from '../../services/auth/SSOAuthService';
import { stripeSSOService } from '../../services/billing/StripeSSO';
import { ssoConfig, LEGAL_INDUSTRY_CONFIG } from '../../config/ssoConfig';

// Types
interface GoogleSignInProps {
  onSuccess?: (result: AuthenticationResult) => void;
  onError?: (error: string) => void;
  onWorkspaceDetected?: (organizationName: string, domain: string) => void;
  className?: string;
  buttonText?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loginHint?: string;
  hostedDomain?: string;
  showLogo?: boolean;
  showWorkspaceInfo?: boolean;
}

interface GoogleButtonStyles {
  container: string;
  button: string;
  icon: string;
  text: string;
  loading: string;
}

// Google SignIn Component
export const GoogleSignIn: React.FC<GoogleSignInProps> = ({
  onSuccess,
  onError,
  onWorkspaceDetected,
  className = '',
  buttonText = 'Sign in with Google',
  size = 'medium',
  variant = 'primary',
  disabled = false,
  loginHint,
  hostedDomain,
  showLogo = true,
  showWorkspaceInfo = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check configuration on mount
  useEffect(() => {
    const checkConfig = () => {
      const configured = ssoConfig.enabledProviders.includes('google') &&
                        ssoConfig.google.clientId;
      setIsConfigured(configured);

      if (!configured) {
        setError('Google SSO not configured');
      }
    };

    checkConfig();
  }, []);

  // Handle Google sign-in
  const handleSignIn = async () => {
    if (!isConfigured || isLoading || disabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Start Google authentication
      const result = await ssoAuthService.authenticateWithGoogle({
        loginHint,
        hostedDomain: hostedDomain || ssoConfig.google.hostedDomain
      });

      if (result.success) {
        // Authentication will continue via redirect
        // The actual success handling happens in the callback component
        console.log('Google authentication initiated');
      } else {
        throw new Error(result.error || 'Google authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get button styles based on props
  const getButtonStyles = (): GoogleButtonStyles => {
    const baseStyles = {
      container: 'relative inline-flex items-center justify-center',
      button: 'flex items-center justify-center gap-3 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
      icon: 'flex-shrink-0',
      text: 'whitespace-nowrap',
      loading: 'absolute inset-0 flex items-center justify-center'
    };

    // Size variations
    const sizeStyles = {
      small: 'px-4 py-2 text-sm',
      medium: 'px-6 py-3 text-base',
      large: 'px-8 py-4 text-lg'
    };

    // Variant styles
    const variantStyles = {
      primary: 'bg-[#4285f4] hover:bg-[#3367d6] text-white border border-[#4285f4] focus:ring-[#4285f4]',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 focus:ring-gray-500',
      outline: 'bg-white hover:bg-gray-50 text-[#4285f4] border border-[#4285f4] focus:ring-[#4285f4]'
    };

    // Disabled styles
    const disabledStyles = 'opacity-50 cursor-not-allowed hover:bg-current';

    return {
      ...baseStyles,
      button: `${baseStyles.button} ${sizeStyles[size]} ${variantStyles[variant]} ${(disabled || isLoading) ? disabledStyles : ''}`,
    };
  };

  const styles = getButtonStyles();

  // Google logo SVG
  const GoogleIcon = () => (
    <svg
      className={`${styles.icon} ${size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-6 h-6' : 'w-5 h-5'}`}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={variant === 'primary' ? '#ffffff' : '#4285F4'}
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill={variant === 'primary' ? '#ffffff' : '#34A853'}
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill={variant === 'primary' ? '#ffffff' : '#FBBC05'}
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill={variant === 'primary' ? '#ffffff' : '#EA4335'}
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );

  // Loading spinner
  const LoadingSpinner = () => (
    <div className={styles.loading}>
      <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );

  if (!isConfigured) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            Google SSO not configured. Please check your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={disabled || isLoading || !isConfigured}
        className={styles.button}
        aria-label={`${buttonText} - Google OAuth 2.0 authentication`}
      >
        {isLoading && <LoadingSpinner />}
        <div className={`flex items-center gap-3 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          {showLogo && <GoogleIcon />}
          <span className={styles.text}>
            {isLoading ? 'Signing in...' : buttonText}
          </span>
        </div>
      </button>

      {/* Error display */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Workspace info */}
      {showWorkspaceInfo && (
        <div className="mt-3 text-xs text-gray-600">
          <p>Sign in with your Google account</p>
          <p>Supports Google Workspace and personal Gmail</p>
        </div>
      )}
    </div>
  );
};

// Google Workspace Detection Component
export const GoogleWorkspaceInfo: React.FC<{
  organizationName?: string;
  domain?: string;
  isWorkspace?: boolean;
  memberCount?: number;
  className?: string;
}> = ({ organizationName, domain, isWorkspace, memberCount, className = '' }) => {
  if (!domain && !isWorkspace) {
    return null;
  }

  const isGoogleWorkspace = isWorkspace || (domain && domain !== 'gmail.com');

  return (
    <div className={`${isGoogleWorkspace ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className={`w-5 h-5 ${isGoogleWorkspace ? 'text-blue-600' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${isGoogleWorkspace ? 'text-blue-900' : 'text-gray-900'}`}>
            {isGoogleWorkspace ? 'Google Workspace Detected' : 'Personal Google Account'}
          </h4>
          {organizationName && (
            <p className={`text-sm mt-1 ${isGoogleWorkspace ? 'text-blue-700' : 'text-gray-700'}`}>
              Organization: {organizationName}
            </p>
          )}
          {domain && (
            <p className={`text-sm ${isGoogleWorkspace ? 'text-blue-700' : 'text-gray-700'}`}>
              Domain: {domain}
            </p>
          )}
          {memberCount && (
            <p className={`text-sm ${isGoogleWorkspace ? 'text-blue-700' : 'text-gray-700'}`}>
              Members: {memberCount}
            </p>
          )}
          <p className={`text-xs mt-2 ${isGoogleWorkspace ? 'text-blue-600' : 'text-gray-600'}`}>
            {isGoogleWorkspace
              ? 'Workspace billing and team management available'
              : 'Individual account - upgrade to workspace for team features'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

// Google SSO Status Component
export const GoogleSSOStatus: React.FC<{
  isAuthenticated: boolean;
  user?: any;
  onSignOut?: () => void;
  className?: string;
}> = ({ isAuthenticated, user, onSignOut, className = '' }) => {
  if (!isAuthenticated || !user) {
    return null;
  }

  const isWorkspace = user.domain && user.domain !== 'gmail.com';

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">
              {user.name}
            </p>
            <p className="text-xs text-green-700">
              {user.email} • Google {isWorkspace ? 'Workspace' : ''}
            </p>
            {user.organizationName && (
              <p className="text-xs text-green-600">
                {user.organizationName}
              </p>
            )}
          </div>
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="text-sm text-green-700 hover:text-green-900 underline"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

// Google One Tap Component (for streamlined sign-in)
export const GoogleOneTap: React.FC<{
  onSuccess?: (result: AuthenticationResult) => void;
  onError?: (error: string) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}> = ({ onSuccess, onError, auto_select = false, cancel_on_tap_outside = true }) => {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = () => {
      const configured = ssoConfig.enabledProviders.includes('google') &&
                        ssoConfig.google.clientId;
      setIsConfigured(configured);
    };

    checkConfig();

    if (isConfigured && typeof window !== 'undefined') {
      // Initialize Google One Tap
      // Note: This would require the Google Identity Services library
      console.log('Google One Tap would be initialized here');
    }
  }, [isConfigured]);

  // This component doesn't render visible UI - it handles the One Tap experience
  return null;
};

// Combined Google Auth Provider Component
export const GoogleAuthProvider: React.FC<{
  children: React.ReactNode;
  clientId?: string;
}> = ({ children, clientId }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
      console.log('Google Identity Services loaded');
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div data-google-auth-provider={isLoaded ? 'loaded' : 'loading'}>
      {children}
    </div>
  );
};

export default GoogleSignIn;