/**
 * Error Analytics Service for BEAR AI
 * Provides error tracking and analytics capabilities
 */

export interface ErrorAnalytics {
  track: (error: Error, context?: any) => void;
  flush: () => Promise<void>;
}

export class DefaultErrorAnalytics implements ErrorAnalytics {
  track(error: Error, context?: any): void {
    // For alpha release, just log to console
    console.error('Error tracked:', error, context);
  }

  async flush(): Promise<void> {
    // No-op for alpha release
  }
}

export const errorAnalytics = new DefaultErrorAnalytics();

export default errorAnalytics;