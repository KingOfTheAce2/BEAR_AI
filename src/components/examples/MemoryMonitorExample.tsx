import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { MemoryUsageIndicator } from '../ui/MemoryUsageIndicator';
import { useMemoryMonitor } from '../../hooks/useMemoryMonitor';

/**
 * Minimal memory monitor showcase used in documentation examples.
 * Focuses on the core hook behaviour that is available in the codebase today.
 */
const MemoryMonitorExample: React.FC = () => {
  const { memoryInfo, status, isMonitoring, start, stop } = useMemoryMonitor({
    autoStart: true,
    enableTrends: false,
  });

  const usage = memoryInfo?.usagePercentage ?? 0;

  return (
    <Card className="max-w-xl space-y-4">
      <CardHeader>
        <CardTitle>Memory monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MemoryUsageIndicator
          memoryInfo={memoryInfo}
          status={status}
          variant="compact"
          showDetails={false}
        />

        <div className="text-sm text-muted-foreground">
          <p>Usage: {usage.toFixed(1)}%</p>
          <p>Status: {status}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={isMonitoring ? stop : start}>
            {isMonitoring ? 'Stop monitoring' : 'Start monitoring'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryMonitorExample;
