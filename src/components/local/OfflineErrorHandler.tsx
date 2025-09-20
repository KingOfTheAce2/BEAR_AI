import React, { useState, useEffect, useCallback } from 'react';

import {
  AlertTriangle,
  WifiOff,
  RefreshCw,
  HardDrive,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Info,
  FileX,
  Database,
  Cpu,
  MemoryStick,
  Zap,
  Settings,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface ErrorContext {
  component: string;
  operation: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  modelId?: string;
  filePath?: string;
  systemInfo?: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

interface OfflineError {
  id: string;
  type: 'network' | 'storage' | 'memory' | 'model' | 'file' | 'permission' | 'system' | 'data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: string;
  context: ErrorContext;
  suggestions: string[];
  isResolved: boolean;
  canRetry: boolean;
  requiresRestart: boolean;
  autoResolved: boolean;
  retryCount: number;
  maxRetries: number;
  localDataLoss: boolean;
  privacyImpact: boolean;
}

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
  isDestructive?: boolean;
  requiresConfirmation?: boolean;
}

interface OfflineErrorHandlerProps {
  errors?: OfflineError[];
  onErrorResolve?: (errorId: string) => void;
  onRetry?: (errorId: string) => void;
  onClearAll?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const OfflineErrorHandler: React.FC<OfflineErrorHandlerProps> = ({
  errors = [],
  onErrorResolve,
  onRetry,
  onClearAll,
  showDetails = false,
  className = ""
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  
  // Sample errors for demonstration
  const [currentErrors, setCurrentErrors] = useState<OfflineError[]>(errors.length > 0 ? errors : [
    {
      id: 'err-1',
      type: 'model',
      severity: 'high',
      title: 'Model Loading Failed',
      message: 'Failed to load the selected language model',
      details: 'The model file appears to be corrupted or incompatible with the current system configuration.',
      context: {
        component: 'LocalModelSelector',
        operation: 'loadModel',
        timestamp: new Date(),
        modelId: 'llama-2-7b-chat-q4',
        systemInfo: { memory: 4096, cpu: 50, disk: 85 }
      },
      suggestions: [
        'Verify model file integrity',
        'Check available system memory',
        'Try a smaller quantized model',
        'Restart the application'
      ],
      isResolved: false,
      canRetry: true,
      requiresRestart: false,
      autoResolved: false,
      retryCount: 0,
      maxRetries: 3,
      localDataLoss: false,
      privacyImpact: false
    },
    {
      id: 'err-2',
      type: 'storage',
      severity: 'medium',
      title: 'Insufficient Storage Space',
      message: 'Not enough disk space to save conversation',
      details: 'Available disk space is below the minimum threshold. Some conversations may not be saved.',
      context: {
        component: 'LocalChatInterface',
        operation: 'saveConversation',
        timestamp: new Date(),
        systemInfo: { memory: 8192, cpu: 30, disk: 95 }
      },
      suggestions: [
        'Clear old conversation data',
        'Enable compression',
        'Change storage location',
        'Clean system temporary files'
      ],
      isResolved: false,
      canRetry: true,
      requiresRestart: false,
      autoResolved: false,
      retryCount: 1,
      maxRetries: 2,
      localDataLoss: true,
      privacyImpact: false
    },
    {
      id: 'err-3',
      type: 'file',
      severity: 'low',
      title: 'Document Access Denied',
      message: 'Cannot read selected document file',
      details: 'The application does not have permission to access the selected file.',
      context: {
        component: 'LocalFileBrowser',
        operation: 'readFile',
        timestamp: new Date(),
        filePath: '/home/user/Documents/contract.pdf'
      },
      suggestions: [
        'Check file permissions',
        'Move file to accessible location',
        'Run application as administrator',
        'Copy file to application data folder'
      ],
      isResolved: false,
      canRetry: true,
      requiresRestart: false,
      autoResolved: false,
      retryCount: 0,
      maxRetries: 2,
      localDataLoss: false,
      privacyImpact: false
    }
  ]);

  const getErrorIcon = (type: string, severity: string) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (type) {
      case 'network':
        return <WifiOff {...iconProps} />;
      case 'storage':
        return <HardDrive {...iconProps} />;
      case 'memory':
        return <MemoryStick {...iconProps} />;
      case 'model':
        return <Cpu {...iconProps} />;
      case 'file':
        return <FileX {...iconProps} />;
      case 'permission':
        return <Shield {...iconProps} />;
      case 'system':
        return <AlertTriangle {...iconProps} />;
      case 'data':
        return <Database {...iconProps} />;
      default:
        return severity === 'critical' ? <XCircle {...iconProps} /> : <AlertCircle {...iconProps} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950';
      case 'high':
        return 'text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950';
      case 'medium':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950';
      case 'low':
        return 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950';
      default:
        return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const handleRetry = async (errorId: string) => {
    const error = currentErrors.find(e => e.id === errorId);
    if (!error || error.retryCount >= error.maxRetries) return;

    // Update retry count
    setCurrentErrors(prev => prev.map(e => 
      e.id === errorId 
        ? { ...e, retryCount: e.retryCount + 1 }
        : e
    ));

    // Simulate retry operation
    setIsRecovering(true);
    setRecoveryProgress(0);

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setRecoveryProgress(i);
      }

      // Simulate successful retry (60% chance)
      const success = Math.random() > 0.4;
      
      if (success) {
        setCurrentErrors(prev => prev.map(e => 
          e.id === errorId 
            ? { ...e, isResolved: true, autoResolved: true }
            : e
        ));
        onErrorResolve?.(errorId);
      }
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRecovering(false);
      setRecoveryProgress(0);
    }

    onRetry?.(errorId);
  };

  const handleResolve = (errorId: string) => {
    setCurrentErrors(prev => prev.map(e => 
      e.id === errorId 
        ? { ...e, isResolved: true }
        : e
    ));
    onErrorResolve?.(errorId);
  };

  const clearAllResolved = () => {
    setCurrentErrors(prev => prev.filter(e => !e.isResolved));
    onClearAll?.();
  };

  const getRecoveryActions = (error: OfflineError): RecoveryAction[] => {
    const baseActions: RecoveryAction[] = [];

    switch (error.type) {
      case 'model':
        baseActions.push(
          {
            id: 'reload-model',
            label: 'Reload Model',
            description: 'Attempt to reload the model from disk',
            icon: <RefreshCw className="w-4 h-4" />,
            action: async () => handleRetry(error.id)
          },
          {
            id: 'change-model',
            label: 'Select Different Model',
            description: 'Choose a different compatible model',
            icon: <Cpu className="w-4 h-4" />,
            action: async () => console.log('Open model selector')
          }
        );
        break;
      
      case 'storage':
        baseActions.push(
          {
            id: 'clear-cache',
            label: 'Clear Cache',
            description: 'Free up space by clearing temporary files',
            icon: <HardDrive className="w-4 h-4" />,
            action: async () => console.log('Clear cache'),
            isDestructive: true,
            requiresConfirmation: true
          },
          {
            id: 'change-location',
            label: 'Change Storage Location',
            description: 'Move data to a different location with more space',
            icon: <Download className="w-4 h-4" />,
            action: async () => console.log('Change storage location')
          }
        );
        break;

      case 'file':
        baseActions.push(
          {
            id: 'retry-file',
            label: 'Retry File Access',
            description: 'Attempt to access the file again',
            icon: <RefreshCw className="w-4 h-4" />,
            action: async () => handleRetry(error.id)
          },
          {
            id: 'choose-different',
            label: 'Choose Different File',
            description: 'Select a different file to work with',
            icon: <FileX className="w-4 h-4" />,
            action: async () => console.log('Open file browser')
          }
        );
        break;

      default:
        baseActions.push({
          id: 'retry-generic',
          label: 'Retry Operation',
          description: 'Attempt the operation again',
          icon: <RefreshCw className="w-4 h-4" />,
          action: async () => handleRetry(error.id)
        });
        break;
    }

    // Always add resolve action
    baseActions.push({
      id: 'resolve',
      label: 'Mark as Resolved',
      description: 'Mark this error as resolved',
      icon: <CheckCircle className="w-4 h-4" />,
      action: async () => handleResolve(error.id)
    });

    return baseActions;
  };

  const unresolvedErrors = currentErrors.filter(e => !e.isResolved);
  const resolvedErrors = currentErrors.filter(e => e.isResolved);
  const criticalErrors = unresolvedErrors.filter(e => e.severity === 'critical');

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Offline Error Handler
            {unresolvedErrors.length > 0 && (
              <Badge variant={criticalErrors.length > 0 ? "destructive" : "secondary"}>
                {unresolvedErrors.length} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSystemInfo(!showSystemInfo)}
            >
              {showSystemInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            {resolvedErrors.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllResolved}>
                Clear Resolved
              </Button>
            )}
          </div>
        </div>

        {/* System status overview */}
        {showSystemInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Network</div>
                <div className="text-xs text-muted-foreground">Offline (Protected)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Local Storage</div>
                <div className="text-xs text-muted-foreground">156MB / 1GB</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Privacy</div>
                <div className="text-xs text-muted-foreground">All data local</div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {currentErrors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Systems Operational</h3>
            <p className="text-muted-foreground">
              No errors detected. All operations are running smoothly in offline mode.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Critical Errors - Always shown first */}
            {criticalErrors.length > 0 && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Critical Issues Detected</AlertTitle>
                <AlertDescription>
                  {criticalErrors.length} critical error{criticalErrors.length > 1 ? 's' : ''} require immediate attention.
                  Some functionality may be unavailable until resolved.
                </AlertDescription>
              </Alert>
            )}

            {/* Recovery Progress */}
            {isRecovering && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">Attempting Recovery...</div>
                      <Progress value={recoveryProgress} className="h-2" />
                    </div>
                    <span className="text-sm text-muted-foreground">{recoveryProgress}%</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error List */}
            {unresolvedErrors.map((error) => {
              const isExpanded = expandedErrors.has(error.id);
              const recoveryActions = getRecoveryActions(error);

              return (
                <Card
                  key={error.id}
                  className={`border ${getSeverityColor(error.severity)}`}
                >
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <CardHeader 
                        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleErrorExpansion(error.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getErrorIcon(error.type, error.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{error.title}</h4>
                              <Badge variant={getSeverityBadgeVariant(error.severity)}>
                                {error.severity}
                              </Badge>
                              {error.localDataLoss && (
                                <Badge variant="destructive" className="text-xs">
                                  Data Loss Risk
                                </Badge>
                              )}
                              {error.privacyImpact && (
                                <Badge variant="secondary" className="text-xs">
                                  Privacy Impact
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{error.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {error.context.timestamp.toLocaleTimeString()}
                              </span>
                              <span>{error.context.component}</span>
                              {error.retryCount > 0 && (
                                <span>Retry {error.retryCount}/{error.maxRetries}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {error.canRetry && error.retryCount < error.maxRetries && !isRecovering && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(error.id);
                                }}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Retry
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleErrorExpansion(error.id);
                              }}
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Error Details */}
                        {(error.details || showDetails) && (
                          <div className="mb-4 p-3 bg-muted/30 rounded text-sm">
                            <strong>Details:</strong> {error.details}
                            {showDetails && (
                              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <div>Component: {error.context.component}</div>
                                <div>Operation: {error.context.operation}</div>
                                {error.context.filePath && (
                                  <div>File: <code className="bg-muted px-1 rounded">{error.context.filePath}</code></div>
                                )}
                                {error.context.systemInfo && (
                                  <div>System: {error.context.systemInfo.memory}MB RAM, {error.context.systemInfo.cpu}% CPU, {error.context.systemInfo.disk}% disk</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Suggestions */}
                        {error.suggestions.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium mb-2">Suggested Solutions:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {error.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-xs text-muted-foreground mt-0.5">•</span>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recovery Actions */}
                        <div className="flex flex-wrap gap-2">
                          {recoveryActions.map((action) => (
                            <Button
                              key={action.id}
                              variant={action.isDestructive ? "destructive" : "outline"}
                              size="sm"
                              onClick={action.action}
                              disabled={isRecovering}
                              title={action.description}
                            >
                              {action.icon}
                              <span className="ml-1">{action.label}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}

            {/* Resolved Errors - Collapsed by default */}
            {resolvedErrors.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-green-200 bg-green-50 dark:bg-green-950">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium">
                            {resolvedErrors.length} Resolved Error{resolvedErrors.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          Show History
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {resolvedErrors.map((error) => (
                      <div
                        key={error.id}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{error.title}</span>
                          {error.autoResolved && (
                            <Badge variant="outline" className="text-xs">Auto-resolved</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {error.context.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Footer with offline status */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3 h-3" />
            <span>Operating in secure offline mode</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>No data leaves your device</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OfflineErrorHandler;