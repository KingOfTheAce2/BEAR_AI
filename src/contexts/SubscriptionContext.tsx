import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import {
  SubscriptionTier,
  SubscriptionStatus,
  UserSubscription,
  SubscriptionUsage,
  SUBSCRIPTION_PLANS,
  FEATURE_GATES,
  FeatureConfig,
  PaymentMethod,
  Invoice,
  EnterpriseAccount,
  EnterpriseUser
} from '../types/subscription';

// Context state interface
interface SubscriptionContextState {
  // Current subscription data
  subscription: UserSubscription | null;
  usage: SubscriptionUsage | null;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];

  // Enterprise features
  enterpriseAccount: EnterpriseAccount | null;
  enterpriseUsers: EnterpriseUser[];

  // Loading and error states
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Feature access checking
  hasFeature: (feature: string) => boolean;
  canUseFeature: (feature: string) => { allowed: boolean; reason?: string };

  // Subscription management
  initializeStripe: (secretKey: string, publishableKey: string, webhookSecret: string) => Promise<void>;
  createCustomer: (email: string, name?: string) => Promise<string>;
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  updatePaymentMethod: (paymentMethodId: string) => Promise<void>;

  // Usage tracking
  incrementUsage: (type: keyof SubscriptionUsage, amount?: number) => Promise<void>;
  checkUsageLimit: (type: keyof SubscriptionUsage) => { withinLimit: boolean; current: number; limit: number | null };

  // Enterprise management
  addEnterpriseUser: (email: string, role: 'admin' | 'user' | 'viewer') => Promise<void>;
  removeEnterpriseUser: (userId: string) => Promise<void>;
  updateEnterpriseUser: (userId: string, role: 'admin' | 'user' | 'viewer') => Promise<void>;

  // Data refresh
  refreshSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  refreshInvoices: () => Promise<void>;
}

// Default context value
const defaultContextValue: SubscriptionContextState = {
  subscription: null,
  usage: null,
  paymentMethods: [],
  invoices: [],
  enterpriseAccount: null,
  enterpriseUsers: [],
  loading: false,
  error: null,
  initialized: false,
  hasFeature: () => false,
  canUseFeature: () => ({ allowed: false, reason: 'Not initialized' }),
  initializeStripe: async () => { throw new Error('Not implemented'); },
  createCustomer: async () => { throw new Error('Not implemented'); },
  upgradeSubscription: async () => { throw new Error('Not implemented'); },
  cancelSubscription: async () => { throw new Error('Not implemented'); },
  resumeSubscription: async () => { throw new Error('Not implemented'); },
  updatePaymentMethod: async () => { throw new Error('Not implemented'); },
  incrementUsage: async () => { throw new Error('Not implemented'); },
  checkUsageLimit: () => ({ withinLimit: true, current: 0, limit: null }),
  addEnterpriseUser: async () => { throw new Error('Not implemented'); },
  removeEnterpriseUser: async () => { throw new Error('Not implemented'); },
  updateEnterpriseUser: async () => { throw new Error('Not implemented'); },
  refreshSubscription: async () => { throw new Error('Not implemented'); },
  refreshUsage: async () => { throw new Error('Not implemented'); },
  refreshInvoices: async () => { throw new Error('Not implemented'); }
};

// Create the context
const SubscriptionContext = createContext<SubscriptionContextState>(defaultContextValue);

// Provider props
interface SubscriptionProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
}

// Local storage keys
const STORAGE_KEYS = {
  SUBSCRIPTION: 'bear_ai_subscription',
  USAGE: 'bear_ai_usage',
  CUSTOMER_ID: 'bear_ai_customer_id',
  ENTERPRISE_ACCOUNT: 'bear_ai_enterprise_account'
};

// Provider component
export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  autoInitialize = true
}) => {
  // State management
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [enterpriseAccount, setEnterpriseAccount] = useState<EnterpriseAccount | null>(null);
  const [enterpriseUsers, setEnterpriseUsers] = useState<EnterpriseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Utility function to handle errors
  const handleError = useCallback((error: any, action: string) => {
    const errorMessage = error?.message || error?.toString() || `Failed to ${action}`;
    console.error(`Subscription error during ${action}:`, error);
    setError(errorMessage);
    return errorMessage;
  }, []);

  // Initialize Stripe client
  const initializeStripe = useCallback(async (
    secretKey: string,
    publishableKey: string,
    webhookSecret: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      await invoke('stripe_init_client', {
        secretKey,
        publishableKey,
        webhookSecret,
        environment: secretKey.startsWith('sk_live_') ? 'live' : 'test'
      });

      setInitialized(true);
      console.log('Stripe client initialized successfully');
    } catch (error) {
      handleError(error, 'initialize Stripe');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create customer
  const createCustomer = useCallback(async (email: string, name?: string): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      const customer = await invoke('stripe_create_customer', {
        request: { email, name }
      });

      // Store customer ID for future use
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_ID, (customer as any).id);

      console.log('Customer created:', (customer as any).id);
      return (customer as any).id;
    } catch (error) {
      handleError(error, 'create customer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Feature access checking
  const hasFeature = useCallback((feature: string): boolean => {
    if (!subscription) return feature === 'basicChat'; // Free tier gets basic chat

    const featureConfig = FEATURE_GATES[feature];
    if (!featureConfig) return false;

    const currentTierIndex = Object.values(SubscriptionTier).indexOf(subscription.tier);
    const requiredTierIndex = Object.values(SubscriptionTier).indexOf(featureConfig.requiredTier);

    return currentTierIndex >= requiredTierIndex;
  }, [subscription]);

  const canUseFeature = useCallback((feature: string): { allowed: boolean; reason?: string } => {
    if (!subscription) {
      return { allowed: feature === 'basicChat', reason: 'No active subscription' };
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: 'Subscription not active' };
    }

    const featureConfig = FEATURE_GATES[feature];
    if (!featureConfig) {
      return { allowed: false, reason: 'Unknown feature' };
    }

    if (!hasFeature(feature)) {
      return {
        allowed: false,
        reason: featureConfig.upgradeMessage
      };
    }

    return { allowed: true };
  }, [subscription, hasFeature]);

  // Usage tracking
  const incrementUsage = useCallback(async (
    type: keyof SubscriptionUsage,
    amount: number = 1
  ) => {
    if (!usage) return;

    const newUsage = { ...usage };

    switch (type) {
      case 'documentsUploaded':
        newUsage.documentsUploaded += amount;
        break;
      case 'analysisJobsRun':
        newUsage.analysisJobsRun += amount;
        break;
      case 'chatSessionsCreated':
        newUsage.chatSessionsCreated += amount;
        break;
      case 'storageUsed':
        newUsage.storageUsed += amount;
        break;
    }

    setUsage(newUsage);
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(newUsage));
  }, [usage]);

  const checkUsageLimit = useCallback((type: keyof SubscriptionUsage) => {
    if (!subscription || !usage) {
      return { withinLimit: false, current: 0, limit: null };
    }

    const limits = subscription.plan.limits;
    const current = usage[type] as number;
    let limit: number | null = null;

    switch (type) {
      case 'documentsUploaded':
        limit = limits.maxDocuments;
        break;
      case 'analysisJobsRun':
        limit = limits.maxAnalysisJobs;
        break;
      case 'chatSessionsCreated':
        limit = limits.maxChatSessions;
        break;
      case 'storageUsed':
        limit = null; // Storage limit handled differently
        break;
    }

    const withinLimit = limit === null || current < limit;
    return { withinLimit, current, limit };
  }, [subscription, usage]);

  // Subscription management
  const upgradeSubscription = useCallback(async (tier: SubscriptionTier) => {
    try {
      setLoading(true);
      setError(null);

      const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
      if (!customerId) {
        throw new Error('No customer ID found. Please create an account first.');
      }

      const plan = SUBSCRIPTION_PLANS[tier];
      if (!plan.stripePriceId) {
        throw new Error('Invalid subscription plan');
      }

      const result = await invoke('stripe_create_subscription', {
        request: {
          customer_id: customerId,
          price_id: plan.stripePriceId,
          trial_period_days: tier === SubscriptionTier.PROFESSIONAL ? 14 : undefined
        }
      });

      // Update local subscription data
      const newSubscription: UserSubscription = {
        id: (result as any).id,
        userId: customerId,
        customerId,
        subscriptionId: (result as any).id,
        tier,
        status: (result as any).status as SubscriptionStatus,
        currentPeriodStart: new Date((result as any).current_period_start * 1000),
        currentPeriodEnd: new Date((result as any).current_period_end * 1000),
        cancelAtPeriodEnd: (result as any).cancel_at_period_end,
        trialEnd: (result as any).trial_end ? new Date((result as any).trial_end * 1000) : null,
        plan,
        usage: usage || {
          documentsUploaded: 0,
          analysisJobsRun: 0,
          chatSessionsCreated: 0,
          storageUsed: 0,
          lastResetDate: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setSubscription(newSubscription);
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(newSubscription));

      console.log('Subscription upgraded to:', tier);
    } catch (error) {
      handleError(error, 'upgrade subscription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [usage, handleError]);

  const cancelSubscription = useCallback(async () => {
    if (!subscription?.subscriptionId) {
      throw new Error('No active subscription to cancel');
    }

    try {
      setLoading(true);
      setError(null);

      await invoke('stripe_update_subscription', {
        request: {
          subscription_id: subscription.subscriptionId,
          cancel_at_period_end: true
        }
      });

      const updatedSubscription = {
        ...subscription,
        cancelAtPeriodEnd: true,
        updatedAt: new Date()
      };

      setSubscription(updatedSubscription);
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));

      console.log('Subscription will be cancelled at period end');
    } catch (error) {
      handleError(error, 'cancel subscription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [subscription, handleError]);

  const resumeSubscription = useCallback(async () => {
    if (!subscription?.subscriptionId) {
      throw new Error('No subscription to resume');
    }

    try {
      setLoading(true);
      setError(null);

      await invoke('stripe_update_subscription', {
        request: {
          subscription_id: subscription.subscriptionId,
          cancel_at_period_end: false
        }
      });

      const updatedSubscription = {
        ...subscription,
        cancelAtPeriodEnd: false,
        updatedAt: new Date()
      };

      setSubscription(updatedSubscription);
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));

      console.log('Subscription resumed');
    } catch (error) {
      handleError(error, 'resume subscription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [subscription, handleError]);

  const updatePaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Implementation would depend on your specific payment method update flow
      console.log('Payment method updated:', paymentMethodId);
    } catch (error) {
      handleError(error, 'update payment method');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Enterprise management
  const addEnterpriseUser = useCallback(async (email: string, role: 'admin' | 'user' | 'viewer') => {
    if (!enterpriseAccount) {
      throw new Error('No enterprise account');
    }

    try {
      setLoading(true);
      setError(null);

      // Implementation would call backend to add user
      console.log('Adding enterprise user:', email, role);
    } catch (error) {
      handleError(error, 'add enterprise user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [enterpriseAccount, handleError]);

  const removeEnterpriseUser = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Implementation would call backend to remove user
      console.log('Removing enterprise user:', userId);
    } catch (error) {
      handleError(error, 'remove enterprise user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const updateEnterpriseUser = useCallback(async (userId: string, role: 'admin' | 'user' | 'viewer') => {
    try {
      setLoading(true);
      setError(null);

      // Implementation would call backend to update user
      console.log('Updating enterprise user:', userId, role);
    } catch (error) {
      handleError(error, 'update enterprise user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Data refresh functions
  const refreshSubscription = useCallback(async () => {
    const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerId) return;

    try {
      setLoading(true);
      // Implementation would fetch current subscription from Stripe
    } catch (error) {
      handleError(error, 'refresh subscription');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const refreshUsage = useCallback(async () => {
    try {
      setLoading(true);
      // Implementation would fetch current usage from backend
    } catch (error) {
      handleError(error, 'refresh usage');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const refreshInvoices = useCallback(async () => {
    const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerId) return;

    try {
      setLoading(true);

      const invoiceList = await invoke('stripe_get_invoices', {
        customerId,
        limit: 20
      });

      setInvoices(invoiceList as Invoice[]);
    } catch (error) {
      handleError(error, 'refresh invoices');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Initialize from localStorage on mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const storedSubscription = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
        if (storedSubscription) {
          const parsed = JSON.parse(storedSubscription);
          // Convert date strings back to Date objects
          parsed.currentPeriodStart = new Date(parsed.currentPeriodStart);
          parsed.currentPeriodEnd = new Date(parsed.currentPeriodEnd);
          if (parsed.trialEnd) parsed.trialEnd = new Date(parsed.trialEnd);
          if (parsed.usage?.lastResetDate) parsed.usage.lastResetDate = new Date(parsed.usage.lastResetDate);
          setSubscription(parsed);
        }

        const storedUsage = localStorage.getItem(STORAGE_KEYS.USAGE);
        if (storedUsage) {
          const parsed = JSON.parse(storedUsage);
          parsed.lastResetDate = new Date(parsed.lastResetDate);
          setUsage(parsed);
        }

        const storedEnterprise = localStorage.getItem(STORAGE_KEYS.ENTERPRISE_ACCOUNT);
        if (storedEnterprise) {
          setEnterpriseAccount(JSON.parse(storedEnterprise));
        }
      } catch (error) {
        console.error('Error loading subscription data from storage:', error);
      }
    };

    loadFromStorage();
  }, []);

  // Listen for webhook events
  useEffect(() => {
    const setupWebhookListener = async () => {
      try {
        const unlisten = await listen('stripe-webhook-event', (event) => {
          console.log('Received Stripe webhook event:', event.payload);
          // Refresh subscription data when webhooks are received
          refreshSubscription();
        });

        return unlisten;
      } catch (error) {
        console.error('Error setting up webhook listener:', error);
      }
    };

    if (initialized) {
      setupWebhookListener();
    }
  }, [initialized, refreshSubscription]);

  // Context value
  const contextValue: SubscriptionContextState = {
    subscription,
    usage,
    paymentMethods,
    invoices,
    enterpriseAccount,
    enterpriseUsers,
    loading,
    error,
    initialized,
    hasFeature,
    canUseFeature,
    initializeStripe,
    createCustomer,
    upgradeSubscription,
    cancelSubscription,
    resumeSubscription,
    updatePaymentMethod,
    incrementUsage,
    checkUsageLimit,
    addEnterpriseUser,
    removeEnterpriseUser,
    updateEnterpriseUser,
    refreshSubscription,
    refreshUsage,
    refreshInvoices
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Custom hook to use the subscription context
export const useSubscription = (): SubscriptionContextState => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Higher-order component for subscription-aware components
export const withSubscription = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => (
    <SubscriptionProvider>
      <Component {...props} />
    </SubscriptionProvider>
  );
};

export default SubscriptionContext;