/**
 * SSO Callback Handler Component for BEAR AI
 * Handles OAuth callbacks from Microsoft and Google
 * Processes authentication results and manages workspace setup
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ssoAuthService, SSOUser, AuthenticationResult } from '../../services/auth/SSOAuthService';
import { stripeSSOService, WorkspaceBilling } from '../../services/billing/StripeSSO';
import { LEGAL_INDUSTRY_CONFIG } from '../../config/ssoConfig';

// Types
interface CallbackState {
  loading: boolean;
  success: boolean;
  error: string | null;
  user: SSOUser | null;
  workspaceSetupRequired: boolean;
  workspaceBilling: WorkspaceBilling | null;
  redirectUrl: string | null;
}

interface WorkspaceSetupProps {
  user: SSOUser;
  onComplete: (billing: WorkspaceBilling) => void;
  onSkip: () => void;
}

// Main SSO Callback Component
export const SSOCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<CallbackState>({
    loading: true,
    success: false,
    error: null,
    user: null,
    workspaceSetupRequired: false,
    workspaceBilling: null,
    redirectUrl: null
  });

  // Process the OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const provider = determineProvider();

        // Handle OAuth errors
        if (error) {
          throw new Error(errorDescription || `OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('Authorization code not received');
        }

        if (!provider) {
          throw new Error('Unable to determine SSO provider');
        }

        // Process the callback based on provider
        let result: AuthenticationResult;
        if (provider === 'microsoft') {
          result = await ssoAuthService.handleMicrosoftCallback(code, state || undefined);
        } else {
          result = await ssoAuthService.handleGoogleCallback(code, state || undefined);
        }

        if (!result.success || !result.user) {
          throw new Error(result.error || 'Authentication failed');
        }

        // Check if workspace billing setup is needed
        const workspaceEligibility = stripeSSOService.validateWorkspaceEligibility(result.user);
        let workspaceBilling: WorkspaceBilling | null = null;
        let setupRequired = false;

        if (workspaceEligibility.eligible && result.user.domain) {
          // Check if workspace billing already exists
          const billingResult = await stripeSSOService.getWorkspaceBilling(result.user.domain);

          if (billingResult.success) {
            workspaceBilling = billingResult.data;
            // Add user to existing workspace
            await stripeSSOService.addUserToWorkspace(result.user);
          } else {
            // Setup required for new workspace
            setupRequired = result.user.organizationName !== undefined;
          }
        }

        // Update state with success
        setState({
          loading: false,
          success: true,
          error: null,
          user: result.user,
          workspaceSetupRequired: setupRequired,
          workspaceBilling,
          redirectUrl: getRedirectUrl()
        });

        // Auto-redirect if no workspace setup needed
        if (!setupRequired) {
          setTimeout(() => {
            navigate(getRedirectUrl(), { replace: true });
          }, 2000);
        }

      } catch (error) {
        console.error('SSO callback error:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed'
        }));
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  // Determine the SSO provider from URL or state
  const determineProvider = (): 'microsoft' | 'google' | null => {
    const path = window.location.pathname;

    if (path.includes('microsoft')) {
      return 'microsoft';
    } else if (path.includes('google')) {
      return 'google';
    }

    // Fallback to referrer or stored state
    const referrer = document.referrer;
    if (referrer.includes('login.microsoftonline.com')) {
      return 'microsoft';
    } else if (referrer.includes('accounts.google.com')) {
      return 'google';
    }

    return null;
  };

  // Get the redirect URL after authentication
  const getRedirectUrl = (): string => {
    // Check for stored redirect URL
    const storedUrl = sessionStorage.getItem('sso_redirect_url');
    if (storedUrl) {
      sessionStorage.removeItem('sso_redirect_url');
      return storedUrl;
    }

    // Default to dashboard or home
    return '/dashboard';
  };

  // Handle workspace setup completion
  const handleWorkspaceSetupComplete = (billing: WorkspaceBilling) => {
    setState(prev => ({
      ...prev,
      workspaceSetupRequired: false,
      workspaceBilling: billing
    }));

    // Redirect after setup
    setTimeout(() => {
      navigate(getRedirectUrl(), { replace: true });
    }, 1000);
  };

  // Handle skipping workspace setup
  const handleSkipWorkspaceSetup = () => {
    setState(prev => ({
      ...prev,
      workspaceSetupRequired: false
    }));

    navigate(getRedirectUrl(), { replace: true });
  };

  // Render loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900">
              Completing sign-in...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your credentials
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-lg font-semibold text-red-900">
                Sign-in Failed
              </h2>
            </div>
            <p className="mt-2 text-sm text-red-700">
              {state.error}
            </p>
            <div className="mt-4">
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render workspace setup
  if (state.workspaceSetupRequired && state.user) {
    return (
      <WorkspaceSetup
        user={state.user}
        onComplete={handleWorkspaceSetupComplete}
        onSkip={handleSkipWorkspaceSetup}
      />
    );
  }

  // Render success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-lg font-semibold text-green-900">
              Sign-in Successful
            </h2>
          </div>
          {state.user && (
            <div className="mt-4">
              <p className="text-sm text-green-700">
                Welcome, {state.user.name}!
              </p>
              <p className="text-xs text-green-600 mt-1">
                {state.user.email} • {state.user.provider === 'microsoft' ? 'Microsoft' : 'Google'}
              </p>
              {state.workspaceBilling && (
                <p className="text-xs text-green-600 mt-1">
                  Added to {state.workspaceBilling.organizationName} workspace
                </p>
              )}
            </div>
          )}
          <p className="mt-4 text-sm text-green-700">
            Redirecting you to the application...
          </p>
        </div>
      </div>
    </div>
  );
};

// Workspace Setup Component
const WorkspaceSetup: React.FC<WorkspaceSetupProps> = ({ user, onComplete, onSkip }) => {
  const [step, setStep] = useState<'plan' | 'billing' | 'processing'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle plan selection
  const handlePlanSelect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create payment session
      const result = await stripeSSOService.createPaymentSession(
        user.domain!,
        selectedPlan,
        billingCycle,
        memberCount,
        `${window.location.origin}/auth/billing-success`,
        `${window.location.origin}/auth/billing-cancel`
      );

      if (result.success && result.actionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.actionUrl;
      } else {
        throw new Error(result.error || 'Failed to create payment session');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const pricing = stripeSSOService.calculatePricing(selectedPlan, billingCycle, memberCount);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Set up Workspace Billing
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Configure billing for {user.organizationName} ({user.domain})
            </p>
          </div>

          {step === 'plan' && (
            <div className="space-y-6">
              {/* Plan Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Choose Your Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['basic', 'pro', 'enterprise'].map((plan) => (
                    <div
                      key={plan}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPlan === plan
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPlan(plan as any)}
                    >
                      <h4 className="font-semibold text-gray-900 capitalize">
                        {plan}
                      </h4>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        ${billingCycle === 'monthly'
                          ? plan === 'basic' ? '29' : plan === 'pro' ? '79' : '199'
                          : plan === 'basic' ? '290' : plan === 'pro' ? '790' : '1990'
                        }
                        <span className="text-sm font-normal text-gray-600">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Cycle */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Billing Cycle
                </h3>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="monthly"
                      checked={billingCycle === 'monthly'}
                      onChange={(e) => setBillingCycle(e.target.value as any)}
                      className="mr-2"
                    />
                    Monthly
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="annual"
                      checked={billingCycle === 'annual'}
                      onChange={(e) => setBillingCycle(e.target.value as any)}
                      className="mr-2"
                    />
                    Annual (17% discount)
                  </label>
                </div>
              </div>

              {/* Member Count */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Team Size
                </h3>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={memberCount}
                  onChange={(e) => setMemberCount(parseInt(e.target.value) || 1)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">members</span>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Pricing Summary
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</span>
                    <span>${pricing.perUser}/user/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Members: {memberCount}</span>
                    <span>${pricing.total}</span>
                  </div>
                  {pricing.discount && (
                    <div className="flex justify-between text-green-600">
                      <span>Annual discount:</span>
                      <span>-{Math.round(pricing.discount * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={handlePlanSelect}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Continue to Payment'}
                </button>
                <button
                  onClick={onSkip}
                  className="px-4 py-3 text-gray-600 hover:text-gray-800"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SSOCallback;