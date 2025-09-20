import React, { useState, useEffect } from 'react';
import { SystemMetrics, ModelInferenceMetrics, PerformanceAlert, OptimizationSuggestion, performanceMonitor } from '../../services/performanceMonitor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface PerformanceMetricsProps {
  className?: string;
  showAlerts?: boolean;
  showSuggestions?: boolean;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  className = '',
  showAlerts = true,
  showSuggestions = true
}) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelInferenceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'model' | 'user' | 'alerts' | 'suggestions'>('system');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    // Initialize data
    updateData();

    // Set up event listeners
    const handleSystemMetrics = (metrics: SystemMetrics) => {
      setSystemMetrics(prev => [...prev.slice(-99), metrics]);
    };

    const handleModelMetrics = (metrics: ModelInferenceMetrics) => {
      setModelMetrics(prev => [...prev.slice(-99), metrics]);
    };

    const handleAlertCreated = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    const handleOptimizationSuggestions = (newSuggestions: OptimizationSuggestion[]) => {
      setSuggestions(prev => [...prev, ...newSuggestions]);
    };

    performanceMonitor.on('system-metrics-updated', handleSystemMetrics);
    performanceMonitor.on('model-metrics-updated', handleModelMetrics);
    performanceMonitor.on('alert-created', handleAlertCreated);
    performanceMonitor.on('optimization-suggestions', handleOptimizationSuggestions);

    // Update summary periodically
    const summaryInterval = setInterval(() => {
      setSummary(performanceMonitor.getPerformanceSummary());
    }, 5000);

    return () => {
      performanceMonitor.off('system-metrics-updated', handleSystemMetrics);
      performanceMonitor.off('model-metrics-updated', handleModelMetrics);
      performanceMonitor.off('alert-created', handleAlertCreated);
      performanceMonitor.off('optimization-suggestions', handleOptimizationSuggestions);
      clearInterval(summaryInterval);
    };
  }, []);

  const updateData = () => {
    setSystemMetrics(performanceMonitor.getSystemMetrics());
    setModelMetrics(performanceMonitor.getModelMetrics());
    setAlerts(performanceMonitor.getAlerts());
    setSuggestions(performanceMonitor.getOptimizationSuggestions());
    setSummary(performanceMonitor.getPerformanceSummary());
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      performanceMonitor.stopMonitoring();
    } else {
      performanceMonitor.startMonitoring();
    }
    setIsMonitoring(!isMonitoring);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderSystemMetricsChart = () => {
    const chartData = systemMetrics.map(m => ({
      time: formatTime(m.timestamp),
      cpu: m.cpu.usage,
      memory: m.memory.percentage,
      network: m.network.latency
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">CPU Usage</h4>
            <div className="text-2xl font-bold text-blue-600">
              {summary.systemHealth?.cpu?.toFixed(1) || 0}%
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Memory Usage</h4>
            <div className="text-2xl font-bold text-green-600">
              {summary.systemHealth?.memory?.toFixed(1) || 0}%
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Network Latency</h4>
            <div className="text-2xl font-bold text-purple-600">
              {summary.systemHealth?.network?.toFixed(0) || 0}ms
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cpu" stroke="#3B82F6" name="CPU %" />
            <Line type="monotone" dataKey="memory" stroke="#10B981" name="Memory %" />
            <Line type="monotone" dataKey="network" stroke="#8B5CF6" name="Latency (ms)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderModelMetricsChart = () => {
    const chartData = modelMetrics.map(m => ({
      time: formatTime(m.startTime),
      duration: m.duration,
      tokensPerSecond: m.tokensPerSecond,
      memoryUsed: m.memoryUsed / 1024 / 1024 // Convert to MB
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Avg Latency</h4>
            <div className="text-2xl font-bold text-blue-600">
              {summary.modelPerformance?.averageLatency?.toFixed(0) || 0}ms
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Tokens/Second</h4>
            <div className="text-2xl font-bold text-green-600">
              {summary.modelPerformance?.tokensPerSecond?.toFixed(1) || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Success Rate</h4>
            <div className="text-2xl font-bold text-purple-600">
              {summary.modelPerformance?.successRate?.toFixed(1) || 100}%
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="duration" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Duration (ms)" />
            <Area type="monotone" dataKey="tokensPerSecond" stackId="2" stroke="#10B981" fill="#10B981" name="Tokens/s" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderAlerts = () => {
    const activeAlerts = alerts.filter(a => !a.resolved);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Performance Alerts</h3>
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
            {activeAlerts.length} Active
          </span>
        </div>
        
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active alerts. System is performing well!
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-lg ${getAlertSeverityColor(alert.severity)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{alert.message}</div>
                    <div className="text-sm opacity-75">
                      Threshold: {alert.threshold} | Current: {alert.currentValue}
                    </div>
                    <div className="text-xs opacity-60">
                      {formatTime(alert.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={() => performanceMonitor.resolveAlert(alert.id)}
                    className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSuggestions = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Optimization Suggestions</h3>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
            {suggestions.length} Available
          </span>
        </div>
        
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No optimization suggestions available.
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.slice(0, 10).map(suggestion => (
              <div key={suggestion.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      suggestion.impact === 'high' ? 'bg-red-100 text-red-800' :
                      suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {suggestion.impact} impact
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      suggestion.effort === 'high' ? 'bg-red-100 text-red-800' :
                      suggestion.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {suggestion.effort} effort
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{suggestion.description}</p>
                {suggestion.implementation && (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Implementation:</strong> {suggestion.implementation}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Priority: {suggestion.priority}/10 | {formatTime(suggestion.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`performance-metrics ${className}`}>
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Performance Monitoring Dashboard</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMonitoring}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isMonitoring 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </button>
              <button
                onClick={updateData}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="border-b">
          <nav className="flex space-x-1 p-2">
            {[
              { key: 'system', label: 'System' },
              { key: 'model', label: 'Model' },
              { key: 'user', label: 'User' },
              ...(showAlerts ? [{ key: 'alerts', label: `Alerts (${alerts.filter(a => !a.resolved).length})` }] : []),
              ...(showSuggestions ? [{ key: 'suggestions', label: `Suggestions (${suggestions.length})` }] : [])
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'system' && renderSystemMetricsChart()}
          {activeTab === 'model' && renderModelMetricsChart()}
          {activeTab === 'user' && (
            <div className="text-center py-8 text-gray-500">
              User interaction metrics will be displayed here when available.
            </div>
          )}
          {activeTab === 'alerts' && renderAlerts()}
          {activeTab === 'suggestions' && renderSuggestions()}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
