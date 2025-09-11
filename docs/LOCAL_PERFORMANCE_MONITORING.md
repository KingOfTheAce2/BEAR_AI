# Local Performance Monitoring System

A comprehensive, privacy-focused performance monitoring solution that keeps all data local without external reporting or telemetry.

## Overview

The Local Performance Monitoring System provides real-time monitoring of system resources, model performance, and application health with complete data privacy. All metrics are stored locally using IndexedDB and never transmitted to external services.

## Features

### 🖥️ System Resource Monitoring
- **Real-time CPU, Memory, and Disk monitoring**
- Browser-based system metrics collection
- Network information (when available)
- Historical data with configurable retention

### 🤖 Model Performance Tracking
- **Automatic model inference tracking**
- Latency, throughput, and memory usage metrics
- Error rate monitoring and reliability tracking
- Support for training, inference, and loading operations

### 📊 Local Analytics Dashboard
- **Interactive performance visualizations**
- Real-time charts for system and model metrics
- Historical trend analysis
- Configurable time ranges and filters

### 🚨 Smart Alert System
- **Configurable performance thresholds**
- Real-time alert generation
- Browser notifications (optional)
- Alert categorization and resolution tracking

### 💡 Optimization Recommendations
- **AI-powered performance insights**
- Automated bottleneck detection
- Actionable optimization suggestions
- Implementation guidance and impact estimates

### 🔒 Privacy-First Design
- **100% local data storage**
- No external analytics or telemetry
- Encrypted data storage (optional)
- Data anonymization options

## Quick Start

### Basic Usage

```typescript
import { LocalPerformanceMonitor } from './src/services/monitoring/localPerformanceMonitor';
import { PerformanceDashboard } from './src/components/monitoring/PerformanceDashboard';

// Initialize the monitor
const monitor = new LocalPerformanceMonitor({
  sampling: {
    systemMetricsInterval: 5000, // 5 seconds
    alertCheckInterval: 10000    // 10 seconds
  },
  thresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 }
  }
});

// Start monitoring
await monitor.start();

// Use in React component
function MyApp() {
  return <PerformanceDashboard monitor={monitor} />;
}
```

### With React Hooks

```typescript
import { PerformanceMonitoringUtils } from './src/utils/monitoring/performanceMonitoringUtils';

function MyComponent() {
  const { monitor, isLoading, error } = PerformanceMonitoringUtils.createReactHook()({
    sampling: { systemMetricsInterval: 3000 }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!monitor) return <div>Monitor unavailable</div>;

  return <PerformanceDashboard monitor={monitor} />;
}
```

### Model Performance Tracking

```typescript
import { trackModelPerformance } from './src/utils/monitoring/performanceMonitoringUtils';

class MyModel {
  @trackModelPerformance('my-model-v1', 'My Model', 'inference')
  async runInference(input: string): Promise<string> {
    // Your model inference code here
    return processInput(input);
  }
}

// Or manual tracking
const operationId = monitor.startModelOperation('model-id', 'Model Name', 'inference');
try {
  const result = await runInference(input);
  monitor.endModelOperation(operationId, true, { 
    tokenCount: result.tokens 
  });
} catch (error) {
  monitor.endModelOperation(operationId, false);
}
```

## Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│           Performance Dashboard         │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │   Charts    │ │    Alerts Panel    │ │
│  └─────────────┘ └─────────────────────┘ │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │ Metrics     │ │  Recommendations    │ │
│  └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│      Local Performance Monitor          │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │   System    │ │    Model Tracker    │ │
│  │  Monitor    │ │                     │ │
│  └─────────────┘ └─────────────────────┘ │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │ Alert       │ │  Recommendation     │ │
│  │ System      │ │     Engine          │ │
│  └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│        Local Storage Service            │
│         (IndexedDB)                     │
└─────────────────────────────────────────┘
```

### Data Flow

1. **Collection**: System and model metrics are collected in real-time
2. **Processing**: Data is analyzed for trends and anomalies
3. **Storage**: Metrics are stored locally in IndexedDB
4. **Analysis**: AI engine generates alerts and recommendations
5. **Visualization**: Dashboard displays real-time and historical data

## Configuration

### Monitoring Configuration

```typescript
interface MonitoringConfig {
  sampling: {
    systemMetricsInterval: number;    // System metrics collection interval (ms)
    modelMetricsInterval: number;     // Model metrics collection interval (ms)
    alertCheckInterval: number;       // Alert evaluation interval (ms)
  };
  storage: {
    maxHistoryDays: number;          // Data retention period
    compressionEnabled: boolean;      // Enable data compression
    autoCleanup: boolean;            // Automatic old data cleanup
  };
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    modelLatency: { warning: number; critical: number };
    modelMemory: { warning: number; critical: number };
  };
  alerts: {
    enabled: boolean;                // Enable alert system
    soundEnabled: boolean;           // Audio alerts
    notificationEnabled: boolean;    // Browser notifications
    emailEnabled: boolean;           // Email alerts (not implemented)
  };
  privacy: {
    localStorageOnly: boolean;       // Always true for privacy
    encryptData: boolean;            // Encrypt stored data
    anonymizeData: boolean;          // Remove identifying information
  };
}
```

### Default Thresholds

- **CPU**: Warning at 70%, Critical at 90%
- **Memory**: Warning at 80%, Critical at 95%  
- **Disk**: Warning at 85%, Critical at 95%
- **Model Latency**: Warning at 5s, Critical at 10s
- **Model Memory**: Warning at 512MB, Critical at 1GB

## API Reference

### LocalPerformanceMonitor

#### Lifecycle Methods
```typescript
// Initialize and start monitoring
await monitor.start(): Promise<void>

// Stop monitoring and cleanup
await monitor.stop(): Promise<void>

// Get current monitoring state
monitor.getState(): MonitoringState
```

#### Model Tracking Methods
```typescript
// Start tracking a model operation
monitor.startModelOperation(
  modelId: string, 
  modelName: string, 
  operation: 'inference' | 'training' | 'loading',
  metadata?: any
): string

// End tracking and record metrics
monitor.endModelOperation(
  operationId: string,
  success: boolean,
  additionalMetrics?: any,
  metadata?: any
): ModelPerformanceMetrics | null

// Automatic tracking wrapper
monitor.trackInference<T>(
  modelId: string,
  modelName: string,
  inferenceFunction: () => Promise<T>,
  inputTokens?: number,
  metadata?: any
): Promise<{ result: T; metrics: ModelPerformanceMetrics }>
```

#### Data Access Methods
```typescript
// Get current system metrics
monitor.getCurrentSystemMetrics(): SystemMetrics | null

// Get recent system metrics
monitor.getRecentSystemMetrics(count?: number): SystemMetrics[]

// Get recent model metrics
monitor.getRecentModelMetrics(count?: number): ModelPerformanceMetrics[]

// Get active alerts
monitor.getActiveAlerts(): PerformanceAlert[]

// Get active recommendations
monitor.getActiveRecommendations(): OptimizationRecommendation[]
```

#### Historical Data Methods
```typescript
// Get historical system metrics
await monitor.getHistoricalSystemMetrics(
  startTime?: number, 
  endTime?: number, 
  limit?: number
): Promise<SystemMetrics[]>

// Get historical model metrics
await monitor.getHistoricalModelMetrics(
  modelId?: string,
  operation?: string,
  startTime?: number,
  endTime?: number,
  limit?: number
): Promise<ModelPerformanceMetrics[]>
```

#### Alert & Recommendation Management
```typescript
// Resolve an alert
monitor.resolveAlert(alertId: string, resolution?: string): boolean

// Create custom alert
monitor.createCustomAlert(
  type: 'warning' | 'error' | 'critical',
  category: 'system' | 'model' | 'memory' | 'disk' | 'network',
  title: string,
  message: string
): PerformanceAlert

// Mark recommendation as applied
monitor.markRecommendationApplied(id: string): boolean

// Generate proactive recommendations
monitor.generateProactiveRecommendations(): OptimizationRecommendation[]
```

#### Configuration & Maintenance
```typescript
// Update configuration
monitor.updateConfig(newConfig: Partial<MonitoringConfig>): void

// Update alert thresholds
monitor.updateThresholds(thresholds: Partial<PerformanceThresholds>): void

// Export all data
await monitor.exportData(): Promise<string>

// Import data
await monitor.importData(jsonData: string): Promise<void>

// Clear all data
await monitor.clearAllData(): Promise<void>

// Get database size
await monitor.getDatabaseSize(): Promise<number>
```

#### Event Callbacks
```typescript
// Listen for new system metrics
monitor.onSystemMetrics(callback: (metrics: SystemMetrics) => void): void

// Listen for new model metrics
monitor.onModelMetrics(callback: (metrics: ModelPerformanceMetrics) => void): void

// Listen for new alerts
monitor.onAlert(callback: (alert: PerformanceAlert) => void): void

// Listen for new recommendations
monitor.onRecommendation(callback: (recommendation: OptimizationRecommendation) => void): void

// Listen for state changes
monitor.onStateChange(callback: (state: MonitoringState) => void): void
```

## Data Types

### SystemMetrics
```typescript
interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    available: number;
    percentage: number;
    readSpeed?: number;
    writeSpeed?: number;
  };
  network?: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
}
```

### ModelPerformanceMetrics
```typescript
interface ModelPerformanceMetrics {
  timestamp: number;
  modelId: string;
  modelName: string;
  operation: 'inference' | 'training' | 'loading';
  metrics: {
    latency: number;          // milliseconds
    throughput?: number;      // tokens/second or requests/second
    memoryUsage: number;      // bytes
    cpuUsage: number;         // percentage
    tokenCount?: number;
    errorRate?: number;
    accuracy?: number;
  };
  metadata?: {
    inputSize?: number;
    outputSize?: number;
    batchSize?: number;
    modelSize?: number;
  };
}
```

### PerformanceAlert
```typescript
interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: 'warning' | 'error' | 'critical';
  category: 'system' | 'model' | 'memory' | 'disk' | 'network';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  resolved: boolean;
  resolvedAt?: number;
}
```

### OptimizationRecommendation
```typescript
interface OptimizationRecommendation {
  id: string;
  timestamp: number;
  category: 'system' | 'model' | 'memory' | 'disk' | 'network';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string[];
  estimatedImprovement: string;
  applied: boolean;
  appliedAt?: number;
}
```

## Dashboard Components

### PerformanceDashboard
Main dashboard component with tabs for different views:
- **Overview**: Summary metrics and recent activity
- **System Metrics**: Detailed system resource monitoring
- **Model Performance**: Model operation tracking and analytics
- **Alerts**: Alert management and resolution
- **Recommendations**: Optimization suggestions
- **Settings**: Configuration management

### SystemMetricsChart
Real-time system metrics visualization with:
- CPU, Memory, and Disk usage graphs
- Current values and historical trends
- Interactive chart with zoom and pan
- Detailed metric breakdowns

### ModelMetricsChart
Model performance visualization featuring:
- Latency and throughput tracking
- Memory usage patterns
- Operation type breakdowns
- Recent operations list

### AlertsPanel
Alert management interface with:
- Active and resolved alert lists
- Alert filtering and categorization
- Resolution tracking
- Alert statistics and summaries

### RecommendationsPanel
Optimization recommendations display:
- Prioritized recommendation list
- Implementation step guidance
- Applied recommendation tracking
- Category-based filtering

## Storage & Privacy

### Local Storage
- **IndexedDB**: Primary storage for all monitoring data
- **Automatic Cleanup**: Configurable data retention
- **Compression**: Optional data compression for space efficiency
- **Export/Import**: Full data portability

### Privacy Features
- **No External Calls**: All data stays on the user's device
- **Optional Encryption**: Client-side data encryption
- **Data Anonymization**: Remove identifying information
- **User Control**: Complete control over data retention and deletion

## Performance Optimization

### Efficient Data Collection
- **Configurable Sampling**: Adjust collection frequency based on needs
- **Batch Processing**: Efficient data storage and retrieval
- **Memory Management**: Automatic cleanup of old in-memory data
- **Background Processing**: Non-blocking data collection and analysis

### Scalable Architecture
- **Modular Design**: Independent services for different monitoring aspects
- **Lazy Loading**: Components load data only when needed
- **Efficient Rendering**: Optimized chart rendering and updates
- **Memory-conscious**: Automatic memory cleanup and garbage collection

## Browser Compatibility

### Supported Features
- **IndexedDB**: Available in all modern browsers
- **Performance API**: Standard web performance monitoring
- **Web Workers**: Background processing (future enhancement)
- **Notifications API**: Browser notifications for alerts

### Fallbacks
- **Memory API**: Graceful degradation when not available
- **Storage Estimation**: Fallback when storage API unavailable
- **Network Information**: Optional feature with fallbacks

## Integration Examples

### Basic React Integration
```typescript
import { PerformanceMonitoringUtils, PerformanceDashboard } from '@bear-ai/monitoring';

function App() {
  const { monitor, isLoading, error } = PerformanceMonitoringUtils.createReactHook()();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!monitor) return <div>Monitor unavailable</div>;
  
  return <PerformanceDashboard monitor={monitor} />;
}
```

### Custom Metrics Dashboard
```typescript
function CustomDashboard() {
  const { monitor } = usePerformanceMonitor();
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        system: monitor.getCurrentSystemMetrics(),
        alerts: monitor.getActiveAlerts().length,
        recommendations: monitor.getActiveRecommendations().length
      });
    };
    
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [monitor]);
  
  return (
    <div>
      <h1>Custom Metrics</h1>
      {metrics && (
        <div>
          <div>CPU: {metrics.system?.cpu.usage.toFixed(1)}%</div>
          <div>Active Alerts: {metrics.alerts}</div>
          <div>Recommendations: {metrics.recommendations}</div>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

#### Monitor Not Starting
```typescript
// Check if IndexedDB is available
if (!window.indexedDB) {
  console.error('IndexedDB not supported');
}

// Check for sufficient permissions
try {
  const monitor = new LocalPerformanceMonitor();
  await monitor.start();
} catch (error) {
  console.error('Failed to start monitor:', error);
}
```

#### High Memory Usage
```typescript
// Reduce data retention
monitor.updateConfig({
  storage: { maxHistoryDays: 7 }, // Reduce from default 30 days
  sampling: { systemMetricsInterval: 10000 } // Reduce frequency
});
```

#### Performance Issues
```typescript
// Optimize for performance
monitor.updateConfig({
  sampling: {
    systemMetricsInterval: 10000,  // Less frequent collection
    alertCheckInterval: 30000      // Less frequent alert checks
  },
  storage: { compressionEnabled: true }
});
```

## Future Enhancements

### Planned Features
- **Web Workers**: Background processing for better performance
- **Advanced Analytics**: Machine learning-based anomaly detection
- **Custom Dashboards**: User-configurable dashboard layouts
- **Data Synchronization**: Optional sync between devices (privacy-preserving)
- **Plugin System**: Extensible monitoring capabilities

### Contributing
This monitoring system is designed to be privacy-first and completely local. When contributing, please ensure:
1. No external data transmission
2. Opt-in only for any data collection
3. Clear user control over all data
4. Comprehensive error handling
5. Accessibility compliance

For more examples and advanced usage, see the `examples/monitoring/` directory.