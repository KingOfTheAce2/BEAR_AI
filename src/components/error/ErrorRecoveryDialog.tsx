/**
 * Error Recovery Dialog for BEAR AI
 * Provides advanced recovery options and error reporting
 * 
 * @file Advanced error recovery and reporting dialog
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { X, RefreshCw, Trash2, Download, Send, AlertTriangle, CheckCircle, Clock, Settings } from 'lucide-react';
import { ProcessedError } from '../../services/errorHandler';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';

// ==================== INTERFACES ====================

interface ErrorRecoveryDialogProps {
  error: ProcessedError;
  onClose: () => void;
  onRetry: () => void;
  onReset: () => void;
}

interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
  risk: 'low' | 'medium' | 'high';
  estimatedTime: string;
}

interface ErrorReportData {
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  additionalInfo: string;
  includePersonalData: boolean;
}

// ==================== RECOVERY ACTIONS ====================

const useRecoveryActions = (error: ProcessedError): RecoveryAction[] => {
  const clearBrowserCache = async (): Promise<void> => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  };

  const clearLocalStorage = async (): Promise<void> => {
    localStorage.clear();
    sessionStorage.clear();
  };

  const downloadErrorReport = async (): Promise<void> => {
    const report = {
      errorId: error.id,
      timestamp: error.context.timestamp.toISOString(),
      message: error.message,
      stack: error.stack,
      category: error.category,
      severity: error.severity,
      context: error.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      performanceData: error.reportingData.performanceData
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${error.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restartComponents = async (): Promise<void> => {
    // Simulate component restart by clearing React keys
    const event = new CustomEvent('restart-components');
    window.dispatchEvent(event);
  };

  const actions: RecoveryAction[] = [
    {
      id: 'clear-cache',
      name: 'Clear Browser Cache',
      description: 'Clears all cached data that might be causing issues',
      icon: <Trash2 className="h-4 w-4" />,
      action: clearBrowserCache,
      risk: 'low',
      estimatedTime: '5 seconds'
    },
    {
      id: 'clear-storage',
      name: 'Clear Local Storage',
      description: 'Removes all locally stored data and preferences',
      icon: <Trash2 className="h-4 w-4" />,
      action: clearLocalStorage,
      risk: 'medium',
      estimatedTime: '2 seconds'
    },
    {
      id: 'restart-components',
      name: 'Restart Components',
      description: 'Reinitializes the application components',
      icon: <RefreshCw className="h-4 w-4" />,
      action: restartComponents,
      risk: 'low',
      estimatedTime: '3 seconds'
    },
    {
      id: 'download-report',
      name: 'Download Error Report',
      description: 'Downloads a detailed error report for analysis',
      icon: <Download className="h-4 w-4" />,
      action: downloadErrorReport,
      risk: 'low',
      estimatedTime: '1 second'
    }
  ];

  // Filter actions based on error category
  return actions.filter(action => {
    switch (error.category) {
      case 'memory':
        return ['clear-cache', 'clear-storage', 'download-report'].includes(action.id);
      case 'network':
        return ['clear-cache', 'download-report'].includes(action.id);
      case 'component':
        return ['restart-components', 'clear-cache', 'download-report'].includes(action.id);
      default:
        return true;
    }
  });
};

// ==================== COMPONENTS ====================

const RecoveryActionCard: React.FC<{
  action: RecoveryAction;
  onExecute: (action: RecoveryAction) => void;
  isExecuting: boolean;
}> = ({ action, onExecute, isExecuting }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">{action.icon}</div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{action.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={`text-xs ${getRiskColor(action.risk)}`}>
                  {action.risk} risk
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {action.estimatedTime}
                </span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onExecute(action)}
            disabled={isExecuting}
            variant="outline"
          >
            {isExecuting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Execute'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ErrorReportForm: React.FC<{
  error: ProcessedError;
  onSubmit: (data: ErrorReportData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ error, onSubmit, onCancel, isSubmitting }) => {
  const [reportData, setReportData] = useState<ErrorReportData>({
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    additionalInfo: '',
    includePersonalData: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reportData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          What were you doing when this error occurred?
        </label>
        <textarea
          value={reportData.description}
          onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what you were trying to do..."
          className="w-full p-3 border border-input rounded-md resize-none"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Steps to reproduce (optional)
        </label>
        <textarea
          value={reportData.stepsToReproduce}
          onChange={(e) => setReportData(prev => ({ ...prev, stepsToReproduce: e.target.value }))}
          placeholder="1. First I did...\n2. Then I clicked...\n3. The error occurred when..."
          className="w-full p-3 border border-input rounded-md resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          What did you expect to happen? (optional)
        </label>
        <textarea
          value={reportData.expectedBehavior}
          onChange={(e) => setReportData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
          placeholder="I expected the application to..."
          className="w-full p-3 border border-input rounded-md resize-none"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Additional information (optional)
        </label>
        <textarea
          value={reportData.additionalInfo}
          onChange={(e) => setReportData(prev => ({ ...prev, additionalInfo: e.target.value }))}
          placeholder="Any other details that might be helpful..."
          className="w-full p-3 border border-input rounded-md resize-none"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="includePersonalData"
          checked={reportData.includePersonalData}
          onChange={(e) => setReportData(prev => ({ ...prev, includePersonalData: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="includePersonalData" className="text-sm">
          Include technical data (user agent, URL, performance metrics)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Report
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// ==================== MAIN COMPONENT ====================

export const ErrorRecoveryDialog: React.FC<ErrorRecoveryDialogProps> = ({
  error,
  onClose,
  onRetry,
  onReset
}) => {
  const [activeTab, setActiveTab] = useState<'recovery' | 'report'>('recovery');
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const recoveryActions = useRecoveryActions(error);

  const handleExecuteAction = async (action: RecoveryAction) => {
    setExecutingAction(action.id);
    try {
      await action.action();
      setCompletedActions(prev => new Set([...prev, action.id]));
    } catch (error) {
      console.error('Recovery action failed:', error);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleSubmitReport = async (reportData: ErrorReportData) => {
    setIsSubmittingReport(true);
    try {
      // In a real implementation, this would send to an error reporting service
      const report = {
        errorId: error.id,
        timestamp: error.context.timestamp.toISOString(),
        userReport: reportData,
        technicalData: reportData.includePersonalData ? {
          message: error.message,
          stack: error.stack,
          category: error.category,
          severity: error.severity,
          context: error.context,
          userAgent: navigator.userAgent,
          url: window.location.href,
          performanceData: error.reportingData.performanceData
        } : null
      };

      console.log('Error report submitted:', report);
      setReportSubmitted(true);
      setTimeout(() => {
        setActiveTab('recovery');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-semibold">Error Recovery Center</h2>
            <p className="text-sm text-muted-foreground">
              Error ID: {error.id} • {error.category} • {error.severity} severity
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('recovery')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'recovery'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Recovery Actions
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'report'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Report Issue
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'recovery' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Automated Recovery Actions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try these automated recovery actions to resolve the issue. Actions are ordered by effectiveness and safety.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recoveryActions.map((action) => (
                <RecoveryActionCard
                  key={action.id}
                  action={action}
                  onExecute={handleExecuteAction}
                  isExecuting={executingAction === action.id}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {completedActions.size > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {completedActions.size} action(s) completed
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onReset}>
                Reset Application
              </Button>
              <Button onClick={onRetry}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div>
          {reportSubmitted ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Report Submitted</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for your feedback. Our team will review the error report.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium mb-2">Report this Issue</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help us improve by providing details about this error. Your feedback is valuable for preventing similar issues.
              </p>

              <ErrorReportForm
                error={error}
                onSubmit={handleSubmitReport}
                onCancel={() => setActiveTab('recovery')}
                isSubmitting={isSubmittingReport}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ErrorRecoveryDialog;