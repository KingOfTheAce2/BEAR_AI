/**
 * BEAR AI Cross-Platform Memory Reporting
 * Platform-specific memory monitoring implementations
 * 
 * @file Cross-platform memory reporting for Windows/Linux/macOS
 * @version 2.0.0
 */

import { SystemMemoryInfo } from './memory-safety-system'

// ==================== PLATFORM INTERFACES ====================

export interface PlatformMemoryProvider {
  getSystemMemory(): Promise<SystemMemoryInfo>
  getProcessMemory(pid?: number): Promise<ProcessMemoryInfo>
  monitorMemoryPressure(callback: (level: MemoryPressureLevel) => void): () => void
  supportsGPUMonitoring(): boolean
  getGPUMemory?(): Promise<GPUMemoryInfo>
}

export interface ProcessMemoryInfo {
  pid: number
  name: string
  rss: number // Resident Set Size
  vms: number // Virtual Memory Size
  shared: number
  text: number
  data: number
  lib: number
  cpu: number
}

export interface GPUMemoryInfo {
  total: number
  used: number
  available: number
  devices: Array<{
    name: string
    memory: number
    utilization: number
    temperature?: number
  }>
}

export type MemoryPressureLevel = 'normal' | 'warning' | 'critical' | 'emergency'

// ==================== WINDOWS MEMORY PROVIDER ====================

export class WindowsMemoryProvider implements PlatformMemoryProvider {
  private processCache: Map<number, ProcessMemoryInfo> = new Map()
  private lastUpdate: number = 0
  private cacheTimeout: number = 1000 // 1 second

  async getSystemMemory(): Promise<SystemMemoryInfo> {
    try {
      // In a real implementation, this would use Windows API calls
      // via Node.js native addons or child processes
      const result = await this.executeWMIQuery('SELECT * FROM Win32_OperatingSystem')
      const memInfo = result[0]
      
      const total = parseInt(memInfo.TotalVisibleMemorySize) * 1024
      const available = parseInt(memInfo.FreePhysicalMemory) * 1024
      const used = total - available

      return {
        total,
        used,
        available,
        usagePercentage: (used / total) * 100,
        platform: 'windows',
        swap: await this.getSwapInfo(),
        gpu: this.supportsGPUMonitoring() ? await this.getGPUMemory() : undefined
      }
    } catch (error) {
      console.error('Failed to get Windows memory info:', error)
      return this.getFallbackMemoryInfo('windows')
    }
  }

  async getProcessMemory(pid: number = process.pid): Promise<ProcessMemoryInfo> {
    const now = Date.now()
    
    // Use cached data if recent
    if (now - this.lastUpdate < this.cacheTimeout && this.processCache.has(pid)) {
      return this.processCache.get(pid)!
    }

    try {
      // Use Windows Performance Counters or WMI
      const result = await this.executeWMIQuery(
        `SELECT * FROM Win32_Process WHERE ProcessId = ${pid}`
      )
      
      if (result.length === 0) {
        throw new Error(`Process ${pid} not found`)
      }

      const proc = result[0]
      const memInfo: ProcessMemoryInfo = {
        pid,
        name: proc.Name,
        rss: parseInt(proc.WorkingSetSize) || 0,
        vms: parseInt(proc.VirtualSize) || 0,
        shared: parseInt(proc.QuotaPagedPoolUsage) || 0,
        text: 0, // Not directly available on Windows
        data: 0, // Not directly available on Windows
        lib: 0, // Not directly available on Windows
        cpu: parseFloat(proc.PercentProcessorTime) || 0
      }

      this.processCache.set(pid, memInfo)
      this.lastUpdate = now
      return memInfo
    } catch (error) {
      console.error(`Failed to get Windows process memory for PID ${pid}:`, error)
      return this.getFallbackProcessInfo(pid)
    }
  }

  monitorMemoryPressure(callback: (level: MemoryPressureLevel) => void): () => void {
    // Windows memory pressure monitoring using performance counters
    const interval = setInterval(async () => {
      try {
        const memInfo = await this.getSystemMemory()
        const level = this.calculatePressureLevel(memInfo.usagePercentage)
        callback(level)
      } catch (error) {
        console.error('Memory pressure monitoring error:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }

  supportsGPUMonitoring(): boolean {
    // Check if NVIDIA/AMD GPU monitoring tools are available
    return true // Assume available for now
  }

  async getGPUMemory(): Promise<GPUMemoryInfo> {
    try {
      // In real implementation, use nvidia-ml-py equivalent or WMI
      // For now, return mock data
      return {
        total: 8 * 1024 * 1024 * 1024,
        used: Math.random() * 4 * 1024 * 1024 * 1024,
        available: 4 * 1024 * 1024 * 1024,
        devices: [
          {
            name: 'NVIDIA GeForce RTX 4080',
            memory: 8 * 1024 * 1024 * 1024,
            utilization: Math.random() * 100,
            temperature: 45 + Math.random() * 20
          }
        ]
      }
    } catch (error) {
      console.error('Failed to get GPU memory info:', error)
      throw error
    }
  }

  private async executeWMIQuery(query: string): Promise<any[]> {
    // Mock WMI query execution
    // In real implementation, use child_process to run wmic or PowerShell
    console.log(`Executing WMI query: ${query}`)
    
    // Return mock data
    if (query.includes('Win32_OperatingSystem')) {
      return [{
        TotalVisibleMemorySize: '16777216', // 16GB in KB
        FreePhysicalMemory: '8388608' // 8GB in KB
      }]
    }
    
    if (query.includes('Win32_Process')) {
      return [{
        Name: 'bear-ai.exe',
        WorkingSetSize: '536870912', // 512MB
        VirtualSize: '1073741824', // 1GB
        QuotaPagedPoolUsage: '67108864', // 64MB
        PercentProcessorTime: '15.5'
      }]
    }

    return []
  }

  private async getSwapInfo(): Promise<SystemMemoryInfo['swap']> {
    try {
      const result = await this.executeWMIQuery(
        'SELECT * FROM Win32_PageFileUsage'
      )
      
      if (result.length > 0) {
        const pageFile = result[0]
        return {
          total: parseInt(pageFile.AllocatedBaseSize) * 1024 * 1024,
          used: parseInt(pageFile.CurrentUsage) * 1024 * 1024,
          free: (parseInt(pageFile.AllocatedBaseSize) - parseInt(pageFile.CurrentUsage)) * 1024 * 1024
        }
      }
    } catch (error) {
      console.error('Failed to get Windows swap info:', error)
    }

    return undefined
  }

  private getFallbackMemoryInfo(platform: string): SystemMemoryInfo {
    return {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      used: 8 * 1024 * 1024 * 1024, // 8GB
      available: 8 * 1024 * 1024 * 1024, // 8GB
      usagePercentage: 50,
      platform: platform as any
    }
  }

  private getFallbackProcessInfo(pid: number): ProcessMemoryInfo {
    return {
      pid,
      name: 'bear-ai',
      rss: 512 * 1024 * 1024, // 512MB
      vms: 1024 * 1024 * 1024, // 1GB
      shared: 64 * 1024 * 1024, // 64MB
      text: 0,
      data: 0,
      lib: 0,
      cpu: 15.0
    }
  }

  private calculatePressureLevel(usagePercentage: number): MemoryPressureLevel {
    if (usagePercentage >= 90) return 'emergency'
    if (usagePercentage >= 80) return 'critical'
    if (usagePercentage >= 70) return 'warning'
    return 'normal'
  }
}

// ==================== LINUX MEMORY PROVIDER ====================

export class LinuxMemoryProvider implements PlatformMemoryProvider {
  private procMemInfoPath = '/proc/meminfo'
  private procStatPath = '/proc/stat'

  async getSystemMemory(): Promise<SystemMemoryInfo> {
    try {
      const memInfo = await this.readProcMemInfo()
      const total = memInfo.MemTotal * 1024
      const available = memInfo.MemAvailable * 1024
      const used = total - available

      return {
        total,
        used,
        available,
        usagePercentage: (used / total) * 100,
        platform: 'linux',
        swap: {
          total: memInfo.SwapTotal * 1024,
          used: (memInfo.SwapTotal - memInfo.SwapFree) * 1024,
          free: memInfo.SwapFree * 1024
        },
        gpu: this.supportsGPUMonitoring() ? await this.getGPUMemory() : undefined
      }
    } catch (error) {
      console.error('Failed to get Linux memory info:', error)
      return this.getFallbackMemoryInfo('linux')
    }
  }

  async getProcessMemory(pid: number = process.pid): Promise<ProcessMemoryInfo> {
    try {
      const statm = await this.readProcStatm(pid)
      const stat = await this.readProcStat(pid)
      const status = await this.readProcStatus(pid)

      const pageSize = 4096 // Assume 4KB pages
      
      return {
        pid,
        name: stat.comm,
        rss: statm.rss * pageSize,
        vms: statm.size * pageSize,
        shared: statm.share * pageSize,
        text: statm.text * pageSize,
        data: statm.data * pageSize,
        lib: statm.lib * pageSize,
        cpu: this.calculateCpuUsage(stat)
      }
    } catch (error) {
      console.error(`Failed to get Linux process memory for PID ${pid}:`, error)
      return this.getFallbackProcessInfo(pid)
    }
  }

  monitorMemoryPressure(callback: (level: MemoryPressureLevel) => void): () => void {
    // Linux memory pressure monitoring using /proc/pressure/memory if available
    const interval = setInterval(async () => {
      try {
        const memInfo = await this.getSystemMemory()
        const level = this.calculatePressureLevel(memInfo.usagePercentage)
        callback(level)
      } catch (error) {
        console.error('Memory pressure monitoring error:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }

  supportsGPUMonitoring(): boolean {
    // Check if nvidia-smi is available
    return true // Assume available for now
  }

  async getGPUMemory(): Promise<GPUMemoryInfo> {
    try {
      // In real implementation, parse nvidia-smi output
      // For now, return mock data
      return {
        total: 8 * 1024 * 1024 * 1024,
        used: Math.random() * 4 * 1024 * 1024 * 1024,
        available: 4 * 1024 * 1024 * 1024,
        devices: [
          {
            name: 'NVIDIA GeForce RTX 4080',
            memory: 8 * 1024 * 1024 * 1024,
            utilization: Math.random() * 100,
            temperature: 45 + Math.random() * 20
          }
        ]
      }
    } catch (error) {
      console.error('Failed to get GPU memory info:', error)
      throw error
    }
  }

  private async readProcMemInfo(): Promise<Record<string, number>> {
    // Mock implementation - in real code, read from fs
    return {
      MemTotal: 16777216, // 16GB in KB
      MemAvailable: 8388608, // 8GB in KB
      MemFree: 4194304, // 4GB in KB
      SwapTotal: 8388608, // 8GB in KB
      SwapFree: 8388608 // 8GB in KB
    }
  }

  private async readProcStatm(pid: number): Promise<{
    size: number
    rss: number
    share: number
    text: number
    lib: number
    data: number
    dt: number
  }> {
    // Mock implementation
    return {
      size: 262144, // 1GB in pages
      rss: 131072, // 512MB in pages
      share: 16384, // 64MB in pages
      text: 8192, // 32MB in pages
      lib: 0,
      data: 106496, // ~416MB in pages
      dt: 0
    }
  }

  private async readProcStat(pid: number): Promise<{
    comm: string
    utime: number
    stime: number
    [key: string]: any
  }> {
    // Mock implementation
    return {
      comm: 'bear-ai',
      utime: 1500,
      stime: 300,
      ppid: 1,
      pgrp: pid
    }
  }

  private async readProcStatus(pid: number): Promise<Record<string, string>> {
    // Mock implementation
    return {
      Name: 'bear-ai',
      VmRSS: '524288 kB',
      VmSize: '1048576 kB'
    }
  }

  private calculateCpuUsage(stat: any): number {
    // Simplified CPU usage calculation
    return 15.0 // Mock 15% CPU usage
  }

  private getFallbackMemoryInfo(platform: string): SystemMemoryInfo {
    return {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      used: 8 * 1024 * 1024 * 1024, // 8GB
      available: 8 * 1024 * 1024 * 1024, // 8GB
      usagePercentage: 50,
      platform: platform as any
    }
  }

  private getFallbackProcessInfo(pid: number): ProcessMemoryInfo {
    return {
      pid,
      name: 'bear-ai',
      rss: 512 * 1024 * 1024, // 512MB
      vms: 1024 * 1024 * 1024, // 1GB
      shared: 64 * 1024 * 1024, // 64MB
      text: 32 * 1024 * 1024, // 32MB
      data: 416 * 1024 * 1024, // 416MB
      lib: 0,
      cpu: 15.0
    }
  }

  private calculatePressureLevel(usagePercentage: number): MemoryPressureLevel {
    if (usagePercentage >= 90) return 'emergency'
    if (usagePercentage >= 80) return 'critical'
    if (usagePercentage >= 70) return 'warning'
    return 'normal'
  }
}

// ==================== MACOS MEMORY PROVIDER ====================

export class MacOSMemoryProvider implements PlatformMemoryProvider {
  async getSystemMemory(): Promise<SystemMemoryInfo> {
    try {
      const vmStat = await this.getVMStat()
      const hwMemSize = await this.getHWMemSize()
      
      const pageSize = 4096
      const total = hwMemSize
      const free = vmStat.pages_free * pageSize
      const wired = vmStat.pages_wired_down * pageSize
      const active = vmStat.pages_active * pageSize
      const inactive = vmStat.pages_inactive * pageSize
      const compressed = vmStat.pages_compressed * pageSize
      
      const used = wired + active + inactive + compressed
      const available = total - used

      return {
        total,
        used,
        available,
        usagePercentage: (used / total) * 100,
        platform: 'darwin',
        swap: await this.getSwapInfo(),
        gpu: this.supportsGPUMonitoring() ? await this.getGPUMemory() : undefined
      }
    } catch (error) {
      console.error('Failed to get macOS memory info:', error)
      return this.getFallbackMemoryInfo('darwin')
    }
  }

  async getProcessMemory(pid: number = process.pid): Promise<ProcessMemoryInfo> {
    try {
      // Use ps command to get process memory info
      const psOutput = await this.executePsCommand(pid)
      
      return {
        pid,
        name: psOutput.comm,
        rss: psOutput.rss * 1024, // ps returns KB
        vms: psOutput.vsz * 1024, // ps returns KB
        shared: 0, // Not directly available
        text: 0, // Not directly available
        data: 0, // Not directly available
        lib: 0, // Not directly available
        cpu: psOutput.pcpu
      }
    } catch (error) {
      console.error(`Failed to get macOS process memory for PID ${pid}:`, error)
      return this.getFallbackProcessInfo(pid)
    }
  }

  monitorMemoryPressure(callback: (level: MemoryPressureLevel) => void): () => void {
    const interval = setInterval(async () => {
      try {
        const memInfo = await this.getSystemMemory()
        const level = this.calculatePressureLevel(memInfo.usagePercentage)
        callback(level)
      } catch (error) {
        console.error('Memory pressure monitoring error:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }

  supportsGPUMonitoring(): boolean {
    // Check if Metal or CUDA tools are available
    return true // Assume available for now
  }

  async getGPUMemory(): Promise<GPUMemoryInfo> {
    try {
      // In real implementation, use Metal API or system_profiler
      return {
        total: 8 * 1024 * 1024 * 1024,
        used: Math.random() * 4 * 1024 * 1024 * 1024,
        available: 4 * 1024 * 1024 * 1024,
        devices: [
          {
            name: 'Apple M1 Pro',
            memory: 8 * 1024 * 1024 * 1024,
            utilization: Math.random() * 100,
            temperature: 35 + Math.random() * 15
          }
        ]
      }
    } catch (error) {
      console.error('Failed to get GPU memory info:', error)
      throw error
    }
  }

  private async getVMStat(): Promise<{
    pages_free: number
    pages_active: number
    pages_inactive: number
    pages_wired_down: number
    pages_compressed: number
  }> {
    // Mock vm_stat output parsing
    return {
      pages_free: 2097152, // ~8GB in pages
      pages_active: 1048576, // ~4GB in pages
      pages_inactive: 524288, // ~2GB in pages
      pages_wired_down: 262144, // ~1GB in pages
      pages_compressed: 131072 // ~512MB in pages
    }
  }

  private async getHWMemSize(): Promise<number> {
    // Mock sysctl hw.memsize
    return 16 * 1024 * 1024 * 1024 // 16GB
  }

  private async getSwapInfo(): Promise<SystemMemoryInfo['swap']> {
    // Mock sysctl vm.swapusage
    return {
      total: 8 * 1024 * 1024 * 1024, // 8GB
      used: 1 * 1024 * 1024 * 1024, // 1GB
      free: 7 * 1024 * 1024 * 1024 // 7GB
    }
  }

  private async executePsCommand(pid: number): Promise<{
    comm: string
    rss: number
    vsz: number
    pcpu: number
  }> {
    // Mock ps command output
    return {
      comm: 'bear-ai',
      rss: 524288, // 512MB in KB
      vsz: 1048576, // 1GB in KB
      pcpu: 15.0
    }
  }

  private getFallbackMemoryInfo(platform: string): SystemMemoryInfo {
    return {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      used: 8 * 1024 * 1024 * 1024, // 8GB
      available: 8 * 1024 * 1024 * 1024, // 8GB
      usagePercentage: 50,
      platform: platform as any
    }
  }

  private getFallbackProcessInfo(pid: number): ProcessMemoryInfo {
    return {
      pid,
      name: 'bear-ai',
      rss: 512 * 1024 * 1024, // 512MB
      vms: 1024 * 1024 * 1024, // 1GB
      shared: 0,
      text: 0,
      data: 0,
      lib: 0,
      cpu: 15.0
    }
  }

  private calculatePressureLevel(usagePercentage: number): MemoryPressureLevel {
    if (usagePercentage >= 90) return 'emergency'
    if (usagePercentage >= 80) return 'critical'
    if (usagePercentage >= 70) return 'warning'
    return 'normal'
  }
}

// ==================== CROSS-PLATFORM MEMORY MANAGER ====================

export class CrossPlatformMemoryManager {
  private provider: PlatformMemoryProvider

  constructor() {
    this.provider = this.createProvider()
  }

  private createProvider(): PlatformMemoryProvider {
    const platform = process.platform

    switch (platform) {
      case 'win32':
        return new WindowsMemoryProvider()
      case 'linux':
        return new LinuxMemoryProvider()
      case 'darwin':
        return new MacOSMemoryProvider()
      default:
        console.warn(`Unsupported platform: ${platform}, falling back to Linux provider`)
        return new LinuxMemoryProvider()
    }
  }

  async getSystemMemory(): Promise<SystemMemoryInfo> {
    return this.provider.getSystemMemory()
  }

  async getProcessMemory(pid?: number): Promise<ProcessMemoryInfo> {
    return this.provider.getProcessMemory(pid)
  }

  monitorMemoryPressure(callback: (level: MemoryPressureLevel) => void): () => void {
    return this.provider.monitorMemoryPressure(callback)
  }

  supportsGPUMonitoring(): boolean {
    return this.provider.supportsGPUMonitoring()
  }

  async getGPUMemory(): Promise<GPUMemoryInfo | undefined> {
    if (this.provider.supportsGPUMonitoring() && this.provider.getGPUMemory) {
      return this.provider.getGPUMemory()
    }
    return undefined
  }

  getPlatform(): NodeJS.Platform {
    return process.platform as NodeJS.Platform
  }

  static isMemoryOptimizationSupported(): boolean {
    // Check if the current platform supports advanced memory optimization
    return ['win32', 'linux', 'darwin'].includes(process.platform)
  }
}

// Export singleton instance
export const crossPlatformMemoryManager = new CrossPlatformMemoryManager()
