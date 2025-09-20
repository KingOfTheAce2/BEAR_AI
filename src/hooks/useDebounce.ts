/**
 * Enhanced debounce hook with performance optimizations
 * Optimized for high-frequency events like scrolling
 * 
 * @version 2.0.0
 * @author BEAR AI Performance Team
 */

export interface DebounceOptions {
  leading?: boolean;  // Execute on the leading edge
  trailing?: boolean; // Execute on the trailing edge (default: true)
  maxWait?: number;   // Maximum time to wait before executing
}

/**
 * Advanced debounce hook with configurable options
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: DebounceOptions = {}
): T {
  const {
    leading = false,
    trailing = true,
    maxWait
  } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  const argsRef = useRef<Parameters<T>>();
  
  // Update callback ref when callback changes
  callbackRef.current = callback;
  
  const invokeFunc = useCallback(() => {
    const args = argsRef.current;
    if (args) {
      lastInvokeTimeRef.current = Date.now();
      return callbackRef.current(...args);
    }
  }, []);
  
  const leadingEdge = useCallback((time: number) => {
    lastInvokeTimeRef.current = time;
    if (leading) {
      return invokeFunc();
    }
  }, [leading, invokeFunc]);
  
  const remainingWait = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;
    const timeWaiting = delay - timeSinceLastCall;
    
    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }, [delay, maxWait]);
  
  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;
    
    return (
      lastCallTimeRef.current === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);
  
  const timerExpired = useCallback(() => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      if (trailing) {
        invokeFunc();
      }
    } else {
      const wait = remainingWait(time);
      if (wait > 0) {
        timeoutRef.current = setTimeout(timerExpired, wait);
      }
    }
  }, [shouldInvoke, trailing, invokeFunc, remainingWait]);
  
  const debouncedFunction = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastCallTimeRef.current = time;
    argsRef.current = args;
    
    if (isInvoking) {
      if (timeoutRef.current === null) {
        return leadingEdge(time);
      }
      
      if (maxWait !== undefined) {
        timeoutRef.current = setTimeout(timerExpired, delay);
        maxTimeoutRef.current = setTimeout(() => {
          if (trailing) {
            invokeFunc();
          }
        }, maxWait);
        return leadingEdge(time);
      }
    }
    
    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(timerExpired, delay);
    }
  }, [shouldInvoke, leadingEdge, delay, maxWait, timerExpired, trailing, invokeFunc]) as T;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [] // eslint-disable-line react-hooks/exhaustive-deps);
  
  // Add cancel and flush methods
  (debouncedFunction as any).cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    lastCallTimeRef.current = 0;
    lastInvokeTimeRef.current = 0;
  };
  
  (debouncedFunction as any).flush = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    if (lastCallTimeRef.current !== 0) {
      return invokeFunc();
    }
  };
  
  return debouncedFunction;
}

/**
 * Simple debounce hook for basic use cases
 */
export function useSimpleDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return useDebounce(callback, delay, { trailing: true });
}

/**
 * Throttle hook - ensures function is called at most once per interval
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return useDebounce(callback, delay, { 
    leading: true, 
    trailing: false, 
    maxWait: delay 
  });
}

export default useDebounce;