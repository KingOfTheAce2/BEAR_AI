import React, { ReactNode } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionTier, FEATURE_GATES } from '../../types/subscription';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  tier?: SubscriptionTier;
  silent?: boolean;
  className?: string;
}

interface FeatureGateState {
  showUpgrade: boolean;
}

/**
 * FeatureGate component controls access to features based on subscription tier
 *
 * Features:
 * - Automatic tier checking
 * - Customizable fallback content
 * - Optional upgrade prompts
 * - Silent mode for conditional rendering
 * - Usage limit checking
 */
const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  tier,
  silent = false,
  className
}) => {
  const {
    hasFeature,
    canUseFeature,
    subscription,
    checkUsageLimit,
    upgradeSubscription,
    loading
  } = useSubscription();

  const [showUpgrade, setShowUpgrade] = React.useState(false);

  // Check if user has access to the feature
  const featureAccess = canUseFeature(feature);
  const hasAccess = featureAccess.allowed;

  // Get feature configuration
  const featureConfig = FEATURE_GATES[feature];
  const requiredTier = tier || featureConfig?.requiredTier;

  // Check usage limits for specific features
  const checkFeatureUsage = React.useCallback(() => {
    if (!hasAccess) return false;

    // Check specific usage limits based on feature
    switch (feature) {
      case 'documentAnalysis':
        const analysisLimit = checkUsageLimit('analysisJobsRun');
        return analysisLimit.withinLimit;

      case 'documentUpload':
        const documentLimit = checkUsageLimit('documentsUploaded');
        return documentLimit.withinLimit;

      case 'chatSessions':
        const chatLimit = checkUsageLimit('chatSessionsCreated');
        return chatLimit.withinLimit;

      default:
        return true;
    }
  }, [hasAccess, checkUsageLimit, feature]);

  const canUse = hasAccess && checkFeatureUsage();

  // Handle upgrade action
  const handleUpgrade = async (selectedTier: SubscriptionTier) => {
    try {
      await upgradeSubscription(selectedTier);
      setShowUpgrade(false);
    } catch (error) {
      // Error logging disabled for production
    }
  };

  // Handle access denied
  const handleAccessDenied = () => {
    if (showUpgradePrompt && !silent) {
      setShowUpgrade(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`feature-gate loading ${className || ''}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Checking access...</span>
        </div>
      </div>
    );
  }

  // Silent mode - just return null if no access
  if (silent && !canUse) {
    return null;
  }

  // User has access - render children
  if (canUse) {
    return <div className={className}>{children}</div>;
  }

  // User doesn't have access - show fallback or upgrade prompt
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  // Default fallback with upgrade prompt
  return (
    <div className={`feature-gate blocked ${className || ''}`}>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {featureConfig?.description || 'Premium Feature'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {featureAccess.reason || `This feature requires a ${requiredTier} subscription or higher.`}
            </p>

            {/* Show current tier */}
            {subscription && (
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Current: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                </span>
              </div>
            )}

            {/* Usage limit info if applicable */}
            {hasAccess && !checkFeatureUsage() && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  You've reached your usage limit for this feature. Upgrade to increase your limits.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex space-x-3">
              {showUpgradePrompt && (
                <button
                  onClick={handleAccessDenied}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Upgrade Now
                </button>
              )}

              <button
                onClick={() => window.open('/features', '_blank')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade prompt modal */}
      {showUpgrade && (
        <UpgradePrompt
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={handleUpgrade}
          feature={feature}
          requiredTier={requiredTier}
          currentTier={subscription?.tier}
        />
      )}
    </div>
  );
};

// Helper components for common use cases

export const DocumentAnalysisGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="documentAnalysis" {...props} />
);

export const APIAccessGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="apiAccess" {...props} />
);

export const PrioritySupportGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="prioritySupport" {...props} />
);

export const MultiUserGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="multiUser" {...props} />
);

export const CustomIntegrationsGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="customIntegrations" {...props} />
);

export const AuditLogsGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="auditLogs" {...props} />
);

export const SingleSignOnGate: React.FC<Omit<FeatureGateProps, 'feature'>> = (props) => (
  <FeatureGate feature="singleSignOn" {...props} />
);

// Higher-order component for feature gating
export const withFeatureGate = <P extends object>(
  feature: string,
  options?: {
    fallback?: ReactNode;
    showUpgradePrompt?: boolean;
    silent?: boolean;
  }
) => {
  return (Component: React.ComponentType<P>) => {
    const WrappedComponent: React.FC<P> = (props) => (
      <FeatureGate
        feature={feature}
        fallback={options?.fallback}
        showUpgradePrompt={options?.showUpgradePrompt}
        silent={options?.silent}
      >
        <Component {...props} />
      </FeatureGate>
    );

    WrappedComponent.displayName = `withFeatureGate(${Component.displayName || Component.name})`;
    return WrappedComponent;
  };
};

// Hook for feature checking in components
export const useFeatureGate = (feature: string) => {
  const { hasFeature, canUseFeature, subscription, checkUsageLimit } = useSubscription();

  const isAllowed = canUseFeature(feature).allowed;
  const reason = canUseFeature(feature).reason;
  const hasAccess = hasFeature(feature);

  const checkUsage = React.useCallback(() => {
    switch (feature) {
      case 'documentAnalysis':
        return checkUsageLimit('analysisJobsRun');
      case 'documentUpload':
        return checkUsageLimit('documentsUploaded');
      case 'chatSessions':
        return checkUsageLimit('chatSessionsCreated');
      default:
        return { withinLimit: true, current: 0, limit: null };
    }
  }, [checkUsageLimit, feature]);

  return {
    isAllowed,
    hasAccess,
    reason,
    currentTier: subscription?.tier,
    requiredTier: FEATURE_GATES[feature]?.requiredTier,
    usage: checkUsage()
  };
};

export default FeatureGate;