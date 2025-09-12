import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Download,
  RefreshCw,
  Pause,
  Play,
  BarChart3,
  LineChart,
  PieChart,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number; // percentage
    cores: number;
    frequency: number; // MHz
    temperature?: number; // Celsius
  };
  memory: {
    used: number; // MB
    total: number; // MB
    cached: number; // MB
    swapUsed: number; // MB
    swapTotal: number; // MB
  };
  disk: {
    read: number; // MB/s
    write: number; // MB/s
    usage: number; // percentage
    available: number; // GB
    total: number; // GB
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    isOffline: boolean;
  };
  model: {
    tokensPerSecond: number;
    averageLatency: number; // ms
    memoryUsage: number; // MB
    contextWindowUsage: number; // percentage
    isLoaded: boolean;
    modelName?: string;
  };
  application: {
    uptime: number; // seconds
    threadsCount: number;
    fileHandles: number;
    cacheHitRate: number; // percentage
    errorCount: number;
    warningCount: number;
  };
}

interface HistoricalData {
  metrics: PerformanceMetrics[];
  timespan: '1h' | '6h' | '24h' | '7d';
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  isActive: boolean;
}

interface LocalPerformanceDashboardProps {
  updateInterval?: number; // ms
  onAlert?: (alert: PerformanceAlert) => void;
  onExport?: (data: HistoricalData) => void;
  className?: string;
}

export const LocalPerformanceDashboard: React.FC<LocalPerformanceDashboardProps> = ({
  updateInterval = 1000,
  onAlert,
  onExport,
  className = ""
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedTimespan, setSelectedTimespan] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Performance thresholds for alerts
  const thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    latency: { warning: 1000, critical: 3000 }, // ms
    temperature: { warning: 70, critical: 85 } // Celsius
  };

  // Mock performance data generation
  const generateMockMetrics = useCallback((): PerformanceMetrics => {
    const baseTime = Date.now();
    const variation = () => 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier

    return {
      timestamp: new Date(),
      cpu: {
        usage: Math.min(95, 25 + Math.random() * 40 * variation()),
        cores: 8,
        frequency: 3200 + Math.random() * 400,
        temperature: 45 + Math.random() * 15
      },
      memory: {
        used: Math.min(15000, 4000 + Math.random() * 2000 * variation()),
        total: 16384,
        cached: 1000 + Math.random() * 500,
        swapUsed: Math.random() * 1000,
        swapTotal: 2048
      },
      disk: {
        read: Math.random() * 50,
        write: Math.random() * 30,
        usage: 65 + Math.random() * 20,
        available: 450 - Math.random() * 50,
        total: 512
      },
      network: {
        bytesReceived: Math.random() * 1000,
        bytesSent: Math.random() * 500,
        packetsReceived: Math.random() * 100,
        packetsSent: Math.random() * 50,
        isOffline: true // Always offline for privacy
      },
      model: {
        tokensPerSecond: 12 + Math.random() * 8,
        averageLatency: 80 + Math.random() * 100,
        memoryUsage: 3500 + Math.random() * 1000,
        contextWindowUsage: 20 + Math.random() * 40,
        isLoaded: true,
        modelName: 'Llama 2 7B Chat (Q4_0)'
      },
      application: {
        uptime: Math.floor(baseTime / 1000),
        threadsCount: 12 + Math.floor(Math.random() * 8),
        fileHandles: 150 + Math.floor(Math.random() * 50),
        cacheHitRate: 85 + Math.random() * 10,
        errorCount: Math.floor(Math.random() * 3),
        warningCount: Math.floor(Math.random() * 5)
      }
    };
  }, []);

  // Monitor performance metrics
  useEffect(() => {
    if (!isMonitoring || !autoRefresh) return;

    const interval = setInterval(() => {
      const metrics = generateMockMetrics();
      setCurrentMetrics(metrics);
      
      // Add to historical data (keep last 1000 points)
      setHistoricalData(prev => {
        const newData = [...prev, metrics];
        return newData.slice(-1000);
      });

      // Check for alerts
      checkForAlerts(metrics);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isMonitoring, autoRefresh, updateInterval, generateMockMetrics]);

  // Initial metrics load
  useEffect(() => {
    const initialMetrics = generateMockMetrics();
    setCurrentMetrics(initialMetrics);
    setHistoricalData([initialMetrics]);
  }, [generateMockMetrics]);

  const checkForAlerts = (metrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // CPU alerts
    if (metrics.cpu.usage > thresholds.cpu.critical) {
      newAlerts.push({
        id: `cpu-critical-${Date.now()}`,
        type: 'critical',
        metric: 'CPU Usage',
        value: metrics.cpu.usage,
        threshold: thresholds.cpu.critical,
        message: `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date(),
        isActive: true
      });
    } else if (metrics.cpu.usage > thresholds.cpu.warning) {
      newAlerts.push({
        id: `cpu-warning-${Date.now()}`,
        type: 'warning',
        metric: 'CPU Usage',
        value: metrics.cpu.usage,
        threshold: thresholds.cpu.warning,
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date(),
        isActive: true
      });
    }

    // Memory alerts
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsage > thresholds.memory.critical) {
      newAlerts.push({
        id: `memory-critical-${Date.now()}`,
        type: 'critical',
        metric: 'Memory Usage',
        value: memoryUsage,
        threshold: thresholds.memory.critical,
        message: `Critical memory usage: ${memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
        isActive: true
      });
    } else if (memoryUsage > thresholds.memory.warning) {
      newAlerts.push({
        id: `memory-warning-${Date.now()}`,
        type: 'warning',
        metric: 'Memory Usage',
        value: memoryUsage,
        threshold: thresholds.memory.warning,
        message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
        isActive: true
      });
    }

    // Model latency alerts
    if (metrics.model.averageLatency > thresholds.latency.critical) {
      newAlerts.push({
        id: `latency-critical-${Date.now()}`,
        type: 'critical',
        metric: 'Model Latency',
        value: metrics.model.averageLatency,
        threshold: thresholds.latency.critical,
        message: `Critical model latency: ${metrics.model.averageLatency.toFixed(0)}ms`,
        timestamp: new Date(),
        isActive: true
      });
    }

    // Add new alerts and notify
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev.slice(0, 50)]); // Keep last 50 alerts
      newAlerts.forEach(alert => onAlert?.(alert));
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTrendIcon = (current: number, previous: number) => {
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return <Minus className="w-3 h-3 text-gray-500" />;
    return diff > 0 ? 
      <TrendingUp className="w-3 h-3 text-red-500" /> : 
      <TrendingDown className="w-3 h-3 text-green-500" />;
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const exportData = () => {
    const exportData: HistoricalData = {
      metrics: historicalData,
      timespan: selectedTimespan
    };
    onExport?.(exportData);

    // Create downloadable file
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bear-ai-performance-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeAlerts = alerts.filter(alert => alert.isActive);
  const criticalAlerts = activeAlerts.filter(alert => alert.type === 'critical');
  const warningAlerts = activeAlerts.filter(alert => alert.type === 'warning');

  if (!currentMetrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading performance metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const previousMetrics = historicalData[historicalData.length - 2];

  return (
    <Card className={`w-full ${expandedView ? 'min-h-screen' : ''} ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Local Performance Monitor
            {isMonitoring ? (
              <Badge variant="default" className="ml-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="secondary">Paused</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {activeAlerts.length > 0 && (
              <Badge variant={criticalAlerts.length > 0 ? "destructive" : "secondary"}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                {activeAlerts.length} alert{activeAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto</Label>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            >
              {showAdvancedMetrics ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedView(!expandedView)}
            >
              {expandedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2 mt-4">
            {criticalAlerts.slice(0, 2).map(alert => (
              <div key={alert.id} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">{alert.message}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {alert.timestamp.toLocaleTimeString()}
                </Badge>
              </div>
            ))}
            {warningAlerts.slice(0, 1).map(alert => (
              <div key={alert.id} className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">{alert.message}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {alert.timestamp.toLocaleTimeString()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={expandedView ? "detailed" : "overview"} onValueChange={() => {}}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" onClick={() => setExpandedView(false)}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="detailed" onClick={() => setExpandedView(true)}>
              Detailed
            </TabsTrigger>
            <TabsTrigger value="model">
              Model Performance
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts ({activeAlerts.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Usage */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">CPU</span>
                    </div>
                    {previousMetrics && getTrendIcon(currentMetrics.cpu.usage, previousMetrics.cpu.usage)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className={`text-2xl font-bold ${getStatusColor(currentMetrics.cpu.usage, thresholds.cpu)}`}>
                        {currentMetrics.cpu.usage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">{currentMetrics.cpu.cores} cores</span>
                    </div>
                    <Progress 
                      value={currentMetrics.cpu.usage} 
                      className="h-2"
                      style={{ '--progress-background': currentMetrics.cpu.usage > thresholds.cpu.critical ? 'rgb(239 68 68)' : currentMetrics.cpu.usage > thresholds.cpu.warning ? 'rgb(245 158 11)' : 'rgb(34 197 94)' } as React.CSSProperties}
                    />
                    {showAdvancedMetrics && (
                      <div className="text-xs text-muted-foreground">
                        {currentMetrics.cpu.frequency.toFixed(0)} MHz
                        {currentMetrics.cpu.temperature && ` • ${currentMetrics.cpu.temperature.toFixed(1)}°C`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Memory Usage */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MemoryStick className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Memory</span>
                    </div>
                    {previousMetrics && getTrendIcon(
                      (currentMetrics.memory.used / currentMetrics.memory.total) * 100,
                      (previousMetrics.memory.used / previousMetrics.memory.total) * 100
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className={`text-2xl font-bold ${getStatusColor((currentMetrics.memory.used / currentMetrics.memory.total) * 100, thresholds.memory)}`}>
                        {((currentMetrics.memory.used / currentMetrics.memory.total) * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(currentMetrics.memory.used * 1024 * 1024)}
                      </span>
                    </div>
                    <Progress 
                      value={(currentMetrics.memory.used / currentMetrics.memory.total) * 100} 
                      className="h-2"
                    />
                    {showAdvancedMetrics && (
                      <div className="text-xs text-muted-foreground">
                        Cached: {formatBytes(currentMetrics.memory.cached * 1024 * 1024)}
                        {currentMetrics.memory.swapUsed > 0 && ` • Swap: ${formatBytes(currentMetrics.memory.swapUsed * 1024 * 1024)}`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Disk Usage */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Storage</span>
                    </div>
                    {previousMetrics && getTrendIcon(currentMetrics.disk.usage, previousMetrics.disk.usage)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className={`text-2xl font-bold ${getStatusColor(currentMetrics.disk.usage, thresholds.disk)}`}>
                        {currentMetrics.disk.usage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currentMetrics.disk.available.toFixed(0)} GB free
                      </span>
                    </div>
                    <Progress 
                      value={currentMetrics.disk.usage} 
                      className="h-2"
                    />
                    {showAdvancedMetrics && (
                      <div className="text-xs text-muted-foreground">
                        R: {currentMetrics.disk.read.toFixed(1)} MB/s • W: {currentMetrics.disk.write.toFixed(1)} MB/s
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Model Performance */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Model</span>
                    </div>
                    {previousMetrics && getTrendIcon(currentMetrics.model.tokensPerSecond, previousMetrics.model.tokensPerSecond)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-bold text-orange-600">
                        {currentMetrics.model.tokensPerSecond.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">tok/s</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Latency: {currentMetrics.model.averageLatency.toFixed(0)}ms
                    </div>
                    {showAdvancedMetrics && (
                      <div className="text-xs text-muted-foreground">
                        Memory: {formatBytes(currentMetrics.model.memoryUsage * 1024 * 1024)}
                        • Context: {currentMetrics.model.contextWindowUsage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="font-medium">{formatUptime(currentMetrics.application.uptime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Threads:</span>
                      <span className="font-medium">{currentMetrics.application.threadsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">File Handles:</span>
                      <span className="font-medium">{currentMetrics.application.fileHandles}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cache Hit Rate:</span>
                      <span className="font-medium">{currentMetrics.application.cacheHitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{currentMetrics.model.modelName || 'None'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Network:</span>
                      <Badge variant="outline" className="text-xs">
                        {currentMetrics.network.isOffline ? 'Offline (Secure)' : 'Online'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Errors:</span>
                      <span className={`font-medium ${currentMetrics.application.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {currentMetrics.application.errorCount}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Warnings:</span>
                      <span className={`font-medium ${currentMetrics.application.warningCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {currentMetrics.application.warningCount}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={activeAlerts.length === 0 ? "default" : criticalAlerts.length > 0 ? "destructive" : "secondary"}>
                        {activeAlerts.length === 0 ? 'Healthy' : criticalAlerts.length > 0 ? 'Critical' : 'Warning'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Tab */}
          <TabsContent value="detailed" className="space-y-6">
            <div className="text-center py-8">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Detailed Performance Charts</h3>
              <p className="text-muted-foreground mb-4">
                Historical performance data visualization would be implemented here using a charting library like Chart.js or D3.
              </p>
              <Button variant="outline">
                <LineChart className="w-4 h-4 mr-2" />
                View Historical Data
              </Button>
            </div>
          </TabsContent>

          {/* Model Performance Tab */}
          <TabsContent value="model" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Inference Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tokens/Second:</span>
                        <span className="font-medium">{currentMetrics.model.tokensPerSecond.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Average Latency:</span>
                        <span className="font-medium">{currentMetrics.model.averageLatency.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Memory Usage:</span>
                        <span className="font-medium">{formatBytes(currentMetrics.model.memoryUsage * 1024 * 1024)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Context Usage:</span>
                        <span className="font-medium">{currentMetrics.model.contextWindowUsage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Model Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Model:</span>
                        <span className="font-medium">{currentMetrics.model.modelName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={currentMetrics.model.isLoaded ? "default" : "secondary"}>
                          {currentMetrics.model.isLoaded ? 'Loaded' : 'Not Loaded'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Performance:</span>
                        <Badge variant={currentMetrics.model.averageLatency < 200 ? "default" : "secondary"}>
                          {currentMetrics.model.averageLatency < 200 ? 'Optimal' : 'Slow'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
                <p className="text-muted-foreground">
                  All systems are operating within normal parameters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 20).map((alert) => (
                  <Card key={alert.id} className={`border-l-4 ${
                    alert.type === 'critical' ? 'border-l-red-500' : 
                    alert.type === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                            alert.type === 'critical' ? 'text-red-500' : 
                            alert.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div>
                            <h4 className="font-medium">{alert.message}</h4>
                            <div className="text-sm text-muted-foreground mt-1">
                              {alert.metric}: {alert.value.toFixed(1)} (threshold: {alert.threshold})
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {alert.timestamp.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant={alert.type === 'critical' ? 'destructive' : alert.type === 'warning' ? 'secondary' : 'outline'}>
                          {alert.type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LocalPerformanceDashboard;