import React, { useState } from 'react';
import {
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  FEATURE_GATES
} from '../../types/subscription';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => Promise<void>;
  feature?: string;
  requiredTier?: SubscriptionTier;
  currentTier?: SubscriptionTier;
  className?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  feature,
  requiredTier,
  currentTier,
  className = ''
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    requiredTier || SubscriptionTier.PROFESSIONAL
  );
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get feature information
  const featureConfig = feature ? FEATURE_GATES[feature] : null;

  // Filter plans to show only upgrades
  const availablePlans = Object.values(SUBSCRIPTION_PLANS).filter(plan => {
    if (!currentTier) return plan.tier !== SubscriptionTier.FREE;

    const currentIndex = Object.values(SubscriptionTier).indexOf(currentTier);
    const planIndex = Object.values(SubscriptionTier).indexOf(plan.tier);

    return planIndex > currentIndex;
  });

  // Handle upgrade
  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setError(null);

    try {
      await onUpgrade(selectedTier);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upgrade failed. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 ${className}`}>
      <div className="relative top-8 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {feature ? `Unlock ${featureConfig?.description || 'Premium Feature'}` : 'Upgrade Your Plan'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {feature
                ? `${featureConfig?.description || 'This feature'} requires a ${requiredTier} subscription or higher.`
                : 'Choose the plan that best fits your needs'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Plan Info */}
        {currentTier && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-500">Current Plan:</span>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
              </span>
            </div>
          </div>
        )}

        {/* Feature Highlight */}
        {feature && featureConfig && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              What you'll unlock:
            </h4>
            <p className="text-blue-800">{featureConfig.description}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Upgrade Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Your Plan</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => {
              const isSelected = selectedTier === plan.tier;
              const isRecommended = plan.tier === SubscriptionTier.PROFESSIONAL;
              const meetsRequirement = !requiredTier ||
                Object.values(SubscriptionTier).indexOf(plan.tier) >=
                Object.values(SubscriptionTier).indexOf(requiredTier);

              return (
                <div
                  key={plan.id}
                  className={`relative border rounded-lg p-6 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : meetsRequirement
                      ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => meetsRequirement && setSelectedTier(plan.tier)}
                >
                  {/* Recommended Badge */}
                  {isRecommended && meetsRequirement && (
                    <div className="absolute top-0 right-0 -mt-2 -mr-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Recommended
                      </span>
                    </div>
                  )}

                  {/* Required Badge */}
                  {requiredTier === plan.tier && (
                    <div className="absolute top-0 left-0 -mt-2 -ml-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Required
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h5 className="text-xl font-semibold text-gray-900">{plan.name}</h5>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(plan.price, plan.currency)}
                      </span>
                      <span className="text-sm text-gray-500">/{plan.interval}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{plan.description}</p>

                    {/* Selection Indicator */}
                    <div className="mt-4">
                      <div className={`w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Key Features */}
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 text-left">
                      {plan.features.slice(0, 5).map((featureItem, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{featureItem}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-xs text-gray-500 italic">
                          +{plan.features.length - 5} more features
                        </li>
                      )}
                    </ul>

                    {/* Plan Limits */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Limits
                      </h6>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Documents:</span>
                          <span>{plan.limits.maxDocuments || 'Unlimited'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Analysis Jobs:</span>
                          <span>{plan.limits.maxAnalysisJobs || 'Unlimited'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chat Sessions:</span>
                          <span>{plan.limits.maxChatSessions || 'Unlimited'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!meetsRequirement && (
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-75 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        Doesn't meet requirements
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing Information */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Billing Information</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>You'll be charged immediately for the selected plan</li>
                  <li>Billing cycle starts from today</li>
                  <li>You can cancel anytime from your subscription settings</li>
                  <li>Unused time from your current plan will be prorated</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isUpgrading}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading || !selectedTier}
            className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUpgrading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Upgrading...
              </>
            ) : (
              <>
                Upgrade to {selectedTier ? SUBSCRIPTION_PLANS[selectedTier].name : 'Selected Plan'}
                {selectedTier && (
                  <span className="ml-2">
                    ({formatCurrency(SUBSCRIPTION_PLANS[selectedTier].price, SUBSCRIPTION_PLANS[selectedTier].currency)}/{SUBSCRIPTION_PLANS[selectedTier].interval})
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            🔒 Secure payment processing powered by Stripe. Your payment information is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;