/**
 * Privacy-First Authentication React Components
 * GDPR/AI Act compliant without third-party SSO
 */

import React, { useState, useEffect } from 'react';
import { Shield, Mail, Key, Fingerprint, Lock, Check, AlertCircle } from 'lucide-react';

interface AuthMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  privacyScore: number;
  recommended?: boolean;
}

/**
 * Main Authentication Component with Multiple Options
 */
export const PrivacyFirstAuth: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>('magiclink');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const authMethods: AuthMethod[] = [
    {
      id: 'magiclink',
      name: 'Magic Link',
      description: 'Passwordless login via secure email link',
      icon: <Mail className="w-5 h-5" />,
      privacyScore: 10,
      recommended: true
    },
    {
      id: 'passkey',
      name: 'Passkey/Biometric',
      description: 'Use fingerprint, Face ID, or security key',
      icon: <Fingerprint className="w-5 h-5" />,
      privacyScore: 10
    },
    {
      id: 'totp',
      name: 'Authenticator App',
      description: 'Use TOTP with any authenticator app',
      icon: <Key className="w-5 h-5" />,
      privacyScore: 9
    },
    {
      id: 'password',
      name: 'Email + Password',
      description: 'Traditional login with strong password',
      icon: <Lock className="w-5 h-5" />,
      privacyScore: 7
    }
  ];

  const handleMagicLinkLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/magiclink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: '✉️ Check your email! We sent you a secure login link.'
        });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to send magic link'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!window.PublicKeyCredential) {
      setMessage({
        type: 'error',
        text: 'Your browser doesn\'t support passkeys. Try Magic Link instead.'
      });
      return;
    }

    setLoading(true);
    try {
      // Get challenge from server
      const challengeResponse = await fetch('/api/auth/passkey/challenge');
      const options = await challengeResponse.json();

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: options
      });

      // Send to server for verification
      const response = await fetch('/api/auth/passkey/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Passkey authentication failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Privacy Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-4">
            <Shield className="w-4 h-4 mr-1" />
            Privacy-First Authentication
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BEAR AI Legal Assistant
          </h1>
          <p className="text-gray-600">
            Sign in securely without Big Tech tracking
          </p>
        </div>

        {/* Authentication Methods */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-3 mb-6">
            {authMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">{method.icon}</div>
                  <div className="ml-3 flex-1 text-left">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {method.name}
                      </span>
                      {method.recommended && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {method.description}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-500">Privacy Score:</span>
                      <div className="flex ml-2">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full mx-0.5 ${
                              i < method.privacyScore
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Method Form */}
          {selectedMethod === 'magiclink' && (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={handleMagicLinkLogin}
                disabled={loading || !email}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
          )}

          {selectedMethod === 'passkey' && (
            <div className="space-y-4">
              <button
                onClick={handlePasskeyLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Use Passkey'}
              </button>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : message.type === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Privacy Information */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            🔒 Your Privacy Guaranteed
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              No data shared with Google, Microsoft, or Facebook
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              All authentication data stored locally in EU
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              GDPR & AI Act compliant by design
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              No tracking cookies or analytics
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              Open source and auditable
            </li>
          </ul>
        </div>

        {/* Legal Compliance Badge */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <span>🇪🇺 GDPR Compliant</span>
            <span>🤖 AI Act Ready</span>
            <span>🔐 Zero Knowledge</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Secure Session Management Component
 */
export const SecureSessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions');
      const data = await response.json();
      setSessions(data.sessions);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    await fetch(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    fetchSessions();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{session.device}</p>
              <p className="text-sm text-gray-600">
                {session.location} • {session.lastActive}
              </p>
            </div>
            {!session.current && (
              <button
                onClick={() => revokeSession(session.id)}
                className="text-red-600 hover:text-red-700"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm">
            <p className="font-medium text-yellow-900">Security Tip</p>
            <p className="text-yellow-700 mt-1">
              Sessions automatically expire after 8 hours of inactivity for your security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyFirstAuth;