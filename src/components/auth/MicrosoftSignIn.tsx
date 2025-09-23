/**
 * Microsoft SignIn Component for BEAR AI
 * Enterprise-grade Microsoft Azure AD integration with MSAL
 * Supports workspace authentication and organization billing
 */

import React, { useState, useEffect } from 'react';
import { ssoAuthService, AuthenticationResult } from '../../services/auth/SSOAuthService';
import { stripeSSOService } from '../../services/billing/StripeSSO';
import { ssoConfig, LEGAL_INDUSTRY_CONFIG } from '../../config/ssoConfig';

// Types
interface MicrosoftSignInProps {
  onSuccess?: (result: AuthenticationResult) => void;
  onError?: (error: string) => void;
  onWorkspaceDetected?: (organizationName: string, domain: string) => void;
  className?: string;
  buttonText?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loginHint?: string;
  showLogo?: boolean;
  showWorkspaceInfo?: boolean;
}

interface MicrosoftButtonStyles {
  container: string;
  button: string;
  icon: string;
  text: string;
  loading: string;
}

// Microsoft SignIn Component
export const MicrosoftSignIn: React.FC<MicrosoftSignInProps> = ({
  onSuccess,
  onError,
  onWorkspaceDetected,
  className = '',
  buttonText = 'Sign in with Microsoft',
  size = 'medium',
  variant = 'primary',
  disabled = false,
  loginHint,
  showLogo = true,
  showWorkspaceInfo = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check configuration on mount
  useEffect(() => {
    const checkConfig = () => {
      const configured = ssoConfig.enabledProviders.includes('microsoft') && 
                        ssoConfig.microsoft.clientId && 
                        ssoConfig.microsoft.authority;
      setIsConfigured(configured);
      
      if (!configured) {
        setError('Microsoft SSO not configured');
      }
    };

    checkConfig();
  }, []);

  // Handle Microsoft sign-in
  const handleSignIn = async () => {
    if (!isConfigured || isLoading || disabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Start Microsoft authentication
      const result = await ssoAuthService.authenticateWithMicrosoft({
        loginHint,
        prompt: 'select_account'
      });

      if (result.success) {
        // Authentication will continue via redirect
        // The actual success handling happens in the callback component
        console.log('Microsoft authentication initiated');
      } else {
        throw new Error(result.error || 'Microsoft authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Microsoft sign-in failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get button styles based on props
  const getButtonStyles = (): MicrosoftButtonStyles => {
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
      primary: 'bg-[#0078d4] hover:bg-[#106ebe] text-white border border-[#0078d4] focus:ring-[#0078d4]',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 focus:ring-gray-500',
      outline: 'bg-white hover:bg-gray-50 text-[#0078d4] border border-[#0078d4] focus:ring-[#0078d4]'
    };

    // Disabled styles
    const disabledStyles = 'opacity-50 cursor-not-allowed hover:bg-current';

    return {
      ...baseStyles,
      button: `${baseStyles.button} ${sizeStyles[size]} ${variantStyles[variant]} ${(disabled || isLoading) ? disabledStyles : ''}`,
    };
  };

  const styles = getButtonStyles();

  // Microsoft logo SVG
  const MicrosoftIcon = () => (
    <svg 
      className={`${styles.icon} ${size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-6 h-6' : 'w-5 h-5'}`}
      viewBox="0 0 23 23" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="10" height="10" fill={variant === 'primary' ? '#ffffff' : '#F25022'} />
      <rect x="12" y="1" width="10" height="10" fill={variant === 'primary' ? '#ffffff' : '#7FBA00'} />
      <rect x="1" y="12" width="10" height="10" fill={variant === 'primary' ? '#ffffff' : '#00A4EF'} />
      <rect x="12" y="12" width="10" height="10" fill={variant === 'primary' ? '#ffffff' : '#FFB900'} />
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
            Microsoft SSO not configured. Please check your environment variables.
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
        aria-label={`${buttonText} - Microsoft Azure AD authentication`}
      >
        {isLoading && <LoadingSpinner />}
        <div className={`flex items-center gap-3 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          {showLogo && <MicrosoftIcon />}
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
          <p>Sign in with your organization account</p>
          <p>Supports Microsoft 365 and Azure AD</p>
        </div>
      )}
    </div>
  );
};

// Microsoft Workspace Detection Component
export const MicrosoftWorkspaceInfo: React.FC<{
  organizationName?: string;
  domain?: string;
  memberCount?: number;
  className?: string;
}> = ({ organizationName, domain, memberCount, className = '' }) => {
  if (!organizationName && !domain) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900">
            Workspace Detected
          </h4>
          {organizationName && (
            <p className="text-sm text-blue-700 mt-1">
              Organization: {organizationName}
            </p>
          )}
          {domain && (
            <p className="text-sm text-blue-700">
              Domain: {domain}
            </p>
          )}
          {memberCount && (
            <p className="text-sm text-blue-700">
              Members: {memberCount}
            </p>
          )}
          <p className="text-xs text-blue-600 mt-2">
            Workspace billing and team management available
          </p>
        </div>
      </div>
    </div>
  );
};

// Microsoft SSO Status Component
export const MicrosoftSSOStatus: React.FC<{
  isAuthenticated: boolean;
  user?: any;
  onSignOut?: () => void;
  className?: string;
}> = ({ isAuthenticated, user, onSignOut, className = '' }) => {
  if (!isAuthenticated || !user) {
    return null;
  }

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
              {user.email} • Microsoft
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

export default MicrosoftSignIn;