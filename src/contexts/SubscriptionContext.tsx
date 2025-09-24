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
  PaymentMethod,
  Invoice,
  EnterpriseAccount,
  EnterpriseUser
} from '../types/subscription';

// Stripe API types
interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  created: number;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  trial_end?: number;
  created: number;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
}

interface StripePaymentMethod {
  id: string;
  type: string;
  created: number;
  card?: {
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
}

interface StripePaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: Record<string, unknown>;
  };
}

interface StripeCoupon {
  id: string;
  name?: string;
  percent_off?: number;
  amount_off?: number;
  duration: string;
}

interface StripePortalSession {
  id: string;
  url: string;
  customer: string;
  return_url: string;
}

interface StripeInvoicePreview {
  amount_due: number;
  subscription: string;
  lines: {
    data: Array<{
      amount: number;
      description: string;
    }>;
  };
}

interface StripePromotionCode {
  id: string;
  code: string;
  active: boolean;
  coupon: StripeCoupon;
}

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
  createSubscription: (customerId: string, priceId: string, trialPeriodDays?: number) => Promise<any>;
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  updatePaymentMethod: (paymentMethodId: string) => Promise<void>;
  getPaymentMethods: (customerId?: string) => Promise<PaymentMethod[]>;
  createPaymentIntent: (amount: number, currency: string, customerId?: string) => Promise<any>;
  confirmPayment: (paymentIntentId: string, paymentMethodId: string) => Promise<any>;
  handleWebhook: (rawBody: string, signature: string) => Promise<any>;
  syncSubscriptionStatus: (subscriptionId: string) => Promise<void>;
  createPortalSession: (customerId: string, returnUrl: string) => Promise<{ url: string }>;
  previewUpgrade: (fromTier: SubscriptionTier, toTier: SubscriptionTier) => Promise<{ amountDue: number; prorationDate: Date }>;
  applyPromoCode: (code: string, subscriptionId?: string) => Promise<{ valid: boolean; discount?: any }>;

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

  // Additional missing functions
  getSubscriptionStatus: () => SubscriptionStatus;
  getCurrentPlan: () => SubscriptionTier;
  getRemainingCredits: () => number;
  isFeatureEnabled: (feature: string) => boolean;
  getUsageStatistics: () => SubscriptionUsage;
  checkQuotaLimit: (type: keyof SubscriptionUsage) => { withinLimit: boolean; current: number; limit: number | null; percentage: number };
  getInvoices: () => Promise<Invoice[]>;
  downloadInvoice: (invoiceId: string) => Promise<string>;
  updateBillingAddress: (address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string }) => Promise<void>;
  getAvailableModels: () => string[];
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
  createSubscription: async () => { throw new Error('Not implemented'); },
  upgradeSubscription: async () => { throw new Error('Not implemented'); },
  cancelSubscription: async () => { throw new Error('Not implemented'); },
  resumeSubscription: async () => { throw new Error('Not implemented'); },
  updatePaymentMethod: async () => { throw new Error('Not implemented'); },
  getPaymentMethods: async () => { throw new Error('Not implemented'); },
  createPaymentIntent: async () => { throw new Error('Not implemented'); },
  confirmPayment: async () => { throw new Error('Not implemented'); },
  handleWebhook: async () => { throw new Error('Not implemented'); },
  syncSubscriptionStatus: async () => { throw new Error('Not implemented'); },
  createPortalSession: async () => { throw new Error('Not implemented'); },
  previewUpgrade: async () => { throw new Error('Not implemented'); },
  applyPromoCode: async () => { throw new Error('Not implemented'); },
  incrementUsage: async () => { throw new Error('Not implemented'); },
  checkUsageLimit: () => ({ withinLimit: true, current: 0, limit: null }),
  addEnterpriseUser: async () => { throw new Error('Not implemented'); },
  removeEnterpriseUser: async () => { throw new Error('Not implemented'); },
  updateEnterpriseUser: async () => { throw new Error('Not implemented'); },
  refreshSubscription: async () => { throw new Error('Not implemented'); },
  refreshUsage: async () => { throw new Error('Not implemented'); },
  refreshInvoices: async () => { throw new Error('Not implemented'); },
  getSubscriptionStatus: () => SubscriptionStatus.INACTIVE,
  getCurrentPlan: () => SubscriptionTier.FREE,
  getRemainingCredits: () => 0,
  isFeatureEnabled: () => false,
  getUsageStatistics: () => ({ documentsUploaded: 0, analysisJobsRun: 0, chatSessionsCreated: 0, storageUsed: 0, lastResetDate: new Date() }),
  checkQuotaLimit: () => ({ withinLimit: true, current: 0, limit: null, percentage: 0 }),
  getInvoices: async () => [],
  downloadInvoice: async () => { throw new Error('Not implemented'); },
  updateBillingAddress: async () => { throw new Error('Not implemented'); },
  getAvailableModels: () => []
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
    // Subscription error logged
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
      // Stripe client initialized
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

      // Customer created
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

      // Subscription upgraded
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

      // Subscription will be cancelled
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

      // Subscription resumed
    } catch (error) {
      handleError(error, 'resume subscription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [subscription, handleError]);

  const updatePaymentMethod = useCallback(async (paymentMethodId: string) => {
    const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerId) {
      throw new Error('No customer ID found');
    }

    try {
      setLoading(true);
      setError(null);

      // Attach the payment method to the customer
      await invoke('stripe_attach_payment_method', {
        paymentMethodId,
        customerId
      });

      // Update the customer's default payment method
      await invoke('stripe_update_customer', {
        customerId,
        defaultPaymentMethod: paymentMethodId
      });

      // Update the subscription's default payment method if there's an active subscription
      if (subscription?.subscriptionId) {
        await invoke('stripe_update_subscription', {
          request: {
            subscription_id: subscription.subscriptionId,
            default_payment_method: paymentMethodId
          }
        });
      }

      // Refresh payment methods list
      const paymentMethodsList = await invoke('stripe_get_payment_methods', {
        customerId,
        type: 'card'
      });

      const mappedPaymentMethods = (paymentMethodsList as any[]).map(pm => ({
        id: pm.id,
        customerId,
        stripePaymentMethodId: pm.id,
        type: pm.type as 'card' | 'bank_account',
        last4: pm.card?.last4 || '',
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: pm.id === paymentMethodId,
        createdAt: new Date(pm.created * 1000)
      }));

      setPaymentMethods(mappedPaymentMethods);

      // Payment method updated
    } catch (error) {
      handleError(error, 'update payment method');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [subscription, handleError]);

  // Create subscription
  const createSubscription = useCallback(async (
    customerId: string,
    priceId: string,
    trialPeriodDays?: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const subscriptionData = await invoke('stripe_create_subscription', {
        request: {
          customer_id: customerId,
          price_id: priceId,
          trial_period_days: trialPeriodDays
        }
      });

      // Store subscription data
      localStorage.setItem('stripe_subscription_id', (subscriptionData as any).id);
      localStorage.setItem('stripe_subscription_data', JSON.stringify(subscriptionData));

      return subscriptionData;
    } catch (error) {
      handleError(error, 'create subscription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Get payment methods
  const getPaymentMethods = useCallback(async (customerId?: string): Promise<PaymentMethod[]> => {
    const customerIdToUse = customerId || localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerIdToUse) {
      throw new Error('No customer ID provided or found');
    }

    try {
      setLoading(true);
      setError(null);

      const paymentMethodsList = await invoke('stripe_get_payment_methods', {
        customerId: customerIdToUse,
        type: 'card'
      });

      const mappedPaymentMethods = (paymentMethodsList as any[]).map(pm => ({
        id: pm.id,
        customerId: customerIdToUse,
        stripePaymentMethodId: pm.id,
        type: pm.type as 'card' | 'bank_account',
        last4: pm.card?.last4 || '',
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: false, // Would need additional API call to determine default
        createdAt: new Date(pm.created * 1000)
      }));

      setPaymentMethods(mappedPaymentMethods);
      localStorage.setItem('stripe_payment_methods', JSON.stringify(mappedPaymentMethods));

      return mappedPaymentMethods;
    } catch (error) {
      handleError(error, 'get payment methods');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create payment intent
  const createPaymentIntent = useCallback(async (
    amount: number,
    currency: string,
    customerId?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const paymentIntentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId || localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID),
        automatic_payment_methods: {
          enabled: true
        }
      };

      const paymentIntent = await invoke('stripe_create_payment_intent', {
        request: paymentIntentData
      });

      // Store payment intent data
      localStorage.setItem('stripe_payment_intent_id', (paymentIntent as any).id);
      localStorage.setItem('stripe_payment_intent_secret', (paymentIntent as any).client_secret);

      return paymentIntent;
    } catch (error) {
      handleError(error, 'create payment intent');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Confirm payment
  const confirmPayment = useCallback(async (
    paymentIntentId: string,
    paymentMethodId: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const confirmedPayment = await invoke('stripe_confirm_payment_intent', {
        paymentIntentId,
        paymentMethodId
      });

      // Update payment status in localStorage
      const paymentStatus = {
        id: paymentIntentId,
        status: (confirmedPayment as any).status,
        amount: (confirmedPayment as any).amount,
        confirmedAt: new Date().toISOString()
      };

      localStorage.setItem('stripe_last_payment_status', JSON.stringify(paymentStatus));

      return confirmedPayment;
    } catch (error) {
      handleError(error, 'confirm payment');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Handle webhook
  const handleWebhook = useCallback(async (
    rawBody: string,
    signature: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const event = await invoke('stripe_verify_webhook', {
        rawBody,
        signature
      });

      const eventData = event as StripeWebhookEvent;

      // Handle different webhook event types
      switch (eventData.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // Refresh subscription data
          await refreshSubscription();
          break;
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          // Refresh invoice data
          await refreshInvoices();
          break;
        case 'customer.created':
        case 'customer.updated':
          // Store customer data updates
          if (eventData.data?.object?.id) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMER_ID, eventData.data.object.id);
          }
          break;
      }

      // Store webhook event for debugging
      const webhookHistory = JSON.parse(localStorage.getItem('stripe_webhook_history') || '[]');
      webhookHistory.unshift({
        id: eventData.id,
        type: eventData.type,
        created: eventData.created,
        processed: new Date().toISOString()
      });

      // Keep only last 50 webhook events
      if (webhookHistory.length > 50) {
        webhookHistory.splice(50);
      }

      localStorage.setItem('stripe_webhook_history', JSON.stringify(webhookHistory));

      return eventData;
    } catch (error) {
      handleError(error, 'handle webhook');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, refreshSubscription, refreshInvoices]);

  // Sync subscription status
  const syncSubscriptionStatus = useCallback(async (subscriptionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const subscriptionData = await invoke('stripe_get_subscription', {
        subscriptionId
      });

      const sub = subscriptionData as StripeSubscription;

      // Determine tier from subscription data
      const tierMap: Record<string, SubscriptionTier> = {
        'price_professional_monthly': SubscriptionTier.PROFESSIONAL,
        'price_enterprise_monthly': SubscriptionTier.ENTERPRISE
      };

      const tier = tierMap[sub.items.data[0]?.price.id] || SubscriptionTier.FREE;
      const plan = SUBSCRIPTION_PLANS[tier];

      const updatedSubscription: UserSubscription = {
        id: sub.id,
        userId: sub.customer,
        customerId: sub.customer,
        subscriptionId: sub.id,
        tier,
        status: sub.status as SubscriptionStatus,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        plan,
        usage: usage || {
          documentsUploaded: 0,
          analysisJobsRun: 0,
          chatSessionsCreated: 0,
          storageUsed: 0,
          lastResetDate: new Date()
        },
        createdAt: new Date(sub.created * 1000),
        updatedAt: new Date()
      };

      setSubscription(updatedSubscription);
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));
    } catch (error) {
      handleError(error, 'sync subscription status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [usage, handleError]);

  // Create portal session
  const createPortalSession = useCallback(async (
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }> => {
    try {
      setLoading(true);
      setError(null);

      const portalSession = await invoke('stripe_create_portal_session', {
        request: {
          customer: customerId,
          return_url: returnUrl
        }
      });

      const sessionUrl = (portalSession as StripePortalSession).url;

      // Store portal session data
      localStorage.setItem('stripe_portal_session', JSON.stringify({
        url: sessionUrl,
        customerId,
        createdAt: new Date().toISOString()
      }));

      return { url: sessionUrl };
    } catch (error) {
      handleError(error, 'create portal session');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Preview upgrade
  const previewUpgrade = useCallback(async (
    fromTier: SubscriptionTier,
    toTier: SubscriptionTier
  ): Promise<{ amountDue: number; prorationDate: Date }> => {
    try {
      setLoading(true);
      setError(null);

      if (!subscription?.subscriptionId) {
        throw new Error('No active subscription to upgrade');
      }

      const toPlan = SUBSCRIPTION_PLANS[toTier];
      if (!toPlan.stripePriceId) {
        throw new Error('Invalid target subscription plan');
      }

      const preview = await invoke('stripe_preview_subscription_update', {
        subscriptionId: subscription.subscriptionId,
        newPriceId: toPlan.stripePriceId,
        prorationBehavior: 'create_prorations'
      });

      const previewData = preview as StripeInvoicePreview;
      const amountDue = previewData.amount_due || 0;
      const prorationDate = new Date();

      // Store preview data
      localStorage.setItem('stripe_upgrade_preview', JSON.stringify({
        fromTier,
        toTier,
        amountDue: amountDue / 100, // Convert from cents
        prorationDate: prorationDate.toISOString(),
        previewData
      }));

      return {
        amountDue: amountDue / 100, // Convert from cents to dollars
        prorationDate
      };
    } catch (error) {
      handleError(error, 'preview upgrade');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [subscription, handleError]);

  // Apply promo code
  const applyPromoCode = useCallback(async (
    code: string,
    subscriptionId?: string
  ): Promise<{ valid: boolean; discount?: any }> => {
    try {
      setLoading(true);
      setError(null);

      const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
      if (!customerId) {
        throw new Error('No customer ID found');
      }

      // First, validate the promotion code
      const promoCode = await invoke('stripe_retrieve_promotion_code', {
        code
      });

      const promoData = promoCode as StripePromotionCode;
      if (!promoData || !promoData.active) {
        return { valid: false };
      }

      // Apply the coupon to the customer or subscription
      let result;
      if (subscriptionId || subscription?.subscriptionId) {
        // Apply to existing subscription
        result = await invoke('stripe_update_subscription', {
          request: {
            subscription_id: subscriptionId || subscription?.subscriptionId,
            coupon: promoData.coupon.id
          }
        });
      } else {
        // Apply to customer for future subscriptions
        result = await invoke('stripe_update_customer', {
          customerId,
          coupon: promoData.coupon.id
        });
      }

      // Store applied promo code
      const appliedPromo = {
        code,
        couponId: promoData.coupon.id,
        discount: promoData.coupon,
        appliedAt: new Date().toISOString(),
        appliedTo: subscriptionId || 'customer'
      };

      localStorage.setItem('stripe_applied_promo', JSON.stringify(appliedPromo));

      // Refresh subscription data to reflect discount
      if (subscription?.subscriptionId) {
        await refreshSubscription();
      }

      return {
        valid: true,
        discount: promoData.coupon
      };
    } catch (error) {
      handleError(error, 'apply promo code');
      return { valid: false };
    } finally {
      setLoading(false);
    }
  }, [subscription, handleError, refreshSubscription]);

  // Enterprise management
  const addEnterpriseUser = useCallback(async (email: string, role: 'admin' | 'user' | 'viewer') => {
    if (!enterpriseAccount) {
      throw new Error('No enterprise account');
    }

    try {
      setLoading(true);
      setError(null);

      // Implementation would call backend to add user
      // Adding enterprise user

      setEnterpriseUsers(prev => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          accountId: enterpriseAccount.id,
          email,
          role,
          permissions: [],
          isActive: true,
          lastLogin: null,
          createdAt: new Date()
        }
      ]);
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
      // Removing enterprise user

      setEnterpriseUsers(prev => prev.filter(user => user.id !== userId));
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
      // Updating enterprise user

      setEnterpriseUsers(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, role }
            : user
        )
      );
    } catch (error) {
      handleError(error, 'update enterprise user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Additional functions implementation
  const getSubscriptionStatus = useCallback((): SubscriptionStatus => {
    if (!subscription) {
      return SubscriptionStatus.INACTIVE;
    }
    return subscription.status;
  }, [subscription]);

  const getCurrentPlan = useCallback((): SubscriptionTier => {
    if (!subscription) {
      return SubscriptionTier.FREE;
    }
    return subscription.tier;
  }, [subscription]);

  const getRemainingCredits = useCallback((): number => {
    if (!subscription || !usage) {
      return 0;
    }

    const plan = subscription.plan;
    if (plan.limits.maxAnalysisJobs === null) {
      return Infinity; // Unlimited
    }

    return Math.max(0, plan.limits.maxAnalysisJobs - usage.analysisJobsRun);
  }, [subscription, usage]);

  const isFeatureEnabled = useCallback((feature: string): boolean => {
    return hasFeature(feature);
  }, [hasFeature]);

  const getUsageStatistics = useCallback((): SubscriptionUsage => {
    if (!usage) {
      return {
        documentsUploaded: 0,
        analysisJobsRun: 0,
        chatSessionsCreated: 0,
        storageUsed: 0,
        lastResetDate: new Date()
      };
    }
    return { ...usage };
  }, [usage]);

  const checkQuotaLimit = useCallback((type: keyof SubscriptionUsage) => {
    if (!subscription || !usage) {
      return { withinLimit: false, current: 0, limit: null, percentage: 0 };
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
    const percentage = limit === null ? 0 : Math.round((current / limit) * 100);

    return { withinLimit, current, limit, percentage };
  }, [subscription, usage]);

  const getInvoices = useCallback(async (): Promise<Invoice[]> => {
    const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerId) {
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      const invoiceList = await invoke('stripe_get_invoices', {
        customerId,
        limit: 20
      });

      const mappedInvoices = (invoiceList as any[]).map(invoice => ({
        id: invoice.id,
        subscriptionId: invoice.subscription || '',
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: new Date(invoice.due_date * 1000),
        paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        invoiceUrl: invoice.hosted_invoice_url || '',
        createdAt: new Date(invoice.created * 1000)
      }));

      setInvoices(mappedInvoices);
      return mappedInvoices;
    } catch (error) {
      handleError(error, 'get invoices');
      return [];
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const downloadInvoice = useCallback(async (invoiceId: string): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // For now, return the hosted invoice URL
      // In a full implementation, you might generate a PDF or fetch the invoice data
      return invoice.invoiceUrl;
    } catch (error) {
      handleError(error, 'download invoice');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [invoices, handleError]);

  const updateBillingAddress = useCallback(async (address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }) => {
    const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerId) {
      throw new Error('No customer ID found');
    }

    try {
      setLoading(true);
      setError(null);

      await invoke('stripe_update_customer', {
        customerId,
        address
      });

      // Billing address updated
    } catch (error) {
      handleError(error, 'update billing address');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const getAvailableModels = useCallback((): string[] => {
    if (!subscription) {
      // Free tier gets limited models
      return [
        'gpt-3.5-turbo',
        'claude-3-haiku',
        'gemini-pro'
      ];
    }

    switch (subscription.tier) {
      case SubscriptionTier.FREE:
        return [
          'gpt-3.5-turbo',
          'claude-3-haiku',
          'gemini-pro'
        ];
      case SubscriptionTier.PROFESSIONAL:
      case SubscriptionTier.ENTERPRISE:
        return [
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
          'claude-3-opus',
          'claude-3-sonnet',
          'claude-3-haiku',
          'gemini-pro',
          'gemini-pro-vision',
          'mixtral-8x7b',
          'llama-2-70b',
          'codellama-34b',
          'palm-2',
          'anthropic-claude-2',
          'cohere-command',
          'stability-stable-diffusion-xl'
        ];
      default:
        return [];
    }
  }, [subscription]);

  // Data refresh functions
  const refreshSubscription = useCallback(async () => {
    const customerId = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    if (!customerId) return;

    try {
      setLoading(true);

      // Fetch current subscription from Stripe
      const subscriptions = await invoke('stripe_get_subscriptions', {
        customerId
      });

      if (subscriptions && (subscriptions as any[]).length > 0) {
        const activeSubscription = (subscriptions as any[]).find(sub => sub.status === 'active') || (subscriptions as any[])[0];

        if (activeSubscription) {
          const tierMap: Record<string, SubscriptionTier> = {
            'price_professional_monthly': SubscriptionTier.PROFESSIONAL,
            'price_enterprise_monthly': SubscriptionTier.ENTERPRISE
          };

          const tier = tierMap[activeSubscription.items.data[0]?.price.id] || SubscriptionTier.FREE;
          const plan = SUBSCRIPTION_PLANS[tier];

          const updatedSubscription: UserSubscription = {
            id: activeSubscription.id,
            userId: customerId,
            customerId,
            subscriptionId: activeSubscription.id,
            tier,
            status: activeSubscription.status as SubscriptionStatus,
            currentPeriodStart: new Date(activeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
            trialEnd: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000) : null,
            plan,
            usage: usage || {
              documentsUploaded: 0,
              analysisJobsRun: 0,
              chatSessionsCreated: 0,
              storageUsed: 0,
              lastResetDate: new Date()
            },
            createdAt: new Date(activeSubscription.created * 1000),
            updatedAt: new Date()
          };

          setSubscription(updatedSubscription);
          localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));
        }
      }
    } catch (error) {
      handleError(error, 'refresh subscription');
    } finally {
      setLoading(false);
    }
  }, [usage, handleError]);

  const refreshUsage = useCallback(async () => {
    try {
      setLoading(true);

      // For now, we'll use localStorage as our source of truth
      // In a full implementation, this would fetch from a backend API
      const storedUsage = localStorage.getItem(STORAGE_KEYS.USAGE);
      if (storedUsage) {
        const parsed = JSON.parse(storedUsage);
        parsed.lastResetDate = new Date(parsed.lastResetDate);
        setUsage(parsed);
      } else {
        // Initialize default usage if not found
        const defaultUsage: SubscriptionUsage = {
          documentsUploaded: 0,
          analysisJobsRun: 0,
          chatSessionsCreated: 0,
          storageUsed: 0,
          lastResetDate: new Date()
        };
        setUsage(defaultUsage);
        localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(defaultUsage));
      }
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

      const mappedInvoices = (invoiceList as any[]).map(invoice => ({
        id: invoice.id,
        subscriptionId: invoice.subscription || '',
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: new Date(invoice.due_date * 1000),
        paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        invoiceUrl: invoice.hosted_invoice_url || '',
        createdAt: new Date(invoice.created * 1000)
      }));

      setInvoices(mappedInvoices);
    } catch (error) {
      handleError(error, 'refresh invoices');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

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
        // Error loading subscription data from storage
      }
    };

    loadFromStorage();
  }, [autoInitialize]);

  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

    refreshSubscription();
    refreshUsage();
    refreshInvoices();
  }, [autoInitialize, refreshSubscription, refreshUsage, refreshInvoices]);

  // Listen for webhook events
  useEffect(() => {
    if (!initialized) {
      return;
    }

    let unlisten: (() => void) | undefined;

    const setupWebhookListener = async () => {
      try {
        unlisten = await listen('stripe-webhook-event', (event) => {
          // Received Stripe webhook event
          // Refresh subscription data when webhooks are received
          refreshSubscription();
        });
      } catch (error) {
        // Error setting up webhook listener
      }
    };

    setupWebhookListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
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
    createSubscription,
    upgradeSubscription,
    cancelSubscription,
    resumeSubscription,
    updatePaymentMethod,
    getPaymentMethods,
    createPaymentIntent,
    confirmPayment,
    handleWebhook,
    syncSubscriptionStatus,
    createPortalSession,
    previewUpgrade,
    applyPromoCode,
    incrementUsage,
    checkUsageLimit,
    addEnterpriseUser,
    removeEnterpriseUser,
    updateEnterpriseUser,
    refreshSubscription,
    refreshUsage,
    refreshInvoices,
    getSubscriptionStatus,
    getCurrentPlan,
    getRemainingCredits,
    isFeatureEnabled,
    getUsageStatistics,
    checkQuotaLimit,
    getInvoices,
    downloadInvoice,
    updateBillingAddress,
    getAvailableModels
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