// Performance Stats Component
import React, { useState, useEffect, useMemo } from 'react';
import { LocalPerformanceMonitor } from '../../services/monitoring/localPerformanceMonitor';

interface PerformanceStatsProps {
  monitor: LocalPerformanceMonitor;
  focus?: 'all' | 'system' | 'models';
  className?: string;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  monitor,
  focus = 'all',
  className = ''
}) => {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('1h');
  const [systemStats, setSystemStats] = useState<any>(null);
  const [modelStats, setModelStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const timeframeMs = useMemo(() => {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }, [timeframe]);

  useEffect(() => {
    const updateStats = () => {
      setIsLoading(true);
      
      const systemPerformance = monitor.getSystemPerformanceStats(timeframeMs);
      const modelPerformance = monitor.getModelPerformanceStats(undefined, timeframeMs);
      
      setSystemStats(systemPerformance);
      setModelStats(modelPerformance);
      setIsLoading(false);
    };

    updateStats();
    
    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    
    return () => clearInterval(interval);
  }, [monitor, timeframeMs]);

  const formatValue = (value: number, unit: string = '', decimals: number = 1): string => {
    if (isNaN(value) || !isFinite(value)) return 'N/A';
    return `${value.toFixed(decimals)}${unit}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getPerformanceIndicator = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'critical';
  };

  const getCurrentMetrics = () => {
    return monitor.getCurrentSystemMetrics();
  };

  if (isLoading) {
    return (
      <div className={`performance-stats loading ${className}`}>
        <div className="loading-spinner">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className={`performance-stats ${className}`}>
      <div className="stats-header">
        <h3>Performance Statistics</h3>
        <div className="timeframe-selector">
          {(['1h', '24h', '7d', '30d'] as const).map(tf => (
            <button
              key={tf}
              className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {(focus === 'all' || focus === 'system') && systemStats && (
        <div className="system-stats-section">
          <h4>System Performance</h4>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">CPU Usage</span>
                <span 
                  className={`stat-indicator ${getPerformanceIndicator(systemStats.avgCpu, { good: 50, warning: 80 })}`}
                />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {formatValue(systemStats.avgCpu, '%')}
                  <span className="stat-label">Average</span>
                </div>
                <div className="stat-value secondary">
                  {formatValue(systemStats.peakCpu, '%')}
                  <span className="stat-label">Peak</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Memory Usage</span>
                <span 
                  className={`stat-indicator ${getPerformanceIndicator(systemStats.avgMemory, { good: 60, warning: 85 })}`}
                />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {formatValue(systemStats.avgMemory, '%')}
                  <span className="stat-label">Average</span>
                </div>
                <div className="stat-value secondary">
                  {formatValue(systemStats.peakMemory, '%')}
                  <span className="stat-label">Peak</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Disk Usage</span>
                <span 
                  className={`stat-indicator ${getPerformanceIndicator(systemStats.avgDisk, { good: 70, warning: 90 })}`}
                />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {formatValue(systemStats.avgDisk, '%')}
                  <span className="stat-label">Average</span>
                </div>
                <div className="stat-value secondary">
                  {formatValue(systemStats.peakDisk, '%')}
                  <span className="stat-label">Peak</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">System Health</span>
                <span 
                  className={`stat-indicator ${
                    systemStats.avgCpu < 70 && systemStats.avgMemory < 80 && systemStats.avgDisk < 85 
                      ? 'good' 
                      : systemStats.avgCpu < 90 && systemStats.avgMemory < 95 && systemStats.avgDisk < 95
                        ? 'warning'
                        : 'critical'
                  }`}
                />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {systemStats.avgCpu < 70 && systemStats.avgMemory < 80 && systemStats.avgDisk < 85 
                    ? 'Excellent' 
                    : systemStats.avgCpu < 90 && systemStats.avgMemory < 95 && systemStats.avgDisk < 95
                      ? 'Good'
                      : 'Needs Attention'}
                  <span className="stat-label">Overall</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(focus === 'all' || focus === 'models') && modelStats && (
        <div className="model-stats-section">
          <h4>Model Performance</h4>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Inference Latency</span>
                <span 
                  className={`stat-indicator ${getPerformanceIndicator(modelStats.avgLatency, { good: 1000, warning: 5000 })}`}
                />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {formatValue(modelStats.avgLatency, 'ms', 0)}
                  <span className="stat-label">Average</span>
                </div>
                <div className="stat-value secondary">
                  {formatValue(modelStats.p95Latency, 'ms', 0)}
                  <span className="stat-label">P95</span>
                </div>
                <div className="stat-value tertiary">
                  {formatValue(modelStats.p99Latency, 'ms', 0)}
                  <span className="stat-label">P99</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Throughput</span>
                <span className="stat-indicator good" />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {formatValue(modelStats.avgThroughput, '/s')}
                  <span className="stat-label">Average</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Memory Usage</span>
                <span 
                  className={`stat-indicator ${getPerformanceIndicator(modelStats.avgMemoryUsage / (1024 * 1024), { good: 256, warning: 512 })}`}
                />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {formatBytes(modelStats.avgMemoryUsage)}
                  <span className="stat-label">Average</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Operations</span>
                <span className="stat-indicator good" />
              </div>
              <div className="stat-values">
                <div className="stat-value primary">
                  {modelStats.totalOperations}
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-value secondary">
                  {formatValue(modelStats.errorRate, '%')}
                  <span className="stat-label">Error Rate</span>
                </div>
              </div>
            </div>
          </div>

          {modelStats.totalOperations > 0 && (
            <div className="model-insights">
              <h5>Performance Insights</h5>
              <div className="insights-grid">
                <div className="insight-item">
                  <span className="insight-label">Average Response Time:</span>
                  <span className="insight-value">
                    {modelStats.avgLatency < 1000 
                      ? '🟢 Excellent' 
                      : modelStats.avgLatency < 3000 
                        ? '🟡 Good' 
                        : '🔴 Needs Improvement'}
                  </span>
                </div>
                
                <div className="insight-item">
                  <span className="insight-label">Memory Efficiency:</span>
                  <span className="insight-value">
                    {modelStats.avgMemoryUsage < 256 * 1024 * 1024 
                      ? '🟢 Excellent' 
                      : modelStats.avgMemoryUsage < 512 * 1024 * 1024 
                        ? '🟡 Good' 
                        : '🔴 High Usage'}
                  </span>
                </div>
                
                <div className="insight-item">
                  <span className="insight-label">Reliability:</span>
                  <span className="insight-value">
                    {modelStats.errorRate < 1 
                      ? '🟢 Excellent' 
                      : modelStats.errorRate < 5 
                        ? '🟡 Good' 
                        : '🔴 Poor'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {focus === 'all' && (
        <div className="overall-health">
          <h4>System Health Overview</h4>
          <div className="health-indicators">
            <div className="health-item">
              <span className="health-label">CPU Health</span>
              <div className="health-bar">
                <div 
                  className={`health-fill ${getPerformanceIndicator(systemStats?.avgCpu || 0, { good: 50, warning: 80 })}`}
                  style={{ width: `${Math.min(100, (systemStats?.avgCpu || 0))}%` }}
                />
              </div>
              <span className="health-value">{formatValue(systemStats?.avgCpu || 0, '%')}</span>
            </div>

            <div className="health-item">
              <span className="health-label">Memory Health</span>
              <div className="health-bar">
                <div 
                  className={`health-fill ${getPerformanceIndicator(systemStats?.avgMemory || 0, { good: 60, warning: 85 })}`}
                  style={{ width: `${Math.min(100, (systemStats?.avgMemory || 0))}%` }}
                />
              </div>
              <span className="health-value">{formatValue(systemStats?.avgMemory || 0, '%')}</span>
            </div>

            <div className="health-item">
              <span className="health-label">Model Performance</span>
              <div className="health-bar">
                <div 
                  className={`health-fill ${getPerformanceIndicator(modelStats?.avgLatency || 0, { good: 1000, warning: 5000 })}`}
                  style={{ width: `${Math.min(100, (modelStats?.avgLatency || 0) / 100)}%` }}
                />
              </div>
              <span className="health-value">{formatValue(modelStats?.avgLatency || 0, 'ms', 0)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="stats-footer">
        <small>
          Last updated: {new Date().toLocaleTimeString()} • 
          Timeframe: {timeframe} • 
          Data points: {focus === 'system' ? 'System metrics' : focus === 'models' ? 'Model operations' : 'All metrics'}
        </small>
      </div>
    </div>
  );
};