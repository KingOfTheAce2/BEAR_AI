export interface SystemInfo {

  platform: string;
  cores: number;
  memory?: number;
  deviceMemory?: number;
  connection?: string;
  userAgent?: string;
  language?: string;
}

export interface OptimalSystemConfig {
  memoryMonitorInterval: number;
  enableDetailedMetrics: boolean;
  historySize: number;
  smoothingFactor: number;
  maxSamples: number;
  adaptiveSampling: boolean;
}

const CONNECTION_WEIGHTS: Record<string, number> = {
  'slow-2g': 0.25,
  '2g': 0.5,
  '3g': 0.75,
  '4g': 1,
  '5g': 1.2
};

export function getSystemInfo(): SystemInfo {
  if (typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      cores: 4
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  return {
    platform: nav.platform || 'web',
    cores: nav.hardwareConcurrency || 4,
    memory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory * 1024 : undefined,
    deviceMemory: nav.deviceMemory,
    connection: nav.connection?.effectiveType,
    userAgent: nav.userAgent,
    language: nav.language
  };
}

export function getOptimalConfig(systemInfo: SystemInfo = getSystemInfo()): OptimalSystemConfig {
  const cores = systemInfo.cores || 4;
  const memoryGb = systemInfo.deviceMemory || (typeof systemInfo.memory === 'number' ? systemInfo.memory / 1024 : 4);
  const connectionWeight = systemInfo.connection ? CONNECTION_WEIGHTS[systemInfo.connection] ?? 1 : 1;

  const isLowPowerDevice = memoryGb <= 4 || cores <= 2;
  const isHighEndDevice = memoryGb >= 16 && cores >= 8;

  const intervalBase = isLowPowerDevice ? 4000 : isHighEndDevice ? 1200 : 2000;
  const interval = Math.round(intervalBase / connectionWeight);

  return {
    memoryMonitorInterval: Math.max(1000, interval),
    enableDetailedMetrics: !isLowPowerDevice,
    historySize: isLowPowerDevice ? 60 : isHighEndDevice ? 240 : 120,
    smoothingFactor: isLowPowerDevice ? 0.2 : 0.1,
    maxSamples: isHighEndDevice ? 300 : isLowPowerDevice ? 80 : 180,
    adaptiveSampling: !!systemInfo.connection
  };
}
