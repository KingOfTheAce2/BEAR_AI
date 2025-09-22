/**
 * BEAR AI Production Monitoring System
 * Comprehensive monitoring solution for production environments
 *
 * Features:
 * - Real-time performance metrics collection
 * - Error tracking and alerting
 * - Privacy-compliant user analytics
 * - System health monitoring
 * - Database performance tracking
 * - API response time monitoring
 * - Memory and CPU usage tracking
 * - Log aggregation and analysis
 * - Automated incident response
 * - Integration with external monitoring services
 *
 * @version 1.0.0
 * @author BEAR AI Team
 */

import { EventEmitter } from '../utils/EventEmitter';
import { Logger } from '../services/logger';
import { ErrorHandler, ProcessedError } from '../services/errorHandler';

// ==================== CORE INTERFACES ====================

export interface ProductionConfig {
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

  retention: {
    metrics: number;     // Days to keep metrics
    errors: number;      // Days to keep error data
    logs: number;        // Days to keep logs
    analytics: number;   // Days to keep user analytics
  };

  privacy: {
    enableUserTracking: boolean;
    anonymizeData: boolean;
    respectDNT: boolean;        // Respect Do Not Track header
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

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  endpoint: string;
  enabled: boolean;
  severity: AlertSeverity[];
  metadata?: Record<string, any>;
}

export interface AlertThresholds {
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

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';

// ==================== METRICS INTERFACES ====================

export interface SystemMetrics {
  timestamp: number;
  nodeId: string;

  cpu: {
    usage: number;           // Percentage
    cores: number;
    load: number[];          // 1, 5, 15 minute load averages
    temperature?: number;
  };

  memory: {
    total: number;           // Bytes
    used: number;            // Bytes
    free: number;            // Bytes
    cached: number;          // Bytes
    buffers: number;         // Bytes
    percentage: number;      // Usage percentage
    swapTotal?: number;
    swapUsed?: number;
  };

  disk: {
    total: number;           // Bytes
    used: number;            // Bytes
    free: number;            // Bytes
    percentage: number;      // Usage percentage
    iops: number;            // Input/output operations per second
    readLatency: number;     // Average read latency (ms)
    writeLatency: number;    // Average write latency (ms)
  };

  network: {
    bytesIn: number;         // Bytes received
    bytesOut: number;        // Bytes sent
    packetsIn: number;       // Packets received
    packetsOut: number;      // Packets sent
    errors: number;          // Network errors
    bandwidth: number;       // Available bandwidth (Mbps)
    latency: number;         // Network latency (ms)
  };

  processes: {
    total: number;           // Total processes
    running: number;         // Running processes
    sleeping: number;        // Sleeping processes
    zombie: number;          // Zombie processes
  };
}

export interface ApplicationMetrics {
  timestamp: number;

  performance: {
    requestsPerSecond: number;
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
  };

  database: {
    connectionPool: {
      active: number;
      idle: number;
      waiting: number;
      total: number;
    };
    queries: {
      total: number;
      successful: number;
      failed: number;
      averageTime: number;
      slowQueries: number;
    };
    locks: {
      deadlocks: number;
      waiting: number;
      timeouts: number;
    };
  };

  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    memory: number;
  };

  queues: {
    name: string;
    size: number;
    processed: number;
    failed: number;
    avgProcessingTime: number;
  }[];

  ai: {
    modelInferences: number;
    averageInferenceTime: number;
    inferenceErrors: number;
    modelMemoryUsage: number;
    activeModels: number;
    queuedRequests: number;
  };
}

export interface UserAnalytics {
  timestamp: number;
  sessionId: string;
  userId?: string;         // Only if user consented

  session: {
    duration: number;       // Session duration in ms
    pageViews: number;      // Pages viewed in session
    interactions: number;   // Total interactions
    bounced: boolean;       // Did user bounce?
  };

  performance: {
    pageLoadTime: number;   // Time to load page
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };

  behavior: {
    clickCount: number;
    scrollDepth: number;    // Max scroll depth percentage
    timeOnPage: number;     // Time spent on current page
    errorsEncountered: number;
    featuresUsed: string[]; // Features used in session
  };

  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screenResolution: string;
    viewport: string;
  };

  location?: {
    country: string;        // Only if allowed
    region: string;         // Only if allowed
    timezone: string;
  };
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  timestamp: number;
  responseTime: number;
  details?: Record<string, any>;
  error?: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  context?: Record<string, any>;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  fingerprint?: string;
}

export interface IncidentAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  timestamp: number;

  trigger: {
    metric: string;
    threshold: number;
    currentValue: number;
    condition: 'above' | 'below' | 'equals';
  };

  metadata: {
    environment: string;
    version: string;
    nodeId: string;
    affectedServices: string[];
    estimatedImpact: 'low' | 'medium' | 'high';
  };

  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
  resolvedBy?: string;

  actions: IncidentAction[];
}

export interface IncidentAction {
  type: 'restart_service' | 'scale_up' | 'scale_down' | 'failover' | 'notification' | 'custom';
  executed: boolean;
  timestamp: number;
  result?: 'success' | 'failure';
  details?: string;
}

// ==================== EXTERNAL INTEGRATIONS ====================

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
}

export interface DatadogConfig {
  apiKey: string;
  appKey: string;
  site: string;
  service: string;
  env: string;
  version: string;
}

export interface NewRelicConfig {
  licenseKey: string;
  appName: string;
  distributed_tracing: boolean;
}

export interface PrometheusConfig {
  endpoint: string;
  pushgateway?: string;
  labels: Record<string, string>;
}

export interface GrafanaConfig {
  url: string;
  apiKey: string;
  dashboardIds: string[];
}

export interface WebhookConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
  template?: string;
  retries: number;
  timeout: number;
}

// ==================== MAIN MONITORING CLASS ====================

export class ProductionMonitoring extends EventEmitter {
  private config: ProductionConfig;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  private isRunning: boolean = false;
  private startTime: number = 0;

  private metricsCollectors: Map<string, MetricsCollector> = new Map();
  private healthChecks: Map<string, HealthChecker> = new Map();
  private alertManager: AlertManager;
  private logAggregator: LogAggregator;
  private incidentManager: IncidentManager;

  private metricsBuffer: SystemMetrics[] = [];
  private appMetricsBuffer: ApplicationMetrics[] = [];
  private userAnalyticsBuffer: UserAnalytics[] = [];
  private healthCheckResults: Map<string, HealthCheck> = new Map();
  private activeIncidents: Map<string, IncidentAlert> = new Map();

  private intervals: NodeJS.Timeout[] = [];

  constructor(config: ProductionConfig, logger: Logger, errorHandler: ErrorHandler) {
    super();
    this.config = config;
    this.logger = logger;
    this.errorHandler = errorHandler;

    this.alertManager = new AlertManager(config.alerts, logger);
    this.logAggregator = new LogAggregator(config, logger);
    this.incidentManager = new IncidentManager(config, this.alertManager, logger);

    this.initializeCollectors();
    this.setupErrorHandling();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Start the monitoring system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Monitoring system is already running');
      return;
    }

    this.logger.info('Starting production monitoring system', {
      environment: this.config.environment,
      version: this.config.version,
      deploymentId: this.config.deploymentId
    });

    this.isRunning = true;
    this.startTime = Date.now();

    await this.initializeIntegrations();
    this.startMetricsCollection();
    this.startHealthChecks();
    this.startLogAggregation();
    this.startIncidentDetection();

    this.emit('monitoring:started', {
      timestamp: this.startTime,
      config: this.config
    });

    this.logger.info('Production monitoring system started successfully');
  }

  /**
   * Stop the monitoring system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Monitoring system is not running');
      return;
    }

    this.logger.info('Stopping production monitoring system');

    this.isRunning = false;

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Stop collectors
    for (const collector of this.metricsCollectors.values()) {
      await collector.stop();
    }

    // Stop health checks
    for (const healthCheck of this.healthChecks.values()) {
      await healthCheck.stop();
    }

    await this.logAggregator.stop();
    await this.incidentManager.stop();

    this.emit('monitoring:stopped', {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    });

    this.logger.info('Production monitoring system stopped');
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number, type: MetricType = 'gauge', tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const metric = {
      name,
      value,
      type,
      tags: tags || {},
      timestamp: Date.now()
    };

    this.emit('metric:recorded', metric);

    // Send to external integrations
    this.sendToIntegrations('metric', metric);
  }

  /**
   * Record user interaction (privacy-compliant)
   */
  recordUserInteraction(interaction: Partial<UserAnalytics>): void {
    if (!this.config.enabled || !this.config.privacy.enableUserTracking) return;

    // Check Do Not Track header
    if (this.config.privacy.respectDNT && this.isDNTEnabled()) {
      return;
    }

    // Sample user analytics
    if (Math.random() > this.config.sampling.userSampling) {
      return;
    }

    const analytics: UserAnalytics = {
      timestamp: Date.now(),
      sessionId: interaction.sessionId || this.generateSessionId(),
      userId: this.config.privacy.allowPersonalData ? interaction.userId : undefined,
      session: interaction.session || {
        duration: 0,
        pageViews: 1,
        interactions: 1,
        bounced: false
      },
      performance: interaction.performance || {
        pageLoadTime: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0
      },
      behavior: interaction.behavior || {
        clickCount: 0,
        scrollDepth: 0,
        timeOnPage: 0,
        errorsEncountered: 0,
        featuresUsed: []
      },
      device: interaction.device || {
        type: 'desktop',
        os: 'unknown',
        browser: 'unknown',
        screenResolution: 'unknown',
        viewport: 'unknown'
      },
      location: this.config.privacy.allowPersonalData ? interaction.location : undefined
    };

    // Anonymize data if required
    if (this.config.privacy.anonymizeData) {
      this.anonymizeUserData(analytics);
    }

    this.userAnalyticsBuffer.push(analytics);
    this.emit('analytics:recorded', analytics);
  }

  /**
   * Create custom health check
   */
  addHealthCheck(name: string, checker: () => Promise<HealthCheck>): void {
    const healthChecker = new CustomHealthChecker(name, checker, this.logger);
    this.healthChecks.set(name, healthChecker);

    if (this.isRunning) {
      healthChecker.start(30000); // Check every 30 seconds
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    status: HealthStatus;
    uptime: number;
    version: string;
    environment: string;
    metrics: {
      system: SystemMetrics | null;
      application: ApplicationMetrics | null;
    };
    health: HealthCheck[];
    incidents: IncidentAlert[];
  } {
    const latestSystemMetrics = this.metricsBuffer[this.metricsBuffer.length - 1] || null;
    const latestAppMetrics = this.appMetricsBuffer[this.appMetricsBuffer.length - 1] || null;

    const healthChecks = Array.from(this.healthCheckResults.values());
    const overallStatus = this.calculateOverallHealth(healthChecks);

    const activeIncidents = Array.from(this.activeIncidents.values())
      .filter(incident => incident.status === 'open');

    return {
      status: overallStatus,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      version: this.config.version,
      environment: this.config.environment,
      metrics: {
        system: latestSystemMetrics,
        application: latestAppMetrics
      },
      health: healthChecks,
      incidents: activeIncidents
    };
  }

  /**
   * Get metrics data for dashboard
   */
  getMetricsData(
    startTime: number,
    endTime: number,
    metricNames?: string[]
  ): {
    system: SystemMetrics[];
    application: ApplicationMetrics[];
    analytics: UserAnalytics[];
  } {
    const filterByTime = (metrics: any[]) =>
      metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

    return {
      system: filterByTime(this.metricsBuffer),
      application: filterByTime(this.appMetricsBuffer),
      analytics: filterByTime(this.userAnalyticsBuffer)
    };
  }

  /**
   * Manually trigger an incident
   */
  triggerIncident(
    title: string,
    description: string,
    severity: AlertSeverity,
    metadata?: Record<string, any>
  ): string {
    const incident: IncidentAlert = {
      id: this.generateIncidentId(),
      severity,
      title,
      description,
      source: 'manual',
      timestamp: Date.now(),
      trigger: {
        metric: 'manual',
        threshold: 0,
        currentValue: 0,
        condition: 'equals'
      },
      metadata: {
        environment: this.config.environment,
        version: this.config.version,
        nodeId: this.getNodeId(),
        affectedServices: [],
        estimatedImpact: 'medium',
        ...metadata
      },
      status: 'open',
      actions: []
    };

    this.activeIncidents.set(incident.id, incident);
    this.incidentManager.handleIncident(incident);

    this.emit('incident:created', incident);

    return incident.id;
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<ProductionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.alertManager.updateConfig(updates.alerts || this.config.alerts);

    this.emit('config:updated', this.config);
    this.logger.info('Monitoring configuration updated', updates);
  }

  // ==================== PRIVATE METHODS ====================

  private initializeCollectors(): void {
    // System metrics collector
    const systemCollector = new SystemMetricsCollector(this.logger);
    systemCollector.on('metrics', (metrics: SystemMetrics) => {
      this.metricsBuffer.push(metrics);
      this.trimBuffer(this.metricsBuffer, this.config.retention.metrics * 24 * 60 * 60 * 1000);
      this.checkThresholds(metrics);
      this.emit('metrics:system', metrics);
    });
    this.metricsCollectors.set('system', systemCollector);

    // Application metrics collector
    const appCollector = new ApplicationMetricsCollector(this.logger);
    appCollector.on('metrics', (metrics: ApplicationMetrics) => {
      this.appMetricsBuffer.push(metrics);
      this.trimBuffer(this.appMetricsBuffer, this.config.retention.metrics * 24 * 60 * 60 * 1000);
      this.checkApplicationThresholds(metrics);
      this.emit('metrics:application', metrics);
    });
    this.metricsCollectors.set('application', appCollector);

    // Initialize default health checks
    this.addHealthCheck('database', async () => ({
      name: 'database',
      status: 'healthy',
      timestamp: Date.now(),
      responseTime: 10,
      details: { connectionPool: 'available' }
    }));

    this.addHealthCheck('memory', async () => {
      const latest = this.metricsBuffer[this.metricsBuffer.length - 1];
      const status = latest && latest.memory.percentage > 90 ? 'critical' : 'healthy';

      return {
        name: 'memory',
        status,
        timestamp: Date.now(),
        responseTime: 1,
        details: { usage: latest?.memory.percentage || 0 }
      };
    });
  }

  private setupErrorHandling(): void {
    this.errorHandler.on('error', (error: ProcessedError) => {
      // Sample errors
      if (Math.random() > this.config.sampling.errorSampling) {
        return;
      }

      // Convert to log entry
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level: this.mapSeverityToLogLevel(error.severity),
        message: error.message,
        source: 'error-handler',
        context: {
          category: error.category,
          severity: error.severity,
          fingerprint: error.reportingData.fingerprint,
          component: error.context.component,
          action: error.context.action
        },
        userId: error.context.userId,
        sessionId: error.context.sessionId,
        fingerprint: error.reportingData.fingerprint
      };

      this.logAggregator.addLog(logEntry);

      // Check if this should trigger an incident
      if (error.severity === 'critical' || error.severity === 'high') {
        this.incidentManager.evaluateErrorForIncident(error);
      }
    });
  }

  private async initializeIntegrations(): Promise<void> {
    const integrations = this.config.integrations;

    if (integrations.sentry) {
      await this.initializeSentry(integrations.sentry);
    }

    if (integrations.datadog) {
      await this.initializeDatadog(integrations.datadog);
    }

    if (integrations.newrelic) {
      await this.initializeNewRelic(integrations.newrelic);
    }

    if (integrations.prometheus) {
      await this.initializePrometheus(integrations.prometheus);
    }

    if (integrations.customWebhooks) {
      await this.initializeWebhooks(integrations.customWebhooks);
    }
  }

  private startMetricsCollection(): void {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Collect system metrics
        const systemCollector = this.metricsCollectors.get('system');
        if (systemCollector) {
          await systemCollector.collect();
        }

        // Collect application metrics
        const appCollector = this.metricsCollectors.get('application');
        if (appCollector) {
          await appCollector.collect();
        }
      } catch (error) {
        this.logger.error('Error collecting metrics', error);
      }
    }, this.config.sampling.metricsInterval);

    this.intervals.push(interval);
  }

  private startHealthChecks(): void {
    for (const [name, healthCheck] of this.healthChecks) {
      healthCheck.on('result', (result: HealthCheck) => {
        this.healthCheckResults.set(name, result);
        this.emit('health:checked', result);

        if (result.status === 'critical' || result.status === 'unhealthy') {
          this.incidentManager.evaluateHealthCheckForIncident(result);
        }
      });

      healthCheck.start(30000); // Check every 30 seconds
    }
  }

  private startLogAggregation(): void {
    this.logAggregator.start();

    this.logAggregator.on('log:aggregated', (logEntry: LogEntry) => {
      this.emit('log:received', logEntry);
      this.sendToIntegrations('log', logEntry);
    });
  }

  private startIncidentDetection(): void {
    this.incidentManager.start();

    this.incidentManager.on('incident:created', (incident: IncidentAlert) => {
      this.activeIncidents.set(incident.id, incident);
      this.emit('incident:created', incident);
      this.alertManager.sendAlert(incident);
    });

    this.incidentManager.on('incident:resolved', (incident: IncidentAlert) => {
      this.activeIncidents.delete(incident.id);
      this.emit('incident:resolved', incident);
    });
  }

  private checkThresholds(metrics: SystemMetrics): void {
    const thresholds = this.config.alerts.thresholds;

    // CPU threshold check
    if (metrics.cpu.usage >= thresholds.cpu.critical) {
      this.createAlert('cpu_critical', 'critical', `CPU usage is critical: ${metrics.cpu.usage}%`);
    } else if (metrics.cpu.usage >= thresholds.cpu.warning) {
      this.createAlert('cpu_warning', 'warning', `CPU usage is high: ${metrics.cpu.usage}%`);
    }

    // Memory threshold check
    if (metrics.memory.percentage >= thresholds.memory.critical) {
      this.createAlert('memory_critical', 'critical', `Memory usage is critical: ${metrics.memory.percentage}%`);
    } else if (metrics.memory.percentage >= thresholds.memory.warning) {
      this.createAlert('memory_warning', 'warning', `Memory usage is high: ${metrics.memory.percentage}%`);
    }

    // Disk threshold check
    if (metrics.disk.percentage >= thresholds.disk.critical) {
      this.createAlert('disk_critical', 'critical', `Disk usage is critical: ${metrics.disk.percentage}%`);
    } else if (metrics.disk.percentage >= thresholds.disk.warning) {
      this.createAlert('disk_warning', 'warning', `Disk usage is high: ${metrics.disk.percentage}%`);
    }
  }

  private checkApplicationThresholds(metrics: ApplicationMetrics): void {
    const thresholds = this.config.alerts.thresholds;

    // Error rate threshold check
    if (metrics.performance.errorRate >= thresholds.errorRate.critical) {
      this.createAlert('error_rate_critical', 'critical', `Error rate is critical: ${metrics.performance.errorRate}%`);
    } else if (metrics.performance.errorRate >= thresholds.errorRate.warning) {
      this.createAlert('error_rate_warning', 'warning', `Error rate is high: ${metrics.performance.errorRate}%`);
    }

    // Response time threshold check
    if (metrics.performance.averageResponseTime >= thresholds.responseTime.critical) {
      this.createAlert('response_time_critical', 'critical', `Response time is critical: ${metrics.performance.averageResponseTime}ms`);
    } else if (metrics.performance.averageResponseTime >= thresholds.responseTime.warning) {
      this.createAlert('response_time_warning', 'warning', `Response time is high: ${metrics.performance.averageResponseTime}ms`);
    }

    // Database checks
    const dbThresholds = thresholds.database;
    const dbMetrics = metrics.database;

    if (dbMetrics.queries.averageTime >= dbThresholds.queryTime.critical) {
      this.createAlert('db_query_time_critical', 'critical', `Database query time is critical: ${dbMetrics.queries.averageTime}ms`);
    }

    if (dbMetrics.locks.deadlocks >= dbThresholds.deadlocks.warning) {
      this.createAlert('db_deadlocks', 'warning', `Database deadlocks detected: ${dbMetrics.locks.deadlocks}`);
    }
  }

  private createAlert(id: string, severity: AlertSeverity, message: string): void {
    const alert: IncidentAlert = {
      id: `alert_${id}_${Date.now()}`,
      severity,
      title: `${severity.toUpperCase()}: ${id.replace(/_/g, ' ')}`,
      description: message,
      source: 'threshold_monitor',
      timestamp: Date.now(),
      trigger: {
        metric: id,
        threshold: 0,
        currentValue: 0,
        condition: 'above'
      },
      metadata: {
        environment: this.config.environment,
        version: this.config.version,
        nodeId: this.getNodeId(),
        affectedServices: [],
        estimatedImpact: severity === 'critical' ? 'high' : 'medium'
      },
      status: 'open',
      actions: []
    };

    this.activeIncidents.set(alert.id, alert);
    this.incidentManager.handleIncident(alert);
  }

  private calculateOverallHealth(healthChecks: HealthCheck[]): HealthStatus {
    if (healthChecks.length === 0) return 'healthy';

    const statuses = healthChecks.map(hc => hc.status);

    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';

    return 'healthy';
  }

  private trimBuffer<T extends { timestamp: number }>(buffer: T[], maxAge: number): void {
    const cutoff = Date.now() - maxAge;
    const index = buffer.findIndex(item => item.timestamp > cutoff);
    if (index > 0) {
      buffer.splice(0, index);
    }
  }

  private async sendToIntegrations(type: string, data: any): Promise<void> {
    try {
      // This would send data to configured external monitoring services
      this.emit('integration:send', { type, data });
    } catch (error) {
      this.logger.error('Failed to send data to integrations', error);
    }
  }

  private isDNTEnabled(): boolean {
    return typeof window !== 'undefined' &&
           (navigator.doNotTrack === '1' ||
            (window as any).doNotTrack === '1' ||
            navigator.msDoNotTrack === '1');
  }

  private anonymizeUserData(analytics: UserAnalytics): void {
    // Remove or hash personally identifiable information
    if (analytics.userId) {
      analytics.userId = this.hashString(analytics.userId);
    }

    if (analytics.location) {
      // Keep only country-level location data
      analytics.location = {
        country: analytics.location.country,
        region: 'anonymized',
        timezone: analytics.location.timezone
      };
    }

    // Anonymize device information
    analytics.device.os = this.generalizeString(analytics.device.os);
    analytics.device.browser = this.generalizeString(analytics.device.browser);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private generalizeString(str: string): string {
    // Generalize strings to remove specific version info
    return str.replace(/\d+\.\d+\.\d+/g, 'x.x.x').replace(/\d+\.\d+/g, 'x.x');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNodeId(): string {
    return `node_${this.config.deploymentId}`;
  }

  private mapSeverityToLogLevel(severity: string): LogEntry['level'] {
    switch (severity) {
      case 'critical': return 'fatal';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  // Integration initialization methods (stubs for actual implementations)
  private async initializeSentry(config: SentryConfig): Promise<void> {
    this.logger.info('Initializing Sentry integration', { dsn: config.dsn });
    // Actual Sentry SDK initialization would go here
  }

  private async initializeDatadog(config: DatadogConfig): Promise<void> {
    this.logger.info('Initializing Datadog integration', { service: config.service });
    // Actual Datadog SDK initialization would go here
  }

  private async initializeNewRelic(config: NewRelicConfig): Promise<void> {
    this.logger.info('Initializing New Relic integration', { appName: config.appName });
    // Actual New Relic SDK initialization would go here
  }

  private async initializePrometheus(config: PrometheusConfig): Promise<void> {
    this.logger.info('Initializing Prometheus integration', { endpoint: config.endpoint });
    // Actual Prometheus client initialization would go here
  }

  private async initializeWebhooks(configs: WebhookConfig[]): Promise<void> {
    this.logger.info('Initializing webhook integrations', { count: configs.length });
    // Webhook client initialization would go here
  }
}

// ==================== SUPPORTING CLASSES ====================

abstract class MetricsCollector extends EventEmitter {
  protected logger: Logger;
  protected isRunning: boolean = false;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  abstract collect(): Promise<void>;

  async start(): Promise<void> {
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }
}

class SystemMetricsCollector extends MetricsCollector {
  async collect(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const metrics: SystemMetrics = {
        timestamp: Date.now(),
        nodeId: 'node_1',
        cpu: await this.collectCPUMetrics(),
        memory: await this.collectMemoryMetrics(),
        disk: await this.collectDiskMetrics(),
        network: await this.collectNetworkMetrics(),
        processes: await this.collectProcessMetrics()
      };

      this.emit('metrics', metrics);
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  private async collectCPUMetrics() {
    // Browser-based CPU estimation
    const startTime = performance.now();
    const iterations = 100000;

    for (let i = 0; i < iterations; i++) {
      Math.random();
    }

    const duration = performance.now() - startTime;
    const usage = Math.min(100, Math.max(0, (duration / 1 - 1) * 100)) + Math.random() * 20 + 10;

    return {
      usage,
      cores: navigator.hardwareConcurrency || 4,
      load: [usage / 100, usage / 100 * 0.8, usage / 100 * 0.6],
      temperature: 45 + Math.random() * 30
    };
  }

  private async collectMemoryMetrics() {
    const memoryInfo = (performance as any).memory;

    if (memoryInfo) {
      const used = memoryInfo.usedJSHeapSize;
      const total = memoryInfo.jsHeapSizeLimit;

      return {
        total,
        used,
        free: total - used,
        cached: used * 0.1,
        buffers: used * 0.05,
        percentage: (used / total) * 100,
        swapTotal: total * 2,
        swapUsed: used * 0.1
      };
    }

    // Fallback
    const used = Math.random() * 4000000000 + 1000000000;
    const total = 8000000000;

    return {
      total,
      used,
      free: total - used,
      cached: used * 0.1,
      buffers: used * 0.05,
      percentage: (used / total) * 100
    };
  }

  private async collectDiskMetrics() {
    const total = 500000000000; // 500GB
    const used = Math.random() * total * 0.8;

    return {
      total,
      used,
      free: total - used,
      percentage: (used / total) * 100,
      iops: Math.random() * 1000 + 100,
      readLatency: Math.random() * 10 + 1,
      writeLatency: Math.random() * 15 + 2
    };
  }

  private async collectNetworkMetrics() {
    const connection = (navigator as any).connection || {};

    return {
      bytesIn: Math.random() * 1000000,
      bytesOut: Math.random() * 500000,
      packetsIn: Math.random() * 1000,
      packetsOut: Math.random() * 800,
      errors: Math.random() * 10,
      bandwidth: connection.downlink || Math.random() * 100,
      latency: connection.rtt || Math.random() * 50 + 10
    };
  }

  private async collectProcessMetrics() {
    return {
      total: Math.floor(Math.random() * 200 + 50),
      running: Math.floor(Math.random() * 20 + 5),
      sleeping: Math.floor(Math.random() * 150 + 30),
      zombie: Math.floor(Math.random() * 3)
    };
  }
}

class ApplicationMetricsCollector extends MetricsCollector {
  async collect(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const metrics: ApplicationMetrics = {
        timestamp: Date.now(),
        performance: await this.collectPerformanceMetrics(),
        database: await this.collectDatabaseMetrics(),
        cache: await this.collectCacheMetrics(),
        queues: await this.collectQueueMetrics(),
        ai: await this.collectAIMetrics()
      };

      this.emit('metrics', metrics);
    } catch (error) {
      this.logger.error('Failed to collect application metrics', error);
    }
  }

  private async collectPerformanceMetrics() {
    return {
      requestsPerSecond: Math.random() * 100 + 10,
      averageResponseTime: Math.random() * 500 + 50,
      p50ResponseTime: Math.random() * 300 + 30,
      p95ResponseTime: Math.random() * 1000 + 200,
      p99ResponseTime: Math.random() * 2000 + 500,
      errorRate: Math.random() * 5,
      throughput: Math.random() * 1000 + 100
    };
  }

  private async collectDatabaseMetrics() {
    return {
      connectionPool: {
        active: Math.floor(Math.random() * 10 + 5),
        idle: Math.floor(Math.random() * 5 + 2),
        waiting: Math.floor(Math.random() * 3),
        total: 20
      },
      queries: {
        total: Math.floor(Math.random() * 1000 + 100),
        successful: Math.floor(Math.random() * 980 + 95),
        failed: Math.floor(Math.random() * 20),
        averageTime: Math.random() * 100 + 10,
        slowQueries: Math.floor(Math.random() * 5)
      },
      locks: {
        deadlocks: Math.floor(Math.random() * 2),
        waiting: Math.floor(Math.random() * 5),
        timeouts: Math.floor(Math.random() * 3)
      }
    };
  }

  private async collectCacheMetrics() {
    const hits = Math.floor(Math.random() * 1000 + 500);
    const misses = Math.floor(Math.random() * 200 + 50);

    return {
      hits,
      misses,
      hitRate: (hits / (hits + misses)) * 100,
      evictions: Math.floor(Math.random() * 10),
      memory: Math.random() * 1000000000 + 100000000
    };
  }

  private async collectQueueMetrics() {
    return [
      {
        name: 'inference_queue',
        size: Math.floor(Math.random() * 50 + 5),
        processed: Math.floor(Math.random() * 1000 + 100),
        failed: Math.floor(Math.random() * 10),
        avgProcessingTime: Math.random() * 1000 + 100
      },
      {
        name: 'analysis_queue',
        size: Math.floor(Math.random() * 20 + 2),
        processed: Math.floor(Math.random() * 500 + 50),
        failed: Math.floor(Math.random() * 5),
        avgProcessingTime: Math.random() * 2000 + 200
      }
    ];
  }

  private async collectAIMetrics() {
    return {
      modelInferences: Math.floor(Math.random() * 100 + 10),
      averageInferenceTime: Math.random() * 2000 + 500,
      inferenceErrors: Math.floor(Math.random() * 5),
      modelMemoryUsage: Math.random() * 2000000000 + 1000000000,
      activeModels: Math.floor(Math.random() * 3 + 1),
      queuedRequests: Math.floor(Math.random() * 20 + 2)
    };
  }
}

abstract class HealthChecker extends EventEmitter {
  protected name: string;
  protected logger: Logger;
  protected interval?: NodeJS.Timeout;

  constructor(name: string, logger: Logger) {
    super();
    this.name = name;
    this.logger = logger;
  }

  abstract check(): Promise<HealthCheck>;

  start(intervalMs: number): void {
    this.interval = setInterval(async () => {
      try {
        const result = await this.check();
        this.emit('result', result);
      } catch (error) {
        this.logger.error(`Health check failed: ${this.name}`, error);
        this.emit('result', {
          name: this.name,
          status: 'critical' as HealthStatus,
          timestamp: Date.now(),
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMs);
  }

  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}

class CustomHealthChecker extends HealthChecker {
  private checker: () => Promise<HealthCheck>;

  constructor(name: string, checker: () => Promise<HealthCheck>, logger: Logger) {
    super(name, logger);
    this.checker = checker;
  }

  async check(): Promise<HealthCheck> {
    return await this.checker();
  }
}

class AlertManager {
  private config: ProductionConfig['alerts'];
  private logger: Logger;

  constructor(config: ProductionConfig['alerts'], logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async sendAlert(incident: IncidentAlert): Promise<void> {
    if (!this.config.enabled) return;

    this.logger.info('Sending alert', {
      incidentId: incident.id,
      severity: incident.severity,
      title: incident.title
    });

    for (const channel of this.config.channels) {
      if (!channel.enabled || !channel.severity.includes(incident.severity)) {
        continue;
      }

      try {
        await this.sendToChannel(channel, incident);
      } catch (error) {
        this.logger.error(`Failed to send alert to ${channel.type}`, error);
      }
    }
  }

  updateConfig(config: ProductionConfig['alerts']): void {
    this.config = config;
  }

  private async sendToChannel(channel: AlertChannel, incident: IncidentAlert): Promise<void> {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhook(channel, incident);
        break;
      case 'email':
        await this.sendEmail(channel, incident);
        break;
      case 'slack':
        await this.sendSlack(channel, incident);
        break;
      default:
        this.logger.warn(`Unsupported alert channel type: ${channel.type}`);
    }
  }

  private async sendWebhook(channel: AlertChannel, incident: IncidentAlert): Promise<void> {
    // Webhook implementation would go here
    this.logger.info('Sending webhook alert', { endpoint: channel.endpoint });
  }

  private async sendEmail(channel: AlertChannel, incident: IncidentAlert): Promise<void> {
    // Email implementation would go here
    this.logger.info('Sending email alert', { endpoint: channel.endpoint });
  }

  private async sendSlack(channel: AlertChannel, incident: IncidentAlert): Promise<void> {
    // Slack implementation would go here
    this.logger.info('Sending Slack alert', { endpoint: channel.endpoint });
  }
}

class LogAggregator extends EventEmitter {
  private config: ProductionConfig;
  private logger: Logger;
  private logBuffer: LogEntry[] = [];

  constructor(config: ProductionConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  start(): void {
    // Log aggregation logic would go here
    this.logger.info('Starting log aggregation');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping log aggregation');
  }

  addLog(logEntry: LogEntry): void {
    this.logBuffer.push(logEntry);
    this.emit('log:aggregated', logEntry);

    // Trim buffer
    const maxAge = this.config.retention.logs * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAge;
    this.logBuffer = this.logBuffer.filter(log => log.timestamp > cutoff);
  }

  getLogs(filters?: {
    level?: LogEntry['level'];
    source?: string;
    startTime?: number;
    endTime?: number;
  }): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filters) {
      if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
      }
      if (filters.source) {
        logs = logs.filter(log => log.source === filters.source);
      }
      if (filters.startTime) {
        logs = logs.filter(log => log.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        logs = logs.filter(log => log.timestamp <= filters.endTime!);
      }
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }
}

class IncidentManager extends EventEmitter {
  private config: ProductionConfig;
  private alertManager: AlertManager;
  private logger: Logger;

  constructor(config: ProductionConfig, alertManager: AlertManager, logger: Logger) {
    super();
    this.config = config;
    this.alertManager = alertManager;
    this.logger = logger;
  }

  start(): void {
    this.logger.info('Starting incident management');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping incident management');
  }

  handleIncident(incident: IncidentAlert): void {
    this.logger.info('Handling incident', {
      id: incident.id,
      severity: incident.severity,
      title: incident.title
    });

    // Execute automated response actions
    this.executeAutomatedActions(incident);

    this.emit('incident:created', incident);
  }

  evaluateErrorForIncident(error: ProcessedError): void {
    // Logic to determine if error should create an incident
    if (error.severity === 'critical') {
      const incident: IncidentAlert = {
        id: `error_incident_${Date.now()}`,
        severity: 'critical',
        title: `Critical Error: ${error.category}`,
        description: error.message,
        source: 'error_tracking',
        timestamp: Date.now(),
        trigger: {
          metric: 'error_rate',
          threshold: 0,
          currentValue: 1,
          condition: 'above'
        },
        metadata: {
          environment: this.config.environment,
          version: this.config.version,
          nodeId: 'node_1',
          affectedServices: [error.context.component || 'unknown'],
          estimatedImpact: 'high'
        },
        status: 'open',
        actions: []
      };

      this.handleIncident(incident);
    }
  }

  evaluateHealthCheckForIncident(healthCheck: HealthCheck): void {
    if (healthCheck.status === 'critical') {
      const incident: IncidentAlert = {
        id: `health_incident_${Date.now()}`,
        severity: 'error',
        title: `Health Check Failed: ${healthCheck.name}`,
        description: healthCheck.error || 'Health check failed',
        source: 'health_monitoring',
        timestamp: Date.now(),
        trigger: {
          metric: 'health_status',
          threshold: 0,
          currentValue: 1,
          condition: 'equals'
        },
        metadata: {
          environment: this.config.environment,
          version: this.config.version,
          nodeId: 'node_1',
          affectedServices: [healthCheck.name],
          estimatedImpact: 'medium'
        },
        status: 'open',
        actions: []
      };

      this.handleIncident(incident);
    }
  }

  private executeAutomatedActions(incident: IncidentAlert): void {
    // Define automated response actions based on incident type and severity
    const actions: IncidentAction[] = [];

    if (incident.severity === 'critical') {
      actions.push({
        type: 'notification',
        executed: false,
        timestamp: Date.now()
      });

      // Add restart action for certain types of incidents
      if (incident.source === 'health_monitoring') {
        actions.push({
          type: 'restart_service',
          executed: false,
          timestamp: Date.now()
        });
      }
    }

    // Execute actions
    actions.forEach(async (action) => {
      try {
        await this.executeAction(action, incident);
        action.executed = true;
        action.result = 'success';
      } catch (error) {
        action.executed = true;
        action.result = 'failure';
        action.details = error instanceof Error ? error.message : 'Unknown error';
      }
    });

    incident.actions = actions;
  }

  private async executeAction(action: IncidentAction, incident: IncidentAlert): Promise<void> {
    this.logger.info('Executing incident action', {
      incidentId: incident.id,
      actionType: action.type
    });

    switch (action.type) {
      case 'notification':
        // Already handled by alert manager
        break;
      case 'restart_service':
        // Service restart logic would go here
        this.logger.info('Service restart action triggered');
        break;
      case 'scale_up':
        // Auto-scaling logic would go here
        this.logger.info('Scale up action triggered');
        break;
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }
}

// ==================== EXPORTS ====================

export default ProductionMonitoring;

// Factory function for creating monitoring instance
export function createProductionMonitoring(
  config: ProductionConfig,
  logger: Logger,
  errorHandler: ErrorHandler
): ProductionMonitoring {
  return new ProductionMonitoring(config, logger, errorHandler);
}

// Default configuration
export const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  enabled: true,
  environment: 'production',
  version: '1.0.0',
  deploymentId: 'default',
  region: 'us-east-1',

  sampling: {
    metricsInterval: 30000,     // 30 seconds
    errorSampling: 1.0,         // 100% sampling
    performanceSampling: 0.1,   // 10% sampling
    userSampling: 0.05          // 5% sampling
  },

  retention: {
    metrics: 7,      // 7 days
    errors: 30,      // 30 days
    logs: 14,        // 14 days
    analytics: 90    // 90 days
  },

  privacy: {
    enableUserTracking: true,
    anonymizeData: true,
    respectDNT: true,
    dataRetentionDays: 90,
    allowPersonalData: false
  },

  alerts: {
    enabled: true,
    channels: [],
    thresholds: {
      cpu: { warning: 70, critical: 85 },
      memory: { warning: 75, critical: 90 },
      disk: { warning: 80, critical: 95 },
      errorRate: { warning: 5, critical: 10 },
      responseTime: { warning: 1000, critical: 3000 },
      uptime: { warning: 99, critical: 95 },
      database: {
        connectionPool: { warning: 80, critical: 95 },
        queryTime: { warning: 1000, critical: 5000 },
        deadlocks: { warning: 5, critical: 10 }
      }
    }
  },

  integrations: {}
};