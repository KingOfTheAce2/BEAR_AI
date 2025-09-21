/**
 * Subscription tier system type definitions
 * Supports Free, Professional, and Enterprise tiers with feature gating
 */

export enum SubscriptionTier {
  FREE = 'free',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing'
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  limits: SubscriptionLimits;
}

export interface SubscriptionLimits {
  maxDocuments: number | null; // null = unlimited
  maxAnalysisJobs: number | null;
  maxChatSessions: number | null;
  maxFileSize: number; // in bytes
  documentAnalysis: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  multiUser: boolean;
  customIntegrations: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  customerId: string; // Stripe customer ID
  subscriptionId: string | null; // Stripe subscription ID
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  plan: SubscriptionPlan;
  usage: SubscriptionUsage;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  documentsUploaded: number;
  analysisJobsRun: number;
  chatSessionsCreated: number;
  storageUsed: number; // in bytes
  lastResetDate: Date;
}

export interface EnterpriseAccount {
  id: string;
  name: string;
  domain: string;
  subscriptionId: string;
  adminUserId: string;
  maxUsers: number;
  currentUsers: number;
  billingEmail: string;
  features: EnterpriseFeatures;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseFeatures {
  singleSignOn: boolean;
  customBranding: boolean;
  dedicatedSupport: boolean;
  auditLogs: boolean;
  dataRetention: number; // in days
  apiRateLimit: number; // requests per minute
}

export interface EnterpriseUser {
  id: string;
  accountId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  dueDate: Date;
  paidAt: Date | null;
  invoiceUrl: string;
  createdAt: Date;
}

// Feature gate configuration
export interface FeatureConfig {
  [key: string]: {
    requiredTier: SubscriptionTier;
    description: string;
    upgradeMessage: string;
  };
}

// Tauri command interfaces
export interface CreateSubscriptionRequest {
  priceId: string;
  customerId?: string;
  paymentMethodId?: string;
  trialDays?: number;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  clientSecret?: string; // For payment confirmation
  status: SubscriptionStatus;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface CreateCustomerRequest {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentMethodRequest {
  customerId: string;
  type: 'card';
  card: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
  livemode: boolean;
}

// Error types
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public declineCode?: string
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// Default subscription plans
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  [SubscriptionTier.FREE]: {
    id: 'free',
    tier: SubscriptionTier.FREE,
    name: 'Free',
    description: 'Basic chat functionality with limited features',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      'Basic AI chat',
      'Model download and selection',
      'Local document storage',
      'Basic export options'
    ],
    stripePriceId: '',
    limits: {
      maxDocuments: 10,
      maxAnalysisJobs: 0,
      maxChatSessions: 5,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      documentAnalysis: false,
      prioritySupport: false,
      apiAccess: false,
      multiUser: false,
      customIntegrations: false
    }
  },
  [SubscriptionTier.PROFESSIONAL]: {
    id: 'professional',
    tier: SubscriptionTier.PROFESSIONAL,
    name: 'Professional',
    description: 'Full featured plan with document analysis and priority support',
    price: 2999, // $29.99
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Free',
      'Advanced document analysis',
      'Unlimited chat sessions',
      'Priority support',
      'API access',
      'Advanced export options',
      'Custom model integration'
    ],
    stripePriceId: 'price_professional_monthly',
    limits: {
      maxDocuments: null,
      maxAnalysisJobs: null,
      maxChatSessions: null,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      documentAnalysis: true,
      prioritySupport: true,
      apiAccess: true,
      multiUser: false,
      customIntegrations: true
    }
  },
  [SubscriptionTier.ENTERPRISE]: {
    id: 'enterprise',
    tier: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'Professional features with multi-user management and central billing',
    price: 9999, // $99.99
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Professional',
      'Multi-user management',
      'Central billing',
      'SSO integration',
      'Custom branding',
      'Dedicated support',
      'Audit logs',
      'Custom data retention'
    ],
    stripePriceId: 'price_enterprise_monthly',
    limits: {
      maxDocuments: null,
      maxAnalysisJobs: null,
      maxChatSessions: null,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      documentAnalysis: true,
      prioritySupport: true,
      apiAccess: true,
      multiUser: true,
      customIntegrations: true
    }
  }
};

// Feature gate definitions
export const FEATURE_GATES: FeatureConfig = {
  documentAnalysis: {
    requiredTier: SubscriptionTier.PROFESSIONAL,
    description: 'Analyze documents with AI-powered insights',
    upgradeMessage: 'Upgrade to Professional to unlock document analysis features'
  },
  prioritySupport: {
    requiredTier: SubscriptionTier.PROFESSIONAL,
    description: 'Get priority customer support',
    upgradeMessage: 'Upgrade to Professional for priority support'
  },
  apiAccess: {
    requiredTier: SubscriptionTier.PROFESSIONAL,
    description: 'Access the BEAR AI API',
    upgradeMessage: 'Upgrade to Professional to access the API'
  },
  multiUser: {
    requiredTier: SubscriptionTier.ENTERPRISE,
    description: 'Multi-user account management',
    upgradeMessage: 'Upgrade to Enterprise for multi-user features'
  },
  customIntegrations: {
    requiredTier: SubscriptionTier.PROFESSIONAL,
    description: 'Custom model and service integrations',
    upgradeMessage: 'Upgrade to Professional for custom integrations'
  },
  auditLogs: {
    requiredTier: SubscriptionTier.ENTERPRISE,
    description: 'Detailed audit logs and compliance features',
    upgradeMessage: 'Upgrade to Enterprise for audit logs'
  },
  singleSignOn: {
    requiredTier: SubscriptionTier.ENTERPRISE,
    description: 'Single Sign-On integration',
    upgradeMessage: 'Upgrade to Enterprise for SSO features'
  }
};