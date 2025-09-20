import React from 'react';
import { SystemStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

import { WifiIcon, ShieldCheckIcon, ClockIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface UnifiedStatusBarProps {
  systemStatus: SystemStatus;
}

export const UnifiedStatusBar: React.FC<UnifiedStatusBarProps> = ({ systemStatus }) => {
  const { config } = useTheme();

  const getConnectionStatus = () => {
    switch (systemStatus.connection) {
      case 'online':
        return { icon: WifiIcon, color: 'text-green-500', text: 'Online' };
      case 'offline':
        return { icon: WifiIcon, color: 'text-red-500', text: 'Offline' };
      case 'connecting':
        return { icon: WifiIcon, color: 'text-yellow-500', text: 'Connecting...' };
      default:
        return { icon: WifiIcon, color: 'text-gray-500', text: 'Unknown' };
    }
  };

  const getSecurityStatus = () => {
    switch (systemStatus.security) {
      case 'secure':
        return { color: 'text-green-500', text: 'Secure Connection' };
      case 'warning':
        return { color: 'text-yellow-500', text: 'Security Warning' };
      case 'error':
        return { color: 'text-red-500', text: 'Security Error' };
      default:
        return { color: 'text-gray-500', text: 'Security Unknown' };
    }
  };

  const connectionStatus = getConnectionStatus();
  const securityStatus = getSecurityStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <div className="flex items-center justify-between h-full px-4 text-xs text-text-muted">
      {/* Left side - System status indicators */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          <ConnectionIcon className={cn('w-3 h-3', connectionStatus.color)} />
          <span>{connectionStatus.text}</span>
        </div>

        {/* Security Status */}
        <div className="flex items-center space-x-1">
          <ShieldCheckIcon className={cn('w-3 h-3', securityStatus.color)} />
          <span>{securityStatus.text}</span>
        </div>

        {/* Operations Status */}
        {(systemStatus.operations.active > 0 || systemStatus.operations.queued > 0) && (
          <div className="flex items-center space-x-1">
            <CpuChipIcon className="w-3 h-3 text-blue-500" />
            <span>
              {systemStatus.operations.active} active
              {systemStatus.operations.queued > 0 && `, ${systemStatus.operations.queued} queued`}
            </span>
          </div>
        )}
      </div>

      {/* Center - Current time */}
      <div className="flex items-center space-x-1">
        <ClockIcon className="w-3 h-3" />
        <span>{new Date().toLocaleTimeString()}</span>
      </div>

      {/* Right side - App version and theme info */}
      <div className="flex items-center space-x-4">
        <span className="capitalize">{config.theme} Theme</span>
        <span>v{systemStatus.version}</span>
      </div>
    </div>
  );
};
