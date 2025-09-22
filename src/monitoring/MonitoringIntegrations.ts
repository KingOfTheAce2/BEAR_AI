/**
 * BEAR AI Production Monitoring Integrations
 * External monitoring service integrations and webhook handlers
 *
 * @version 1.0.0
 * @author BEAR AI Team
 */

import { EventEmitter } from '../utils/EventEmitter';
import { Logger } from '../services/logger';
import {
  ProductionConfig,
  SentryConfig,
  DatadogConfig,
  NewRelicConfig,
  PrometheusConfig,
  GrafanaConfig,
  WebhookConfig,
  SystemMetrics,
  ApplicationMetrics,
  UserAnalytics,
  LogEntry,
  IncidentAlert
} from './ProductionMonitoring';

// ==================== INTEGRATION INTERFACES ====================

export interface IntegrationProvider {
  name: string;
  version: string;
  enabled: boolean;
  config: any;
  initialize(): Promise<void>;
  sendMetric(metric: MetricData): Promise<void>;
  sendEvent(event: EventData): Promise<void>;
  sendLog(log: LogEntry): Promise<void>;
  sendAlert(alert: IncidentAlert): Promise<void>;
  healthCheck(): Promise<boolean>;
  disconnect(): Promise<void>;
}

export interface MetricData {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  tags: Record<string, string>;
  timestamp: number;
  unit?: string;
}

export interface EventData {
  name: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  tags: Record<string, string>;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface IntegrationStatus {
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  lastSent: number;
  errorCount: number;
  successCount: number;
  latency: number;
  error?: string;
}

// ==================== INTEGRATION MANAGER ====================

export class MonitoringIntegrations extends EventEmitter {
  private logger: Logger;
  private config: ProductionConfig;
  private providers: Map<string, IntegrationProvider> = new Map();
  private rateLimits: Map<string, RateLimiter> = new Map();
  private retryQueue: Map<string, QueuedMessage[]> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ProductionConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing monitoring integrations');

    // Initialize configured providers
    if (this.config.integrations.sentry) {
      const sentry = new SentryIntegration(this.config.integrations.sentry, this.logger);
      this.providers.set('sentry', sentry);
      this.rateLimits.set('sentry', new RateLimiter(100, 60000)); // 100 requests per minute
    }

    if (this.config.integrations.datadog) {
      const datadog = new DatadogIntegration(this.config.integrations.datadog, this.logger);
      this.providers.set('datadog', datadog);
      this.rateLimits.set('datadog', new RateLimiter(1000, 60000)); // 1000 requests per minute
    }

    if (this.config.integrations.newrelic) {
      const newrelic = new NewRelicIntegration(this.config.integrations.newrelic, this.logger);
      this.providers.set('newrelic', newrelic);
      this.rateLimits.set('newrelic', new RateLimiter(500, 60000)); // 500 requests per minute
    }

    if (this.config.integrations.prometheus) {
      const prometheus = new PrometheusIntegration(this.config.integrations.prometheus, this.logger);
      this.providers.set('prometheus', prometheus);
      this.rateLimits.set('prometheus', new RateLimiter(10000, 60000)); // 10k requests per minute
    }

    if (this.config.integrations.grafana) {
      const grafana = new GrafanaIntegration(this.config.integrations.grafana, this.logger);
      this.providers.set('grafana', grafana);
      this.rateLimits.set('grafana', new RateLimiter(200, 60000)); // 200 requests per minute
    }

    if (this.config.integrations.customWebhooks) {
      for (const webhookConfig of this.config.integrations.customWebhooks) {
        const webhook = new WebhookIntegration(webhookConfig, this.logger);
        this.providers.set(`webhook_${webhookConfig.name}`, webhook);
        this.rateLimits.set(`webhook_${webhookConfig.name}`, new RateLimiter(60, 60000)); // 60 requests per minute
      }
    }

    // Initialize all providers
    for (const [name, provider] of this.providers) {
      try {
        await provider.initialize();
        this.logger.info(`Integration initialized: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to initialize integration: ${name}`, error);
      }
    }

    // Start health checks
    this.startHealthChecks();

    this.emit('integrations:initialized', Array.from(this.providers.keys()));
  }

  async sendSystemMetrics(metrics: SystemMetrics): Promise<void> {
    const metricData: MetricData[] = [
      {
        name: 'system.cpu.usage',
        value: metrics.cpu.usage,
        type: 'gauge',
        tags: { node_id: metrics.nodeId },
        timestamp: metrics.timestamp,
        unit: 'percent'
      },
      {
        name: 'system.memory.usage',
        value: metrics.memory.percentage,
        type: 'gauge',
        tags: { node_id: metrics.nodeId },
        timestamp: metrics.timestamp,
        unit: 'percent'
      },
      {
        name: 'system.disk.usage',
        value: metrics.disk.percentage,
        type: 'gauge',
        tags: { node_id: metrics.nodeId },
        timestamp: metrics.timestamp,
        unit: 'percent'
      },
      {
        name: 'system.network.latency',
        value: metrics.network.latency,
        type: 'gauge',
        tags: { node_id: metrics.nodeId },
        timestamp: metrics.timestamp,
        unit: 'milliseconds'
      }
    ];

    await this.sendMetrics(metricData);
  }

  async sendApplicationMetrics(metrics: ApplicationMetrics): Promise<void> {
    const metricData: MetricData[] = [
      {
        name: 'application.requests_per_second',
        value: metrics.performance.requestsPerSecond,
        type: 'gauge',
        tags: { environment: this.config.environment },
        timestamp: metrics.timestamp,
        unit: 'requests_per_second'
      },
      {
        name: 'application.response_time.avg',
        value: metrics.performance.averageResponseTime,
        type: 'gauge',
        tags: { environment: this.config.environment },
        timestamp: metrics.timestamp,
        unit: 'milliseconds'
      },
      {
        name: 'application.error_rate',
        value: metrics.performance.errorRate,
        type: 'gauge',
        tags: { environment: this.config.environment },
        timestamp: metrics.timestamp,
        unit: 'percent'
      },
      {
        name: 'application.database.connections.active',
        value: metrics.database.connectionPool.active,
        type: 'gauge',
        tags: { environment: this.config.environment },
        timestamp: metrics.timestamp,
        unit: 'connections'
      },
      {
        name: 'application.ai.inference_time.avg',
        value: metrics.ai.averageInferenceTime,
        type: 'gauge',
        tags: { environment: this.config.environment },
        timestamp: metrics.timestamp,
        unit: 'milliseconds'
      }
    ];

    await this.sendMetrics(metricData);
  }

  async sendUserAnalytics(analytics: UserAnalytics): Promise<void> {
    // Only send if privacy settings allow
    if (!this.config.privacy.enableUserTracking) return;

    const eventData: EventData = {
      name: 'user.session',
      message: 'User session analytics',
      level: 'info',
      tags: {
        device_type: analytics.device.type,
        browser: analytics.device.browser,
        environment: this.config.environment
      },
      timestamp: analytics.timestamp,
      metadata: {
        session_duration: analytics.session.duration,
        page_views: analytics.session.pageViews,
        interactions: analytics.session.interactions,
        performance: analytics.performance
      }
    };

    await this.sendEvent(eventData);
  }

  async sendLog(log: LogEntry): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        const rateLimiter = this.rateLimits.get(name);
        if (rateLimiter && !rateLimiter.allowRequest()) {
          this.queueMessage(name, { type: 'log', data: log });
          continue;
        }

        await provider.sendLog(log);
        this.updateProviderStats(name, true);
      } catch (error) {
        this.logger.error(`Failed to send log to ${name}`, error);
        this.updateProviderStats(name, false);
        this.queueMessage(name, { type: 'log', data: log });
      }
    }
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        const rateLimiter = this.rateLimits.get(name);
        if (rateLimiter && !rateLimiter.allowRequest()) {
          this.queueMessage(name, { type: 'alert', data: alert });
          continue;
        }

        await provider.sendAlert(alert);
        this.updateProviderStats(name, true);
      } catch (error) {
        this.logger.error(`Failed to send alert to ${name}`, error);
        this.updateProviderStats(name, false);
        this.queueMessage(name, { type: 'alert', data: alert });
      }
    }
  }

  async sendCustomMetric(
    name: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' | 'timer' = 'gauge',
    tags: Record<string, string> = {},
    unit?: string
  ): Promise<void> {
    const metricData: MetricData = {
      name,
      value,
      type,
      tags: {
        ...tags,
        environment: this.config.environment,
        version: this.config.version
      },
      timestamp: Date.now(),
      unit
    };

    await this.sendMetrics([metricData]);
  }

  getIntegrationStatus(): IntegrationStatus[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      provider: name,
      status: provider.enabled ? 'connected' : 'disconnected',
      lastSent: 0, // Would track from actual usage
      errorCount: 0, // Would track from actual usage
      successCount: 0, // Would track from actual usage
      latency: 0 // Would measure actual latency
    }));
  }

  async testIntegration(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;

    try {
      return await provider.healthCheck();
    } catch (error) {
      this.logger.error(`Health check failed for ${providerName}`, error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting monitoring integrations');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const [name, provider] of this.providers) {
      try {
        await provider.disconnect();
        this.logger.info(`Integration disconnected: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to disconnect integration: ${name}`, error);
      }
    }

    this.providers.clear();
    this.rateLimits.clear();
    this.retryQueue.clear();

    this.emit('integrations:disconnected');
  }

  private async sendMetrics(metrics: MetricData[]): Promise<void> {
    for (const [name, provider] of this.providers) {
      for (const metric of metrics) {
        try {
          const rateLimiter = this.rateLimits.get(name);
          if (rateLimiter && !rateLimiter.allowRequest()) {
            this.queueMessage(name, { type: 'metric', data: metric });
            continue;
          }

          await provider.sendMetric(metric);
          this.updateProviderStats(name, true);
        } catch (error) {
          this.logger.error(`Failed to send metric to ${name}`, error);
          this.updateProviderStats(name, false);
          this.queueMessage(name, { type: 'metric', data: metric });
        }
      }
    }
  }

  private async sendEvent(event: EventData): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        const rateLimiter = this.rateLimits.get(name);
        if (rateLimiter && !rateLimiter.allowRequest()) {
          this.queueMessage(name, { type: 'event', data: event });
          continue;
        }

        await provider.sendEvent(event);
        this.updateProviderStats(name, true);
      } catch (error) {
        this.logger.error(`Failed to send event to ${name}`, error);
        this.updateProviderStats(name, false);
        this.queueMessage(name, { type: 'event', data: event });
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, provider] of this.providers) {
        try {
          const isHealthy = await provider.healthCheck();
          if (!isHealthy) {
            this.logger.warn(`Integration health check failed: ${name}`);
            this.emit('integration:unhealthy', { provider: name });
          }
        } catch (error) {
          this.logger.error(`Health check error for ${name}`, error);
          this.emit('integration:error', { provider: name, error });
        }
      }

      // Process retry queue
      await this.processRetryQueue();
    }, 60000); // Check every minute
  }

  private async processRetryQueue(): Promise<void> {
    for (const [providerName, queue] of this.retryQueue) {
      const provider = this.providers.get(providerName);
      if (!provider || queue.length === 0) continue;

      const rateLimiter = this.rateLimits.get(providerName);
      if (rateLimiter && !rateLimiter.allowRequest()) continue;

      const message = queue.shift();
      if (!message) continue;

      try {
        switch (message.type) {
          case 'metric':
            await provider.sendMetric(message.data);
            break;
          case 'event':
            await provider.sendEvent(message.data);
            break;
          case 'log':
            await provider.sendLog(message.data);
            break;
          case 'alert':
            await provider.sendAlert(message.data);
            break;
        }
        this.updateProviderStats(providerName, true);
      } catch (error) {
        this.logger.error(`Failed to retry message to ${providerName}`, error);
        this.updateProviderStats(providerName, false);

        // Re-queue if not too old (max 1 hour)
        if (Date.now() - message.timestamp < 3600000) {
          queue.push(message);
        }
      }
    }
  }

  private queueMessage(providerName: string, message: QueuedMessage): void {
    if (!this.retryQueue.has(providerName)) {
      this.retryQueue.set(providerName, []);
    }

    const queue = this.retryQueue.get(providerName)!;
    queue.push({ ...message, timestamp: Date.now() });

    // Limit queue size to prevent memory issues
    if (queue.length > 1000) {
      queue.shift();
    }
  }

  private updateProviderStats(providerName: string, success: boolean): void {
    // In a real implementation, this would update metrics for monitoring the monitoring system
    this.emit('provider:stats', { provider: providerName, success });
  }
}

// ==================== INTEGRATION IMPLEMENTATIONS ====================

interface QueuedMessage {
  type: 'metric' | 'event' | 'log' | 'alert';
  data: any;
  timestamp?: number;
}

class RateLimiter {
  private requests: number = 0;
  private windowStart: number = Date.now();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  allowRequest(): boolean {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStart >= this.windowMs) {
      this.requests = 0;
      this.windowStart = now;
    }

    if (this.requests >= this.maxRequests) {
      return false;
    }

    this.requests++;
    return true;
  }
}

class SentryIntegration implements IntegrationProvider {
  name = 'sentry';
  version = '1.0.0';
  enabled = true;

  constructor(
    private config: SentryConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    // Initialize Sentry SDK
    this.logger.info('Initializing Sentry integration', {
      dsn: this.config.dsn,
      environment: this.config.environment
    });
    // Actual Sentry initialization would go here
  }

  async sendMetric(metric: MetricData): Promise<void> {
    // Sentry doesn't typically handle custom metrics directly
    // This would be implemented if using Sentry's performance monitoring
  }

  async sendEvent(event: EventData): Promise<void> {
    // Send as Sentry breadcrumb or event
    this.logger.debug('Sending event to Sentry', { event: event.name });
  }

  async sendLog(log: LogEntry): Promise<void> {
    // Send as Sentry event based on log level
    if (log.level === 'error' || log.level === 'fatal') {
      this.logger.debug('Sending error log to Sentry', { message: log.message });
    }
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    // Send critical alerts as Sentry events
    if (alert.severity === 'critical' || alert.severity === 'error') {
      this.logger.debug('Sending alert to Sentry', { alertId: alert.id });
    }
  }

  async healthCheck(): Promise<boolean> {
    // Simple health check - would make actual API call in real implementation
    return true;
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting Sentry integration');
  }
}

class DatadogIntegration implements IntegrationProvider {
  name = 'datadog';
  version = '1.0.0';
  enabled = true;

  constructor(
    private config: DatadogConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing Datadog integration', {
      service: this.config.service,
      env: this.config.env
    });
    // Actual Datadog SDK initialization would go here
  }

  async sendMetric(metric: MetricData): Promise<void> {
    // Send metric to Datadog
    this.logger.debug('Sending metric to Datadog', {
      name: metric.name,
      value: metric.value
    });
  }

  async sendEvent(event: EventData): Promise<void> {
    // Send event to Datadog
    this.logger.debug('Sending event to Datadog', { event: event.name });
  }

  async sendLog(log: LogEntry): Promise<void> {
    // Send log to Datadog
    this.logger.debug('Sending log to Datadog', { level: log.level });
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    // Send alert as Datadog event
    this.logger.debug('Sending alert to Datadog', { alertId: alert.id });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting Datadog integration');
  }
}

class NewRelicIntegration implements IntegrationProvider {
  name = 'newrelic';
  version = '1.0.0';
  enabled = true;

  constructor(
    private config: NewRelicConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing New Relic integration', {
      appName: this.config.appName
    });
  }

  async sendMetric(metric: MetricData): Promise<void> {
    this.logger.debug('Sending metric to New Relic', {
      name: metric.name,
      value: metric.value
    });
  }

  async sendEvent(event: EventData): Promise<void> {
    this.logger.debug('Sending event to New Relic', { event: event.name });
  }

  async sendLog(log: LogEntry): Promise<void> {
    this.logger.debug('Sending log to New Relic', { level: log.level });
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    this.logger.debug('Sending alert to New Relic', { alertId: alert.id });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting New Relic integration');
  }
}

class PrometheusIntegration implements IntegrationProvider {
  name = 'prometheus';
  version = '1.0.0';
  enabled = true;

  constructor(
    private config: PrometheusConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing Prometheus integration', {
      endpoint: this.config.endpoint
    });
  }

  async sendMetric(metric: MetricData): Promise<void> {
    // Send metric to Prometheus pushgateway or expose on /metrics endpoint
    this.logger.debug('Sending metric to Prometheus', {
      name: metric.name,
      value: metric.value
    });
  }

  async sendEvent(event: EventData): Promise<void> {
    // Convert event to Prometheus metric if applicable
    this.logger.debug('Processing event for Prometheus', { event: event.name });
  }

  async sendLog(log: LogEntry): Promise<void> {
    // Prometheus doesn't handle logs directly
    // This could increment error counters or similar metrics
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    // Convert alert to Prometheus metric
    this.logger.debug('Processing alert for Prometheus', { alertId: alert.id });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting Prometheus integration');
  }
}

class GrafanaIntegration implements IntegrationProvider {
  name = 'grafana';
  version = '1.0.0';
  enabled = true;

  constructor(
    private config: GrafanaConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing Grafana integration', {
      url: this.config.url
    });
  }

  async sendMetric(metric: MetricData): Promise<void> {
    // Grafana typically pulls metrics from other sources
    // This could send to Grafana Cloud or annotation API
    this.logger.debug('Processing metric for Grafana', {
      name: metric.name,
      value: metric.value
    });
  }

  async sendEvent(event: EventData): Promise<void> {
    // Send as Grafana annotation
    this.logger.debug('Sending event to Grafana annotations', { event: event.name });
  }

  async sendLog(log: LogEntry): Promise<void> {
    // Grafana doesn't handle logs directly unless using Loki
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    // Send as Grafana annotation
    this.logger.debug('Sending alert to Grafana annotations', { alertId: alert.id });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting Grafana integration');
  }
}

class WebhookIntegration implements IntegrationProvider {
  name: string;
  version = '1.0.0';
  enabled = true;

  constructor(
    private config: WebhookConfig,
    private logger: Logger
  ) {
    this.name = `webhook_${config.name}`;
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing webhook integration: ${this.config.name}`, {
      url: this.config.url
    });
  }

  async sendMetric(metric: MetricData): Promise<void> {
    await this.sendWebhook('metric', metric);
  }

  async sendEvent(event: EventData): Promise<void> {
    await this.sendWebhook('event', event);
  }

  async sendLog(log: LogEntry): Promise<void> {
    await this.sendWebhook('log', log);
  }

  async sendAlert(alert: IncidentAlert): Promise<void> {
    await this.sendWebhook('alert', alert);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - could make actual HTTP request
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info(`Disconnecting webhook integration: ${this.config.name}`);
  }

  private async sendWebhook(type: string, data: any): Promise<void> {
    try {
      const payload = this.config.template
        ? this.formatTemplate(this.config.template, { type, data })
        : { type, data, timestamp: Date.now() };

      // In a real implementation, this would make an HTTP request
      this.logger.debug(`Sending webhook: ${this.config.name}`, {
        url: this.config.url,
        type,
        payload
      });

      // Simulated HTTP request
      // const response = await fetch(this.config.url, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...this.config.headers
      //   },
      //   body: JSON.stringify(payload)
      // });

    } catch (error) {
      this.logger.error(`Webhook failed: ${this.config.name}`, error);
      throw error;
    }
  }

  private formatTemplate(template: string, data: any): any {
    // Simple template replacement
    let result = template;
    result = result.replace(/\{\{type\}\}/g, data.type);
    result = result.replace(/\{\{timestamp\}\}/g, Date.now().toString());
    // More sophisticated template processing would go here
    return JSON.parse(result);
  }
}

export default MonitoringIntegrations;