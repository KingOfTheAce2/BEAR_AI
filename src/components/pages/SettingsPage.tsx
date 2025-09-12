import React from 'react';
import { ThemeSelector } from '../ui/ThemeSelector';
import { useApp } from '../../contexts/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  UserCircleIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  BellIcon,
  CogIcon
} from '@heroicons/react/24/outline';

export const SettingsPage: React.FC = () => {
  const { state, logout } = useApp();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Settings
        </h1>
        <p className="text-text-muted">
          Customize your BEAR AI experience and manage your account preferences.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Profile Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <UserCircleIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Profile</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={state.user?.name || ''}
                  onChange={() => {}}
                  disabled
                />
                <Input
                  label="Email"
                  type="email"
                  value={state.user?.email || ''}
                  onChange={() => {}}
                  disabled
                />
              </div>
              
              <Input
                label="Law Firm"
                value={state.user?.firm || ''}
                onChange={() => {}}
                disabled
              />
              
              <Input
                label="Role"
                value={state.user?.role || ''}
                onChange={() => {}}
                disabled
              />
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-text-muted mb-4">
                Profile information is currently read-only. Contact your administrator to make changes.
              </p>
              <Button variant="secondary" size="sm">
                Request Profile Update
              </Button>
            </div>
          </div>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <PaintBrushIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Appearance</h2>
            </div>
            
            <ThemeSelector />
          </div>
        </Card>

        {/* Security Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <ShieldCheckIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Security</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                    Secure Connection
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Your connection is encrypted and secure.
                  </p>
                </div>
                <ShieldCheckIcon className="w-6 h-6 text-green-500" />
              </div>
              
              <div className="space-y-3">
                <Button variant="secondary" fullWidth>
                  Change Password
                </Button>
                <Button variant="secondary" fullWidth>
                  Two-Factor Authentication
                </Button>
                <Button variant="secondary" fullWidth>
                  Active Sessions
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <BellIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Desktop Notifications</h3>
                  <p className="text-sm text-text-muted">Receive notifications when AI responses are ready</p>
                </div>
                <input type="checkbox" className="rounded border-border" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Email Notifications</h3>
                  <p className="text-sm text-text-muted">Get email alerts for important updates</p>
                </div>
                <input type="checkbox" className="rounded border-border" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Sound Alerts</h3>
                  <p className="text-sm text-text-muted">Play sound when receiving notifications</p>
                </div>
                <input type="checkbox" className="rounded border-border" defaultChecked />
              </div>
            </div>
          </div>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <CogIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Advanced</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Auto-save Documents</h3>
                  <p className="text-sm text-text-muted">Automatically save document changes</p>
                </div>
                <input type="checkbox" className="rounded border-border" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Analytics</h3>
                  <p className="text-sm text-text-muted">Help improve BEAR AI by sharing usage data</p>
                </div>
                <input type="checkbox" className="rounded border-border" />
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex space-x-4">
                <Button variant="secondary">
                  Export Data
                </Button>
                <Button variant="outline" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};