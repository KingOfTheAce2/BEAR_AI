import React from 'react';
import { SystemStatus } from '../../types';
import {
  WifiIcon,
  ShieldCheckIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface StatusBarProps {
  systemStatus: SystemStatus;
}

export const StatusBar: React.FC<StatusBarProps> = ({ systemStatus }) => {
  const getConnectionIcon = () => {
    switch (systemStatus.connection) {
      case 'online':
        return <WifiIcon className="w-3 h-3 text-bear-green" />;
      case 'connecting':
        return <ClockIcon className="w-3 h-3 text-yellow-500 animate-spin" />;
      case 'offline':
        return <XCircleIcon className="w-3 h-3 text-bear-red" />;
      default:
        return <WifiIcon className="w-3 h-3 text-gray-400" />;
    }
  };

  const getSecurityIcon = () => {
    switch (systemStatus.security) {
      case 'secure':
        return <ShieldCheckIcon className="w-3 h-3 text-bear-green" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-3 h-3 text-yellow-500" />;
      case 'error':
        return <XCircleIcon className="w-3 h-3 text-bear-red" />;
      default:
        return <ShieldCheckIcon className="w-3 h-3 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (systemStatus.connection) {
      case 'online':
        return 'Online';
      case 'connecting':
        return 'Connecting...';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getSecurityText = () => {
    switch (systemStatus.security) {
      case 'secure':
        return 'Secure Connection';
      case 'warning':
        return 'Security Warning';
      case 'error':
        return 'Security Error';
      default:
        return 'Security Status Unknown';
    }
  };

  return (
    <div className="h-full flex items-center justify-between px-4 bg-gray-100 text-xs text-gray-600">
      {/* Left Section - Connection & Security Status */}
      <div className="flex items-center space-x-6">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          {getConnectionIcon()}
          <span className={`
            ${systemStatus.connection === 'online' ? 'text-bear-green' :
              systemStatus.connection === 'connecting' ? 'text-yellow-500' :
              'text-bear-red'}
          `}>
            {getConnectionText()}
          </span>
        </div>

        {/* Security Status */}
        <div className="flex items-center space-x-1">
          {getSecurityIcon()}
          <span className={`
            ${systemStatus.security === 'secure' ? 'text-bear-green' :
              systemStatus.security === 'warning' ? 'text-yellow-500' :
              'text-bear-red'}
          `}>
            {getSecurityText()}
          </span>
        </div>

        {/* Operations Status */}
        <div className="flex items-center space-x-1">
          <CpuChipIcon className="w-3 h-3 text-gray-500" />
          <span>
            {systemStatus.operations.active > 0 ? (
              <>
                <span className="text-bear-green">{systemStatus.operations.active} active</span>
                {systemStatus.operations.queued > 0 && (
                  <span className="text-gray-500">, {systemStatus.operations.queued} queued</span>
                )}
              </>
            ) : (
              <span className="text-gray-500">Ready</span>
            )}
          </span>
        </div>
      </div>

      {/* Center Section - Current Time */}
      <div className="hidden sm:block">
        <span>{new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })}</span>
      </div>

      {/* Right Section - Version & System Info */}
      <div className="flex items-center space-x-4">
        {/* Memory Usage Indicator (Mock) */}
        <div className="hidden md:flex items-center space-x-1">
          <div className="w-20 h-1 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className="h-full bg-bear-green transition-all duration-300"
              style={{ width: '65%' }}
            />
          </div>
          <span className="text-gray-500">RAM</span>
        </div>

        {/* API Status */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-bear-green rounded-full animate-pulse" />
          <span className="text-gray-500">API Active</span>
        </div>

        {/* Version */}
        <div className="text-gray-500">
          v{systemStatus.version}
        </div>
      </div>
    </div>
  );
};