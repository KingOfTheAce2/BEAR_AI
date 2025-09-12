/**
 * Environment Detection Utilities for BEAR AI Hybrid Application
 * Handles detection of Tauri desktop environment vs web browser environment
 */

/**
 * Check if we're running in a Tauri desktop environment
 */
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Check if we're running in a web browser environment
 */
export const isWebEnvironment = (): boolean => {
  return typeof window !== 'undefined' && !('__TAURI__' in window);
};

/**
 * Check if we're running in a Node.js environment (server-side)
 */
export const isNodeEnvironment = (): boolean => {
  return typeof window === 'undefined' && typeof process !== 'undefined';
};

/**
 * Check if we're running in a test environment
 */
export const isTestEnvironment = (): boolean => {
  return (
    typeof process !== 'undefined' && 
    process.env.NODE_ENV === 'test'
  );
};

/**
 * Get the current environment type
 */
export type EnvironmentType = 'tauri' | 'web' | 'node' | 'test';

export const getCurrentEnvironment = (): EnvironmentType => {
  if (isTestEnvironment()) return 'test';
  if (isNodeEnvironment()) return 'node';
  if (isTauriEnvironment()) return 'tauri';
  return 'web';
};

/**
 * Environment-specific feature detection
 */
export const environmentFeatures = {
  /**
   * Check if Tauri invoke commands are available
   */
  hasTauriInvoke: (): boolean => {
    return isTauriEnvironment() && typeof window.__TAURI__?.invoke === 'function';
  },

  /**
   * Check if local storage is available
   */
  hasLocalStorage: (): boolean => {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window;
    } catch {
      return false;
    }
  },

  /**
   * Check if WebSocket is available
   */
  hasWebSocket: (): boolean => {
    return typeof WebSocket !== 'undefined';
  },

  /**
   * Check if File API is available
   */
  hasFileAPI: (): boolean => {
    return typeof File !== 'undefined' && typeof FileReader !== 'undefined';
  },

  /**
   * Check if we can use HTTP fetch
   */
  hasHTTPFetch: (): boolean => {
    return typeof fetch !== 'undefined';
  }
};

/**
 * Safe environment check with fallback
 */
export const safeEnvironmentCheck = <T>(
  check: () => T,
  fallback: T
): T => {
  try {
    return check();
  } catch (error) {
    console.warn('Environment check failed, using fallback:', error);
    return fallback;
  }
};

/**
 * Wait for Tauri to be ready (if in Tauri environment)
 */
export const waitForTauriReady = async (timeoutMs = 5000): Promise<boolean> => {
  if (!isTauriEnvironment()) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = Math.floor(timeoutMs / 100);

    const checkReady = () => {
      attempts++;
      
      if (environmentFeatures.hasTauriInvoke()) {
        resolve(true);
        return;
      }

      if (attempts >= maxAttempts) {
        console.warn('Tauri readiness timeout after', timeoutMs, 'ms');
        resolve(false);
        return;
      }

      setTimeout(checkReady, 100);
    };

    checkReady();
  });
};

/**
 * Environment-aware console logging
 */
export const environmentLog = {
  info: (message: string, ...args: any[]) => {
    const env = getCurrentEnvironment();
    console.log(`[${env.toUpperCase()}] ${message}`, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    const env = getCurrentEnvironment();
    console.warn(`[${env.toUpperCase()}] ${message}`, ...args);
  },

  error: (message: string, ...args: any[]) => {
    const env = getCurrentEnvironment();
    console.error(`[${env.toUpperCase()}] ${message}`, ...args);
  }
};

export default {
  isTauriEnvironment,
  isWebEnvironment,
  isNodeEnvironment,
  isTestEnvironment,
  getCurrentEnvironment,
  environmentFeatures,
  safeEnvironmentCheck,
  waitForTauriReady,
  environmentLog
};