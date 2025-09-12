import React from 'react';
import { ConnectionState, StreamingError } from '../../types/streaming';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  error?: StreamingError | null;
  onReconnect?: () => void;
  onDismissError?: () => void;
  className?: string;
  showDetails?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionState,
  error,
  onReconnect,
  onDismissError,
  className = '',
  showDetails = false
}) => {
  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'disconnected':
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState.status) {
      case 'connected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'connecting':
      case 'reconnecting':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'disconnected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L5.636 18.364m12.728 0L5.636 5.636" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${connectionState.reconnectAttempts} attempts)`;
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return null;
    return latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`;
  };

  const formatLastConnected = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`connection-status ${className}`}>
      {/* Main status indicator */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-md border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        
        {connectionState.latency && (
          <span className="text-xs opacity-75">
            {formatLatency(connectionState.latency)}
          </span>
        )}
      </div>

      {/* Detailed information */}
      {showDetails && connectionState.status !== 'error' && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          {connectionState.lastConnected && (
            <div>Last connected: {formatLastConnected(connectionState.lastConnected)}</div>
          )}
          {connectionState.reconnectAttempts > 0 && (
            <div>Reconnect attempts: {connectionState.reconnectAttempts}</div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
                </span>
              </div>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error.message}
              </p>
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                {error.timestamp.toLocaleTimeString()}
                {error.code && ` • Code: ${error.code}`}
              </div>
            </div>
            
            <div className="ml-3 flex space-x-2">
              {error.recoverable && onReconnect && (
                <button
                  onClick={onReconnect}
                  className="text-xs bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              )}
              {onDismissError && (
                <button
                  onClick={onDismissError}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reconnection progress */}
      {connectionState.status === 'reconnecting' && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Reconnecting...</span>
            <span>{connectionState.reconnectAttempts}/3</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-yellow-500 h-1 rounded-full transition-all duration-1000"
              style={{ 
                width: `${(connectionState.reconnectAttempts / 3) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Compact status indicator for minimal UI
export const CompactConnectionStatus: React.FC<{
  connectionState: ConnectionState;
  className?: string;
}> = ({ connectionState, className = '' }) => {
  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
        return 'bg-gray-400';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`} title={connectionState.status}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      {connectionState.latency && (
        <span className="text-xs text-gray-500">
          {connectionState.latency}ms
        </span>
      )}
    </div>
  );
};