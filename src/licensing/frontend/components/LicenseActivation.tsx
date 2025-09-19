/**
 * BEAR AI Licensing System - License Activation Component
 * React component for license activation workflow
 */

import React, { useState, useEffect } from 'react';
import {
  KeyIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { Copy } from 'lucide-react';
import {
  LicenseActivationRequest,
  LicenseActivationResponse,
  HardwareFingerprint
} from '../../types/license.types';

interface LicenseActivationProps {
  onActivationComplete?: (license: any) => void;
  onCancel?: () => void;
}

export const LicenseActivation: React.FC<LicenseActivationProps> = ({
  onActivationComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'input' | 'hardware' | 'activating' | 'complete' | 'error'>('input');
  const [activationCode, setActivationCode] = useState('');
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    organization: ''
  });
  const [hardwareFingerprint, setHardwareFingerprint] = useState<HardwareFingerprint | null>(null);
  const [activationResult, setActivationResult] = useState<LicenseActivationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineActivation, setIsOfflineActivation] = useState(false);

  useEffect(() => {
    if (step === 'hardware') {
      generateHardwareFingerprint();
    }
  }, [step]);

  const generateHardwareFingerprint = async () => {
    try {
      const response = await fetch('/api/license/hardware-fingerprint');
      const fingerprint = await response.json();
      setHardwareFingerprint(fingerprint);
    } catch (err) {
      setError('Failed to generate hardware fingerprint');
      setStep('error');
    }
  };

  const validateActivationCode = (code: string) => {
    // Basic validation - in production, this would be more sophisticated
    const cleanCode = code.replace(/[-\s]/g, '');
    return cleanCode.length >= 16 && /^[A-Z0-9]+$/.test(cleanCode);
  };

  const formatActivationCode = (code: string) => {
    const clean = code.replace(/[-\s]/g, '').toUpperCase();
    return clean.match(/.{1,4}/g)?.join('-') || clean;
  };

  const handleActivationCodeChange = (value: string) => {
    const formatted = formatActivationCode(value);
    setActivationCode(formatted);
  };

  const handleNext = () => {
    if (step === 'input') {
      if (!validateActivationCode(activationCode)) {
        setError('Please enter a valid activation code');
        return;
      }
      if (!userInfo.name || !userInfo.email) {
        setError('Please fill in all required fields');
        return;
      }
      setError(null);
      setStep('hardware');
    } else if (step === 'hardware') {
      activateLicense();
    }
  };

  const activateLicense = async () => {
    if (!hardwareFingerprint) {
      setError('Hardware fingerprint not available');
      return;
    }

    setStep('activating');
    setError(null);

    try {
      const activationRequest: LicenseActivationRequest = {
        activationCode: activationCode.replace(/[-\s]/g, ''),
        hardwareFingerprint,
        userInfo
      };

      const response = await fetch('/api/license/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activationRequest)
      });

      const result: LicenseActivationResponse = await response.json();
      setActivationResult(result);

      if (result.success) {
        setStep('complete');
        if (onActivationComplete && result.license) {
          onActivationComplete(result.license);
        }
      } else {
        setError(result.error || 'Activation failed');
        setStep('error');

        if (result.requiresOnlineActivation) {
          setIsOfflineActivation(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during activation');
      setStep('error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <KeyIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activate BEAR AI</h2>
        <p className="text-gray-600">
          Enter your activation code to unlock all features
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activation Code *
          </label>
          <input
            type="text"
            value={activationCode}
            onChange={(e) => handleActivationCodeChange(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center text-lg tracking-wider"
            maxLength={19} // 16 chars + 3 hyphens
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the activation code from your purchase confirmation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={userInfo.name}
              onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={userInfo.email}
              onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization (Optional)
          </label>
          <input
            type="text"
            value={userInfo.organization}
            onChange={(e) => setUserInfo({ ...userInfo, organization: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={!activationCode || !userInfo.name || !userInfo.email}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          Next
          <ArrowRightIcon className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );

  const renderHardwareStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <ComputerDesktopIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hardware Verification</h2>
        <p className="text-gray-600">
          We'll bind your license to this device for security
        </p>
      </div>

      {hardwareFingerprint && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Device Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="font-mono">{hardwareFingerprint.osInfo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CPU:</span>
              <span className="font-mono">{hardwareFingerprint.cpuId.substring(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MAC Address:</span>
              <span className="font-mono">{hardwareFingerprint.macAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hardware ID:</span>
              <div className="flex items-center">
                <span className="font-mono text-xs">{hardwareFingerprint.fingerprint.substring(0, 16)}...</span>
                <button
                  onClick={() => copyToClipboard(hardwareFingerprint.fingerprint)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your license will be tied to this specific device</li>
          <li>• You can transfer your license to a new device (limited transfers)</li>
          <li>• Contact support if you need additional transfers</li>
          <li>• This information is encrypted and stored securely</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep('input')}
          className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!hardwareFingerprint}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Activate License
        </button>
      </div>
    </div>
  );

  const renderActivatingStep = () => (
    <div className="text-center space-y-6">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activating License</h2>
        <p className="text-gray-600">
          Please wait while we activate your BEAR AI license...
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation Complete!</h2>
        <p className="text-gray-600">
          Your BEAR AI license has been successfully activated.
        </p>
      </div>

      {activationResult?.license && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
          <h3 className="font-medium text-green-900 mb-2">License Details</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-green-700">Tier:</span>
              <span className="font-medium text-green-900 capitalize">
                {activationResult.license.tier}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Expires:</span>
              <span className="font-medium text-green-900">
                {new Date(activationResult.license.expiresAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Licensed to:</span>
              <span className="font-medium text-green-900">{userInfo.name}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => onActivationComplete?.(activationResult?.license)}
        className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Get Started
      </button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="text-center space-y-6">
      <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation Failed</h2>
        <p className="text-gray-600 mb-4">{error}</p>

        {isOfflineActivation && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-yellow-900 mb-2">Offline Activation Required</h3>
            <p className="text-sm text-yellow-800 mb-3">
              This activation code requires online verification. Please ensure you have an internet connection and try again.
            </p>
            <div className="text-sm text-yellow-700">
              <p><strong>If you're unable to connect:</strong></p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Copy your hardware fingerprint: {hardwareFingerprint?.fingerprint.substring(0, 16)}...</li>
                <li>Contact support with your activation code and hardware fingerprint</li>
                <li>You'll receive an offline activation file</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-3">
        <button
          onClick={() => setStep('input')}
          className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Try Again
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      {step === 'input' && renderInputStep()}
      {step === 'hardware' && renderHardwareStep()}
      {step === 'activating' && renderActivatingStep()}
      {step === 'complete' && renderCompleteStep()}
      {step === 'error' && renderErrorStep()}
    </div>
  );
};

export default LicenseActivation;