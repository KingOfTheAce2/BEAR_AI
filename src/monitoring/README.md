# BEAR AI Production Monitoring System

A comprehensive production monitoring solution for the BEAR AI application, featuring real-time metrics collection, error tracking, user analytics, and automated incident response.

## Features

### Core Monitoring
- ✅ **Real-time performance metrics collection**
- ✅ **Error tracking and alerting system**
- ✅ **Privacy-compliant user analytics and behavior tracking**
- ✅ **System health checks and uptime monitoring**
- ✅ **Database performance monitoring**
- ✅ **API response time tracking**
- ✅ **Memory and CPU usage monitoring**
- ✅ **Log aggregation and analysis**
- ✅ **Automated incident response triggers**

### Dashboard & Visualization
- ✅ **Configurable monitoring dashboards**
- ✅ **Multiple widget types (charts, gauges, tables, maps)**
- ✅ **Real-time and historical data visualization**
- ✅ **Role-based access control**
- ✅ **Custom dashboard creation**

### External Integrations
- ✅ **Sentry integration for error tracking**
- ✅ **Datadog integration for metrics and APM**
- ✅ **New Relic integration for performance monitoring**
- ✅ **Prometheus integration for metrics collection**
- ✅ **Grafana integration for visualization**
- ✅ **Custom webhook support**
- ✅ **Rate limiting and retry mechanisms**

## Quick Start

### Basic Setup

```typescript
import { setupProductionMonitoring } from './monitoring';

// Quick setup with sensible defaults
const monitoring = await setupProductionMonitoring('production', '1.0.0', {
  enableUserTracking: true,
  enableIntegrations: false
});

// Start monitoring
await monitoring.start();

// Record custom metrics
await monitoring.monitoring.recordMetric('business.signups', 1, 'counter', {
  source: 'web',
  plan: 'premium'
});

// Add health checks
monitoring.monitoring.addHealthCheck('database', async () => ({
  name: 'database',
  status: 'healthy',
  timestamp: Date.now(),
  responseTime: 25,
  details: { connections: 5 }
}));
```

### Advanced Setup with Integrations

```typescript
import { setupProductionMonitoring } from './monitoring';

const monitoring = await setupProductionMonitoring('production', '1.0.0', {
  enableUserTracking: true,
  enableIntegrations: true,
  customConfig: {
    sampling: {
      metricsInterval: 15000,     // Collect metrics every 15 seconds
      errorSampling: 1.0,         // Sample 100% of errors
      performanceSampling: 0.1,   // Sample 10% of performance data
      userSampling: 0.05          // Sample 5% of user interactions
    },
    alerts: {
      enabled: true,
      channels: [
        {
          type: 'webhook',
          endpoint: 'https://hooks.slack.com/your-webhook',
          enabled: true,
          severity: ['critical', 'error']
        }
      ],
      thresholds: {
        cpu: { warning: 70, critical: 85 },
        memory: { warning: 75, critical: 90 },
        errorRate: { warning: 5, critical: 10 }
      }
    },
    integrations: {
      sentry: {
        dsn: 'https://your-dsn@sentry.io/project',
        environment: 'production',
        sampleRate: 1.0
      },
      datadog: {
        apiKey: 'your-api-key',
        service: 'bear-ai',
        env: 'production'
      }
    }
  }
});

await monitoring.start();
```

## Architecture

### Core Components

1. **ProductionMonitoring** - Main monitoring orchestrator
2. **MonitoringDashboard** - Dashboard configuration and management
3. **MonitoringIntegrations** - External service integrations

### Data Flow

```
Application → ProductionMonitoring → Metrics Collection
                    ↓
            Health Checks → Alert Manager
                    ↓
            Log Aggregation → Incident Manager
                    ↓
            External Integrations (Sentry, Datadog, etc.)
```

## Configuration

### Environment Configuration

```typescript
interface ProductionConfig {
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  version: string;
  deploymentId: string;
  region: string;

  sampling: {
    metricsInterval: number;      // How often to collect metrics (ms)
    errorSampling: number;        // Error sampling rate (0-1)
    performanceSampling: number;  // Performance sampling rate (0-1)
    userSampling: number;         // User analytics sampling rate (0-1)
  };

  privacy: {
    enableUserTracking: boolean;
    anonymizeData: boolean;
    respectDNT: boolean;          // Respect Do Not Track header
    dataRetentionDays: number;
    allowPersonalData: boolean;
  };

  alerts: {
    enabled: boolean;
    channels: AlertChannel[];
    thresholds: AlertThresholds;
  };

  integrations: {
    sentry?: SentryConfig;
    datadog?: DatadogConfig;
    newrelic?: NewRelicConfig;
    prometheus?: PrometheusConfig;
    grafana?: GrafanaConfig;
    customWebhooks?: WebhookConfig[];
  };
}
```

### Alert Configuration

```typescript
interface AlertThresholds {
  cpu: { warning: number; critical: number; };
  memory: { warning: number; critical: number; };
  disk: { warning: number; critical: number; };
  errorRate: { warning: number; critical: number; };
  responseTime: { warning: number; critical: number; };
  uptime: { warning: number; critical: number; };
  database: {
    connectionPool: { warning: number; critical: number; };
    queryTime: { warning: number; critical: number; };
    deadlocks: { warning: number; critical: number; };
  };
}
```

## Usage Examples

### Recording Custom Metrics

```typescript
// Business metrics
await monitoring.recordMetric('business.revenue', 1299.99, 'gauge', {
  currency: 'USD',
  product: 'premium'
});

// Performance metrics
await monitoring.recordMetric('api.response_time', 245, 'histogram', {
  endpoint: '/api/chat',
  method: 'POST'
});

// AI model metrics
await monitoring.recordMetric('ai.inference_time', 1850, 'timer', {
  model: 'llama-7b',
  request_type: 'chat'
});
```

### User Analytics (Privacy-Compliant)

```typescript
// Record user interaction
monitoring.recordUserInteraction({
  sessionId: 'session_123',
  session: {
    duration: 300000,    // 5 minutes
    pageViews: 3,
    interactions: 15,
    bounced: false
  },
  performance: {
    pageLoadTime: 1200,
    firstContentfulPaint: 800,
    largestContentfulPaint: 1100,
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 50
  },
  behavior: {
    clickCount: 15,
    scrollDepth: 75,
    timeOnPage: 120000,
    errorsEncountered: 0,
    featuresUsed: ['chat', 'file_upload']
  },
  device: {
    type: 'desktop',
    os: 'Windows 10',
    browser: 'Chrome 91',
    screenResolution: '1920x1080',
    viewport: '1200x800'
  }
});
```

### Custom Health Checks

```typescript
// Database health check
monitoring.addHealthCheck('database', async () => {
  try {
    const start = Date.now();
    await database.ping();
    const responseTime = Date.now() - start;

    return {
      name: 'database',
      status: responseTime < 100 ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      responseTime,
      details: {
        connectionPool: await database.getPoolStatus(),
        activeConnections: await database.getActiveConnections()
      }
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'critical',
      timestamp: Date.now(),
      responseTime: 0,
      error: error.message
    };
  }
});

// External service health check
monitoring.addHealthCheck('openai_api', async () => {
  try {
    const response = await fetch('https://api.openai.com/health');
    return {
      name: 'openai_api',
      status: response.ok ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      responseTime: response.headers.get('x-response-time') || 0,
      details: { status: response.status }
    };
  } catch (error) {
    return {
      name: 'openai_api',
      status: 'unhealthy',
      timestamp: Date.now(),
      responseTime: 0,
      error: error.message
    };
  }
});
```

### Dashboard Management

```typescript
import { DashboardManager, DashboardTemplates } from './monitoring';

const dashboardManager = new DashboardManager();

// Get default dashboards
const systemDashboard = DashboardTemplates.getSystemOverviewDashboard();
const appDashboard = DashboardTemplates.getApplicationDashboard();

// Create custom dashboard
const customDashboard = {
  id: 'ai_performance',
  name: 'AI Model Performance',
  description: 'Monitor AI model inference and accuracy',
  widgets: [
    {
      id: 'inference_time',
      type: 'line_chart',
      title: 'Average Inference Time',
      dataSource: {
        metric: 'ai.inference_time.avg',
        timeRange: { start: 'now-1h', end: 'now' }
      }
    }
  ]
};

dashboardManager.createDashboard(customDashboard);

// Export dashboard configuration
const config = dashboardManager.exportDashboard('ai_performance');
```

## Integration Setup

### Sentry Integration

```typescript
integrations: {
  sentry: {
    dsn: 'https://your-dsn@sentry.io/project',
    environment: 'production',
    release: '1.0.0',
    sampleRate: 1.0,
    tracesSampleRate: 0.1
  }
}
```

### Datadog Integration

```typescript
integrations: {
  datadog: {
    apiKey: 'your-datadog-api-key',
    appKey: 'your-datadog-app-key',
    site: 'datadoghq.com',
    service: 'bear-ai',
    env: 'production',
    version: '1.0.0'
  }
}
```

### Prometheus Integration

```typescript
integrations: {
  prometheus: {
    endpoint: 'http://prometheus:9090',
    pushgateway: 'http://pushgateway:9091',
    labels: {
      service: 'bear-ai',
      environment: 'production'
    }
  }
}
```

### Custom Webhooks

```typescript
integrations: {
  customWebhooks: [
    {
      name: 'slack_alerts',
      url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      headers: { 'Content-Type': 'application/json' },
      template: JSON.stringify({
        text: 'Alert: {{title}}',
        channel: '#alerts',
        severity: '{{severity}}'
      }),
      retries: 3,
      timeout: 5000
    }
  ]
}
```

## Privacy & Compliance

The monitoring system is designed with privacy in mind:

### User Data Protection
- **Anonymization**: Automatically anonymize user data when enabled
- **DNT Respect**: Honor Do Not Track browser settings
- **Sampling**: Configurable sampling rates to minimize data collection
- **Retention**: Automatic data cleanup based on retention policies
- **Consent**: Only collect user data when explicitly enabled

### GDPR Compliance Features
- Data minimization through sampling
- Right to be forgotten (data cleanup)
- Data portability (export capabilities)
- Privacy by design architecture

### Configuration Example
```typescript
privacy: {
  enableUserTracking: true,
  anonymizeData: true,        // Hash/anonymize PII
  respectDNT: true,          // Respect Do Not Track
  dataRetentionDays: 90,     // Auto-delete after 90 days
  allowPersonalData: false   // Don't collect PII
}
```

## Monitoring AI/ML Models

Special considerations for AI model monitoring:

### Inference Metrics
```typescript
// Record inference performance
monitoring.recordMetric('ai.model.inference_time', duration, 'histogram', {
  model_id: 'llama-7b',
  input_tokens: String(inputLength),
  output_tokens: String(outputLength)
});

// Record model accuracy (if available)
monitoring.recordMetric('ai.model.accuracy', accuracy, 'gauge', {
  model_id: 'llama-7b',
  dataset: 'validation'
});

// Record resource usage
monitoring.recordMetric('ai.model.memory_usage', memoryUsage, 'gauge', {
  model_id: 'llama-7b'
});
```

### Model Health Checks
```typescript
monitoring.addHealthCheck('model_availability', async () => {
  try {
    const testInput = 'Hello, world!';
    const start = Date.now();
    const response = await aiModel.inference(testInput);
    const responseTime = Date.now() - start;

    return {
      name: 'model_availability',
      status: response ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      responseTime,
      details: {
        model: 'llama-7b',
        memoryUsage: await aiModel.getMemoryUsage()
      }
    };
  } catch (error) {
    return {
      name: 'model_availability',
      status: 'critical',
      timestamp: Date.now(),
      responseTime: 0,
      error: error.message
    };
  }
});
```

## Performance Considerations

### Sampling Strategies
- **High-frequency metrics**: Use lower sampling rates (0.01-0.1)
- **Error events**: Use high sampling rates (0.8-1.0)
- **User interactions**: Use privacy-conscious sampling (0.01-0.05)

### Resource Optimization
- **Memory management**: Automatic cleanup of old metrics
- **Rate limiting**: Prevent overwhelming external services
- **Async processing**: Non-blocking metric collection
- **Batch operations**: Efficient data transmission

### Scalability
- **Horizontal scaling**: Support for multiple monitoring instances
- **Load balancing**: Distribute monitoring load across nodes
- **Data partitioning**: Efficient storage and retrieval

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce retention periods
   - Increase cleanup frequency
   - Lower sampling rates

2. **Integration Failures**
   - Check API keys and endpoints
   - Verify rate limits
   - Review error logs

3. **Missing Metrics**
   - Verify sampling configuration
   - Check if monitoring is enabled
   - Review metric naming

### Debug Mode
```typescript
const monitoring = await setupProductionMonitoring('development', '1.0.0', {
  customConfig: {
    alerts: {
      debugMode: true  // Enable detailed logging
    }
  }
});
```

## API Reference

### Main Classes
- `ProductionMonitoring` - Core monitoring system
- `DashboardManager` - Dashboard management
- `MonitoringIntegrations` - External integrations

### Key Methods
- `monitoring.start()` - Start monitoring
- `monitoring.stop()` - Stop monitoring
- `monitoring.recordMetric()` - Record custom metric
- `monitoring.addHealthCheck()` - Add health check
- `monitoring.getSystemStatus()` - Get current status

## Contributing

To extend the monitoring system:

1. **Add new integrations**: Implement `IntegrationProvider` interface
2. **Custom metrics**: Use `recordMetric()` with appropriate tags
3. **New dashboards**: Create dashboard configs using `DashboardConfig`
4. **Health checks**: Implement async health check functions

## License

This monitoring system is part of the BEAR AI project and follows the same licensing terms.