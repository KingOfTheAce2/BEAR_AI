import React, { useState } from 'react';
import { PerformanceAlert as Alert } from '../../services/performanceMonitor';
import { usePerformance } from '../../contexts/PerformanceContext';

interface PerformanceAlertProps {
  alert: Alert;
  showResolveButton?: boolean;
  compact?: boolean;
  className?: string;
}

export const PerformanceAlertComponent: React.FC<PerformanceAlertProps> = ({
  alert,
  showResolveButton = true,
  compact = false,
  className = ''
}) => {
  const { resolveAlert } = usePerformance();
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      resolveAlert(alert.id);
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bgColor: 'bg-red-100 border-red-400',
          textColor: 'text-red-800',
          icon: '🚨',
          badgeColor: 'bg-red-500'
        };
      case 'high':
        return {
          bgColor: 'bg-orange-100 border-orange-400',
          textColor: 'text-orange-800',
          icon: '⚠️',
          badgeColor: 'bg-orange-500'
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-100 border-yellow-400',
          textColor: 'text-yellow-800',
          icon: '⚡',
          badgeColor: 'bg-yellow-500'
        };
      case 'low':
        return {
          bgColor: 'bg-blue-100 border-blue-400',
          textColor: 'text-blue-800',
          icon: 'ℹ️',
          badgeColor: 'bg-blue-500'
        };
      default:
        return {
          bgColor: 'bg-gray-100 border-gray-400',
          textColor: 'text-gray-800',
          icon: '📊',
          badgeColor: 'bg-gray-500'
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-2 rounded-lg border ${config.bgColor} ${config.textColor} ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-sm">{config.icon}</span>
          <span className="text-sm font-medium">{alert.message}</span>
        </div>
        {showResolveButton && !alert.resolved && (
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
          >
            {isResolving ? '...' : 'Resolve'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${config.bgColor} ${config.textColor} ${className}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold">{alert.type.toUpperCase()} Alert</h4>
              <span className={`px-2 py-1 rounded-full text-xs text-white ${config.badgeColor}`}>
                {alert.severity}
              </span>
            </div>
            <p className="text-sm mb-2">{alert.message}</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">Threshold:</span> {alert.threshold}
              </div>
              <div>
                <span className="font-medium">Current:</span> {alert.currentValue}
              </div>
              <div>
                <span className="font-medium">Time:</span> {formatTime(alert.timestamp)}
              </div>
              <div>
                <span className="font-medium">Status:</span> {alert.resolved ? 'Resolved' : 'Active'}
              </div>
            </div>
            {alert.metadata && Object.keys(alert.metadata).length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-xs">Additional Info:</span>
                <div className="text-xs bg-white bg-opacity-20 p-2 rounded mt-1">
                  {Object.entries(alert.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {showResolveButton && !alert.resolved && (
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="ml-4 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm transition-colors"
          >
            {isResolving ? 'Resolving...' : 'Resolve'}
          </button>
        )}
      </div>
    </div>
  );
};

interface PerformanceAlertsListProps {
  maxAlerts?: number;
  showResolved?: boolean;
  compact?: boolean;
  className?: string;
}

export const PerformanceAlertsList: React.FC<PerformanceAlertsListProps> = ({
  maxAlerts = 10,
  showResolved = false,
  compact = false,
  className = ''
}) => {
  const { alerts } = usePerformance();
  
  const filteredAlerts = alerts
    .filter(alert => showResolved || !alert.resolved)
    .sort((a, b) => {
      // Sort by severity and timestamp
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      return b.timestamp - a.timestamp;
    })
    .slice(0, maxAlerts);

  if (filteredAlerts.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-4xl mb-2">✅</div>
        <div>No {showResolved ? '' : 'active'} performance alerts</div>
        <div className="text-sm">System is performing optimally</div>
      </div>
    );
  }

  return (
    <div className={`space-y-${compact ? '2' : '4'} ${className}`}>
      {filteredAlerts.map(alert => (
        <PerformanceAlertComponent
          key={alert.id}
          alert={alert}
          compact={compact}
          showResolveButton={!alert.resolved}
        />
      ))}
    </div>
  );
};

export default PerformanceAlertComponent;