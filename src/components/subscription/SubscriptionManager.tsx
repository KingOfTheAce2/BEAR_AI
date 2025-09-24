import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import {
  SubscriptionTier,
  SubscriptionStatus,
  SUBSCRIPTION_PLANS,
  UserSubscription,
  PaymentMethod,
  Invoice
} from '../../types/subscription';
import UpgradePrompt from './UpgradePrompt';

interface SubscriptionManagerProps {
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  className = '',
  showHeader = true,
  compact = false
}) => {
  const {
    subscription,
    usage,
    paymentMethods,
    invoices,
    loading,
    error,
    upgradeSubscription,
    cancelSubscription,
    resumeSubscription,
    refreshSubscription,
    refreshInvoices,
    initializeStripe,
    createCustomer
  } = useSubscription();

  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'usage' | 'invoices'>('overview');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Initialize Stripe if not already done
  useEffect(() => {
    const initStripe = async () => {
      try {
        // In a real app, these would come from environment variables or secure storage
        const stripeSecretKey = process.env.REACT_APP_STRIPE_SECRET_KEY;
        const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
        const stripeWebhookSecret = process.env.REACT_APP_STRIPE_WEBHOOK_SECRET;

        if (!stripeSecretKey || !stripePublishableKey || !stripeWebhookSecret) {
          throw new Error('Missing required Stripe environment variables: REACT_APP_STRIPE_SECRET_KEY, REACT_APP_STRIPE_PUBLISHABLE_KEY, REACT_APP_STRIPE_WEBHOOK_SECRET');
        }

        await initializeStripe(
          stripeSecretKey,
          stripePublishableKey,
          stripeWebhookSecret
        );
      } catch (error) {
        // Failed to initialize Stripe
      }
    };

    initStripe();
  }, [initializeStripe]);

  // Refresh data on mount
  useEffect(() => {
    refreshSubscription();
    refreshInvoices();
  }, [refreshSubscription, refreshInvoices]);

  // Handle upgrade selection
  const handleUpgradeClick = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setShowUpgradeModal(true);
  };

  // Handle subscription upgrade
  const handleUpgrade = async (tier: SubscriptionTier) => {
    try {
      await upgradeSubscription(tier);
      setShowUpgradeModal(false);
      setSelectedTier(null);
    } catch (error) {
      // Upgrade failed
    }
  };

  // Handle subscription cancellation
  const handleCancel = async () => {
    try {
      await cancelSubscription();
      setShowCancelConfirm(false);
    } catch (error) {
      // Cancellation failed
    }
  };

  // Handle subscription resumption
  const handleResume = async () => {
    try {
      await resumeSubscription();
    } catch (error) {
      // Resume failed
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Get subscription status color
  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'text-green-600 bg-green-100';
      case SubscriptionStatus.TRIALING:
        return 'text-blue-600 bg-blue-100';
      case SubscriptionStatus.PAST_DUE:
        return 'text-yellow-600 bg-yellow-100';
      case SubscriptionStatus.CANCELED:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get usage percentage
  const getUsagePercentage = (current: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  if (loading) {
    return (
      <div className={`subscription-manager loading ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading subscription...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`subscription-manager error ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Subscription Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`subscription-manager ${className}`}>
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your BEAR AI subscription, billing, and usage
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      {!compact && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'billing', name: 'Billing' },
              { id: 'usage', name: 'Usage' },
              { id: 'invoices', name: 'Invoices' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {(activeTab === 'overview' || compact) && (
          <div className="space-y-6">
            {/* Current Subscription */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Subscription</h3>

              {subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {subscription.plan.name}
                      </h4>
                      <p className="text-sm text-gray-600">{subscription.plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(subscription.plan.price, subscription.plan.currency)}
                        <span className="text-sm font-normal text-gray-500">
                          /{subscription.plan.interval}
                        </span>
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {subscription.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Current Period</dt>
                        <dd className="text-sm text-gray-900">
                          {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                        </dd>
                      </div>
                      {subscription.trialEnd && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Trial Ends</dt>
                          <dd className="text-sm text-gray-900">{formatDate(subscription.trialEnd)}</dd>
                        </div>
                      )}
                      {subscription.cancelAtPeriodEnd && (
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-red-500">Cancellation</dt>
                          <dd className="text-sm text-red-700">
                            Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="border-t pt-4 flex space-x-3">
                    {subscription.tier !== SubscriptionTier.ENTERPRISE && (
                      <button
                        onClick={() => handleUpgradeClick(
                          subscription.tier === SubscriptionTier.FREE
                            ? SubscriptionTier.PROFESSIONAL
                            : SubscriptionTier.ENTERPRISE
                        )}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upgrade
                      </button>
                    )}

                    {subscription.cancelAtPeriodEnd ? (
                      <button
                        onClick={handleResume}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Resume Subscription
                      </button>
                    ) : (
                      subscription.tier !== SubscriptionTier.FREE && (
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Cancel Subscription
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Subscription</h3>
                  <p className="mt-1 text-sm text-gray-500">You're currently on the free plan.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => handleUpgradeClick(SubscriptionTier.PROFESSIONAL)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Upgrade to Professional
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Available Plans */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
                  const isCurrent = subscription?.tier === plan.tier;
                  const isUpgrade = subscription &&
                    Object.values(SubscriptionTier).indexOf(plan.tier) >
                    Object.values(SubscriptionTier).indexOf(subscription.tier);

                  return (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-4 ${
                        isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="text-center">
                        <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                        <div className="mt-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {formatCurrency(plan.price, plan.currency)}
                          </span>
                          <span className="text-sm text-gray-500">/{plan.interval}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{plan.description}</p>

                        <ul className="mt-4 space-y-2 text-sm text-gray-600">
                          {plan.features.slice(0, 4).map((feature, index) => (
                            <li key={index} className="flex items-center">
                              <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-4">
                          {isCurrent ? (
                            <span className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100">
                              Current Plan
                            </span>
                          ) : isUpgrade ? (
                            <button
                              onClick={() => handleUpgradeClick(plan.tier)}
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Upgrade
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                            >
                              Downgrade
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && usage && subscription && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Overview</h3>
            <div className="space-y-6">
              {[
                {
                  label: 'Documents Uploaded',
                  current: usage.documentsUploaded,
                  limit: subscription.plan.limits.maxDocuments,
                  key: 'documentsUploaded' as keyof typeof usage
                },
                {
                  label: 'Analysis Jobs',
                  current: usage.analysisJobsRun,
                  limit: subscription.plan.limits.maxAnalysisJobs,
                  key: 'analysisJobsRun' as keyof typeof usage
                },
                {
                  label: 'Chat Sessions',
                  current: usage.chatSessionsCreated,
                  limit: subscription.plan.limits.maxChatSessions,
                  key: 'chatSessionsCreated' as keyof typeof usage
                }
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">
                      {item.current} {item.limit ? `/ ${item.limit}` : ''}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.limit && getUsagePercentage(item.current, item.limit) > 80
                            ? 'bg-red-500'
                            : item.limit && getUsagePercentage(item.current, item.limit) > 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: item.limit
                            ? `${getUsagePercentage(item.current, item.limit)}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h3>
            {invoices.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(new Date(invoice.createdAt))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'open'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No invoices found.</p>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedTier && (
        <UpgradePrompt
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedTier(null);
          }}
          onUpgrade={handleUpgrade}
          requiredTier={selectedTier}
          currentTier={subscription?.tier}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Cancel Subscription</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Cancel Subscription
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="mt-3 px-4 py-2 bg-white text-gray-500 text-base font-medium rounded-md w-full shadow-sm border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;