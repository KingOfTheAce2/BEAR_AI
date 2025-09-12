// Performance Dashboard Component
import React, { useState, useEffect, useCallback } from 'react';
import { 
  SystemMetrics, 
  ModelPerformanceMetrics, 
  PerformanceAlert, 
  OptimizationRecommendation,
  MonitoringState 
} from '../../types/monitoring';
import { LocalPerformanceMonitor } from '../../services/monitoring/localPerformanceMonitor';
import { SystemMetricsChart } from './SystemMetricsChart';
import { ModelMetricsChart } from './ModelMetricsChart';
import { AlertsPanel } from './AlertsPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { PerformanceStats } from './PerformanceStats';

interface PerformanceDashboardProps {
  monitor: LocalPerformanceMonitor;
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  monitor,
  className = ''
}) => {
  const [state, setState] = useState<MonitoringState | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'system' | 'models' | 'alerts' | 'recommendations' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize monitoring state
  useEffect(() => {
    const initializeState = async () => {
      try {
        setIsLoading(true);
        const currentState = monitor.getState();
        setState(currentState);
        
        // Set up state change listener
        monitor.onStateChange((newState) => {
          setState(newState);
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize performance monitoring');
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, [monitor]);

  const handleStartMonitoring = useCallback(async () => {
    try {
      await monitor.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
    }
  }, [monitor]);

  const handleStopMonitoring = useCallback(async () => {
    try {
      await monitor.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop monitoring');
    }
  }, [monitor]);

  const handleResolveAlert = useCallback((alertId: string) => {
    monitor.resolveAlert(alertId);
  }, [monitor]);

  const handleApplyRecommendation = useCallback((recommendationId: string) => {
    monitor.markRecommendationApplied(recommendationId);
  }, [monitor]);

  if (isLoading) {
    return (
      <div className={`performance-dashboard loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Performance Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`performance-dashboard error ${className}`}>
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Retry</button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={`performance-dashboard ${className}`}>
        <div className="no-state">
          <p>No monitoring state available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Local Performance Monitor</h2>
          <div className="status-indicator">
            <span className={`status-dot ${state.isRunning ? 'running' : 'stopped'}`}></span>
            <span className="status-text">
              {state.isRunning ? 'Monitoring Active' : 'Monitoring Stopped'}
            </span>
            {state.startedAt && (
              <span className="start-time">
                Started: {new Date(state.startedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="header-controls">
            {state.isRunning ? (
              <button 
                className="btn btn-stop" 
                onClick={handleStopMonitoring}
              >
                Stop Monitoring
              </button>
            ) : (
              <button 
                className="btn btn-start" 
                onClick={handleStartMonitoring}
              >
                Start Monitoring
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <h4>Active Alerts</h4>
          <span className="stat-value">{state.alerts.filter(a => !a.resolved).length}</span>
        </div>
        <div className="stat-card">
          <h4>Recommendations</h4>
          <span className="stat-value">{state.recommendations.filter(r => !r.applied).length}</span>
        </div>
        <div className="stat-card">
          <h4>System Metrics</h4>
          <span className="stat-value">{state.systemMetrics.length}</span>
        </div>
        <div className="stat-card">
          <h4>Model Metrics</h4>
          <span className="stat-value">{state.modelMetrics.length}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'system', label: 'System Metrics' },
          { id: 'models', label: 'Model Performance' },
          { id: 'alerts', label: 'Alerts' },
          { id: 'recommendations', label: 'Recommendations' },
          { id: 'settings', label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
            {tab.id === 'alerts' && state.alerts.filter(a => !a.resolved).length > 0 && (
              <span className="badge">{state.alerts.filter(a => !a.resolved).length}</span>
            )}
            {tab.id === 'recommendations' && state.recommendations.filter(r => !r.applied).length > 0 && (
              <span className="badge">{state.recommendations.filter(r => !r.applied).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <PerformanceStats monitor={monitor} />
            <div className="overview-grid">
              <div className="overview-section">
                <h3>Recent System Performance</h3>
                <SystemMetricsChart 
                  metrics={state.systemMetrics.slice(-50)} 
                  height={200}
                />
              </div>
              <div className="overview-section">
                <h3>Recent Model Performance</h3>
                <ModelMetricsChart 
                  metrics={state.modelMetrics.slice(-50)} 
                  height={200}
                />
              </div>
            </div>
            <div className="overview-alerts">
              <h3>Recent Alerts</h3>
              <AlertsPanel 
                alerts={state.alerts.filter(a => !a.resolved).slice(0, 5)}
                onResolve={handleResolveAlert}
                compact
              />
            </div>
            <div className="overview-recommendations">
              <h3>Top Recommendations</h3>
              <RecommendationsPanel 
                recommendations={state.recommendations.filter(r => !r.applied).slice(0, 3)}
                onApply={handleApplyRecommendation}
                compact
              />
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="system-tab">
            <h3>System Resource Monitoring</h3>
            <SystemMetricsChart 
              metrics={state.systemMetrics.slice(-200)} 
              height={400}
              showDetails
            />
            <div className="system-summary">
              <PerformanceStats monitor={monitor} focus="system" />
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="models-tab">
            <h3>Model Performance Tracking</h3>
            <ModelMetricsChart 
              metrics={state.modelMetrics.slice(-200)} 
              height={400}
              showDetails
            />
            <div className="model-summary">
              <PerformanceStats monitor={monitor} focus="models" />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="alerts-tab">
            <h3>Performance Alerts</h3>
            <AlertsPanel 
              alerts={state.alerts}
              onResolve={handleResolveAlert}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-tab">
            <h3>Optimization Recommendations</h3>
            <RecommendationsPanel 
              recommendations={state.recommendations}
              onApply={handleApplyRecommendation}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h3>Monitoring Configuration</h3>
            <SettingsPanel monitor={monitor} config={state.config} />
          </div>
        )}
      </div>
    </div>
  );
};

// Settings Panel Component
interface SettingsPanelProps {
  monitor: LocalPerformanceMonitor;
  config: any;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ monitor, config }) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleConfigChange = (section: string, key: string, value: any) => {
    const newConfig = {
      ...localConfig,
      [section]: {
        ...localConfig[section],
        [key]: value
      }
    };
    setLocalConfig(newConfig);
  };

  const handleSaveConfig = () => {
    monitor.updateConfig(localConfig);
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all monitoring data? This action cannot be undone.')) {
      await monitor.clearAllData();
    }
  };

  const handleExportData = async () => {
    try {
      const data = await monitor.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h4>Sampling Configuration</h4>
        <div className="setting-item">
          <label>System Metrics Interval (ms)</label>
          <input
            type="number"
            value={localConfig.sampling.systemMetricsInterval}
            onChange={(e) => handleConfigChange('sampling', 'systemMetricsInterval', Number(e.target.value))}
            min="1000"
            max="60000"
            step="1000"
          />
        </div>
        <div className="setting-item">
          <label>Alert Check Interval (ms)</label>
          <input
            type="number"
            value={localConfig.sampling.alertCheckInterval}
            onChange={(e) => handleConfigChange('sampling', 'alertCheckInterval', Number(e.target.value))}
            min="5000"
            max="300000"
            step="5000"
          />
        </div>
      </div>

      <div className="settings-section">
        <h4>Storage Configuration</h4>
        <div className="setting-item">
          <label>Max History Days</label>
          <input
            type="number"
            value={localConfig.storage.maxHistoryDays}
            onChange={(e) => handleConfigChange('storage', 'maxHistoryDays', Number(e.target.value))}
            min="1"
            max="90"
          />
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localConfig.storage.autoCleanup}
              onChange={(e) => handleConfigChange('storage', 'autoCleanup', e.target.checked)}
            />
            Auto Cleanup Old Data
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h4>Alert Thresholds</h4>
        <div className="threshold-grid">
          <div className="threshold-item">
            <label>CPU Warning (%)</label>
            <input
              type="number"
              value={localConfig.thresholds.cpu.warning}
              onChange={(e) => handleConfigChange('thresholds', 'cpu', { ...localConfig.thresholds.cpu, warning: Number(e.target.value) })}
              min="0"
              max="100"
            />
          </div>
          <div className="threshold-item">
            <label>CPU Critical (%)</label>
            <input
              type="number"
              value={localConfig.thresholds.cpu.critical}
              onChange={(e) => handleConfigChange('thresholds', 'cpu', { ...localConfig.thresholds.cpu, critical: Number(e.target.value) })}
              min="0"
              max="100"
            />
          </div>
          <div className="threshold-item">
            <label>Memory Warning (%)</label>
            <input
              type="number"
              value={localConfig.thresholds.memory.warning}
              onChange={(e) => handleConfigChange('thresholds', 'memory', { ...localConfig.thresholds.memory, warning: Number(e.target.value) })}
              min="0"
              max="100"
            />
          </div>
          <div className="threshold-item">
            <label>Memory Critical (%)</label>
            <input
              type="number"
              value={localConfig.thresholds.memory.critical}
              onChange={(e) => handleConfigChange('thresholds', 'memory', { ...localConfig.thresholds.memory, critical: Number(e.target.value) })}
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4>Privacy & Security</h4>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localConfig.privacy.localStorageOnly}
              onChange={(e) => handleConfigChange('privacy', 'localStorageOnly', e.target.checked)}
              disabled
            />
            Local Storage Only (Always Enabled)
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localConfig.privacy.anonymizeData}
              onChange={(e) => handleConfigChange('privacy', 'anonymizeData', e.target.checked)}
            />
            Anonymize Data
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSaveConfig}>
          Save Configuration
        </button>
        <button className="btn btn-secondary" onClick={handleExportData}>
          Export Data
        </button>
        <button className="btn btn-danger" onClick={handleClearData}>
          Clear All Data
        </button>
      </div>
    </div>
  );
};