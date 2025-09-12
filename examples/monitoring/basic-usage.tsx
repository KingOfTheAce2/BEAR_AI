// Basic Usage Example for Local Performance Monitor
import React, { useEffect } from 'react';
import { LocalPerformanceMonitor } from '../../src/services/monitoring/localPerformanceMonitor';
import { PerformanceDashboard } from '../../src/components/monitoring/PerformanceDashboard';
import { PerformanceMonitoringUtils, trackModelPerformance } from '../../src/utils/monitoring/performanceMonitoringUtils';

// CSS import (adjust path as needed)
import '../../src/styles/monitoring.css';

/**
 * Basic usage example showing how to initialize and use the performance monitor
 */
export const BasicUsageExample: React.FC = () => {
  const [monitor, setMonitor] = React.useState<LocalPerformanceMonitor | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const initMonitor = async () => {
      try {
        // Initialize with custom configuration
        const monitorInstance = await PerformanceMonitoringUtils.initialize({
          sampling: {
            systemMetricsInterval: 5000, // 5 seconds
            modelMetricsInterval: 1000,  // 1 second
            alertCheckInterval: 10000    // 10 seconds
          },
          thresholds: {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            disk: { warning: 85, critical: 95 },
            modelLatency: { warning: 3000, critical: 8000 },
            modelMemory: { warning: 256, critical: 512 }
          },
          alerts: {
            enabled: true,
            soundEnabled: false,
            notificationEnabled: true,
            emailEnabled: false
          },
          privacy: {
            localStorageOnly: true,
            encryptData: false,
            anonymizeData: false
          }
        });

        setMonitor(monitorInstance);
      } catch (error) {
        console.error('Failed to initialize performance monitor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initMonitor();

    // Cleanup on unmount
    return () => {
      PerformanceMonitoringUtils.destroy();
    };
  }, []);

  if (isLoading) {
    return <div>Initializing performance monitor...</div>;
  }

  if (!monitor) {
    return <div>Failed to initialize performance monitor</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', minHeight: '100vh' }}>
      <h1 style={{ color: '#4ecdc4', marginBottom: '30px' }}>
        Performance Monitor - Basic Usage
      </h1>
      
      <PerformanceDashboard monitor={monitor} />
      
      {/* Example usage buttons */}
      <div style={{ marginTop: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => simulateModelInference(monitor)}
          style={{ padding: '10px 20px', background: '#4ecdc4', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Simulate Model Inference
        </button>
        
        <button 
          onClick={() => simulateHighCPULoad()}
          style={{ padding: '10px 20px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Simulate High CPU Load
        </button>
        
        <button 
          onClick={() => generateTestAlert(monitor)}
          style={{ padding: '10px 20px', background: '#ffa726', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Generate Test Alert
        </button>
        
        <button 
          onClick={() => exportPerformanceData(monitor)}
          style={{ padding: '10px 20px', background: '#26de81', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Export Data
        </button>
      </div>
    </div>
  );
};

// Example model class with automatic performance tracking
class ExampleModel {
  @trackModelPerformance('example-model-v1', 'Example Model', 'inference')
  async runInference(inputData: string): Promise<string> {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    // Simulate occasional errors
    if (Math.random() < 0.05) {
      throw new Error('Simulated inference error');
    }
    
    return `Processed: ${inputData}`;
  }

  @trackModelPerformance('example-model-v1', 'Example Model', 'loading')
  async loadModel(): Promise<void> {
    // Simulate model loading
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 2000));
  }
}

// Helper functions for demonstration
async function simulateModelInference(monitor: LocalPerformanceMonitor) {
  const model = new ExampleModel();
  
  try {
    const result = await model.runInference(`Test input ${Date.now()}`);
    console.log('Inference result:', result);
  } catch (error) {
    console.error('Inference failed:', error);
  }
}

function simulateHighCPULoad() {
  // Create high CPU load for a few seconds
  const duration = 3000; // 3 seconds
  const startTime = Date.now();
  
  const interval = setInterval(() => {
    // Intensive computation
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.random() * Math.random();
    }
    
    if (Date.now() - startTime > duration) {
      clearInterval(interval);
      console.log('High CPU load simulation completed');
    }
  }, 10);
}

function generateTestAlert(monitor: LocalPerformanceMonitor) {
  monitor.createCustomAlert(
    'warning',
    'system',
    'Test Alert',
    'This is a test alert generated for demonstration purposes.'
  );
}

async function exportPerformanceData(monitor: LocalPerformanceMonitor) {
  try {
    const data = await monitor.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    console.log('Performance data exported successfully');
  } catch (error) {
    console.error('Failed to export performance data:', error);
  }
}

/**
 * Advanced usage example with React hooks
 */
export const AdvancedUsageExample: React.FC = () => {
  // Use the React hook for easier integration
  const { monitor, isLoading, error } = PerformanceMonitoringUtils.createReactHook()({
    sampling: {
      systemMetricsInterval: 3000, // More frequent monitoring
      modelMetricsInterval: 500,
      alertCheckInterval: 5000
    },
    thresholds: {
      cpu: { warning: 60, critical: 85 }, // More strict thresholds
      memory: { warning: 70, critical: 90 },
      disk: { warning: 80, critical: 95 },
      modelLatency: { warning: 2000, critical: 5000 },
      modelMemory: { warning: 128, critical: 256 }
    }
  });

  // Monitor state changes
  useEffect(() => {
    if (!monitor) return;

    const handleAlert = (alert: any) => {
      console.log('New alert:', alert);
      // You could show a toast notification here
    };

    const handleRecommendation = (recommendation: any) => {
      console.log('New recommendation:', recommendation);
      // You could show a notification or update UI
    };

    monitor.onAlert(handleAlert);
    monitor.onRecommendation(handleRecommendation);

    // Cleanup listeners on unmount
    return () => {
      // Note: In a real implementation, you'd want to remove specific listeners
      // The current API doesn't support listener removal, but you could modify it to do so
    };
  }, [monitor]);

  if (isLoading) {
    return <div>Loading advanced performance monitor...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!monitor) {
    return <div>Monitor not available</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', minHeight: '100vh' }}>
      <h1 style={{ color: '#4ecdc4', marginBottom: '30px' }}>
        Performance Monitor - Advanced Usage
      </h1>
      
      <PerformanceDashboard monitor={monitor} />
      
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ color: '#4ecdc4' }}>Real-time Metrics</h2>
        <RealTimeMetricsDisplay monitor={monitor} />
      </div>
    </div>
  );
};

/**
 * Real-time metrics display component
 */
const RealTimeMetricsDisplay: React.FC<{ monitor: LocalPerformanceMonitor }> = ({ monitor }) => {
  const [currentMetrics, setCurrentMetrics] = React.useState<any>(null);

  useEffect(() => {
    const updateMetrics = () => {
      const systemMetrics = monitor.getCurrentSystemMetrics();
      const modelStats = monitor.getModelPerformanceStats();
      const activeAlerts = monitor.getActiveAlerts();
      const recommendations = monitor.getActiveRecommendations();

      setCurrentMetrics({
        system: systemMetrics,
        model: modelStats,
        alerts: activeAlerts.length,
        recommendations: recommendations.length
      });
    };

    // Update immediately
    updateMetrics();

    // Update every 2 seconds
    const interval = setInterval(updateMetrics, 2000);
    
    return () => clearInterval(interval);
  }, [monitor]);

  if (!currentMetrics) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginTop: '20px'
    }}>
      {currentMetrics.system && (
        <div style={{ background: '#2d2d2d', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#4ecdc4' }}>System</h4>
          <div style={{ color: '#fff' }}>
            <div>CPU: {currentMetrics.system.cpu.usage.toFixed(1)}%</div>
            <div>Memory: {currentMetrics.system.memory.percentage.toFixed(1)}%</div>
            <div>Disk: {currentMetrics.system.disk.percentage.toFixed(1)}%</div>
          </div>
        </div>
      )}
      
      <div style={{ background: '#2d2d2d', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#4ecdc4' }}>Model Performance</h4>
        <div style={{ color: '#fff' }}>
          <div>Avg Latency: {currentMetrics.model.avgLatency.toFixed(0)}ms</div>
          <div>Operations: {currentMetrics.model.totalOperations}</div>
          <div>Error Rate: {currentMetrics.model.errorRate.toFixed(1)}%</div>
        </div>
      </div>
      
      <div style={{ background: '#2d2d2d', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#4ecdc4' }}>Alerts & Recommendations</h4>
        <div style={{ color: '#fff' }}>
          <div style={{ color: currentMetrics.alerts > 0 ? '#ff6b6b' : '#26de81' }}>
            Active Alerts: {currentMetrics.alerts}
          </div>
          <div style={{ color: currentMetrics.recommendations > 0 ? '#ffa726' : '#26de81' }}>
            Recommendations: {currentMetrics.recommendations}
          </div>
        </div>
      </div>
    </div>
  );
};