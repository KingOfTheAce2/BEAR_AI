# Memory Monitoring System for BEAR AI

A comprehensive real-time memory monitoring solution designed for the BEAR AI Legal Assistant GUI, providing cross-platform system resource detection and visual memory usage indicators.

## Overview

The Memory Monitoring System consists of four main components:

1. **`memoryMonitor.ts`** - Core memory monitoring with real-time updates
2. **`systemResources.ts`** - Cross-platform system resource detection  
3. **`MemoryUsageIndicator.tsx`** - Visual React component for memory display
4. **`useMemoryMonitor.ts`** - React hook for easy integration

## Features

### ✅ Core Memory Monitoring
- Real-time memory usage tracking
- Configurable safety thresholds (warning/critical levels)
- Memory usage trends analysis (increasing/decreasing/stable)
- Cross-platform compatibility (Windows/Linux/Mac)
- Minimal performance impact with optimized polling

### ✅ System Resource Detection
- Automatic platform detection (OS, browser, device type)
- Hardware capability analysis (CPU cores, RAM estimation)
- Browser API availability detection
- Optimal configuration recommendations based on system capabilities

### ✅ Visual Components
- Multiple display variants (minimal, compact, detailed, chart)
- Animated progress bars with status indicators
- Color-coded status representation (normal/warning/critical)
- Trend indicators with rate calculations
- Responsive design with mobile optimization

### ✅ React Integration
- Custom hooks for easy state management
- TypeScript support with comprehensive type definitions
- Integration with existing BEAR AI component patterns
- Memory leak prevention and cleanup

## Quick Start

### Basic Usage

```tsx
import React from 'react';
import { MemoryUsageIndicator } from '@components/ui';
import { useMemoryMonitor } from '@hooks/useMemoryMonitor';

function MyComponent() {
  const { memoryInfo, status, trend, isSupported } = useMemoryMonitor();

  if (!isSupported) {
    return <div>Memory monitoring not available in this browser</div>;
  }

  return (
    <MemoryUsageIndicator
      memoryInfo={memoryInfo}
      status={status}
      trend={trend}
      variant="detailed"
      showTrend={true}
      animated={true}
    />
  );
}
```

### Simple Memory Usage

```tsx
import { useSimpleMemoryMonitor } from '@hooks/useMemoryMonitor';

function SimpleExample() {
  const { memoryUsage, status, isSupported } = useSimpleMemoryMonitor();

  return (
    <div>
      <span>Memory: {memoryUsage.toFixed(1)}%</span>
      <span className={status === 'critical' ? 'text-red-500' : 'text-green-500'}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}
```

### Memory Alerts

```tsx
import { useMemoryAlerts } from '@hooks/useMemoryMonitor';

function AlertsExample() {
  const { alerts, currentStatus, clearAlerts } = useMemoryAlerts({
    warning: 75,
    critical: 90
  });

  return (
    <div>
      {alerts.map((alert, index) => (
        <div key={index} className={alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'}>
          {alert.type.toUpperCase()}: {new Date(alert.timestamp).toLocaleTimeString()}
        </div>
      ))}
      <button onClick={clearAlerts}>Clear Alerts ({alerts.length})</button>
    </div>
  );
}
```

## API Reference

### MemoryMonitor Class

```typescript
class MemoryMonitor {
  constructor(config?: Partial<MemoryMonitorConfig>)
  
  // Control methods
  start(): void
  stop(): void
  
  // Data access
  getCurrentMemoryInfo(): MemoryInfo | null
  getHistory(): MemoryInfo[]
  getMemoryStatus(): MemoryStatus
  getMemoryTrend(): MemoryTrend
  
  // Subscription
  subscribe(callback: (info: MemoryInfo) => void): () => void
  
  // Static utilities
  static isSupported(): boolean
  static getPlatformInfo(): PlatformInfo
}
```

### useMemoryMonitor Hook

```typescript
function useMemoryMonitor(options?: UseMemoryMonitorOptions): UseMemoryMonitorReturn

interface UseMemoryMonitorOptions {
  config?: Partial<MemoryMonitorConfig>;
  autoStart?: boolean;
  useOptimalConfig?: boolean;
  onStatusChange?: (status: MemoryStatus) => void;
  onCriticalMemory?: (memoryInfo: MemoryInfo) => void;
  onMemoryWarning?: (memoryInfo: MemoryInfo) => void;
  enableTrends?: boolean;
  debounceDelay?: number;
}

interface UseMemoryMonitorReturn {
  memoryInfo: MemoryInfo | null;
  status: MemoryStatus;
  trend: MemoryTrend | null;
  history: MemoryInfo[];
  isMonitoring: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getConfig: () => MemoryMonitorConfig;
  updateConfig: (newConfig: Partial<MemoryMonitorConfig>) => void;
  refresh: () => void;
  error: Error | null;
}
```

### MemoryUsageIndicator Component

```typescript
interface MemoryUsageIndicatorProps {
  memoryInfo?: MemoryInfo | null;
  status?: MemoryStatus;
  trend?: MemoryTrend;
  variant?: 'compact' | 'detailed' | 'minimal' | 'chart';
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  showDetails?: boolean;
  animated?: boolean;
  customThresholds?: {
    warning: number;
    critical: number;
  };
  onDetailsClick?: () => void;
  colorScheme?: 'default' | 'colorful' | 'monochrome';
}
```

## Configuration

### Memory Thresholds

```typescript
const config: MemoryMonitorConfig = {
  updateInterval: 1000,        // Update every 1 second
  thresholds: {
    warning: 75,               // 75% usage triggers warning
    critical: 90,              // 90% usage triggers critical
    maxSafe: 80,               // Maximum recommended usage
  },
  enableDetailedMonitoring: true,
  enablePerformanceObserver: true,
  maxHistoryLength: 100,       // Keep last 100 readings
};
```

### System-Optimized Configuration

```typescript
import { getOptimalConfig } from '@utils/systemResources';

// Automatically configure based on system capabilities
const optimalConfig = getOptimalConfig();
// {
//   memoryMonitorInterval: 1000,    // Adjusted for device performance
//   maxConcurrentOperations: 6,     // Based on CPU cores
//   enableDetailedMetrics: true,    // Based on system resources
//   preferredStorageMethod: 'indexedDB',
//   networkTimeout: 5000
// }
```

## Browser Compatibility

### Supported APIs
- **Performance Memory API** (Chrome/Edge): Full memory info
- **Performance Observer** (Modern browsers): Enhanced monitoring
- **Navigator Hardware Concurrency**: CPU core detection
- **Network Information API**: Connection-aware optimizations

### Fallback Support
- Graceful degradation on unsupported browsers
- Estimated memory calculations when APIs unavailable
- Platform detection via user agent analysis
- Conservative resource limits for unknown systems

### Browser Support Matrix
- ✅ Chrome 60+ (Full support)
- ✅ Firefox 70+ (Limited memory API)
- ✅ Safari 14+ (Basic support)
- ✅ Edge 79+ (Full support)
- ⚠️ Older browsers (Fallback mode)

## Performance Optimization

### Automatic Optimizations
- **Mobile Detection**: Reduced polling frequency and features
- **Low-End Devices**: Conservative memory thresholds
- **High-End Systems**: Enhanced monitoring and concurrent operations
- **Network Awareness**: Adjusted timeouts based on connection

### Manual Optimizations
```typescript
// Reduce monitoring frequency for better performance
const config = {
  updateInterval: 2000,              // 2 seconds instead of 1
  enablePerformanceObserver: false,  // Disable for lower overhead
  maxHistoryLength: 50,              // Reduce memory usage
};

// Platform-specific optimizations
const optimizations = getPlatformOptimizations();
if (optimizations.reducedAnimations) {
  // Disable animations on mobile/low-end devices
}
```

## Integration with BEAR AI

### Existing Architecture
The memory monitoring system integrates seamlessly with BEAR AI's existing patterns:

- **Component Structure**: Follows existing UI component patterns
- **TypeScript Support**: Comprehensive type definitions
- **Theme Integration**: Uses BEAR AI's color system and styling
- **Responsive Design**: Matches existing breakpoint system
- **Hook Pattern**: Consistent with other BEAR AI custom hooks

### Usage in Legal Assistant Context
```tsx
// Monitor memory during document processing
function DocumentProcessor() {
  const { memoryInfo, status } = useMemoryMonitor({
    onCriticalMemory: () => {
      // Pause document processing
      pauseProcessing();
      showMemoryWarning();
    }
  });

  return (
    <div>
      {/* Document processing UI */}
      <MemoryUsageIndicator
        memoryInfo={memoryInfo}
        status={status}
        variant="compact"
        className="absolute top-4 right-4"
      />
    </div>
  );
}
```

## Testing

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import { MemoryUsageIndicator } from '@components/ui';

test('displays memory usage correctly', () => {
  const mockMemoryInfo = {
    usagePercentage: 75,
    usedMemory: 6 * 1024 * 1024 * 1024,
    totalMemory: 8 * 1024 * 1024 * 1024,
    // ... other properties
  };

  render(
    <MemoryUsageIndicator
      memoryInfo={mockMemoryInfo}
      status="warning"
      variant="detailed"
    />
  );

  expect(screen.getByText('75.0%')).toBeInTheDocument();
  expect(screen.getByText('Warning')).toBeInTheDocument();
});
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useMemoryMonitor } from '@hooks/useMemoryMonitor';

test('starts and stops monitoring', () => {
  const { result } = renderHook(() => useMemoryMonitor({ autoStart: false }));

  expect(result.current.isMonitoring).toBe(false);

  act(() => {
    result.current.start();
  });

  expect(result.current.isMonitoring).toBe(true);
});
```

## Troubleshooting

### Common Issues

#### Memory API Not Supported
```typescript
if (!MemoryMonitor.isSupported()) {
  console.warn('Memory API not supported, using fallback estimation');
  // Use alternative monitoring or disable feature
}
```

#### High Memory Usage Detection
```typescript
const { status, memoryInfo } = useMemoryMonitor({
  onCriticalMemory: (info) => {
    // Log for debugging
    console.error('Critical memory usage:', {
      usage: info.usagePercentage,
      used: formatMemorySize(info.usedMemory),
      available: formatMemorySize(info.availableMemory)
    });
    
    // Trigger cleanup
    cleanupResources();
  }
});
```

#### Performance Issues
```typescript
// Reduce monitoring frequency on low-end devices
const systemInfo = getSystemInfo();
const config = systemInfo.browser.mobile ? {
  updateInterval: 3000,  // 3 seconds on mobile
  enableDetailedMonitoring: false
} : {};

const monitor = useMemoryMonitor({ config });
```

## File Structure

```
src/
├── utils/
│   ├── memoryMonitor.ts           # Core memory monitoring logic
│   ├── systemResources.ts         # System resource detection
│   └── index.ts                   # Utility exports
├── components/
│   ├── ui/
│   │   ├── MemoryUsageIndicator.tsx  # Visual memory component
│   │   └── index.ts                  # Component exports
│   └── examples/
│       └── MemoryMonitorExample.tsx  # Usage examples
├── hooks/
│   ├── useMemoryMonitor.ts        # React hook for memory monitoring
│   └── index.ts                   # Hook exports
└── types/
    └── index.ts                   # TypeScript type definitions
```

## Contributing

When extending the memory monitoring system:

1. **Follow Existing Patterns**: Use the established component and hook patterns
2. **Type Safety**: Ensure all new features have proper TypeScript definitions
3. **Performance**: Consider impact on low-end devices and mobile browsers
4. **Testing**: Add comprehensive tests for new functionality
5. **Documentation**: Update this README with new features

## License

This memory monitoring system is part of the BEAR AI Legal Assistant GUI and is subject to the same proprietary license terms.

---

**Note**: This system is designed specifically for the BEAR AI Legal Assistant and integrates with its existing architecture and patterns. For standalone usage, some dependencies may need to be adapted.