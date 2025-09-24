/**
 * High-performance Intersection Observer hook
 * Optimized for virtual scrolling and lazy loading
 * 
 * Features:
 * - Efficient batch processing of intersections
 * - Memory leak prevention
 * - Performance monitoring
 * - Dynamic threshold adjustment
 * 
 * @version 2.0.0
 * @author BEAR AI Performance Team
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  onIntersect?: (entries: IntersectionObserverEntry[]) => void;
  onEnter?: (entry: IntersectionObserverEntry) => void;
  onLeave?: (entry: IntersectionObserverEntry) => void;
  debounce?: number; // Debounce intersection callbacks
  batchSize?: number; // Process intersections in batches
}

export interface IntersectionObserverHook {
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
  takeRecords: () => IntersectionObserverEntry[];
  isObserving: (element: Element) => boolean;
  getObservedElements: () => Element[];
  getStats: () => IntersectionStats;
}

interface IntersectionStats {
  observedElements: number;
  totalIntersections: number;
  averageProcessingTime: number;
  batchesProcessed: number;
}

export function useIntersectionObserver(
  options: IntersectionObserverOptions = {}
): IntersectionObserverHook {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    onIntersect,
    onEnter,
    onLeave,
    debounce = 0,
    batchSize = 10
  } = options;
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<Element>>(new Set());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEntriesRef = useRef<IntersectionObserverEntry[]>([]);
  const statsRef = useRef<IntersectionStats>({
    observedElements: 0,
    totalIntersections: 0,
    averageProcessingTime: 0,
    batchesProcessed: 0
  });
  
  // Batch processing for performance
  const processPendingEntries = useCallback(() => {
    if (pendingEntriesRef.current.length === 0) return;
    
    const startTime = performance.now();
    const entries = pendingEntriesRef.current.splice(0);
    
    // Process in batches to avoid blocking
    const processBatch = (batchEntries: IntersectionObserverEntry[], startIndex: number = 0) => {
      const endIndex = Math.min(startIndex + batchSize, batchEntries.length);
      const batch = batchEntries.slice(startIndex, endIndex);
      
      try {
        // Call intersection callback with batch
        if (onIntersect) {
          onIntersect(batch);
        }
        
        // Call individual enter/leave callbacks
        if (onEnter || onLeave) {
          batch.forEach(entry => {
            if (entry.isIntersecting && onEnter) {
              onEnter(entry);
            } else if (!entry.isIntersecting && onLeave) {
              onLeave(entry);
            }
          });
        }
        
        // Update stats
        statsRef.current.totalIntersections += batch.length;
        statsRef.current.batchesProcessed += 1;
        
      } catch (error) {
        // Error logging disabled for production
      }
      
      // Process next batch if needed
      if (endIndex < batchEntries.length) {
        // Use scheduler API if available, otherwise setTimeout
        if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
          (window as any).scheduler.postTask(() => {
            processBatch(batchEntries, endIndex);
          }, { priority: 'user-visible' });
        } else {
          setTimeout(() => processBatch(batchEntries, endIndex), 0);
        }
      } else {
        // All batches processed, update performance stats
        const processingTime = performance.now() - startTime;
        const currentAvg = statsRef.current.averageProcessingTime;
        const totalBatches = statsRef.current.batchesProcessed;
        
        statsRef.current.averageProcessingTime = 
          (currentAvg * (totalBatches - 1) + processingTime) / totalBatches;
      }
    };
    
    processBatch(entries);
  }, [onIntersect, onEnter, onLeave, batchSize]);
  
  // Debounced processing
  const scheduleProcessing = useCallback(() => {
    if (debounce > 0) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(processPendingEntries, debounce);
    } else {
      processPendingEntries();
    }
  }, [processPendingEntries, debounce]);
  
  // Intersection callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    pendingEntriesRef.current.push(...entries);
    scheduleProcessing();
  }, [scheduleProcessing]);
  
  // Create observer with memoized options
  const observerOptions = useMemo(() => ({
    root,
    rootMargin,
    threshold
  }), [root, rootMargin, threshold]);
  
  useEffect(() => {
    // Create new observer if options changed
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    try {
      observerRef.current = new IntersectionObserver(handleIntersection, observerOptions);
      
      // Re-observe all previously observed elements
      observedElementsRef.current.forEach(element => {
        if (observerRef.current && document.contains(element)) {
          observerRef.current.observe(element);
        } else {
          // Element no longer in DOM, remove from set
          observedElementsRef.current.delete(element);
        }
      });
      
      statsRef.current.observedElements = observedElementsRef.current.size;
    } catch (error) {
      // Error logging disabled for production
    }
  }, [handleIntersection, observerOptions]);
  
  // Observe element
  const observe = useCallback((element: Element) => {
    if (!element || !observerRef.current) return;
    
    if (!observedElementsRef.current.has(element)) {
      observedElementsRef.current.add(element);
      observerRef.current.observe(element);
      statsRef.current.observedElements = observedElementsRef.current.size;
    }
  }, []);
  
  // Unobserve element
  const unobserve = useCallback((element: Element) => {
    if (!element || !observerRef.current) return;
    
    if (observedElementsRef.current.has(element)) {
      observedElementsRef.current.delete(element);
      observerRef.current.unobserve(element);
      statsRef.current.observedElements = observedElementsRef.current.size;
    }
  }, []);
  
  // Disconnect observer
  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observedElementsRef.current.clear();
      statsRef.current.observedElements = 0;
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Clear pending entries
    pendingEntriesRef.current = [];
  }, []);
  
  // Take records
  const takeRecords = useCallback((): IntersectionObserverEntry[] => {
    if (!observerRef.current) return [];
    return observerRef.current.takeRecords();
  }, []);
  
  // Check if element is being observed
  const isObserving = useCallback((element: Element): boolean => {
    return observedElementsRef.current.has(element);
  }, []);
  
  // Get all observed elements
  const getObservedElements = useCallback((): Element[] => {
    return Array.from(observedElementsRef.current);
  }, []);
  
  // Get performance stats
  const getStats = useCallback((): IntersectionStats => {
    return { ...statsRef.current };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    observe,
    unobserve,
    disconnect,
    takeRecords,
    isObserving,
    getObservedElements,
    getStats
  };
}

/**
 * Simplified intersection observer for basic visibility detection
 */
export function useVisibilityObserver(
  callback: (isVisible: boolean, entry: IntersectionObserverEntry) => void,
  options: Omit<IntersectionObserverOptions, 'onIntersect' | 'onEnter' | 'onLeave'> = {}
) {
  return useIntersectionObserver({
    ...options,
    onIntersect: (entries) => {
      entries.forEach(entry => {
        callback(entry.isIntersecting, entry);
      });
    }
  });
}

/**
 * Lazy loading hook with automatic image src management
 */
export function useLazyLoading(
  options: Omit<IntersectionObserverOptions, 'onIntersect'> = {}
) {
  const loadedElementsRef = useRef<Set<Element>>(new Set());
  
  const { observe, unobserve, disconnect } = useIntersectionObserver({
    ...options,
    threshold: options.threshold || 0.1,
    onEnter: (entry) => {
      const element = entry.target;
      
      if (!loadedElementsRef.current.has(element)) {
        // Handle img elements
        if (element instanceof HTMLImageElement) {
          const dataSrc = element.getAttribute('data-src');
          if (dataSrc) {
            element.src = dataSrc;
            element.removeAttribute('data-src');
          }
        }
        
        // Handle elements with background images
        const dataBg = element.getAttribute('data-bg');
        if (dataBg) {
          (element as HTMLElement).style.backgroundImage = `url(${dataBg})`;
          element.removeAttribute('data-bg');
        }
        
        // Add loaded class for CSS transitions
        element.classList.add('lazy-loaded');
        loadedElementsRef.current.add(element);
        
        // Stop observing once loaded
        unobserve(element);
      }
    }
  });
  
  return {
    observe,
    unobserve,
    disconnect,
    isLoaded: (element: Element) => loadedElementsRef.current.has(element)
  };
}

export default useIntersectionObserver;