import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { useSystemSettings } from '../../contexts/SettingsContext';
import FormField from './FormField';

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
  connection?: unknown;
};

const getNavigator = (): NavigatorWithMemory | null =>
  typeof navigator !== 'undefined' ? (navigator as NavigatorWithMemory) : null;

const SystemSettingsPanel: React.FC = () => {
  const { system, updateSystem } = useSystemSettings();
  const [performanceMetrics, setPerformanceMetrics] = useState({
    memoryUsage: 0,
    cpuUsage: 0,
    storageUsage: 0,
    networkLatency: 0,
  });

  const updateChannels = [
    { value: 'stable', label: 'Stable (Recommended)' },
    { value: 'beta', label: 'Beta (Preview Features)' },
    { value: 'nightly', label: 'Nightly (Latest Development)' },
  ];

  const aggressivenessLevels = [
    { value: 'low', label: 'Low (Conservative)' },
    { value: 'medium', label: 'Medium (Balanced)' },
    { value: 'high', label: 'High (Aggressive)' },
  ];

  // Simulate performance monitoring
  useEffect(() => {
    const updateMetrics = () => {
      // In a real application, these would be actual system metrics
      setPerformanceMetrics({
        memoryUsage: Math.floor(Math.random() * 50) + 30, // 30-80%
        cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
        storageUsage: Math.floor(Math.random() * 20) + 40, // 40-60%
        networkLatency: Math.floor(Math.random() * 100) + 50, // 50-150ms
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const optimizePerformance = () => {
    const nav = getNavigator();
    const hardwareConcurrency = nav?.hardwareConcurrency ?? 4;
    const deviceMemory = nav?.deviceMemory ?? 4;
    const preloadAggressiveness: 'low' | 'medium' | 'high' =
      deviceMemory >= 8 ? 'high' : 'medium';

    const optimizedSettings = {
      performance: {
        ...system.performance,
        maxWorkerThreads: Math.min(hardwareConcurrency, 8),
        memoryLimit: Math.floor(deviceMemory * 1024 * 0.4), // 40% of available RAM
        gcSettings: {
          enabled: true,
          threshold: 0.7,
          frequency: 5000,
        },
        caching: {
          enabled: true,
          maxSize: Math.floor(deviceMemory * 100), // Proportional to RAM
          ttl: 1800, // 30 minutes
        },
        preloading: {
          enabled: true,
          aggressiveness: preloadAggressiveness,
        },
      },
    };

    updateSystem(optimizedSettings);
    window.alert('Performance settings have been optimized for your system!');
  };

  const runSystemDiagnostic = () => {
    const nav = getNavigator();
    const diagnostics = {
      platform: nav?.platform ?? 'unknown',
      userAgent: nav?.userAgent ?? 'unknown',
      language: nav?.language ?? 'unknown',
      cookieEnabled: nav?.cookieEnabled ?? false,
      onLine: nav?.onLine ?? false,
      hardwareConcurrency: nav?.hardwareConcurrency ?? null,
      deviceMemory: nav?.deviceMemory ?? null,
      connection: nav?.connection ?? null,
    };

    // Logging disabled for production
    
    // Create a diagnostic report
    const report = Object.entries(diagnostics)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-diagnostic-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearCache = () => {
    if (window.confirm('This will clear all cached data. Continue?')) {
      // Clear various caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Clear service worker caches
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update();
          });
        });
      }
      
      window.alert('Cache cleared successfully!');
    }
  };

  const getMemoryPressureColor = (usage: number) => {
    if (usage < 50) return '#28a745'; // Green
    if (usage < 75) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>System & Performance Settings</h3>
        <p>Configure system optimization, hardware detection, and performance tuning</p>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <h4>Hardware Information</h4>
          <div className="hardware-info-grid">
            <div className="info-card">
              <h5>CPU</h5>
              <p>{system.hardware.cpuCores} cores</p>
              <p>{system.hardware.architecture}</p>
            </div>
            <div className="info-card">
              <h5>Memory</h5>
              <p>{system.hardware.totalMemory} MB</p>
              <div className="memory-bar">
                <div 
                  className="memory-used" 
                  style={{ 
                    width: `${performanceMetrics.memoryUsage}%`,
                    backgroundColor: getMemoryPressureColor(performanceMetrics.memoryUsage)
                  }}
                />
              </div>
              <small>{performanceMetrics.memoryUsage}% used</small>
            </div>
            <div className="info-card">
              <h5>Platform</h5>
              <p>{system.hardware.platform}</p>
            </div>
            <div className="info-card">
              <h5>GPU</h5>
              <p>{system.hardware.gpuInfo.length > 0 ? system.hardware.gpuInfo[0].vendor : 'Not detected'}</p>
            </div>
          </div>
        </div>

        <div className="form-group">
          <h4>Performance Tuning</h4>
          
          <FormField
            label="Maximum Worker Threads"
            type="slider"
            value={system.performance.maxWorkerThreads}
            onChange={(value) => updateSystem({
              performance: { ...system.performance, maxWorkerThreads: Number(value) }
            })}
            min={1}
            max={navigator.hardwareConcurrency || 8}
            step={1}
            description="Number of worker threads for parallel processing"
          />

          <FormField
            label="Memory Limit (MB)"
            type="slider"
            value={system.performance.memoryLimit}
            onChange={(value) => updateSystem({
              performance: { ...system.performance, memoryLimit: Number(value) }
            })}
            min={128}
            max={Math.floor(system.hardware.totalMemory * 0.8)}
            step={64}
            description="Maximum memory usage for the application"
          />

          <FormField
            label="Enable Garbage Collection"
            type="switch"
            value={system.performance.gcSettings.enabled}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                gcSettings: { ...system.performance.gcSettings, enabled: value }
              }
            })}
            description="Enable automatic memory management"
          />

          <FormField
            label="GC Threshold"
            type="slider"
            value={system.performance.gcSettings.threshold}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                gcSettings: { ...system.performance.gcSettings, threshold: Number(value) }
              }
            })}
            min={0.5}
            max={0.95}
            step={0.05}
            description="Memory usage threshold to trigger garbage collection"
          />

          <FormField
            label="GC Frequency (ms)"
            type="number"
            value={system.performance.gcSettings.frequency}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                gcSettings: { ...system.performance.gcSettings, frequency: Number(value) }
              }
            })}
            min={1000}
            max={60000}
            step={1000}
            description="How often to check for garbage collection"
          />

          <div className="performance-actions">
            <button className="action-button primary" onClick={optimizePerformance}>
              Auto-Optimize for This System
            </button>
          </div>
        </div>

        <div className="form-group">
          <h4>Caching Configuration</h4>
          
          <FormField
            label="Enable Caching"
            type="switch"
            value={system.performance.caching.enabled}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                caching: { ...system.performance.caching, enabled: value }
              }
            })}
            description="Enable caching for improved performance"
          />

          <FormField
            label="Cache Size Limit (MB)"
            type="slider"
            value={system.performance.caching.maxSize}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                caching: { ...system.performance.caching, maxSize: Number(value) }
              }
            })}
            min={10}
            max={1000}
            step={10}
            description="Maximum size for cached data"
          />

          <FormField
            label="Cache TTL (seconds)"
            type="number"
            value={system.performance.caching.ttl}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                caching: { ...system.performance.caching, ttl: Number(value) }
              }
            })}
            min={60}
            max={86400}
            step={60}
            description="How long to keep items in cache"
          />

          <div className="cache-actions">
            <button className="action-button secondary" onClick={clearCache}>
              Clear All Caches
            </button>
          </div>
        </div>

        <div className="form-group">
          <h4>Preloading & Optimization</h4>
          
          <FormField
            label="Enable Preloading"
            type="switch"
            value={system.performance.preloading.enabled}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                preloading: { ...system.performance.preloading, enabled: value }
              }
            })}
            description="Preload resources to improve responsiveness"
          />

          <FormField
            label="Preloading Aggressiveness"
            type="select"
            value={system.performance.preloading.aggressiveness}
            onChange={(value) => updateSystem({
              performance: { 
                ...system.performance, 
                preloading: { ...system.performance.preloading, aggressiveness: value as any }
              }
            })}
            options={aggressivenessLevels}
            description="How aggressively to preload resources"
          />
        </div>

        <div className="form-group">
          <h4>Development Settings</h4>
          
          <FormField
            label="Debug Mode"
            type="switch"
            value={system.development.debugMode}
            onChange={(value) => updateSystem({
              development: { ...system.development, debugMode: value }
            })}
            description="Enable debug mode with additional logging"
          />

          <FormField
            label="Verbose Logging"
            type="switch"
            value={system.development.verboseLogging}
            onChange={(value) => updateSystem({
              development: { ...system.development, verboseLogging: value }
            })}
            description="Enable detailed console logging"
          />

          <FormField
            label="Enable Profiling"
            type="switch"
            value={system.development.enableProfiling}
            onChange={(value) => updateSystem({
              development: { ...system.development, enableProfiling: value }
            })}
            description="Enable performance profiling tools"
          />

          <FormField
            label="Hot Reload"
            type="switch"
            value={system.development.hotReload}
            onChange={(value) => updateSystem({
              development: { ...system.development, hotReload: value }
            })}
            description="Enable hot reload for development"
          />

          <FormField
            label="Source Maps"
            type="switch"
            value={system.development.sourceMaps}
            onChange={(value) => updateSystem({
              development: { ...system.development, sourceMaps: value }
            })}
            description="Include source maps for debugging"
          />

          <FormField
            label="Developer Tools"
            type="switch"
            value={system.development.devTools}
            onChange={(value) => updateSystem({
              development: { ...system.development, devTools: value }
            })}
            description="Enable browser developer tools integration"
          />
        </div>

        <div className="form-group">
          <h4>Update Settings</h4>
          
          <FormField
            label="Auto Check for Updates"
            type="switch"
            value={system.updates.autoCheck}
            onChange={(value) => updateSystem({
              updates: { ...system.updates, autoCheck: value }
            })}
            description="Automatically check for application updates"
          />

          <FormField
            label="Auto Download Updates"
            type="switch"
            value={system.updates.autoDownload}
            onChange={(value) => updateSystem({
              updates: { ...system.updates, autoDownload: value }
            })}
            description="Automatically download updates when available"
          />

          <FormField
            label="Auto Install Updates"
            type="switch"
            value={system.updates.autoInstall}
            onChange={(value) => updateSystem({
              updates: { ...system.updates, autoInstall: value }
            })}
            description="Automatically install downloaded updates"
          />

          <FormField
            label="Update Channel"
            type="select"
            value={system.updates.channel}
            onChange={(value) => updateSystem({
              updates: { ...system.updates, channel: value as any }
            })}
            options={updateChannels}
            description="Choose your update channel"
          />

          <FormField
            label="Check Interval (Hours)"
            type="slider"
            value={system.updates.checkInterval}
            onChange={(value) => updateSystem({
              updates: { ...system.updates, checkInterval: Number(value) }
            })}
            min={1}
            max={168}
            step={1}
            description="How often to check for updates"
          />
        </div>

        <div className="form-group">
          <h4>System Monitoring</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <h5>CPU Usage</h5>
              <div className="metric-value">{performanceMetrics.cpuUsage}%</div>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ width: `${performanceMetrics.cpuUsage}%` }}
                />
              </div>
            </div>
            <div className="metric-card">
              <h5>Memory Usage</h5>
              <div className="metric-value">{performanceMetrics.memoryUsage}%</div>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ 
                    width: `${performanceMetrics.memoryUsage}%`,
                    backgroundColor: getMemoryPressureColor(performanceMetrics.memoryUsage)
                  }}
                />
              </div>
            </div>
            <div className="metric-card">
              <h5>Storage Usage</h5>
              <div className="metric-value">{performanceMetrics.storageUsage}%</div>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ width: `${performanceMetrics.storageUsage}%` }}
                />
              </div>
            </div>
            <div className="metric-card">
              <h5>Network Latency</h5>
              <div className="metric-value">{performanceMetrics.networkLatency}ms</div>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ width: `${Math.min(performanceMetrics.networkLatency / 2, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="system-actions">
            <button className="action-button secondary" onClick={runSystemDiagnostic}>
              Run System Diagnostic
            </button>
          </div>
        </div>

        <div className="settings-info">
          <h4>System Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Worker Threads:</label>
              <span>{system.performance.maxWorkerThreads}</span>
            </div>
            <div className="info-item">
              <label>Memory Limit:</label>
              <span>{system.performance.memoryLimit} MB</span>
            </div>
            <div className="info-item">
              <label>Cache Size:</label>
              <span>{system.performance.caching.maxSize} MB</span>
            </div>
            <div className="info-item">
              <label>Update Channel:</label>
              <span>{system.updates.channel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPanel;