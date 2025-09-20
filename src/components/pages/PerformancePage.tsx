import React, { useState, useEffect } from 'react';
import { OptimizationSuggestionsList } from '../ui/OptimizationSuggestions';
import { PerformanceAlertsList } from '../ui/PerformanceAlert';
import { PerformanceMetrics } from '../dashboard/PerformanceMetrics';
import { performanceOptimizer } from '../../services/performanceOptimizer';
import { usePerformance } from '../../contexts/PerformanceContext';

const PerformancePage: React.FC = () => {
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    performanceSummary, 
    alerts,
    suggestions,
    updateThresholds
  } = usePerformance();

  const [activeSection, setActiveSection] = useState<'overview' | 'metrics' | 'alerts' | 'optimization' | 'settings'>('overview');
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<any>({});
  const [thresholds, setThresholds] = useState({
    cpu: 80,
    memory: 85,
    modelLatency: 5000,
    renderTime: 100,
    networkLatency: 1000
  });

  useEffect(() => {
    const updateStats = () => {
      setOptimizationStats(performanceOptimizer.getOptimizationStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleOptimizationToggle = () => {
    if (autoOptimizationEnabled) {
      performanceOptimizer.stopAutoOptimization();
    } else {
      performanceOptimizer.startAutoOptimization();
    }
    setAutoOptimizationEnabled(!autoOptimizationEnabled);
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      try {
        const success = await performanceOptimizer.applySuggestion(suggestion);
        if (success) {
          window.alert('Optimization applied successfully!');
        } else {
          window.alert('Failed to apply optimization. Manual intervention may be required.');
        }
      } catch (error) {
        console.error('Error applying suggestion:', error);
        window.alert('Error applying optimization.');
      }
    }
  };

  const handleRunOptimizationCycle = async () => {
    try {
      const newSuggestions = await performanceOptimizer.runOptimizationCycle();
      console.log('Generated', newSuggestions.length, 'new optimization suggestions');
    } catch (error) {
      console.error('Error running optimization cycle:', error);
    }
  };

  const handleThresholdUpdate = () => {
    updateThresholds(thresholds);
    window.alert('Thresholds updated successfully!');
  };

  const getHealthStatus = () => {
    if (!performanceSummary.systemHealth) return { status: 'unknown', color: 'text-gray-500' };
    
    const { cpu, memory, network } = performanceSummary.systemHealth;
    const maxUsage = Math.max(cpu || 0, memory || 0, network / 10 || 0);
    
    if (maxUsage > 90) return { status: 'critical', color: 'text-red-600' };
    if (maxUsage > 75) return { status: 'warning', color: 'text-yellow-600' };
    if (maxUsage > 50) return { status: 'good', color: 'text-green-600' };
    return { status: 'excellent', color: 'text-blue-600' };
  };

  const healthStatus = getHealthStatus();

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">System Health Overview</h2>
          <div className="flex items-center space-x-4">
            <div className={`text-lg font-semibold ${healthStatus.color}`}>
              Status: {healthStatus.status.toUpperCase()}
            </div>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-4 py-2 rounded-lg font-medium ${
                isMonitoring 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-2">CPU Usage</h3>
            <div className="text-2xl font-bold text-blue-800">
              {performanceSummary.systemHealth?.cpu?.toFixed(1) || '0.0'}%
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-2">Memory Usage</h3>
            <div className="text-2xl font-bold text-green-800">
              {performanceSummary.systemHealth?.memory?.toFixed(1) || '0.0'}%
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600 mb-2">Network Latency</h3>
            <div className="text-2xl font-bold text-purple-800">
              {performanceSummary.systemHealth?.network?.toFixed(0) || '0'}ms
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-orange-600 mb-2">Model Avg Latency</h3>
            <div className="text-2xl font-bold text-orange-800">
              {performanceSummary.modelPerformance?.averageLatency?.toFixed(0) || '0'}ms
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600 mb-2">Active Alerts</h3>
            <div className="text-2xl font-bold text-red-800">
              {alerts.filter(a => !a.resolved).length}
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-2">Optimization Suggestions</h3>
            <div className="text-2xl font-bold text-blue-800">
              {suggestions.length}
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-2">Success Rate</h3>
            <div className="text-2xl font-bold text-green-800">
              {performanceSummary.modelPerformance?.successRate?.toFixed(1) || '100'}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <PerformanceAlertsList maxAlerts={5} compact={true} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Optimization Suggestions</h3>
          <OptimizationSuggestionsList 
            maxSuggestions={5} 
            minPriority={7}
            onImplement={handleApplySuggestion}
          />
        </div>
      </div>
    </div>
  );

  const renderOptimization = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Performance Optimization</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleOptimizationToggle}
              className={`px-4 py-2 rounded-lg font-medium ${
                autoOptimizationEnabled
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {autoOptimizationEnabled ? 'Disable Auto-Optimization' : 'Enable Auto-Optimization'}
            </button>
            
            <button
              onClick={handleRunOptimizationCycle}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              Run Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-2">Total Rules</h3>
            <div className="text-2xl font-bold text-blue-800">
              {optimizationStats.totalRules || 0}
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-2">Applied Optimizations</h3>
            <div className="text-2xl font-bold text-green-800">
              {optimizationStats.appliedOptimizations || 0}
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600 mb-2">Auto-Optimization</h3>
            <div className={`text-2xl font-bold ${autoOptimizationEnabled ? 'text-green-800' : 'text-red-800'}`}>
              {autoOptimizationEnabled ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>
        </div>
      </div>

      <OptimizationSuggestionsList onImplement={handleApplySuggestion} />
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Performance Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Alert Thresholds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPU Usage Threshold (%)
              </label>
              <input
                type="number"
                value={thresholds.cpu}
                onChange={(e) => setThresholds(prev => ({ ...prev, cpu: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory Usage Threshold (%)
              </label>
              <input
                type="number"
                value={thresholds.memory}
                onChange={(e) => setThresholds(prev => ({ ...prev, memory: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Latency Threshold (ms)
              </label>
              <input
                type="number"
                value={thresholds.modelLatency}
                onChange={(e) => setThresholds(prev => ({ ...prev, modelLatency: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Render Time Threshold (ms)
              </label>
              <input
                type="number"
                value={thresholds.renderTime}
                onChange={(e) => setThresholds(prev => ({ ...prev, renderTime: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
              />
            </div>
          </div>
          
          <button
            onClick={handleThresholdUpdate}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
          >
            Update Thresholds
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
          <p className="text-gray-600 mt-2">Monitor system performance, track metrics, and optimize operations</p>
        </div>

        <div className="mb-6">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'metrics', label: 'Metrics' },
              { key: 'alerts', label: `Alerts (${alerts.filter(a => !a.resolved).length})` },
              { key: 'optimization', label: 'Optimization' },
              { key: 'settings', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeSection === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          {activeSection === 'overview' && renderOverview()}
          {activeSection === 'metrics' && <PerformanceMetrics />}
          {activeSection === 'alerts' && <PerformanceAlertsList />}
          {activeSection === 'optimization' && renderOptimization()}
          {activeSection === 'settings' && renderSettings()}
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;