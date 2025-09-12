// Hooks Index  
// Central export file for all custom React hooks

export { useResponsive, useMediaQuery } from './useResponsive';
export type { BreakpointConfig } from './useResponsive';

export { useClickOutside } from './useClickOutside';

export { 
  useMemoryMonitor,
  useSimpleMemoryMonitor,
  useMemoryAlerts 
} from './useMemoryMonitor';

export type {
  UseMemoryMonitorOptions,
  UseMemoryMonitorReturn
} from './useMemoryMonitor';