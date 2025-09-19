/**
 * Simple Error Boundary Wrapper for BEAR AI
 * TypeScript-compatible React error boundary
 *
 * @file Simple error boundary implementation that avoids TS issues
 * @version 2.0.3
 */

import React, { type ComponentType } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryWrapperState {
  hasError: boolean;
  error: Error | null;
}

export interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

// ==================== ERROR BOUNDARY WRAPPER ====================

export class ErrorBoundaryWrapper extends React.Component<ErrorBoundaryWrapperProps, ErrorBoundaryWrapperState> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryWrapperState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWrapper;

// Simple HOC for wrapping components
export const withErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>,
  errorFallback?: (error: Error) => ReactNode
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundaryWrapper fallback={errorFallback}>
      <WrappedComponent {...props} />
    </ErrorBoundaryWrapper>
  );

  const wrappedMetadata =
    (WrappedComponent as { displayName?: string; name?: string }).displayName ||
    (WrappedComponent as { name?: string }).name ||
    'Component';

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${wrappedMetadata})`;
  return WithErrorBoundaryComponent;
};