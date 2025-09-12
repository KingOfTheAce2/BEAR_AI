/**
 * Memory Monitor Usage Example
 * Demonstrates integration of memory monitoring system with BEAR AI
 */

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui';
import { MemoryUsageIndicator } from '@components/ui';
import { useMemoryMonitor, useSimpleMemoryMonitor, useMemoryAlerts } from '@hooks/useMemoryMonitor';
import { getSystemInfo } from '@utils/systemResources';
import { Button } from '@components/ui';
import { cn } from '@utils/cn';
import { 
  Activity, 
  Settings, 
  AlertCircle, 
  Info, 
  Cpu, 
  HardDrive, 
  Monitor,
  Smartphone,
  Laptop
} from 'lucide-react';

/**
 * Main Memory Monitor Example Component
 * Shows different variants and usage patterns
 */
export function MemoryMonitorExample(): JSX.Element {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<'compact' | 'detailed' | 'minimal' | 'chart'>('detailed');

  // Full-featured memory monitoring
  const {
    memoryInfo,
    status,
    trend,
    history,
    isMonitoring,
    isSupported,
    start,
    stop,
    reset,
    getConfig,
    updateConfig,
    error
  } = useMemoryMonitor({
    config: {
      updateInterval: 1000,
      thresholds: {
        warning: 70,
        critical: 85,
        maxSafe: 80,
      },
    },
    onStatusChange: (newStatus) => {
      console.log('Memory status changed:', newStatus);
    },
    onCriticalMemory: (info) => {
      console.warn('Critical memory usage detected:', info);
      // Could trigger cleanup, show warning, etc.
    },
    enableTrends: true,
  });

  // Simple monitoring for basic usage
  const simpleMonitor = useSimpleMemoryMonitor();

  // Memory alerts system
  const { alerts, clearAlerts } = useMemoryAlerts({
    warning: 70,
    critical: 85,
  });

  // System information
  const systemInfo = getSystemInfo();

  const handleConfigUpdate = useCallback(() => {
    updateConfig({
      updateInterval: isMonitoring ? 2000 : 500,
      thresholds: {
        warning: 75,
        critical: 90,
        maxSafe: 85,
      },
    });
  }, [updateConfig, isMonitoring]);

  const handleVariantChange = (variant: typeof selectedVariant) => {
    setSelectedVariant(variant);
  };

  if (!isSupported) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Memory Monitoring Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your browser doesn't support the Memory API. Memory monitoring features will be limited.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">BEAR AI Memory Monitor</h1>
        <p className="text-muted-foreground">
          Real-time memory usage monitoring and system resource management
        </p>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {systemInfo.browser.mobile ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
              <div>
                <div className="font-medium">{systemInfo.os}</div>
                <div className="text-sm text-muted-foreground">
                  {systemInfo.browser.name} {systemInfo.browser.version}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <div>
                <div className="font-medium">{systemInfo.hardware.cores} Cores</div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(systemInfo.hardware.estimatedRam / (1024 * 1024 * 1024))} GB RAM
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <div>
                <div className="font-medium">
                  {systemInfo.hardware.screen.width}x{systemInfo.hardware.screen.height}
                </div>
                <div className="text-sm text-muted-foreground">
                  {systemInfo.hardware.pixelRatio}x DPR
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage Indicators - Different Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-3">Minimal Variant</h3>
          <MemoryUsageIndicator
            memoryInfo={memoryInfo}
            status={status}
            variant="minimal"
          />
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Compact Variant</h3>
          <MemoryUsageIndicator
            memoryInfo={memoryInfo}
            status={status}
            trend={trend}
            variant="compact"
            showTrend={true}
          />
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Chart Variant</h3>
          <MemoryUsageIndicator
            memoryInfo={memoryInfo}
            status={status}
            trend={trend}
            variant="chart"
            showTrend={true}
            animated={true}
          />
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Simple Monitor</h3>
          <div className="space-y-2">
            <div className="text-2xl font-bold tabular-nums">
              {simpleMonitor.memoryUsage.toFixed(1)}%
            </div>
            <div className={cn(
              'text-sm font-medium',
              simpleMonitor.status === 'critical' ? 'text-red-600' :
              simpleMonitor.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
            )}>
              {simpleMonitor.status.toUpperCase()}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Memory Monitor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Memory Usage Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleConfigUpdate}
                leftIcon={<Settings className="h-4 w-4" />}
              >
                Update Config
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Variant Selector */}
            <div className="flex gap-2 flex-wrap">
              {(['minimal', 'compact', 'detailed', 'chart'] as const).map((variant) => (
                <Button
                  key={variant}
                  size="sm"
                  variant={selectedVariant === variant ? 'default' : 'outline'}
                  onClick={() => handleVariantChange(variant)}
                >
                  {variant}
                </Button>
              ))}
            </div>

            {/* Selected Memory Indicator */}
            <MemoryUsageIndicator
              memoryInfo={memoryInfo}
              status={status}
              trend={trend}
              variant={selectedVariant}
              showTrend={true}
              showDetails={showDetails}
              animated={true}
              onDetailsClick={() => setShowDetails(!showDetails)}
            />

            {/* Control Panel */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                size="sm"
                onClick={isMonitoring ? stop : start}
                variant={isMonitoring ? 'destructive' : 'default'}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </Button>
              <Button size="sm" variant="outline" onClick={reset}>
                Reset Data
              </Button>
              <Button size="sm" variant="outline" onClick={clearAlerts}>
                Clear Alerts ({alerts.length})
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700 font-medium">Error</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{error.message}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Memory History Chart (if available) */}
      {showDetails && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Last {history.length} readings (showing {Math.min(20, history.length)} most recent)
              </div>
              
              {/* Simple text-based chart */}
              <div className="font-mono text-xs space-y-1 bg-muted p-3 rounded overflow-x-auto">
                {history.slice(-20).map((info, index) => (
                  <div key={info.timestamp} className="flex items-center gap-2">
                    <span className="w-16 text-right">
                      {new Date(info.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="w-12 text-right">
                      {info.usagePercentage.toFixed(1)}%
                    </span>
                    <div className="flex-1 bg-gray-200 h-2 rounded overflow-hidden min-w-[200px]">
                      <div
                        className={cn(
                          'h-full transition-all',
                          info.usagePercentage >= 85 ? 'bg-red-500' :
                          info.usagePercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(100, info.usagePercentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Average</div>
                  <div className="font-semibold">
                    {(history.reduce((sum, info) => sum + info.usagePercentage, 0) / history.length).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Peak</div>
                  <div className="font-semibold">
                    {Math.max(...history.map(info => info.usagePercentage)).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Trend</div>
                  <div className="font-semibold capitalize">
                    {trend?.direction || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Data Points</div>
                  <div className="font-semibold">
                    {history.length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Memory Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(-5).map((alert, index) => (
                <div key={index} className={cn(
                  'p-2 rounded border-l-4 text-sm',
                  alert.type === 'critical' 
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                )}>
                  <span className="font-medium capitalize">{alert.type}</span> memory usage detected at{' '}
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MemoryMonitorExample;