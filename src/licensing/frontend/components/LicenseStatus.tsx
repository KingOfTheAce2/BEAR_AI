/**
 * BEAR AI Licensing System - License Status Component
 * React component for displaying license status and management
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CogIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import {
  License,
  LicenseStatus as LicenseStatusEnum,
  LicenseTier,
  LicenseValidationResult,
  UsageTracking
} from '../../types/license.types';

interface LicenseStatusProps {
  onActivateClicked?: () => void;
  onUpgradeClicked?: () => void;
  onManageClicked?: () => void;
}

export const LicenseStatus: React.FC<LicenseStatusProps> = ({
  onActivateClicked,
  onUpgradeClicked,
  onManageClicked
}) => {
  const [license, setLicense] = useState<License | null>(null);
  const [validationResult, setValidationResult] = useState<LicenseValidationResult | null>(null);
  const [usageTracking, setUsageTracking] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLicenseData();

    // Refresh every 5 minutes
    const interval = setInterval(loadLicenseData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadLicenseData = async () => {
    try {
      setLoading(true);

      // In a real implementation, this would call the license manager
      const response = await fetch('/api/license/status');
      const data = await response.json();

      setLicense(data.license);
      setValidationResult(data.validation);
      setUsageTracking(data.usage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load license data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!validationResult) return <InformationCircleIcon className="h-6 w-6 text-gray-400" />;

    if (validationResult.isValid) {
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    } else if (validationResult.warnings.length > 0) {
      return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
    } else {
      return <XCircleIcon className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!validationResult) return 'bg-gray-50 border-gray-200';

    if (validationResult.isValid) {
      return 'bg-green-50 border-green-200';
    } else if (validationResult.warnings.length > 0) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTierDisplayName = (tier: LicenseTier) => {
    switch (tier) {
      case LicenseTier.FREE: return 'Free';
      case LicenseTier.PROFESSIONAL: return 'Professional';
      case LicenseTier.ENTERPRISE: return 'Enterprise';
      case LicenseTier.TRIAL: return 'Trial';
      default: return tier;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.round((used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <XCircleIcon className="h-6 w-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">License Error</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadLicenseData}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No License Found</h3>
          <p className="text-gray-600 mb-4">
            Activate BEAR AI to access all features
          </p>
          <button
            onClick={onActivateClicked}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Activate License
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* License Status Header */}
      <div className={`border rounded-lg p-6 ${getStatusColor()}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {getStatusIcon()}
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                BEAR AI {getTierDisplayName(license.tier)} License
              </h3>
              <p className="text-sm text-gray-600">
                {validationResult?.isValid ? 'Active and Valid' : 'Issues Detected'}
              </p>
            </div>
          </div>
          <button
            onClick={onManageClicked}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <CogIcon className="h-4 w-4 mr-1" />
            Manage
          </button>
        </div>

        {/* Warnings and Errors */}
        {validationResult && (validationResult.warnings.length > 0 || validationResult.errors.length > 0) && (
          <div className="mt-4 space-y-2">
            {validationResult.warnings.map((warning, index) => (
              <div key={index} className="flex items-center text-sm text-yellow-700">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                {warning}
              </div>
            ))}
            {validationResult.errors.map((error, index) => (
              <div key={index} className="flex items-center text-sm text-red-700">
                <XCircleIcon className="h-4 w-4 mr-2" />
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Expiration Warning */}
        {validationResult?.expirationWarning && (
          <div className="mt-4 bg-yellow-100 border border-yellow-200 rounded p-3">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm text-yellow-800">
                  Your license expires in {validationResult.expirationWarning} days
                </p>
                <button
                  onClick={onUpgradeClicked}
                  className="text-sm text-yellow-700 underline hover:text-yellow-900"
                >
                  Renew now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* License Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">License Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">License ID:</span>
            <span className="ml-2 font-mono text-gray-900">
              {license.id.substring(0, 8)}...
            </span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              license.status === LicenseStatusEnum.ACTIVE
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {license.status}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Issued:</span>
            <span className="ml-2 text-gray-900">{formatDate(license.issuedAt)}</span>
          </div>
          <div>
            <span className="text-gray-600">Expires:</span>
            <span className="ml-2 text-gray-900">{formatDate(license.expiresAt)}</span>
          </div>
          <div>
            <span className="text-gray-600">User:</span>
            <span className="ml-2 text-gray-900">{license.userId}</span>
          </div>
          <div>
            <span className="text-gray-600">Transfers:</span>
            <span className="ml-2 text-gray-900">
              {license.transfersUsed} / {license.maxTransfers}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Access */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Feature Access</h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {Object.entries(license.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center">
              {enabled ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <XCircleIcon className="h-4 w-4 text-gray-300 mr-2" />
              )}
              <span className={enabled ? 'text-gray-900' : 'text-gray-400'}>
                {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Tracking */}
      {usageTracking && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Usage Tracking</h4>
          <div className="space-y-4">
            {Object.entries(usageTracking.currentUsage).map(([resource, used]) => {
              if (resource === 'period' || resource === 'resetDate') return null;

              const limit = usageTracking.quotas[license.tier][resource as keyof typeof usageTracking.quotas[LicenseTier.FREE]];
              const percentage = getUsagePercentage(used as number, limit as number);

              return (
                <div key={resource}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {resource.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {limit === -1 ? `${used} / Unlimited` : `${used} / ${limit}`}
                    </span>
                  </div>
                  {limit !== -1 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Usage resets on {formatDate(usageTracking.currentUsage.resetDate)}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {license.tier === LicenseTier.FREE && (
          <button
            onClick={onUpgradeClicked}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Upgrade License
          </button>
        )}
        {license.tier === LicenseTier.TRIAL && (
          <button
            onClick={onUpgradeClicked}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Purchase License
          </button>
        )}
        <button
          onClick={loadLicenseData}
          className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default LicenseStatus;