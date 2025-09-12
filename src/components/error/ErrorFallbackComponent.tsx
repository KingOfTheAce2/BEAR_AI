/**
 * Enhanced Error Fallback Component for BEAR AI
 * User-friendly error display with recovery options
 * 
 * @file Comprehensive error fallback UI component
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, ChevronDown, ChevronUp, ExternalLink, Mail, Shield, Zap, Clock, TrendingUp } from 'lucide-react';
import { ProcessedError } from '../../services/errorHandler';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

// ==================== INTERFACES ====================

interface ErrorFallbackComponentProps {
  error: ProcessedError;
  resetError: () => void;
  retry: () => void;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  isRecovering: boolean;
  showRecoveryOptions: () => void;
  suggestions: string[];
}

interface ErrorActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// ==================== COMPONENTS ====================

const ErrorActionButton: React.FC<ErrorActionButtonProps> = ({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled = false,
  loading = false,
  className
}) => (
  <Button
    onClick={onClick}
    variant={variant}
    disabled={disabled || loading}
    className={cn('flex-1 sm:flex-none', className)}
  >
    {loading ? (
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
    ) : (
      icon
    )}
    {label}
  </Button>
);

const ErrorMetrics: React.FC<{ error: ProcessedError }> = ({ error }) => {
  const metrics = [
    {
      label: 'Severity',
      value: error.severity,
      icon: <Shield className="h-4 w-4" />,
      color: error.severity === 'critical' ? 'text-red-600' : 
             error.severity === 'high' ? 'text-orange-600' : 
             error.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
    },
    {
      label: 'Category',
      value: error.category,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-gray-600'
    },
    {
      label: 'Time',
      value: error.context.timestamp.toLocaleTimeString(),
      icon: <Clock className="h-4 w-4" />,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className={metric.color}>{metric.icon}</div>
          <div>
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="font-medium text-sm capitalize">{metric.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ErrorSuggestions: React.FC<{ suggestions: string[] }> = ({ suggestions }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Zap className="h-4 w-4 text-blue-500" />
        Suggested Actions
      </h4>
      <ul className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>{suggestion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ErrorDetails: React.FC<{ 
  error: ProcessedError; 
  expanded: boolean; 
  onToggle: () => void;
}> = ({ error, expanded, onToggle }) => {
  const handleCopyError = () => {
    const errorText = `
Error ID: ${error.id}
Message: ${error.message}
Category: ${error.category}
Severity: ${error.severity}
Timestamp: ${error.context.timestamp.toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
User Agent: ${error.context.userAgent || 'N/A'}
Component: ${error.context.component || 'N/A'}
Stack: ${error.stack || 'N/A'}
    `.trim();
    
    navigator.clipboard.writeText(errorText);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-muted-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {expanded ? 'Hide' : 'Show'} Technical Details
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyError}
          className="text-muted-foreground"
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">Error Information:</h4>
            <div className="text-xs space-y-1 p-3 bg-muted rounded">
              <div><strong>ID:</strong> {error.id}</div>
              <div><strong>Category:</strong> {error.category}</div>
              <div><strong>Severity:</strong> {error.severity}</div>
              <div><strong>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}</div>
              <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
              <div><strong>Actionable:</strong> {error.actionable ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {error.stack && (
            <div>
              <h4 className="font-medium text-sm mb-2">Stack Trace:</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                {error.stack}
              </pre>
            </div>
          )}

          <div>
            <h4 className="font-medium text-sm mb-2">Context:</h4>
            <div className="text-xs space-y-1 p-3 bg-muted rounded">
              <div><strong>Component:</strong> {error.context.component || 'N/A'}</div>
              <div><strong>Action:</strong> {error.context.action || 'N/A'}</div>
              <div><strong>Route:</strong> {error.context.route || 'N/A'}</div>
              <div><strong>User ID:</strong> {error.context.userId || 'N/A'}</div>
              <div><strong>Session ID:</strong> {error.context.sessionId || 'N/A'}</div>
              <div><strong>Timestamp:</strong> {error.context.timestamp.toISOString()}</div>
            </div>
          </div>

          {error.reportingData.performanceData && (
            <div>
              <h4 className="font-medium text-sm mb-2">Performance Data:</h4>
              <div className="text-xs space-y-1 p-3 bg-muted rounded">
                <div><strong>Memory Used:</strong> {Math.round((error.reportingData.performanceData.memoryUsage || 0) / 1024 / 1024)}MB</div>
                <div><strong>Load Time:</strong> {error.reportingData.performanceData.loadTime || 0}ms</div>
                <div><strong>Network Latency:</strong> {error.reportingData.performanceData.networkLatency || 0}ms</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export const ErrorFallbackComponent: React.FC<ErrorFallbackComponentProps> = ({
  error,
  resetError,
  retry,
  canRetry,
  retryCount,
  maxRetries,
  isRecovering,
  showRecoveryOptions,
  suggestions
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getSeverityConfig = () => {
    switch (error.severity) {
      case 'critical':
        return {
          color: 'bg-red-100 text-red-600 border-red-200',
          badgeVariant: 'destructive' as const,
          icon: AlertTriangle
        };
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-600 border-orange-200',
          badgeVariant: 'destructive' as const,
          icon: AlertTriangle
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-600 border-yellow-200',
          badgeVariant: 'secondary' as const,
          icon: AlertTriangle
        };
      default:
        return {
          color: 'bg-blue-100 text-blue-600 border-blue-200',
          badgeVariant: 'secondary' as const,
          icon: AlertTriangle
        };
    }
  };

  const severityConfig = getSeverityConfig();
  const IconComponent = severityConfig.icon;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg border', severityConfig.color)}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                Something went wrong
                <Badge variant={severityConfig.badgeVariant} className="text-xs">
                  {error.category.replace('-', ' ')}
                </Badge>
                {error.severity !== 'low' && (
                  <Badge variant="outline" className="text-xs">
                    {error.severity} severity
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {error.userFriendlyMessage}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Metrics */}
          <ErrorMetrics error={error} />

          {/* Error Message */}
          <div className="p-3 bg-muted rounded-lg border-l-4 border-l-destructive">
            <p className="font-medium text-sm text-destructive">
              {error.message}
            </p>
            {error.context.component && (
              <p className="text-xs text-muted-foreground mt-1">
                Component: {error.context.component}
              </p>
            )}
          </div>

          {/* Suggestions */}
          <ErrorSuggestions suggestions={suggestions} />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {canRetry && (
              <ErrorActionButton
                onClick={retry}
                icon={<RefreshCw className="h-4 w-4 mr-2" />}
                label={isRecovering ? 'Recovering...' : 'Try Again'}
                loading={isRecovering}
                disabled={isRecovering}
              />
            )}

            <ErrorActionButton
              onClick={resetError}
              icon={<Home className="h-4 w-4 mr-2" />}
              label="Reset"
              variant="outline"
            />

            <ErrorActionButton
              onClick={showRecoveryOptions}
              icon={<Bug className="h-4 w-4 mr-2" />}
              label="Recovery Options"
              variant="outline"
            />

            {typeof window !== 'undefined' && (
              <ErrorActionButton
                onClick={() => window.location.reload()}
                icon={<RefreshCw className="h-4 w-4 mr-2" />}
                label="Refresh Page"
                variant="ghost"
              />
            )}
          </div>

          {/* Technical Details */}
          <ErrorDetails
            error={error}
            expanded={showDetails}
            onToggle={() => setShowDetails(!showDetails)}
          />

          {/* Help and Support */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Error ID: {error.id}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/help" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Help
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="mailto:support@bearai.com" target="_blank" rel="noopener noreferrer">
                  <Mail className="h-4 w-4 mr-1" />
                  Contact Support
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorFallbackComponent;