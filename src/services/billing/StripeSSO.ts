/**
 * Stripe SSO Integration for BEAR AI
 * Links SSO accounts to Stripe customers for workspace/organization billing
 * Handles subscription management per SSO domain with enterprise features
 */

import { SSOUser, SSOSession } from '../auth/SSOAuthService';

// Types
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  organizationName?: string;
  domain?: string;
  ssoProvider: 'microsoft' | 'google';
  ssoUserId: string;
  tenantId?: string;
  metadata: Record<string, string>;
  created: number;
  livemode: boolean;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  trialStart?: number;
  trialEnd?: number;
  items: StripeSubscriptionItem[];
  metadata: Record<string, string>;
}

export interface StripeSubscriptionItem {
  id: string;
  priceId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface WorkspaceBilling {
  organizationId: string;
  organizationName: string;
  domain: string;
  adminUserId: string;
  adminEmail: string;
  ssoProvider: 'microsoft' | 'google';
  stripeCustomerId: string;
  subscriptionId?: string;
  subscription?: StripeSubscription;
  memberCount: number;
  maxMembers: number;
  billingCycle: 'monthly' | 'annual';
  planType: 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
  trialEndsAt?: Date;
  nextBillingDate?: Date;
  totalCost: number;
  currency: 'usd';
}

export interface BillingResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

// Stripe SSO Integration Service
export class StripeSSOService {
  private stripePublishableKey: string;
  private apiBaseUrl: string;

  constructor() {
    this.stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
    this.apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:1420';

    if (!this.stripePublishableKey) {
      console.warn('Stripe publishable key not configured');
    }
  }

  /**
   * Create or update Stripe customer for SSO user
   */
  public async createOrUpdateCustomer(user: SSOUser): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          ssoUser: user,
          metadata: {
            sso_provider: user.provider,
            sso_user_id: user.id,
            tenant_id: user.tenantId,
            organization_id: user.organizationId,
            domain: user.domain,
            created_via: 'sso_integration',
            legal_industry: 'true',
            compliance_required: 'true'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create customer: ${response.statusText}`);
      }

      const customer = await response.json();

      return {
        success: true,
        data: customer
      };
    } catch (error) {
      console.error('Create customer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer'
      };
    }
  }

  /**
   * Setup workspace billing for organization
   */
  public async setupWorkspaceBilling(
    user: SSOUser,
    planType: 'basic' | 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'annual',
    memberCount: number = 1
  ): Promise<BillingResult> {
    try {
      if (!user.organizationName || !user.domain) {
        throw new Error('Organization information required for workspace billing');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          ssoUser: user,
          planType,
          billingCycle,
          memberCount,
          organizationInfo: {
            name: user.organizationName,
            domain: user.domain,
            tenantId: user.tenantId,
            ssoProvider: user.provider
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to setup workspace billing: ${response.statusText}`);
      }

      const workspaceBilling = await response.json();

      return {
        success: true,
        data: workspaceBilling
      };
    } catch (error) {
      console.error('Setup workspace billing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup workspace billing'
      };
    }
  }

  /**
   * Get workspace billing information
   */
  public async getWorkspaceBilling(domain: string): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/workspace/${encodeURIComponent(domain)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Workspace billing not found'
          };
        }
        throw new Error(`Failed to get workspace billing: ${response.statusText}`);
      }

      const workspaceBilling = await response.json();

      return {
        success: true,
        data: workspaceBilling
      };
    } catch (error) {
      console.error('Get workspace billing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workspace billing'
      };
    }
  }

  /**
   * Add user to existing workspace billing
   */
  public async addUserToWorkspace(user: SSOUser): Promise<BillingResult> {
    try {
      if (!user.domain) {
        throw new Error('User domain required');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/workspace/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          ssoUser: user,
          domain: user.domain
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add user to workspace: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Add user to workspace error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add user to workspace'
      };
    }
  }

  /**
   * Update subscription (change plan, add/remove users)
   */
  public async updateSubscription(
    domain: string,
    updates: {
      planType?: 'basic' | 'pro' | 'enterprise';
      memberCount?: number;
      billingCycle?: 'monthly' | 'annual';
    }
  ): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/subscription/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          domain,
          updates
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update subscription: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Update subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription'
      };
    }
  }

  /**
   * Create payment session for subscription
   */
  public async createPaymentSession(
    domain: string,
    planType: 'basic' | 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'annual',
    memberCount: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          domain,
          planType,
          billingCycle,
          memberCount,
          successUrl,
          cancelUrl,
          mode: 'subscription'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create payment session: ${response.statusText}`);
      }

      const session = await response.json();

      return {
        success: true,
        data: session,
        requiresAction: true,
        actionUrl: session.url
      };
    } catch (error) {
      console.error('Create payment session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment session'
      };
    }
  }

  /**
   * Handle subscription status changes
   */
  public async handleSubscriptionUpdate(subscriptionId: string): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/subscription/${subscriptionId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to sync subscription: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Handle subscription update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle subscription update'
      };
    }
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(domain: string, reason?: string): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          domain,
          reason
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel subscription: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Get billing history for workspace
   */
  public async getBillingHistory(domain: string, limit: number = 10): Promise<BillingResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/billing/sso/history/${encodeURIComponent(domain)}?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get billing history: ${response.statusText}`);
      }

      const history = await response.json();

      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('Get billing history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get billing history'
      };
    }
  }

  /**
   * Generate billing portal session
   */
  public async createPortalSession(domain: string, returnUrl: string): Promise<BillingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/billing/sso/portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          domain,
          returnUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create portal session: ${response.statusText}`);
      }

      const session = await response.json();

      return {
        success: true,
        data: session,
        requiresAction: true,
        actionUrl: session.url
      };
    } catch (error) {
      console.error('Create portal session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portal session'
      };
    }
  }

  /**
   * Calculate pricing for plan
   */
  public calculatePricing(
    planType: 'basic' | 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'annual',
    memberCount: number
  ): { perUser: number; total: number; discount?: number } {
    const pricing = {
      basic: { monthly: 29, annual: 290 },
      pro: { monthly: 79, annual: 790 },
      enterprise: { monthly: 199, annual: 1990 }
    };

    const basePrice = pricing[planType][billingCycle];
    const perUser = billingCycle === 'annual' ? basePrice / 12 : basePrice;
    const total = basePrice * memberCount;

    let discount = 0;
    if (billingCycle === 'annual') {
      discount = 0.17; // 17% discount for annual billing
    }

    return {
      perUser: Math.round(perUser * 100) / 100,
      total: Math.round(total * (1 - discount) * 100) / 100,
      discount: discount > 0 ? discount : undefined
    };
  }

  /**
   * Validate workspace eligibility
   */
  public validateWorkspaceEligibility(user: SSOUser): { eligible: boolean; reason?: string } {
    if (!user.organizationName) {
      return {
        eligible: false,
        reason: 'Organization information not available from SSO provider'
      };
    }

    if (!user.domain || user.domain === 'gmail.com' || user.domain === 'outlook.com') {
      return {
        eligible: false,
        reason: 'Workspace billing requires a custom domain'
      };
    }

    if (user.provider === 'google' && !user.domain.includes('.')) {
      return {
        eligible: false,
        reason: 'Invalid domain format'
      };
    }

    return { eligible: true };
  }

  /**
   * Get authentication token for API calls
   */
  private getAuthToken(): string {
    // In a real implementation, this would get the current user's JWT token
    return localStorage.getItem('bear_ai_auth_token') || '';
  }
}

// Export singleton instance
export const stripeSSOService = new StripeSSOService();

// Export utility functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100); // Stripe amounts are in cents
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};