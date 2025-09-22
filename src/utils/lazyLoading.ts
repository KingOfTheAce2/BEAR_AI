/**
 * Lazy Loading and Code Splitting Utilities
 *
 * This module provides utilities for implementing code splitting and lazy loading
 * to optimize bundle size and improve application performance.
 */

import { lazy, ComponentType, LazyExoticComponent, createElement, useEffect } from 'react';
import { RouteObject } from 'react-router-dom';

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

/**
 * Enhanced lazy loading wrapper with error handling and retry logic
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    minDelay = 200,
    timeout = 10000,
    retries = 3,
  } = options;

  let retryCount = 0;

  const enhancedImport = async (): Promise<{ default: T }> => {
    try {
      // Add minimum delay to prevent flash of loading state
      const [component] = await Promise.all([
        importFn(),
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

/**
 * Create a lazy route with automatic error boundary
 */
export function createLazyRoute(
  path: string,
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options: LazyLoadOptions = {}
): RouteObject {
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
    Dashboard: () => createLazyComponent(() => import('../components/Dashboard')),
    Analysis: () => createLazyComponent(() => import('../components/Analysis')),
    Settings: () => createLazyComponent(() => import('../components/Settings')),
    Reports: () => createLazyComponent(() => import('../components/Reports')),
  },

  /**
   * Lazy load features/modules
   */
  features: {
    DocumentProcessor: () => createLazyComponent(() => import('../components/DocumentProcessor')),
    AIChat: () => createLazyComponent(() => import('../components/AIChat')),
    DataVisualization: () => createLazyComponent(() => import('../components/DataVisualization')),
  },

  /**
   * Lazy load third-party libraries
   */
  libraries: {
    ChartLibrary: () => import('chart.js').then(module => ({ default: module })),
    PDFViewer: () => import('react-pdf').then(module => ({ default: module })),
    CodeEditor: () => import('@monaco-editor/react').then(module => ({ default: module })),
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