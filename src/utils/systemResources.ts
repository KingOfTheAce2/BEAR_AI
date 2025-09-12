/**
 * System Resources Utility for BEAR AI
 * Cross-platform system resource detection and monitoring
 */

export interface SystemInfo {
  /** Operating system name */
  os: string;
  /** Browser name and version */
  browser: BrowserInfo;
  /** Hardware information */
  hardware: HardwareInfo;
  /** Available APIs and features */
  capabilities: SystemCapabilities;
  /** Platform-specific resource limits */
  limits: ResourceLimits;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
}

export interface HardwareInfo {
  /** Number of logical CPU cores */
  cores: number;
  /** Estimated RAM in bytes (best effort) */
  estimatedRam: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Screen dimensions */
  screen: {
    width: number;
    height: number;
    availableWidth: number;
    availableHeight: number;
  };
  /** Touch support */
  touchSupport: boolean;
  /** Connection information */
  connection?: {
    effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
}

export interface SystemCapabilities {
  /** Web APIs support */
  webApis: {
    performanceMemory: boolean;
    performanceObserver: boolean;
    webWorkers: boolean;
    serviceWorkers: boolean;
    webAssembly: boolean;
    offscreenCanvas: boolean;
    broadcastChannel: boolean;
    sharedArrayBuffer: boolean;
    atomics: boolean;
  };
  /** Storage capabilities */
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    quota: number; // in bytes
  };
  /** Media capabilities */
  media: {
    webRTC: boolean;
    mediaDevices: boolean;
    getUserMedia: boolean;
  };
}

export interface ResourceLimits {
  /** Maximum safe memory usage (bytes) */
  maxSafeMemory: number;
  /** Maximum recommended concurrent operations */
  maxConcurrentOperations: number;
  /** Storage quota (bytes) */
  storageQuota: number;
  /** Network timeout recommendations (ms) */
  networkTimeout: number;
  /** Maximum file upload size (bytes) */
  maxFileSize: number;
}

export interface PerformanceMetrics {
  /** Time to first contentful paint */
  fcp: number;
  /** Largest contentful paint */
  lcp: number;
  /** First input delay */
  fid: number;
  /** Cumulative layout shift */
  cls: number;
  /** Time to interactive */
  tti: number;
  /** JavaScript heap size info */
  heapInfo?: {
    used: number;
    total: number;
    limit: number;
  };
}

/**
 * System Resources Detector
 * Analyzes and provides comprehensive system information
 */
export class SystemResourceDetector {
  private static instance: SystemResourceDetector | null = null;
  private systemInfo: SystemInfo | null = null;
  private performanceMetrics: PerformanceMetrics | null = null;

  private constructor() {
    this.detectSystemInfo();
  }

  public static getInstance(): SystemResourceDetector {
    if (!SystemResourceDetector.instance) {
      SystemResourceDetector.instance = new SystemResourceDetector();
    }
    return SystemResourceDetector.instance;
  }

  /**
   * Get comprehensive system information
   */
  public getSystemInfo(): SystemInfo {
    if (!this.systemInfo) {
      this.detectSystemInfo();
    }
    return this.systemInfo!;
  }

  /**
   * Get current performance metrics
   */
  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          resolve(this.collectPerformanceMetrics());
        });
      } else {
        setTimeout(() => {
          resolve(this.collectPerformanceMetrics());
        }, 0);
      }
    });
  }

  /**
   * Check if system meets minimum requirements
   */
  public meetsMinimumRequirements(requirements: {
    minRam?: number;
    minCores?: number;
    requiredApis?: string[];
  }): { meets: boolean; missing: string[] } {
    const info = this.getSystemInfo();
    const missing: string[] = [];

    if (requirements.minRam && info.hardware.estimatedRam < requirements.minRam) {
      missing.push(`Insufficient RAM: ${this.formatBytes(info.hardware.estimatedRam)} < ${this.formatBytes(requirements.minRam)}`);
    }

    if (requirements.minCores && info.hardware.cores < requirements.minCores) {
      missing.push(`Insufficient CPU cores: ${info.hardware.cores} < ${requirements.minCores}`);
    }

    if (requirements.requiredApis) {
      const missingApis = requirements.requiredApis.filter(api => {
        switch (api) {
          case 'webWorkers':
            return !info.capabilities.webApis.webWorkers;
          case 'webAssembly':
            return !info.capabilities.webApis.webAssembly;
          case 'performanceMemory':
            return !info.capabilities.webApis.performanceMemory;
          case 'serviceWorkers':
            return !info.capabilities.webApis.serviceWorkers;
          default:
            return false;
        }
      });
      missing.push(...missingApis.map(api => `Missing API: ${api}`));
    }

    return {
      meets: missing.length === 0,
      missing
    };
  }

  /**
   * Get optimal configuration based on system capabilities
   */
  public getOptimalConfig(): {
    memoryMonitorInterval: number;
    maxConcurrentOperations: number;
    enableDetailedMetrics: boolean;
    preferredStorageMethod: 'localStorage' | 'indexedDB' | 'memory';
    networkTimeout: number;
  } {
    const info = this.getSystemInfo();
    const isHighEnd = info.hardware.cores >= 8 && info.hardware.estimatedRam >= 8 * 1024 * 1024 * 1024;
    const isMobile = info.browser.mobile;

    return {
      memoryMonitorInterval: isMobile ? 2000 : isHighEnd ? 500 : 1000,
      maxConcurrentOperations: isHighEnd ? 10 : isMobile ? 3 : 6,
      enableDetailedMetrics: isHighEnd && !isMobile,
      preferredStorageMethod: info.capabilities.storage.indexedDB ? 'indexedDB' : 'localStorage',
      networkTimeout: isMobile ? 10000 : 5000,
    };
  }

  private detectSystemInfo(): void {
    this.systemInfo = {
      os: this.detectOS(),
      browser: this.detectBrowser(),
      hardware: this.detectHardware(),
      capabilities: this.detectCapabilities(),
      limits: this.calculateResourceLimits(),
    };
  }

  private detectOS(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';
    if (userAgent.includes('android')) return 'Android';
    if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';

    return 'Unknown';
  }

  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const userAgentLower = userAgent.toLowerCase();

    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    // Chrome
    if (userAgentLower.includes('chrome') && !userAgentLower.includes('edg')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }
    // Firefox
    else if (userAgentLower.includes('firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    }
    // Safari
    else if (userAgentLower.includes('safari') && !userAgentLower.includes('chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    }
    // Edge
    else if (userAgentLower.includes('edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }

    return {
      name,
      version,
      engine,
      platform: navigator.platform,
      mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    };
  }

  private detectHardware(): HardwareInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      cores: navigator.hardwareConcurrency || 1,
      estimatedRam: this.estimateRAM(),
      pixelRatio: window.devicePixelRatio || 1,
      screen: {
        width: screen.width,
        height: screen.height,
        availableWidth: screen.availWidth,
        availableHeight: screen.availHeight,
      },
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      connection: connection ? {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      } : undefined,
    };
  }

  private detectCapabilities(): SystemCapabilities {
    return {
      webApis: {
        performanceMemory: 'memory' in performance,
        performanceObserver: 'PerformanceObserver' in window,
        webWorkers: typeof Worker !== 'undefined',
        serviceWorkers: 'serviceWorker' in navigator,
        webAssembly: typeof WebAssembly !== 'undefined',
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        broadcastChannel: typeof BroadcastChannel !== 'undefined',
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        atomics: typeof Atomics !== 'undefined',
      },
      storage: {
        localStorage: this.testLocalStorage(),
        sessionStorage: this.testSessionStorage(),
        indexedDB: 'indexedDB' in window,
        quota: this.estimateStorageQuota(),
      },
      media: {
        webRTC: 'RTCPeerConnection' in window,
        mediaDevices: 'mediaDevices' in navigator,
        getUserMedia: 'getUserMedia' in navigator || 'webkitGetUserMedia' in navigator || 'mozGetUserMedia' in navigator,
      },
    };
  }

  private calculateResourceLimits(): ResourceLimits {
    const hardware = this.detectHardware();
    const browser = this.detectBrowser();
    const isMobile = browser.mobile;

    return {
      maxSafeMemory: Math.floor(hardware.estimatedRam * (isMobile ? 0.3 : 0.6)),
      maxConcurrentOperations: Math.min(hardware.cores * 2, isMobile ? 4 : 12),
      storageQuota: this.estimateStorageQuota(),
      networkTimeout: isMobile ? 15000 : 10000,
      maxFileSize: isMobile ? 50 * 1024 * 1024 : 500 * 1024 * 1024, // 50MB mobile, 500MB desktop
    };
  }

  private estimateRAM(): number {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      // Estimate total RAM based on JS heap limit (very rough approximation)
      return (memory.jsHeapSizeLimit || 0) * 8; // Assume JS heap is ~1/8 of total RAM
    }

    // Fallback estimation based on cores and device type
    const cores = navigator.hardwareConcurrency || 1;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      if (cores >= 8) return 8 * 1024 * 1024 * 1024; // 8GB
      if (cores >= 6) return 6 * 1024 * 1024 * 1024; // 6GB
      if (cores >= 4) return 4 * 1024 * 1024 * 1024; // 4GB
      return 2 * 1024 * 1024 * 1024; // 2GB
    }

    // Desktop estimation
    if (cores >= 16) return 32 * 1024 * 1024 * 1024; // 32GB
    if (cores >= 8) return 16 * 1024 * 1024 * 1024;  // 16GB
    if (cores >= 4) return 8 * 1024 * 1024 * 1024;   // 8GB
    if (cores >= 2) return 4 * 1024 * 1024 * 1024;   // 4GB
    return 2 * 1024 * 1024 * 1024; // 2GB minimum
  }

  private estimateStorageQuota(): number {
    // Default estimates based on browser and device type
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      return 100 * 1024 * 1024; // 100MB for mobile
    }
    
    return 1024 * 1024 * 1024; // 1GB for desktop
  }

  private testLocalStorage(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testSessionStorage(): boolean {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    let fcp = 0;
    let lcp = 0;

    // First Contentful Paint
    const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) fcp = fcpEntry.startTime;

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch {
        // LCP not supported
      }
    }

    let heapInfo: PerformanceMetrics['heapInfo'] = undefined;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      heapInfo = {
        used: memory.usedJSHeapSize || 0,
        total: memory.totalJSHeapSize || 0,
        limit: memory.jsHeapSizeLimit || 0,
      };
    }

    return {
      fcp,
      lcp,
      fid: 0, // Would need input event tracking
      cls: 0, // Would need layout shift tracking  
      tti: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      heapInfo,
    };
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

/**
 * Utility functions for system resource management
 */

export const getSystemInfo = (): SystemInfo => {
  return SystemResourceDetector.getInstance().getSystemInfo();
};

export const getOptimalConfig = () => {
  return SystemResourceDetector.getInstance().getOptimalConfig();
};

export const checkSystemRequirements = (requirements: {
  minRam?: number;
  minCores?: number;
  requiredApis?: string[];
}) => {
  return SystemResourceDetector.getInstance().meetsMinimumRequirements(requirements);
};

export const getPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  return SystemResourceDetector.getInstance().getPerformanceMetrics();
};

/**
 * Resource monitoring utilities
 */
export const createResourceMonitor = (callback: (metrics: PerformanceMetrics) => void, interval = 5000) => {
  let intervalId: number;

  const start = () => {
    intervalId = window.setInterval(async () => {
      try {
        const metrics = await getPerformanceMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Failed to collect performance metrics:', error);
      }
    }, interval);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  return { start, stop };
};

/**
 * Platform-specific optimizations
 */
export const getPlatformOptimizations = () => {
  const info = getSystemInfo();
  const optimizations: Record<string, any> = {};

  // Mobile optimizations
  if (info.browser.mobile) {
    optimizations.reducedAnimations = true;
    optimizations.lowerPollingRate = true;
    optimizations.aggressiveCaching = true;
    optimizations.reducedConcurrency = true;
  }

  // Low-end device optimizations
  if (info.hardware.cores <= 2 || info.hardware.estimatedRam <= 2 * 1024 * 1024 * 1024) {
    optimizations.disableNonEssentialFeatures = true;
    optimizations.increaseThrottling = true;
    optimizations.reduceBatchSizes = true;
  }

  // High-end device optimizations
  if (info.hardware.cores >= 8 && info.hardware.estimatedRam >= 16 * 1024 * 1024 * 1024) {
    optimizations.enableAdvancedFeatures = true;
    optimizations.increaseConcurrency = true;
    optimizations.enableDetailedMonitoring = true;
  }

  return optimizations;
};