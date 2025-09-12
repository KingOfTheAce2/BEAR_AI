// Alerts Panel Component
import React, { useState, useMemo } from 'react';
import { PerformanceAlert } from '../../types/monitoring';

interface AlertsPanelProps {
  alerts: PerformanceAlert[];
  onResolve: (alertId: string) => void;
  compact?: boolean;
  className?: string;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onResolve,
  compact = false,
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(alert => !alert.resolved);
    } else if (filter === 'resolved') {
      filtered = filtered.filter(alert => alert.resolved);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(alert => alert.category === categoryFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.type === typeFilter);
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [alerts, filter, categoryFilter, typeFilter]);

  const alertStats = useMemo(() => {
    const active = alerts.filter(a => !a.resolved).length;
    const resolved = alerts.filter(a => a.resolved).length;
    const critical = alerts.filter(a => a.type === 'critical' && !a.resolved).length;
    const byCategory = alerts.reduce((acc, alert) => {
      acc[alert.category] = (acc[alert.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { active, resolved, critical, byCategory };
  }, [alerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return '#ff4757';
      case 'error': return '#ff6348';
      case 'warning': return '#ffa726';
      default: return '#3742fa';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className={`alerts-panel ${compact ? 'compact' : ''} ${className}`}>
      {!compact && (
        <div className="alerts-header">
          <div className="alerts-stats">
            <div className="stat-item">
              <span className="stat-label">Active</span>
              <span className="stat-value critical">{alertStats.active}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Critical</span>
              <span className="stat-value error">{alertStats.critical}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{alertStats.resolved}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{alerts.length}</span>
            </div>
          </div>

          <div className="alerts-filters">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Alerts</option>
              <option value="active">Active Only</option>
              <option value="resolved">Resolved Only</option>
            </select>

            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="system">System</option>
              <option value="model">Model</option>
              <option value="memory">Memory</option>
              <option value="disk">Disk</option>
              <option value="network">Network</option>
            </select>

            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
      )}

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            {filter === 'active' ? (
              <div className="no-active-alerts">
                <span className="icon">✅</span>
                <p>No active alerts</p>
                <small>System is running smoothly</small>
              </div>
            ) : (
              <div className="no-alerts-message">
                <p>No alerts found</p>
                <small>Adjust filters to see more results</small>
              </div>
            )}
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`alert-item ${alert.type} ${alert.resolved ? 'resolved' : 'active'}`}
            >
              <div className="alert-header">
                <div className="alert-info">
                  <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                  <div className="alert-title-section">
                    <h4 className="alert-title">{alert.title}</h4>
                    <div className="alert-meta">
                      <span className="alert-category">{alert.category}</span>
                      <span className="alert-type">{alert.type}</span>
                      <span className="alert-time">{formatTimeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                {!alert.resolved && !compact && (
                  <button
                    className="resolve-btn"
                    onClick={() => onResolve(alert.id)}
                    title="Mark as resolved"
                  >
                    Resolve
                  </button>
                )}
              </div>

              <div className="alert-content">
                <p className="alert-message">{alert.message}</p>
                
                {!compact && (
                  <div className="alert-details">
                    <div className="alert-metrics">
                      <span className="metric-item">
                        <strong>Threshold:</strong> {alert.threshold}{alert.category === 'model' && alert.title.includes('Latency') ? 'ms' : '%'}
                      </span>
                      <span className="metric-item">
                        <strong>Current:</strong> {alert.currentValue.toFixed(1)}{alert.category === 'model' && alert.title.includes('Latency') ? 'ms' : '%'}
                      </span>
                      <span className="metric-item">
                        <strong>Severity:</strong> 
                        <span style={{ color: getAlertColor(alert.type) }}>
                          {alert.type.toUpperCase()}
                        </span>
                      </span>
                    </div>

                    <div className="alert-timestamp">
                      <small>
                        <strong>Triggered:</strong> {new Date(alert.timestamp).toLocaleString()}
                        {alert.resolved && alert.resolvedAt && (
                          <>
                            {' • '}
                            <strong>Resolved:</strong> {new Date(alert.resolvedAt).toLocaleString()}
                          </>
                        )}
                      </small>
                    </div>
                  </div>
                )}
              </div>

              {alert.resolved && (
                <div className="alert-resolved-indicator">
                  <span className="resolved-icon">✅</span>
                  <span className="resolved-text">Resolved</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!compact && alerts.length > 0 && (
        <div className="alerts-summary">
          <h4>Alert Categories</h4>
          <div className="category-breakdown">
            {Object.entries(alertStats.byCategory).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <span className="category-count">{count}</span>
                <div className="category-bar">
                  <div 
                    className="category-fill" 
                    style={{ 
                      width: `${(count / alerts.length) * 100}%`,
                      backgroundColor: getCategoryColor(category)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to get category colors
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'system': return '#ff6b6b';
    case 'model': return '#4ecdc4';
    case 'memory': return '#45b7d1';
    case 'disk': return '#96ceb4';
    case 'network': return '#feca57';
    default: return '#888';
  }
};