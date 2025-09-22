/**
 * Unified Component Factory for BEAR AI
 * Standardized component interfaces and consistent patterns
 */

import React, { memo, forwardRef, useMemo, useCallback } from 'react';
import { logger } from '../../utils/unified/logger';
import { errorHandler, BearError } from '../../utils/unified/errorHandler';
import { cn } from '../../utils/unified/classNames';

// Base component props that all components should extend
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  testId?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
}

// Enhanced component props with common functionality
export interface EnhancedComponentProps extends BaseComponentProps {
  loading?: boolean;
  disabled?: boolean;
  error?: BearError | string | null;
  onError?: (error: BearError) => void;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark' | 'auto';
}

// Component metadata for tracking and debugging
export interface ComponentMetadata {
  name: string;
  version: string;
  category: 'ui' | 'layout' | 'feature' | 'page';
  description?: string;
  dependencies?: string[];
}

// Performance monitoring props
export interface PerformanceProps {
  enableMetrics?: boolean;
  performanceThreshold?: number; // ms
  onPerformanceIssue?: (metrics: ComponentPerformanceMetrics) => void;
}

export interface ComponentPerformanceMetrics {
  renderTime: number;
  mountTime: number;
  updateCount: number;
  errorCount: number;
  lastRender: Date;
}

// Combined props for factory components
export interface FactoryComponentProps extends 
  EnhancedComponentProps, 
  PerformanceProps {}

// Higher-order component for adding common functionality
export function withBearAI<P extends BaseComponentProps>(
  Component: React.ComponentType<P>,
  metadata: ComponentMetadata
) {
  const WrappedComponent = memo(forwardRef<any, P & FactoryComponentProps>(
    (props, ref) => {
      const {
        className,
        loading = false,
        disabled = false,
        error,
        onError,
        enableMetrics = process.env['NODE_ENV'] === 'development',
        performanceThreshold = 100,
        onPerformanceIssue,
        testId,
        ...rest
      } = props;

      // Component logger
      const componentLogger = useMemo(() => 
        logger.child({ component: metadata.name }), 
        [metadata.name]
      );

      // Performance metrics
      const [metrics, setMetrics] = React.useState<ComponentPerformanceMetrics>({
        renderTime: 0,
        mountTime: 0,
        updateCount: 0,
        errorCount: 0,
        lastRender: new Date()
      });

      React.useDebugValue({ component: metadata.name, metrics });

      // Error boundary state
      const [componentError, setComponentError] = React.useState<BearError | null>(null);

      // Performance monitoring
      const renderStartTime = useMemo(() => performance.now(), []);

      // Handle errors
      const handleError = useCallback((error: Error | BearError) => {
        const bearError = error instanceof BearError 
          ? error 
          : errorHandler.system(
              error.message, 
              'COMPONENT_ERROR', 
              { component: metadata.name, stack: error.stack }
            );

        setComponentError(bearError);
        setMetrics(prev => ({ 
          ...prev, 
          errorCount: prev.errorCount + 1,
          lastRender: new Date()
        }));

        componentLogger.componentError(metadata.name, error instanceof Error ? error : new Error(bearError.message));
        
        if (onError) {
          onError(bearError);
        }
      }, [metadata.name, onError, componentLogger]);

      // Component lifecycle logging
      React.useEffect(() => {
        const mountTime = performance.now();
        componentLogger.componentMount(metadata.name, rest);
        
        setMetrics(prev => ({ 
          ...prev, 
          mountTime: mountTime - renderStartTime 
        }));

        return () => {
          componentLogger.componentUnmount(metadata.name);
        };
      }, [componentLogger, metadata.name, renderStartTime, rest]);

      // Performance tracking
      React.useEffect(() => {
        const renderTime = performance.now() - renderStartTime;
        
        setMetrics(prev => {
          const newMetrics = {
            ...prev,
            renderTime,
            updateCount: prev.updateCount + 1,
            lastRender: new Date()
          };

          // Performance threshold check
          if (enableMetrics && renderTime > performanceThreshold && onPerformanceIssue) {
            onPerformanceIssue(newMetrics);
          }

          return newMetrics;
        });
      });

      // Error display
      if (componentError || error) {
        const displayError = componentError || (typeof error === 'string' 
          ? new BearError(error, 'COMPONENT_ERROR') 
          : error);

        return (
          <div 
            className={cn(
              "p-4 border border-red-200 bg-red-50 rounded-lg",
              className
            )}
            data-testid={testId ? `${testId}-error` : undefined}
          >
            <div className="flex items-start">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Component Error: {metadata.name}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{displayError instanceof BearError ? displayError.message : String(displayError)}</p>
                </div>
                {process.env['NODE_ENV'] === 'development' && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setComponentError(null);
                        window.location.reload();
                      }}
                      className="text-xs text-red-600 hover:text-red-500 underline"
                    >
                      Reload Component
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Loading state
      if (loading) {
        return (
          <div 
            className={cn(
              "flex items-center justify-center p-4",
              className
            )}
            data-testid={testId ? `${testId}-loading` : undefined}
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bear-navy"></div>
            <span className="ml-2 text-sm text-gray-600">Loading...</span>
          </div>
        );
      }

      try {
        return (
          <Component
            {...(rest as unknown as P)}
            ref={ref as any}
            className={cn(
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              className
            )}
            data-testid={testId}
            data-component={metadata.name}
            data-version={metadata.version}
          />
        );
      } catch (renderError) {
        handleError(renderError instanceof Error ? renderError : new Error('Render error'));
        return null;
      }
    }
  ));

  WrappedComponent.displayName = `withBearAI(${metadata.name})`;
  
  // Attach metadata to component
  (WrappedComponent as any).__bearAI = {
    metadata,
    originalComponent: Component
  };

  return WrappedComponent;
}

// Component factory functions
export const ComponentFactory = {
  // Create a button component
  createButton: <P extends BaseComponentProps>(
    buttonComponent: React.ComponentType<P>,
    options: Partial<ComponentMetadata> = {}
  ) => withBearAI(buttonComponent, {
    name: 'Button',
    version: '1.0.0',
    category: 'ui',
    description: 'Interactive button component',
    ...options
  }),

  // Create an input component
  createInput: <P extends BaseComponentProps>(
    inputComponent: React.ComponentType<P>,
    options: Partial<ComponentMetadata> = {}
  ) => withBearAI(inputComponent, {
    name: 'Input',
    version: '1.0.0',
    category: 'ui',
    description: 'Form input component',
    ...options
  }),

  // Create a card component
  createCard: <P extends BaseComponentProps>(
    cardComponent: React.ComponentType<P>,
    options: Partial<ComponentMetadata> = {}
  ) => withBearAI(cardComponent, {
    name: 'Card',
    version: '1.0.0',
    category: 'ui',
    description: 'Container card component',
    ...options
  }),

  // Create a layout component
  createLayout: <P extends BaseComponentProps>(
    layoutComponent: React.ComponentType<P>,
    options: Partial<ComponentMetadata> = {}
  ) => withBearAI(layoutComponent, {
    name: 'Layout',
    version: '1.0.0',
    category: 'layout',
    description: 'Layout container component',
    ...options
  }),

  // Create a feature component
  createFeature: <P extends BaseComponentProps>(
    featureComponent: React.ComponentType<P>,
    options: Partial<ComponentMetadata> = {}
  ) => withBearAI(featureComponent, {
    name: 'Feature',
    version: '1.0.0',
    category: 'feature',
    description: 'Feature component',
    ...options
  }),

  // Create a page component
  createPage: <P extends BaseComponentProps>(
    pageComponent: React.ComponentType<P>,
    options: Partial<ComponentMetadata> = {}
  ) => withBearAI(pageComponent, {
    name: 'Page',
    version: '1.0.0',
    category: 'page',
    description: 'Page component',
    ...options
  })
};

// Utility hooks for component development
export function useComponentMetrics(componentName: string) {
  const [metrics, setMetrics] = React.useState<ComponentPerformanceMetrics>({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    errorCount: 0,
    lastRender: new Date()
  });

  React.useDebugValue({ componentName, metrics });

  const recordRender = useCallback((duration: number) => {
    setMetrics(prev => ({
      ...prev,
      renderTime: duration,
      updateCount: prev.updateCount + 1,
      lastRender: new Date()
    }));
  }, []);

  const recordError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      lastRender: new Date()
    }));
  }, []);

  return { metrics, recordRender, recordError };
}

export function useComponentLogger(componentName: string) {
  return useMemo(() => logger.child({ component: componentName }), [componentName]);
}

export function useErrorBoundary(componentName: string) {
  const [error, setError] = React.useState<BearError | null>(null);
  
  const handleError = useCallback((error: Error | BearError) => {
    const bearError = error instanceof BearError 
      ? error 
      : errorHandler.system(error.message, 'COMPONENT_ERROR', { component: componentName });
    
    setError(bearError);
    return bearError;
  }, [componentName]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

// Component registry for debugging and development
export const ComponentRegistry = {
  components: new Map<string, React.ComponentType<any>>(),
  
  register<P>(name: string, component: React.ComponentType<P>): void {
    this.components.set(name, component);
  },
  
  get<P>(name: string): React.ComponentType<P> | undefined {
    return this.components.get(name);
  },
  
  getAll(): Map<string, React.ComponentType<any>> {
    return new Map(this.components);
  },
  
  clear(): void {
    this.components.clear();
  }
};

export default ComponentFactory;