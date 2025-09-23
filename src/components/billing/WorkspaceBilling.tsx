/**
 * Workspace Billing Component for BEAR AI
 * Manages organization billing, subscriptions, and team member management
 * Integrated with Stripe for SSO workspace billing
 */

import React, { useState, useEffect } from 'react';
import { stripeSSOService, WorkspaceBilling as WorkspaceBillingType, formatCurrency, formatDate } from '../../services/billing/StripeSSO';
import { ssoAuthService } from '../../services/auth/SSOAuthService';

// Types
interface WorkspaceBillingProps {
  domain: string;
  className?: string;
}

interface BillingOverviewProps {
  billing: WorkspaceBillingType;
  onUpdate: () => void;
  className?: string;
}

interface SubscriptionManagementProps {
  billing: WorkspaceBillingType;
  onUpdate: () => void;
}

interface TeamManagementProps {
  billing: WorkspaceBillingType;
  onUpdate: () => void;
}

// Main Workspace Billing Component
export const WorkspaceBilling: React.FC<WorkspaceBillingProps> = ({ domain, className = '' }) => {
  const [billing, setBilling] = useState<WorkspaceBillingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'team' | 'history'>('overview');

  // Load workspace billing data
  useEffect(() => {
    loadBillingData();
  }, [domain]);

  const loadBillingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await stripeSSOService.getWorkspaceBilling(domain);

      if (result.success) {
        setBilling(result.data);
      } else {
        setError(result.error || 'Failed to load billing information');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    loadBillingData();
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 text-sm font-medium">
              {error}
            </span>
          </div>
          <button
            onClick={loadBillingData}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!billing) {
    return <WorkspaceSetupPrompt domain={domain} onSetup={handleUpdate} className={className} />;
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Workspace Billing
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage billing for {billing.organizationName} ({billing.domain})
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'subscription', label: 'Subscription' },
              { id: 'team', label: 'Team Management' },
              { id: 'history', label: 'Billing History' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <BillingOverview billing={billing} onUpdate={handleUpdate} />
          )}
          {activeTab === 'subscription' && (
            <SubscriptionManagement billing={billing} onUpdate={handleUpdate} />
          )}
          {activeTab === 'team' && (
            <TeamManagement billing={billing} onUpdate={handleUpdate} />
          )}
          {activeTab === 'history' && (
            <BillingHistory domain={billing.domain} />
          )}
        </div>
      </div>
    </div>
  );
};

// Billing Overview Component
const BillingOverview: React.FC<BillingOverviewProps> = ({ billing, onUpdate, className = '' }) => {
  const nextBillingAmount = billing.totalCost;
  const daysUntilBilling = billing.nextBillingDate
    ? Math.ceil((new Date(billing.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900">Current Plan</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">
            {billing.planType}
          </p>
          <p className="text-sm text-gray-600">
            {billing.billingCycle === 'annual' ? 'Annual billing' : 'Monthly billing'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900">Team Size</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {billing.memberCount}
          </p>
          <p className="text-sm text-gray-600">
            of {billing.maxMembers} members
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900">Next Billing</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(nextBillingAmount * 100)}
          </p>
          <p className="text-sm text-gray-600">
            in {daysUntilBilling} days
          </p>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Subscription Status
            </h3>
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                billing.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {billing.isActive ? 'Active' : 'Inactive'}
              </span>
              {billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date() && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Trial until {formatDate(Math.floor(new Date(billing.trialEndsAt).getTime() / 1000))}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Organization</p>
            <p className="font-medium text-gray-900">{billing.organizationName}</p>
            <p className="text-sm text-gray-600">{billing.domain}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <ManageBillingButton domain={billing.domain} />
        <UpgradePlanButton billing={billing} onUpdate={onUpdate} />
        <AddMembersButton billing={billing} onUpdate={onUpdate} />
      </div>
    </div>
  );
};

// Subscription Management Component
const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ billing, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(billing.planType);
  const [memberCount, setMemberCount] = useState(billing.memberCount);

  const handleUpdateSubscription = async () => {
    setLoading(true);

    try {
      const result = await stripeSSOService.updateSubscription(billing.domain, {
        planType: selectedPlan,
        memberCount
      });

      if (result.success) {
        onUpdate();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Update subscription error:', error);
      alert(error instanceof Error ? error.message : 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = selectedPlan !== billing.planType || memberCount !== billing.memberCount;

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Current Subscription
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Plan:</span>
            <span className="ml-2 font-medium capitalize">{billing.planType}</span>
          </div>
          <div>
            <span className="text-gray-600">Billing:</span>
            <span className="ml-2 font-medium capitalize">{billing.billingCycle}</span>
          </div>
          <div>
            <span className="text-gray-600">Members:</span>
            <span className="ml-2 font-medium">{billing.memberCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Cost:</span>
            <span className="ml-2 font-medium">{formatCurrency(billing.totalCost * 100)}</span>
          </div>
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Change Plan
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
              <p className="text-sm text-gray-600 mt-1">
                {plan === 'basic' && 'Essential features for small teams'}
                {plan === 'pro' && 'Advanced features for growing businesses'}
                {plan === 'enterprise' && 'Full feature set for large organizations'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Member Count */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Team Size
        </h3>
        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600">Number of members:</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={memberCount}
            onChange={(e) => setMemberCount(parseInt(e.target.value) || 1)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Update Button */}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                Subscription Changes
              </h4>
              <p className="text-sm text-blue-700">
                Your changes will take effect immediately.
              </p>
            </div>
            <button
              onClick={handleUpdateSubscription}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Subscription'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Team Management Component
const TeamManagement: React.FC<TeamManagementProps> = ({ billing, onUpdate }) => {
  const utilizationPercentage = (billing.memberCount / billing.maxMembers) * 100;

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Team Overview
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {billing.memberCount} / {billing.maxMembers}
            </p>
            <p className="text-sm text-gray-600">Active members</p>
          </div>
          <div className="w-32">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2 transition-all"
                style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {Math.round(utilizationPercentage)}% utilized
            </p>
          </div>
        </div>
      </div>

      {/* Add Members */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add Team Members
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Team members can sign in using their {billing.domain} email address with SSO.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Automatic Member Addition
          </h4>
          <p className="text-sm text-blue-700">
            When users from {billing.domain} sign in with SSO, they'll automatically be added to your workspace.
            No manual invitation required.
          </p>
        </div>
      </div>

      {/* Member Limits */}
      {billing.memberCount >= billing.maxMembers && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 text-sm font-medium">
              Member limit reached
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            You've reached your member limit. Upgrade your plan to add more team members.
          </p>
        </div>
      )}
    </div>
  );
};

// Billing History Component
const BillingHistory: React.FC<{ domain: string }> = ({ domain }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await stripeSSOService.getBillingHistory(domain);
        if (result.success) {
          setHistory(result.data || []);
        }
      } catch (error) {
        console.error('Failed to load billing history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [domain]);

  if (loading) {
    return <div>Loading billing history...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Billing History
      </h3>
      {history.length === 0 ? (
        <p className="text-gray-600">No billing history available.</p>
      ) : (
        <div className="space-y-2">
          {history.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.description || 'Subscription charge'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(item.created)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </p>
                  <p className={`text-sm ${
                    item.status === 'paid' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Utility Components
const WorkspaceSetupPrompt: React.FC<{
  domain: string;
  onSetup: () => void;
  className?: string;
}> = ({ domain, onSetup, className = '' }) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-blue-900 mb-2">
        Set up Workspace Billing
      </h3>
      <p className="text-blue-700 mb-4">
        Configure billing for your organization ({domain}) to enable team features.
      </p>
      <button
        onClick={onSetup}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Set up billing
      </button>
    </div>
  );
};

const ManageBillingButton: React.FC<{ domain: string }> = ({ domain }) => {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const result = await stripeSSOService.createPortalSession(
        domain,
        window.location.href
      );

      if (result.success && result.actionUrl) {
        window.open(result.actionUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManageBilling}
      disabled={loading}
      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
    >
      {loading ? 'Opening...' : 'Manage Billing'}
    </button>
  );
};

const UpgradePlanButton: React.FC<{
  billing: WorkspaceBillingType;
  onUpdate: () => void;
}> = ({ billing, onUpdate }) => {
  if (billing.planType === 'enterprise') {
    return null;
  }

  return (
    <button
      onClick={() => {
        // Handle plan upgrade
        console.log('Upgrade plan clicked');
      }}
      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Upgrade Plan
    </button>
  );
};

const AddMembersButton: React.FC<{
  billing: WorkspaceBillingType;
  onUpdate: () => void;
}> = ({ billing, onUpdate }) => {
  if (billing.memberCount >= billing.maxMembers) {
    return null;
  }

  return (
    <button
      onClick={() => {
        // Handle add members
        console.log('Add members clicked');
      }}
      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      Add Members
    </button>
  );
};

export default WorkspaceBilling;