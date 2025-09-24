/**
 * BEAR AI Production Monitoring Dashboard Configuration
 * Provides dashboard layouts, widgets, and visualization configs for monitoring data
 *
 * @version 1.0.0
 * @author BEAR AI Team
 */

import { SystemMetrics, ApplicationMetrics, UserAnalytics, HealthCheck, IncidentAlert } from './ProductionMonitoring';

// ==================== DASHBOARD CONFIGURATION ====================

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: Widget[];
  filters: DashboardFilter[];
  refreshInterval: number;
  autoRefresh: boolean;
  permissions: DashboardPermission[];
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'masonry';
  columns: number;
  rowHeight: number;
  margin: [number, number];
  padding: [number, number];
  responsive: {
    breakpoint: number;
    columns: number;
  }[];
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: DataSourceConfig;
  visualization: VisualizationConfig;
  alerts?: WidgetAlert[];
}

export type WidgetType =
  | 'metric_card'
  | 'line_chart'
  | 'bar_chart'
  | 'gauge'
  | 'table'
  | 'heatmap'
  | 'status_indicator'
  | 'alert_list'
  | 'log_viewer'
  | 'topology_map'
  | 'pie_chart'
  | 'histogram'
  | 'timeline'
  | 'geolocation_map'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  layer?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfig {
  theme: 'light' | 'dark' | 'auto';
  colors: string[];
  animation: boolean;
  interactive: boolean;
  exportable: boolean;
  refreshInterval?: number;
  cacheResults?: boolean;
  showLegend?: boolean;
  showTooltips?: boolean;
  precision?: number;
}

export interface DataSourceConfig {
  type: 'realtime' | 'historical' | 'aggregated';
  metric: string;
  timeRange: TimeRange;
  aggregation?: AggregationType;
  filters?: DataFilter[];
  groupBy?: string[];
  sortBy?: string;
  limit?: number;
}

export interface TimeRange {
  start: number | string; // timestamp or relative like '-1h'
  end: number | string;   // timestamp or relative like 'now'
  interval?: string;      // '1m', '5m', '1h', etc.
}

export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex';
  value: any;
}

export interface VisualizationConfig {
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  colors?: ColorConfig;
  thresholds?: ThresholdConfig[];
  formatting?: FormattingConfig;
}

export interface AxisConfig {
  label: string;
  unit?: string;
  scale: 'linear' | 'log' | 'time';
  min?: number;
  max?: number;
  gridLines: boolean;
  tickInterval?: number;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
}

export interface TooltipConfig {
  show: boolean;
  format: string;
  includeTime: boolean;
  customTemplate?: string;
}

export interface ColorConfig {
  scheme: 'default' | 'status' | 'heatmap' | 'custom';
  palette: string[];
  gradients?: boolean;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
  showLine?: boolean;
}

export interface FormattingConfig {
  unit: string;
  precision: number;
  abbreviate: boolean;
  prefix?: string;
  suffix?: string;
}

export interface WidgetAlert {
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text' | 'number';
  options?: FilterOption[];
  default?: any;
  affects: string[]; // Widget IDs this filter affects
}

export interface FilterOption {
  value: any;
  label: string;
  description?: string;
}

export interface DashboardPermission {
  role: string;
  permissions: ('view' | 'edit' | 'delete' | 'share' | 'admin')[];
}

// ==================== DASHBOARD TEMPLATES ====================

export class DashboardTemplates {
  static getSystemOverviewDashboard(): DashboardConfig {
    return {
      id: 'system_overview',
      name: 'System Overview',
      description: 'High-level system metrics and health indicators',
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80,
        margin: [10, 10],
        padding: [20, 20],
        responsive: [
          { breakpoint: 1200, columns: 12 },
          { breakpoint: 768, columns: 6 },
          { breakpoint: 480, columns: 1 }
        ]
      },
      widgets: [
        // System Health Status
        {
          id: 'system_health',
          type: 'status_indicator',
          title: 'System Health',
          position: { x: 0, y: 0 },
          size: { width: 3, height: 2 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#eab308', '#ef4444', '#7c2d12'],
            animation: true,
            interactive: true,
            exportable: false
          },
          dataSource: {
            type: 'realtime',
            metric: 'system.health.overall',
            timeRange: { start: 'now-5m', end: 'now' }
          },
          visualization: {
            colors: {
              scheme: 'status',
              palette: ['#22c55e', '#eab308', '#ef4444', '#7c2d12']
            },
            thresholds: [
              { value: 95, color: '#22c55e', label: 'Healthy' },
              { value: 80, color: '#eab308', label: 'Degraded' },
              { value: 50, color: '#ef4444', label: 'Unhealthy' },
              { value: 0, color: '#7c2d12', label: 'Critical' }
            ]
          }
        },

        // CPU Usage Gauge
        {
          id: 'cpu_usage',
          type: 'gauge',
          title: 'CPU Usage',
          position: { x: 3, y: 0 },
          size: { width: 3, height: 2 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#eab308', '#ef4444'],
            animation: true,
            interactive: true,
            exportable: true,
            precision: 1
          },
          dataSource: {
            type: 'realtime',
            metric: 'system.cpu.usage',
            timeRange: { start: 'now-1m', end: 'now' },
            aggregation: 'avg'
          },
          visualization: {
            formatting: {
              unit: '%',
              precision: 1,
              abbreviate: false
            },
            thresholds: [
              { value: 70, color: '#eab308' },
              { value: 85, color: '#ef4444' }
            ]
          },
          alerts: [
            {
              condition: 'value > 85',
              threshold: 85,
              severity: 'critical',
              message: 'CPU usage is critically high'
            }
          ]
        },

        // Memory Usage Gauge
        {
          id: 'memory_usage',
          type: 'gauge',
          title: 'Memory Usage',
          position: { x: 6, y: 0 },
          size: { width: 3, height: 2 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#eab308', '#ef4444'],
            animation: true,
            interactive: true,
            exportable: true,
            precision: 1
          },
          dataSource: {
            type: 'realtime',
            metric: 'system.memory.percentage',
            timeRange: { start: 'now-1m', end: 'now' },
            aggregation: 'avg'
          },
          visualization: {
            formatting: {
              unit: '%',
              precision: 1,
              abbreviate: false
            },
            thresholds: [
              { value: 75, color: '#eab308' },
              { value: 90, color: '#ef4444' }
            ]
          }
        },

        // Disk Usage Gauge
        {
          id: 'disk_usage',
          type: 'gauge',
          title: 'Disk Usage',
          position: { x: 9, y: 0 },
          size: { width: 3, height: 2 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#eab308', '#ef4444'],
            animation: true,
            interactive: true,
            exportable: true,
            precision: 1
          },
          dataSource: {
            type: 'realtime',
            metric: 'system.disk.percentage',
            timeRange: { start: 'now-1m', end: 'now' },
            aggregation: 'avg'
          },
          visualization: {
            formatting: {
              unit: '%',
              precision: 1,
              abbreviate: false
            },
            thresholds: [
              { value: 80, color: '#eab308' },
              { value: 95, color: '#ef4444' }
            ]
          }
        },

        // Response Time Chart
        {
          id: 'response_time_chart',
          type: 'line_chart',
          title: 'API Response Time',
          position: { x: 0, y: 2 },
          size: { width: 6, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#3b82f6', '#10b981', '#f59e0b'],
            animation: true,
            interactive: true,
            exportable: true,
            showLegend: true,
            showTooltips: true
          },
          dataSource: {
            type: 'historical',
            metric: 'application.performance.responseTime',
            timeRange: { start: 'now-1h', end: 'now', interval: '1m' },
            groupBy: ['percentile']
          },
          visualization: {
            xAxis: {
              label: 'Time',
              scale: 'time',
              gridLines: true
            },
            yAxis: {
              label: 'Response Time',
              unit: 'ms',
              scale: 'linear',
              gridLines: true,
              min: 0
            },
            legend: {
              show: true,
              position: 'top',
              align: 'end'
            },
            tooltip: {
              show: true,
              format: '{value} ms',
              includeTime: true
            }
          }
        },

        // Error Rate Chart
        {
          id: 'error_rate_chart',
          type: 'line_chart',
          title: 'Error Rate',
          position: { x: 6, y: 2 },
          size: { width: 6, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#ef4444'],
            animation: true,
            interactive: true,
            exportable: true,
            showTooltips: true
          },
          dataSource: {
            type: 'historical',
            metric: 'application.performance.errorRate',
            timeRange: { start: 'now-1h', end: 'now', interval: '1m' }
          },
          visualization: {
            xAxis: {
              label: 'Time',
              scale: 'time',
              gridLines: true
            },
            yAxis: {
              label: 'Error Rate',
              unit: '%',
              scale: 'linear',
              gridLines: true,
              min: 0
            },
            thresholds: [
              { value: 5, color: '#eab308', label: 'Warning', showLine: true },
              { value: 10, color: '#ef4444', label: 'Critical', showLine: true }
            ]
          }
        },

        // Active Incidents
        {
          id: 'active_incidents',
          type: 'alert_list',
          title: 'Active Incidents',
          position: { x: 0, y: 5 },
          size: { width: 6, height: 4 },
          config: {
            theme: 'auto',
            colors: ['#ef4444', '#eab308', '#3b82f6'],
            animation: false,
            interactive: true,
            exportable: true
          },
          dataSource: {
            type: 'realtime',
            metric: 'incidents.active',
            timeRange: { start: 'now-24h', end: 'now' },
            filters: [{ field: 'status', operator: 'eq', value: 'open' }],
            sortBy: 'severity',
            limit: 10
          },
          visualization: {
            colors: {
              scheme: 'status',
              palette: ['#ef4444', '#eab308', '#3b82f6', '#6b7280']
            }
          }
        },

        // Service Health Matrix
        {
          id: 'service_health',
          type: 'heatmap',
          title: 'Service Health Matrix',
          position: { x: 6, y: 5 },
          size: { width: 6, height: 4 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#eab308', '#ef4444'],
            animation: true,
            interactive: true,
            exportable: true,
            showTooltips: true
          },
          dataSource: {
            type: 'realtime',
            metric: 'health.services',
            timeRange: { start: 'now-5m', end: 'now' },
            groupBy: ['service', 'region']
          },
          visualization: {
            colors: {
              scheme: 'heatmap',
              palette: ['#22c55e', '#eab308', '#ef4444'],
              gradients: true
            },
            tooltip: {
              show: true,
              format: 'Service: {service}\nRegion: {region}\nHealth: {value}%',
              includeTime: false
            }
          }
        }
      ],
      filters: [
        {
          id: 'time_range',
          name: 'Time Range',
          type: 'select',
          options: [
            { value: 'now-5m', label: 'Last 5 minutes' },
            { value: 'now-15m', label: 'Last 15 minutes' },
            { value: 'now-1h', label: 'Last hour' },
            { value: 'now-6h', label: 'Last 6 hours' },
            { value: 'now-24h', label: 'Last 24 hours' }
          ],
          default: 'now-1h',
          affects: ['response_time_chart', 'error_rate_chart', 'active_incidents']
        },
        {
          id: 'environment',
          name: 'Environment',
          type: 'select',
          options: [
            { value: 'all', label: 'All Environments' },
            { value: 'production', label: 'Production' },
            { value: 'staging', label: 'Staging' },
            { value: 'development', label: 'Development' }
          ],
          default: 'production',
          affects: ['system_health', 'cpu_usage', 'memory_usage', 'disk_usage']
        }
      ],
      refreshInterval: 30000,
      autoRefresh: true,
      permissions: [
        {
          role: 'admin',
          permissions: ['view', 'edit', 'delete', 'share', 'admin']
        },
        {
          role: 'operator',
          permissions: ['view', 'edit', 'share']
        },
        {
          role: 'viewer',
          permissions: ['view']
        }
      ]
    };
  }

  static getApplicationDashboard(): DashboardConfig {
    return {
      id: 'application_dashboard',
      name: 'Application Performance',
      description: 'Detailed application metrics and AI model performance',
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80,
        margin: [10, 10],
        padding: [20, 20],
        responsive: [
          { breakpoint: 1200, columns: 12 },
          { breakpoint: 768, columns: 6 },
          { breakpoint: 480, columns: 1 }
        ]
      },
      widgets: [
        // Request Volume
        {
          id: 'request_volume',
          type: 'metric_card',
          title: 'Requests/sec',
          position: { x: 0, y: 0 },
          size: { width: 3, height: 2 },
          config: {
            theme: 'auto',
            colors: ['#3b82f6'],
            animation: true,
            interactive: false,
            exportable: true,
            precision: 1
          },
          dataSource: {
            type: 'realtime',
            metric: 'application.performance.requestsPerSecond',
            timeRange: { start: 'now-1m', end: 'now' },
            aggregation: 'avg'
          },
          visualization: {
            formatting: {
              unit: 'req/s',
              precision: 1,
              abbreviate: true
            }
          }
        },

        // AI Model Performance
        {
          id: 'ai_inference_time',
          type: 'line_chart',
          title: 'AI Inference Time',
          position: { x: 3, y: 0 },
          size: { width: 6, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#8b5cf6', '#06b6d4'],
            animation: true,
            interactive: true,
            exportable: true,
            showLegend: true
          },
          dataSource: {
            type: 'historical',
            metric: 'application.ai.inferenceTime',
            timeRange: { start: 'now-2h', end: 'now', interval: '5m' },
            groupBy: ['model']
          },
          visualization: {
            xAxis: {
              label: 'Time',
              scale: 'time',
              gridLines: true
            },
            yAxis: {
              label: 'Inference Time',
              unit: 'ms',
              scale: 'linear',
              gridLines: true
            },
            legend: {
              show: true,
              position: 'top',
              align: 'end'
            }
          }
        },

        // Database Connections
        {
          id: 'db_connections',
          type: 'bar_chart',
          title: 'Database Connection Pool',
          position: { x: 9, y: 0 },
          size: { width: 3, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#3b82f6', '#eab308'],
            animation: true,
            interactive: true,
            exportable: true,
            showLegend: true
          },
          dataSource: {
            type: 'realtime',
            metric: 'application.database.connectionPool',
            timeRange: { start: 'now-1m', end: 'now' }
          },
          visualization: {
            xAxis: {
              label: 'Connection Type',
              scale: 'linear',
              gridLines: false
            },
            yAxis: {
              label: 'Count',
              scale: 'linear',
              gridLines: true
            }
          }
        },

        // Cache Hit Rate
        {
          id: 'cache_hit_rate',
          type: 'pie_chart',
          title: 'Cache Performance',
          position: { x: 0, y: 3 },
          size: { width: 4, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#22c55e', '#ef4444'],
            animation: true,
            interactive: true,
            exportable: true,
            showLegend: true
          },
          dataSource: {
            type: 'realtime',
            metric: 'application.cache.hitRate',
            timeRange: { start: 'now-5m', end: 'now' }
          },
          visualization: {
            legend: {
              show: true,
              position: 'right',
              align: 'center'
            }
          }
        },

        // Queue Status
        {
          id: 'queue_status',
          type: 'table',
          title: 'Queue Status',
          position: { x: 4, y: 3 },
          size: { width: 8, height: 3 },
          config: {
            theme: 'auto',
            colors: [],
            animation: false,
            interactive: true,
            exportable: true
          },
          dataSource: {
            type: 'realtime',
            metric: 'application.queues',
            timeRange: { start: 'now-1m', end: 'now' }
          },
          visualization: {
            formatting: {
              unit: '',
              precision: 0,
              abbreviate: true
            }
          }
        }
      ],
      filters: [
        {
          id: 'time_range',
          name: 'Time Range',
          type: 'select',
          options: [
            { value: 'now-15m', label: 'Last 15 minutes' },
            { value: 'now-1h', label: 'Last hour' },
            { value: 'now-6h', label: 'Last 6 hours' },
            { value: 'now-24h', label: 'Last 24 hours' }
          ],
          default: 'now-1h',
          affects: ['ai_inference_time']
        }
      ],
      refreshInterval: 15000,
      autoRefresh: true,
      permissions: [
        {
          role: 'admin',
          permissions: ['view', 'edit', 'delete', 'share', 'admin']
        },
        {
          role: 'developer',
          permissions: ['view', 'edit', 'share']
        },
        {
          role: 'viewer',
          permissions: ['view']
        }
      ]
    };
  }

  static getUserAnalyticsDashboard(): DashboardConfig {
    return {
      id: 'user_analytics',
      name: 'User Analytics',
      description: 'Privacy-compliant user behavior and performance analytics',
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80,
        margin: [10, 10],
        padding: [20, 20],
        responsive: [
          { breakpoint: 1200, columns: 12 },
          { breakpoint: 768, columns: 6 },
          { breakpoint: 480, columns: 1 }
        ]
      },
      widgets: [
        // Active Users
        {
          id: 'active_users',
          type: 'metric_card',
          title: 'Active Users',
          position: { x: 0, y: 0 },
          size: { width: 3, height: 2 },
          config: {
            theme: 'auto',
            colors: ['#6366f1'],
            animation: true,
            interactive: false,
            exportable: true
          },
          dataSource: {
            type: 'realtime',
            metric: 'analytics.users.active',
            timeRange: { start: 'now-5m', end: 'now' },
            aggregation: 'count'
          },
          visualization: {
            formatting: {
              unit: '',
              precision: 0,
              abbreviate: true
            }
          }
        },

        // Page Load Performance
        {
          id: 'page_load_performance',
          type: 'histogram',
          title: 'Page Load Performance',
          position: { x: 3, y: 0 },
          size: { width: 6, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#14b8a6'],
            animation: true,
            interactive: true,
            exportable: true
          },
          dataSource: {
            type: 'historical',
            metric: 'analytics.performance.pageLoadTime',
            timeRange: { start: 'now-1h', end: 'now' }
          },
          visualization: {
            xAxis: {
              label: 'Load Time (ms)',
              scale: 'linear',
              gridLines: true
            },
            yAxis: {
              label: 'Count',
              scale: 'linear',
              gridLines: true
            }
          }
        },

        // Device Types
        {
          id: 'device_types',
          type: 'pie_chart',
          title: 'Device Types',
          position: { x: 9, y: 0 },
          size: { width: 3, height: 3 },
          config: {
            theme: 'auto',
            colors: ['#f59e0b', '#3b82f6', '#10b981'],
            animation: true,
            interactive: true,
            exportable: true,
            showLegend: true
          },
          dataSource: {
            type: 'aggregated',
            metric: 'analytics.device.type',
            timeRange: { start: 'now-24h', end: 'now' },
            aggregation: 'count',
            groupBy: ['device_type']
          },
          visualization: {
            legend: {
              show: true,
              position: 'bottom',
              align: 'center'
            }
          }
        },

        // User Journey Timeline
        {
          id: 'user_journey',
          type: 'timeline',
          title: 'User Journey Flow',
          position: { x: 0, y: 3 },
          size: { width: 12, height: 4 },
          config: {
            theme: 'auto',
            colors: ['#8b5cf6', '#06b6d4', '#f59e0b'],
            animation: true,
            interactive: true,
            exportable: true
          },
          dataSource: {
            type: 'aggregated',
            metric: 'analytics.journey.flow',
            timeRange: { start: 'now-24h', end: 'now' },
            groupBy: ['page', 'action']
          },
          visualization: {
            tooltip: {
              show: true,
              format: 'Page: {page}\nAction: {action}\nUsers: {count}',
              includeTime: false
            }
          }
        }
      ],
      filters: [
        {
          id: 'time_range',
          name: 'Time Range',
          type: 'select',
          options: [
            { value: 'now-1h', label: 'Last hour' },
            { value: 'now-6h', label: 'Last 6 hours' },
            { value: 'now-24h', label: 'Last 24 hours' },
            { value: 'now-7d', label: 'Last 7 days' }
          ],
          default: 'now-24h',
          affects: ['page_load_performance', 'device_types', 'user_journey']
        },
        {
          id: 'device_type',
          name: 'Device Type',
          type: 'multiselect',
          options: [
            { value: 'desktop', label: 'Desktop' },
            { value: 'mobile', label: 'Mobile' },
            { value: 'tablet', label: 'Tablet' }
          ],
          default: ['desktop', 'mobile', 'tablet'],
          affects: ['page_load_performance', 'user_journey']
        }
      ],
      refreshInterval: 60000,
      autoRefresh: true,
      permissions: [
        {
          role: 'admin',
          permissions: ['view', 'edit', 'delete', 'share', 'admin']
        },
        {
          role: 'analyst',
          permissions: ['view', 'edit', 'share']
        },
        {
          role: 'viewer',
          permissions: ['view']
        }
      ]
    };
  }

  static getAllDashboards(): DashboardConfig[] {
    return [
      this.getSystemOverviewDashboard(),
      this.getApplicationDashboard(),
      this.getUserAnalyticsDashboard()
    ];
  }
}

// ==================== DASHBOARD MANAGER ====================

export class DashboardManager {
  private dashboards: Map<string, DashboardConfig> = new Map();
  private customDashboards: Map<string, DashboardConfig> = new Map();

  constructor() {
    // Load default dashboards
    DashboardTemplates.getAllDashboards().forEach(dashboard => {
      this.dashboards.set(dashboard.id, dashboard);
    });
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(id: string): DashboardConfig | null {
    return this.dashboards.get(id) || this.customDashboards.get(id) || null;
  }

  /**
   * Get all available dashboards
   */
  getAllDashboards(): DashboardConfig[] {
    return [
      ...Array.from(this.dashboards.values()),
      ...Array.from(this.customDashboards.values())
    ];
  }

  /**
   * Create custom dashboard
   */
  createDashboard(config: DashboardConfig): void {
    this.customDashboards.set(config.id, config);
  }

  /**
   * Update dashboard
   */
  updateDashboard(id: string, updates: Partial<DashboardConfig>): boolean {
    const dashboard = this.getDashboard(id);
    if (!dashboard) return false;

    const updated = { ...dashboard, ...updates };

    if (this.dashboards.has(id)) {
      this.dashboards.set(id, updated);
    } else {
      this.customDashboards.set(id, updated);
    }

    return true;
  }

  /**
   * Delete dashboard
   */
  deleteDashboard(id: string): boolean {
    // Don't allow deletion of default dashboards
    if (this.dashboards.has(id)) return false;

    return this.customDashboards.delete(id);
  }

  /**
   * Clone dashboard
   */
  cloneDashboard(sourceId: string, newId: string, newName: string): DashboardConfig | null {
    const source = this.getDashboard(sourceId);
    if (!source) return null;

    const cloned: DashboardConfig = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: newName
    };

    this.customDashboards.set(newId, cloned);
    return cloned;
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(id: string): string | null {
    const dashboard = this.getDashboard(id);
    if (!dashboard) return null;

    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(configJson: string): boolean {
    try {
      const config: DashboardConfig = JSON.parse(configJson);

      // Validate required fields
      if (!config.id || !config.name || !config.widgets) {
        throw new Error('Invalid dashboard configuration');
      }

      this.customDashboards.set(config.id, config);
      return true;
    } catch (error) {
      // Error logging disabled for production
      return false;
    }
  }

  /**
   * Get dashboards by permission
   */
  getDashboardsByRole(role: string): DashboardConfig[] {
    return this.getAllDashboards().filter(dashboard =>
      dashboard.permissions.some(perm =>
        perm.role === role && perm.permissions.includes('view')
      )
    );
  }

  /**
   * Check if user can perform action on dashboard
   */
  hasPermission(dashboardId: string, role: string, action: string): boolean {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) return false;

    const permission = dashboard.permissions.find(p => p.role === role);
    return permission ? permission.permissions.includes(action as any) : false;
  }
}

export default DashboardManager;