/**
 * BEAR AI Production Monitoring System
 * Main export file and usage examples
 *
 * @version 1.0.0
 * @author BEAR AI Team
 */

// ==================== EXPORTS ====================

export {
  ProductionMonitoring,
  createProductionMonitoring,
  DEFAULT_PRODUCTION_CONFIG
} from './ProductionMonitoring';

export {
  DashboardManager,
  DashboardTemplates
} from './MonitoringDashboard';

export {
  MonitoringIntegrations
} from './MonitoringIntegrations';

export type {
  ProductionConfig,
  SystemMetrics,
  ApplicationMetrics,
  UserAnalytics,
  HealthCheck,
  IncidentAlert,
  AlertSeverity,
  HealthStatus,
  MetricType,
  AlertChannel,
  AlertThresholds,
  SentryConfig,
  DatadogConfig,
  NewRelicConfig,
  PrometheusConfig,
  GrafanaConfig,
  WebhookConfig
} from './ProductionMonitoring';

export type {
  DashboardConfig,
  Widget,
  WidgetType,
  DataSourceConfig,
  VisualizationConfig,
  DashboardFilter,
  DashboardPermission
} from './MonitoringDashboard';

export type {
  IntegrationProvider,
  MetricData,
  EventData,
  IntegrationStatus
} from './MonitoringIntegrations';

// ==================== FACTORY FUNCTIONS ====================

import { Logger } from '../services/logger';
import { ErrorHandler } from '../services/errorHandler';
import {
  ProductionMonitoring,
  ProductionConfig,
  DEFAULT_PRODUCTION_CONFIG
} from './ProductionMonitoring';
import { DashboardManager } from './MonitoringDashboard';
import { MonitoringIntegrations } from './MonitoringIntegrations';

/**
 * Create a complete monitoring system with all components
 */
export function createCompleteMonitoringSystem(
  config: Partial<ProductionConfig>,
  logger: Logger,
  errorHandler: ErrorHandler
): {
  monitoring: ProductionMonitoring;
  dashboards: DashboardManager;
  integrations: MonitoringIntegrations;
} {
  const fullConfig = { ...DEFAULT_PRODUCTION_CONFIG, ...config };

  const monitoring = new ProductionMonitoring(fullConfig, logger, errorHandler);
  const dashboards = new DashboardManager();
  const integrations = new MonitoringIntegrations(fullConfig, logger);

  // Wire up integrations
  monitoring.on('metrics:system', (metrics) => {
    integrations.sendSystemMetrics(metrics);
  });

  monitoring.on('metrics:application', (metrics) => {
    integrations.sendApplicationMetrics(metrics);
  });

  monitoring.on('analytics:recorded', (analytics) => {
    integrations.sendUserAnalytics(analytics);
  });

  monitoring.on('log:received', (log) => {
    integrations.sendLog(log);
  });

  monitoring.on('incident:created', (incident) => {
    integrations.sendAlert(incident);
  });

  return {
    monitoring,
    dashboards,
    integrations
  };
}

/**
 * Quick setup for production monitoring with sensible defaults
 */
export function setupProductionMonitoring(
  environment: 'development' | 'staging' | 'production',
  version: string,
  options: {
    enableUserTracking?: boolean;
    enableIntegrations?: boolean;
    customConfig?: Partial<ProductionConfig>;
  } = {}
): Promise<{
  monitoring: ProductionMonitoring;
  dashboards: DashboardManager;
  integrations: MonitoringIntegrations;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    try {
      // Create logger (would use your existing logger)
      const logger = {
        info: (message: string, data?: any) => {/* Logging disabled for production */},
        warn: (message: string, data?: any) => {/* Logging disabled for production */},
        error: (message: string, data?: any) => {/* Logging disabled for production */},
        debug: (message: string, data?: any) => {/* Logging disabled for production */}
      } as Logger;

      // Create error handler (would use your existing error handler)
      const errorHandler = {
        handleError: async (error: Error) => {
          // Error handling disabled for production
          return null;
        },
        on: () => {},
        emit: () => {}
      } as any as ErrorHandler;

      const config: ProductionConfig = {
        ...DEFAULT_PRODUCTION_CONFIG,
        environment,
        version,
        deploymentId: `${environment}_${Date.now()}`,
        privacy: {
          ...DEFAULT_PRODUCTION_CONFIG.privacy,
          enableUserTracking: options.enableUserTracking ?? (environment === 'production')
        },
        ...options.customConfig
      };

      const system = createCompleteMonitoringSystem(config, logger, errorHandler);

      resolve({
        ...system,
        start: async () => {
          await system.monitoring.start();
          if (options.enableIntegrations) {
            await system.integrations.initialize();
          }
        },
        stop: async () => {
          await system.monitoring.stop();
          if (options.enableIntegrations) {
            await system.integrations.disconnect();
          }
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// ==================== USAGE EXAMPLES ====================

/**
 * Example: Basic monitoring setup
 */
export async function exampleBasicSetup() {
  const system = await setupProductionMonitoring('production', '1.0.0', {
    enableUserTracking: true,
    enableIntegrations: false
  });

  // Start monitoring
  await system.start();

  // Record custom metrics
  await system.monitoring.recordMetric('custom.business.metric', 42, 'gauge', {
    feature: 'chat',
    user_type: 'premium'
  });

  // Add custom health check
  system.monitoring.addHealthCheck('api_endpoint', async () => ({
    name: 'api_endpoint',
    status: 'healthy',
    timestamp: Date.now(),
    responseTime: 150,
    details: { endpoint: '/api/health' }
  }));

  // Record user interaction
  system.monitoring.recordUserInteraction({
    sessionId: 'session_123',
    session: {
      duration: 300000, // 5 minutes
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
      featuresUsed: ['chat', 'file_upload', 'settings']
    },
    device: {
      type: 'desktop',
      os: 'Windows 10',
      browser: 'Chrome 91',
      screenResolution: '1920x1080',
      viewport: '1200x800'
    }
  });

  return system;
}

/**
 * Example: Advanced setup with integrations
 */
export async function exampleAdvancedSetup() {
  const system = await setupProductionMonitoring('production', '1.0.0', {
    enableUserTracking: true,
    enableIntegrations: true,
    customConfig: {
      sampling: {
        metricsInterval: 15000, // 15 seconds
        errorSampling: 1.0,     // 100% error sampling
        performanceSampling: 0.1, // 10% performance sampling
        userSampling: 0.05      // 5% user sampling
      },
      alerts: {
        enabled: true,
        channels: [
          {
            type: 'webhook',
            endpoint: 'https://your-slack-webhook-url',
            enabled: true,
            severity: ['critical', 'error'],
            metadata: { channel: '#alerts' }
          },
          {
            type: 'email',
            endpoint: 'alerts@yourcompany.com',
            enabled: true,
            severity: ['critical'],
            metadata: {}
          }
        ],
        thresholds: {
          cpu: { warning: 60, critical: 80 },
          memory: { warning: 70, critical: 85 },
          disk: { warning: 75, critical: 90 },
          errorRate: { warning: 3, critical: 7 },
          responseTime: { warning: 800, critical: 2000 },
          uptime: { warning: 99.5, critical: 99 },
          database: {
            connectionPool: { warning: 70, critical: 90 },
            queryTime: { warning: 800, critical: 3000 },
            deadlocks: { warning: 3, critical: 8 }
          }
        }
      },
      integrations: {
        sentry: {
          dsn: 'https://your-sentry-dsn@sentry.io/project',
          environment: 'production',
          release: '1.0.0',
          sampleRate: 1.0,
          tracesSampleRate: 0.1
        },
        datadog: {
          apiKey: 'your-datadog-api-key',
          appKey: 'your-datadog-app-key',
          site: 'datadoghq.com',
          service: 'bear-ai',
          env: 'production',
          version: '1.0.0'
        },
        prometheus: {
          endpoint: 'http://prometheus:9090',
          pushgateway: 'http://pushgateway:9091',
          labels: {
            service: 'bear-ai',
            environment: 'production'
          }
        },
        customWebhooks: [
          {
            name: 'slack_incidents',
            url: 'https://hooks.slack.com/services/your/webhook/url',
            headers: { 'Content-Type': 'application/json' },
            template: '{"text": "Incident: {{type}} - {{title}}", "channel": "#incidents"}',
            retries: 3,
            timeout: 5000
          }
        ]
      }
    }
  });

  await system.start();

  // Get system status
  const status = system.monitoring.getSystemStatus();

  // Create custom dashboard
  const customDashboard = {
    id: 'custom_business_metrics',
    name: 'Business Metrics',
    description: 'Custom business KPIs and metrics',
    layout: {
      type: 'grid' as const,
      columns: 12,
      rowHeight: 80,
      margin: [10, 10] as [number, number],
      padding: [20, 20] as [number, number],
      responsive: []
    },
    widgets: [
      {
        id: 'daily_active_users',
        type: 'metric_card' as const,
        title: 'Daily Active Users',
        position: { x: 0, y: 0 },
        size: { width: 3, height: 2 },
        config: {
          theme: 'auto' as const,
          colors: ['#3b82f6'],
          animation: true,
          interactive: false,
          exportable: true
        },
        dataSource: {
          type: 'aggregated' as const,
          metric: 'analytics.users.daily_active',
          timeRange: { start: 'now-24h', end: 'now' },
          aggregation: 'count' as const
        },
        visualization: {
          formatting: {
            unit: 'users',
            precision: 0,
            abbreviate: true
          }
        }
      }
    ],
    filters: [],
    refreshInterval: 30000,
    autoRefresh: true,
    permissions: [
      {
        role: 'admin',
        permissions: ['view', 'edit', 'delete', 'share', 'admin']
      }
    ]
  };

  system.dashboards.createDashboard(customDashboard);

  // Trigger a test incident
  const incidentId = system.monitoring.triggerIncident(
    'Test Incident',
    'This is a test incident to verify alert systems',
    'warning',
    { test: true }
  );

  // Test incident created: ${incidentId}

  return system;
}

/**
 * Example: Monitoring AI model performance
 */
export function exampleAIModelMonitoring(monitoring: ProductionMonitoring) {
  // Record AI inference metrics
  const recordInference = (modelId: string, startTime: number, success: boolean) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    monitoring.recordMetric('ai.inference.duration', duration, 'histogram', {
      model_id: modelId,
      success: success.toString()
    });

    monitoring.recordMetric('ai.inference.count', 1, 'counter', {
      model_id: modelId,
      success: success.toString()
    });

    if (success) {
      monitoring.recordMetric('ai.inference.success_rate', 1, 'gauge', {
        model_id: modelId
      });
    } else {
      monitoring.recordMetric('ai.inference.error_rate', 1, 'gauge', {
        model_id: modelId
      });
    }
  };

  // Usage example
  const modelId = 'llama-7b';
  const inferenceStart = Date.now();

  // Simulate AI inference
  setTimeout(() => {
    recordInference(modelId, inferenceStart, true);
  }, 1500); // 1.5 second inference

  return recordInference;
}

/**
 * Example: Custom health checks
 */
export function exampleCustomHealthChecks(monitoring: ProductionMonitoring) {
  // Database health check
  monitoring.addHealthCheck('database', async () => {
    try {
      // Simulate database ping
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      const responseTime = Date.now() - start;

      return {
        name: 'database',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        timestamp: Date.now(),
        responseTime,
        details: {
          connectionPool: 'active',
          activeConnections: 5,
          maxConnections: 20
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'critical',
        timestamp: Date.now(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // External API health check
  monitoring.addHealthCheck('external_api', async () => {
    try {
      const start = Date.now();
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      const responseTime = Date.now() - start;

      return {
        name: 'external_api',
        status: 'healthy',
        timestamp: Date.now(),
        responseTime,
        details: {
          endpoint: 'https://api.example.com/health',
          rateLimitRemaining: 950
        }
      };
    } catch (error) {
      return {
        name: 'external_api',
        status: 'unhealthy',
        timestamp: Date.now(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'API unreachable'
      };
    }
  });

  // Memory usage health check
  monitoring.addHealthCheck('memory_usage', async () => {
    const memInfo = (performance as any).memory;
    if (memInfo) {
      const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;

      return {
        name: 'memory_usage',
        status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'degraded' : 'healthy',
        timestamp: Date.now(),
        responseTime: 1,
        details: {
          usedMemory: memInfo.usedJSHeapSize,
          totalMemory: memInfo.jsHeapSizeLimit,
          usagePercent: Math.round(usagePercent)
        }
      };
    }

    return {
      name: 'memory_usage',
      status: 'healthy',
      timestamp: Date.now(),
      responseTime: 1,
      details: { message: 'Memory info not available' }
    };
  });
}

export default {
  createCompleteMonitoringSystem,
  setupProductionMonitoring,
  exampleBasicSetup,
  exampleAdvancedSetup,
  exampleAIModelMonitoring,
  exampleCustomHealthChecks
};