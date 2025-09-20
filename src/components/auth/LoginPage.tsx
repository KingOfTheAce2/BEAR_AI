import { ShieldCheckIcon, ScaleIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

export const LoginPage: React.FC = () => {

  const { login, state } = useApp();
  const { config } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    await login(formData.email, formData.password);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
              <ScaleIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              BEAR AI
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Legal Assistant for Professionals
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Access your AI-powered legal assistant
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                label="Email address"
                type="email"
                value={formData.email}
                onValueChange={(value) => handleInputChange('email', value)}
                error={errors.email}
                placeholder="sarah@lawfirm.com"
                disabled={state.isLoading}
                required
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onValueChange={(value) => handleInputChange('password', value)}
                error={errors.password}
                placeholder="Enter your password"
                disabled={state.isLoading}
                required
              />
            </div>

            {state.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {state.error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Secure legal-grade authentication</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2024 BEAR AI. Built for legal professionals.</p>
        </div>
      </div>
    </div>
  );
};