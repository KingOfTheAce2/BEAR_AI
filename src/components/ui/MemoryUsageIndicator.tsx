import React from 'react';
import { cn } from '@utils/cn';
import { ComponentProps } from '@/types';
import { Activity, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MemoryInfo, MemoryStatus, MemoryTrend, formatMemorySize, formatMemoryPercentage, getMemoryUsageSeverity } from '@utils/memoryMonitor';

export interface MemoryUsageIndicatorProps extends ComponentProps {
  /** Current memory information */
  memoryInfo?: MemoryInfo | null;
  /** Memory status */
  status?: MemoryStatus;
  /** Memory trend analysis */
  trend?: MemoryTrend;
  /** Display variant */
  variant?: 'compact' | 'detailed' | 'minimal' | 'chart';
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Show trend indicator */
  showTrend?: boolean;
  /** Show detailed metrics */
  showDetails?: boolean;
  /** Animated progress bars */
  animated?: boolean;
  /** Custom threshold values */
  customThresholds?: {
    warning: number;
    critical: number;
  };
  /** Click handler for detailed view */
  onDetailsClick?: () => void;
  /** Custom color scheme */
  colorScheme?: 'default' | 'colorful' | 'monochrome';
}

/**
 * Memory Usage Indicator Component
 * Visual display of real-time memory usage with multiple display variants
 */
const MemoryUsageIndicator = React.forwardRef<HTMLDivElement, MemoryUsageIndicatorProps>(
  ({
    className,
    memoryInfo,
    status = 'normal',
    trend,
    variant = 'detailed',
    size = 'md',
    showTrend = true,
    showDetails = true,
    animated = true,
    customThresholds,
    onDetailsClick,
    colorScheme = 'default',
    ...props
  }, ref) => {
    const usagePercentage = memoryInfo?.usagePercentage || 0;
    const severity = getMemoryUsageSeverity(usagePercentage, customThresholds);

    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };

    const statusConfig = {
      normal: {
        color: colorScheme === 'monochrome' ? 'gray' : 'green',
        icon: CheckCircle,
        label: 'Normal',
        bgColor: 'bg-green-500',
        textColor: 'text-green-600',
        borderColor: 'border-green-200',
      },
      warning: {
        color: colorScheme === 'monochrome' ? 'gray' : 'yellow',
        icon: AlertTriangle,
        label: 'Warning',
        bgColor: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        borderColor: 'border-yellow-200',
      },
      critical: {
        color: colorScheme === 'monochrome' ? 'gray' : 'red',
        icon: XCircle,
        label: 'Critical',
        bgColor: 'bg-red-500',
        textColor: 'text-red-600',
        borderColor: 'border-red-200',
      },
    };

    const currentStatus = statusConfig[status];
    const StatusIcon = currentStatus.icon;

    const getTrendIcon = () => {
      if (!trend || trend.direction === 'stable') return Minus;
      return trend.direction === 'increasing' ? TrendingUp : TrendingDown;
    };

    const TrendIcon = getTrendIcon();

    const formatTrendRate = (rate: number): string => {
      const absRate = Math.abs(rate);
      if (absRate < 1024) return `${absRate.toFixed(0)} B/s`;
      if (absRate < 1024 * 1024) return `${(absRate / 1024).toFixed(1)} KB/s`;
      return `${(absRate / (1024 * 1024)).toFixed(1)} MB/s`;
    };

    if (variant === 'minimal') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center gap-1',
            sizes[size],
            className
          )}
          {...props}
        >
          <StatusIcon 
            className={cn(
              'h-4 w-4',
              currentStatus.textColor
            )} 
          />
          <span className={cn('font-medium', currentStatus.textColor)}>
            {formatMemoryPercentage(usagePercentage)}
          </span>
        </div>
      );
    }

    if (variant === 'compact') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center gap-2 px-2 py-1 rounded-md border',
            currentStatus.borderColor,
            'bg-background hover:bg-muted/50 transition-colors',
            onDetailsClick && 'cursor-pointer',
            sizes[size],
            className
          )}
          onClick={onDetailsClick}
          {...props}
        >
          <StatusIcon className={cn('h-4 w-4', currentStatus.textColor)} />
          
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('w-16 h-2 bg-muted rounded-full overflow-hidden', size === 'sm' && 'w-12 h-1.5')}>
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  currentStatus.bgColor,
                  animated && 'animate-pulse'
                )}
                style={{ width: `${Math.min(100, usagePercentage)}%` }}
              />
            </div>
            
            <span className={cn('font-medium tabular-nums', currentStatus.textColor)}>
              {formatMemoryPercentage(usagePercentage)}
            </span>

            {showTrend && trend && trend.direction !== 'stable' && (
              <TrendIcon 
                className={cn(
                  'h-3 w-3',
                  trend.direction === 'increasing' ? 'text-red-500' : 'text-green-500'
                )} 
              />
            )}
          </div>
        </div>
      );
    }

    if (variant === 'chart') {
      return (
        <div
          ref={ref}
          className={cn(
            'p-3 border rounded-lg bg-background',
            currentStatus.borderColor,
            onDetailsClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
            className
          )}
          onClick={onDetailsClick}
          {...props}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className={cn('font-medium', sizes[size])}>Memory Usage</span>
            </div>
            <div className="flex items-center gap-1">
              <StatusIcon className={cn('h-4 w-4', currentStatus.textColor)} />
              <span className={cn('text-xs font-medium', currentStatus.textColor)}>
                {currentStatus.label}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="w-full h-4 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full transition-all duration-500 ease-out',
                  currentStatus.bgColor,
                  animated && usagePercentage > 0 && 'animate-pulse'
                )}
                style={{ 
                  width: `${Math.min(100, usagePercentage)}%`,
                  transition: animated ? 'width 0.5s ease-out' : 'none'
                }}
              />
            </div>

            {/* Threshold markers */}
            <div className="absolute top-0 left-[75%] w-px h-4 bg-yellow-400 opacity-60" />
            <div className="absolute top-0 left-[90%] w-px h-4 bg-red-400 opacity-60" />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="tabular-nums font-medium">
              {formatMemoryPercentage(usagePercentage)}
            </span>
            <span>100%</span>
          </div>

          {showTrend && trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <TrendIcon 
                className={cn(
                  'h-3 w-3',
                  trend.direction === 'increasing' 
                    ? 'text-red-500' 
                    : trend.direction === 'decreasing' 
                      ? 'text-green-500' 
                      : 'text-muted-foreground'
                )} 
              />
              <span className="text-muted-foreground">
                {trend.direction === 'stable' 
                  ? 'Stable' 
                  : `${trend.direction} ${formatTrendRate(trend.rate)}`
                }
              </span>
            </div>
          )}
        </div>
      );
    }

    // Detailed variant (default)
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 border rounded-lg bg-background space-y-3',
          currentStatus.borderColor,
          onDetailsClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={onDetailsClick}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className={cn('font-semibold', sizes[size])}>Memory Usage</h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', currentStatus.textColor)} />
            <span className={cn('text-sm font-medium', currentStatus.textColor)}>
              {currentStatus.label}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="tabular-nums font-medium">
              {formatMemoryPercentage(usagePercentage)}
            </span>
          </div>
          
          <div className="relative">
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-500 ease-out',
                  currentStatus.bgColor,
                  animated && usagePercentage > 0 && 'animate-pulse'
                )}
                style={{ 
                  width: `${Math.min(100, usagePercentage)}%`,
                  transition: animated ? 'width 0.5s ease-out' : 'none'
                }}
              />
            </div>

            {/* Threshold markers */}
            {!customThresholds && (
              <>
                <div className="absolute top-0 left-[75%] w-px h-3 bg-yellow-400 opacity-60" title="Warning threshold (75%)" />
                <div className="absolute top-0 left-[90%] w-px h-3 bg-red-400 opacity-60" title="Critical threshold (90%)" />
              </>
            )}
          </div>
        </div>

        {/* Details */}
        {showDetails && memoryInfo && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
            <div>
              <span className="text-muted-foreground">Used</span>
              <div className="font-medium tabular-nums">
                {formatMemorySize(memoryInfo.usedMemory)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Available</span>
              <div className="font-medium tabular-nums">
                {formatMemorySize(memoryInfo.availableMemory)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Process</span>
              <div className="font-medium tabular-nums">
                {formatMemorySize(memoryInfo.processMemory)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Total</span>
              <div className="font-medium tabular-nums">
                {formatMemorySize(memoryInfo.totalMemory)}
              </div>
            </div>
          </div>
        )}

        {/* Trend */}
        {showTrend && trend && (
          <div className="flex items-center gap-2 pt-2 border-t text-sm">
            <TrendIcon 
              className={cn(
                'h-4 w-4',
                trend.direction === 'increasing' 
                  ? 'text-red-500' 
                  : trend.direction === 'decreasing' 
                    ? 'text-green-500' 
                    : 'text-muted-foreground'
              )} 
            />
            <span className="text-muted-foreground">Trend:</span>
            <span className="font-medium">
              {trend.direction === 'stable' 
                ? 'Stable usage' 
                : `${trend.direction} at ${formatTrendRate(trend.rate)}`
              }
            </span>
            {trend.confidence > 0 && (
              <span className="text-xs text-muted-foreground">
                ({Math.round(trend.confidence * 100)}% confidence)
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

MemoryUsageIndicator.displayName = 'MemoryUsageIndicator';

export { MemoryUsageIndicator };