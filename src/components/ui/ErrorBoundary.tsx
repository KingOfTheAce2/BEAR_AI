import React, { Component, useState } from 'react'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { cn } from '../../utils/cn'
import { ErrorFallbackProps } from '../../types/modelTypes'

import { AlertTriangle, RefreshCw, Home, AlertCircle, Copy, ChevronDown, ChevronUp, ExternalLink, Send, FileText, Shield, Zap } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
  retryCount: number
  showDetails: boolean
  reportSent: boolean
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: any
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  maxRetries?: number
  isolate?: boolean
  className?: string
}

interface ErrorReportProps {
  error: Error
  errorInfo: { componentStack: string }
  onSendReport: (report: ErrorReport) => void
  onClose: () => void
}

interface ErrorReport {
  message: string
  stack: string
  componentStack: string
  userAgent: string
  timestamp: Date
  url: string
  userId?: string
  sessionId?: string
  additionalInfo?: string
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retry
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const handleCopyError = () => {
    const errorText = `
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack || 'N/A'}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim()
    
    navigator.clipboard.writeText(errorText)
  }

  const getErrorSeverity = () => {
    // Analyze error to determine severity
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'warning' // Network/loading issues
    }
    if (error.message.includes('Permission') || error.message.includes('Unauthorized')) {
      return 'error' // Permission issues
    }
    if (error.stack?.includes('TypeError') || error.stack?.includes('ReferenceError')) {
      return 'critical' // Code errors
    }
    return 'error' // Default
  }

  const getErrorCategory = () => {
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Network Error'
    }
    if (error.message.includes('Permission') || error.message.includes('Unauthorized')) {
      return 'Authentication Error'
    }
    if (error.message.includes('ChunkLoadError')) {
      return 'Loading Error'
    }
    if (error.stack?.includes('React')) {
      return 'Component Error'
    }
    return 'Application Error'
  }

  const getSuggestion = () => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'Try refreshing the page. This usually occurs when the application has been updated.'
    }
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Check your internet connection and try again.'
    }
    if (error.message.includes('Permission')) {
      return 'You may need to log in again or contact support for access.'
    }
    return 'Try refreshing the page or contact support if the problem persists.'
  }

  const severity = getErrorSeverity()
  const category = getErrorCategory()
  const suggestion = getSuggestion()

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              severity === 'critical' && 'bg-red-100 text-red-600',
              severity === 'error' && 'bg-orange-100 text-orange-600',
              severity === 'warning' && 'bg-yellow-100 text-yellow-600'
            )}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Something went wrong
                <Badge 
                  variant={severity === 'critical' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {category}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {suggestion}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm text-destructive">
              {error.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={retry} className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button variant="outline" onClick={resetError} className="flex-1 sm:flex-none">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowReport(!showReport)}
              className="flex-1 sm:flex-none"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleCopyError}
              size="sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Details
            </Button>
          </div>

          {/* Error Details Toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-muted-foreground"
            >
              {showDetails ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Error Stack:</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
                
                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Component Stack:</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <strong>URL:</strong> {window.location.href}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date().toLocaleString()}
                  </div>
                  <div className="sm:col-span-2">
                    <strong>User Agent:</strong> {navigator.userAgent}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Report Form */}
          {showReport && (
            <ErrorReportForm
              error={error}
              errorInfo={errorInfo || { componentStack: 'Unknown' }}
              onSendReport={(report) => {
                console.log('Error report:', report)
                setShowReport(false)
              }}
              onClose={() => setShowReport(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const ErrorReportForm: React.FC<ErrorReportProps> = ({
  error,
  errorInfo,
  onSendReport,
  onClose
}) => {
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const report: ErrorReport = {
        message: error.message,
        stack: error.stack || '',
        componentStack: errorInfo?.componentStack || '',
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        url: window.location.href,
        additionalInfo
      }

      await onSendReport(report)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-surface/50">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Report this issue</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Additional Information (optional)
        </label>
        <textarea
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="What were you doing when this error occurred?"
          className="w-full p-2 border border-input rounded resize-none"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={sending}>
          {sending ? (
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
  )
}

const ErrorBoundaryClass: any = class extends (React as any).Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
      reportSent: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({
      errorInfo
    })

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo || { componentStack: '' })

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary()
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
      reportSent: false
    })
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      return
    }

    this.setState(
      { retryCount: retryCount + 1 },
      () => {
        // Auto-reset with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        this.resetTimeoutId = window.setTimeout(() => {
          this.resetErrorBoundary()
        }, delay)
      }
    )
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback: Fallback, isolate, className } = this.props

    if (hasError && error) {
      const errorFallbackProps: ErrorFallbackProps = {
        error,
        errorInfo,
        resetError: this.resetErrorBoundary,
        retry: this.handleRetry
      }

      const fallbackComponent = Fallback ? (
        <Fallback {...errorFallbackProps} />
      ) : (
        <DefaultErrorFallback {...errorFallbackProps} />
      )

      if (isolate) {
        return (
          <div className={cn('error-boundary-container', className)}>
            {fallbackComponent}
          </div>
        )
      }

      return fallbackComponent
    }

    return children
  }
}

// Export the working class
export const ErrorBoundary = ErrorBoundaryClass;
export { DefaultErrorFallback }
export type { ErrorBoundaryProps, ErrorFallbackProps }
