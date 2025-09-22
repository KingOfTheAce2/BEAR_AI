/**
 * Lazy Loading and Code Splitting Utilities
 *
 * This module provides utilities for implementing code splitting and lazy loading
 * to optimize bundle size and improve application performance.
 */

import { lazy, ComponentType, LazyExoticComponent, createElement, useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Configuration options for lazy loading
 */
export interface LazyLoadOptions {
  /** Minimum delay before showing loading state (in ms) */
  minDelay?: number;
  /** Maximum timeout for loading (in ms) */
  timeout?: number;
  /** Retry attempts on failure */
  retries?: number;
  /** Preload component on hover/focus */
  preload?: boolean;
}

export type LazyRoute = {
  path: string;
  element: ReactNode;
  errorElement?: ReactNode;
  children?: LazyRoute[];
};

/**
 * Enhanced lazy loading wrapper with error handling and retry logic
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    minDelay = 200,
    timeout: timeoutMs = 10000,
    retries = 3,
  } = options;

  let retryCount = 0;

  const enhancedImport = async (): Promise<{ default: T }> => {
    try {
      // Add minimum delay to prevent flash of loading state
      const importPromise = importFn();
      const timedImport = timeoutMs > 0
        ? Promise.race([
          importPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Component loading timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ])
        : importPromise;

      const [component] = await Promise.all([
        timedImport,
        new Promise(resolve => setTimeout(resolve, minDelay))
      ]);

      // Reset retry count on successful load
      retryCount = 0;
      return component;
    } catch (error) {
      if (retryCount < retries) {
        retryCount++;
        console.warn(`Component loading failed, retrying (${retryCount}/${retries})`, error);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        return enhancedImport();
      }

      console.error('Component loading failed after all retries', error);
      throw error;
    }
  };

  return lazy(enhancedImport);
}

/**
 * Preload a lazy component
 */
export function preloadComponent<T extends ComponentType<any>>(
  lazyComponent: LazyExoticComponent<T>
): Promise<void> {
  // Access the _payload to trigger preloading
  const componentImporter = (lazyComponent as any)._payload;
  if (componentImporter && typeof componentImporter._result === 'undefined') {
    return componentImporter._result || Promise.resolve();
  }
  return Promise.resolve();
}

async function resolveComponent<T extends ComponentType<any>>(
  importer: () => Promise<any>,
  exportName?: string
): Promise<{ default: T }> {
  const module = await importer();
  const resolved = exportName ? module[exportName] : module.default;
  const component = resolved ?? module.default ?? (exportName ? module[exportName] : undefined);

  if (!component) {
    throw new Error(`Component ${exportName ?? 'default'} not found in module`);
  }

  return { default: component as T };
}

const createUnavailableLazyComponent = (resource: string) =>
  () =>
    createLazyComponent(async () => ({
      default: (() =>
        createElement(
          'div',
          { className: 'text-sm text-muted-foreground' },
          `${resource} is not available in this build.`
        )) as ComponentType<any>
    }));

/**
 * Create a lazy route with automatic error boundary
 */
export function createLazyRoute(
  path: string,
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options: LazyLoadOptions = {}
): LazyRoute {
  const LazyComponent = createLazyComponent(importFn, options);

  return {
    path,
    element: createElement(LazyComponent),
    errorElement: createElement('div', null, 'Error loading page. Please try again.'),
  };
}

/**
 * Preload multiple components in parallel
 */
export async function preloadComponents(
  components: LazyExoticComponent<any>[]
): Promise<void[]> {
  return Promise.all(components.map(preloadComponent));
}

/**
 * Bundle splitting utilities
 */
export const BundleSplitting = {
  /**
   * Lazy load pages/routes
   */
  pages: {
    Dashboard: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/pages/PerformancePage'))),
    Analysis: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/pages/ResearchPage'), 'ResearchPage')),
    Settings: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/settings/SettingsPanel'))),
    Reports: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/pages/HistoryPage'), 'HistoryPage')),
  },

  /**
   * Lazy load features/modules
   */
  features: {
    DocumentProcessor: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/documents/PIIDocumentProcessor'))),
    AIChat: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/chat/ChatInterface'), 'ChatInterface')),
    DataVisualization: () =>
      createLazyComponent(() => resolveComponent(() => import('../components/monitoring/PerformanceDashboard'), 'PerformanceDashboard')),
  },

  /**
   * Lazy load third-party libraries
   */
  libraries: {
    ChartLibrary: createUnavailableLazyComponent('Chart.js'),
    PDFViewer: createUnavailableLazyComponent('react-pdf'),
    CodeEditor: createUnavailableLazyComponent('Monaco editor'),
  }
};

/**
 * Resource preloading utilities
 */
export const ResourcePreloader = {
  /**
   * Preload critical components on app start
   */
  preloadCritical: async (): Promise<void> => {
    const criticalComponents = [
      BundleSplitting.pages.Dashboard(),
      BundleSplitting.features.DocumentProcessor(),
    ];

    await preloadComponents(criticalComponents);
  },

  /**
   * Preload components on user interaction
   */
  preloadOnHover: (componentLoader: () => LazyExoticComponent<any>) => {
    let isPreloaded = false;

    return {
      onMouseEnter: () => {
        if (!isPreloaded) {
          isPreloaded = true;
          preloadComponent(componentLoader());
        }
      },
      onFocus: () => {
        if (!isPreloaded) {
          isPreloaded = true;
          preloadComponent(componentLoader());
        }
      }
    };
  },

  /**
   * Preload components based on user navigation patterns
   */
  preloadPredictive: async (userPath: string[]): Promise<void> => {
    const predictions = predictNextRoute(userPath);
    const componentsToPreload = predictions.map(route =>
      BundleSplitting.pages[route as keyof typeof BundleSplitting.pages]?.()
    ).filter(Boolean);

    if (componentsToPreload.length > 0) {
      await preloadComponents(componentsToPreload);
    }
  }
};

/**
 * Simple route prediction based on common patterns
 */
function predictNextRoute(userPath: string[]): string[] {
  const commonPatterns = {
    '/dashboard': ['/analysis', '/reports'],
    '/analysis': ['/reports', '/settings'],
    '/reports': ['/dashboard', '/analysis'],
    '/settings': ['/dashboard']
  };

  const lastRoute = userPath[userPath.length - 1];
  return commonPatterns[lastRoute as keyof typeof commonPatterns] || [];
}

/**
 * Performance monitoring for lazy loading
 */
export const LazyLoadingMetrics = {
  componentLoadTimes: new Map<string, number>(),

  recordLoadTime: (componentName: string, startTime: number): void => {
    const loadTime = Date.now() - startTime;
    LazyLoadingMetrics.componentLoadTimes.set(componentName, loadTime);

    // Log slow loading components
    if (loadTime > 2000) {
      console.warn(`Slow component loading detected: ${componentName} took ${loadTime}ms`);
    }
  },

  getAverageLoadTime: (): number => {
    const times = Array.from(LazyLoadingMetrics.componentLoadTimes.values());
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  },

  getSlowComponents: (threshold = 1000): Array<[string, number]> => {
    return Array.from(LazyLoadingMetrics.componentLoadTimes.entries())
      .filter(([, time]) => time > threshold)
      .sort(([, a], [, b]) => b - a);
  }
};

/**
 * HOC for adding loading tracking to lazy components
 */
export function withLoadingMetrics<T extends ComponentType<any>>(
  Component: T,
  componentName: string
): T {
  const WrappedComponent = (props: any) => {
    const startTime = Date.now();

    useEffect(() => {
      LazyLoadingMetrics.recordLoadTime(componentName, startTime);
    }, []);

    return createElement(Component, props);
  };

  WrappedComponent.displayName = `withLoadingMetrics(${componentName})`;
  return WrappedComponent as T;
}

/**
 * Webpack magic comments helper for better chunk naming
 */
export const ChunkNaming = {
  /**
   * Generate webpack magic comment for chunk naming
   */
  webpackChunkName: (chunkName: string): string =>
    `/* webpackChunkName: "${chunkName}" */`,

  /**
   * Generate webpack magic comment for preloading
   */
  webpackPreload: (): string =>
    `/* webpackPreload: true */`,

  /**
   * Generate webpack magic comment for prefetching
   */
  webpackPrefetch: (): string =>
    `/* webpackPrefetch: true */`,
};

/**
 * Example usage with webpack magic comments:
 *
 * const LazyDashboard = createLazyComponent(
 *   () => import(
 *     ChunkNaming.webpackChunkName('dashboard') +
 *     ChunkNaming.webpackPreload() +
 *     '../components/Dashboard'
 *   )
 * );
 */

export default {
  createLazyComponent,
  createLazyRoute,
  preloadComponent,
  preloadComponents,
  BundleSplitting,
  ResourcePreloader,
  LazyLoadingMetrics,
  withLoadingMetrics,
  ChunkNaming
};