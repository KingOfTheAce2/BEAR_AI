// Priority-based Request Scheduler

import { QueueRequest, RequestPriority, RequestStatus, SystemResources, ResourceRequirements } from './types';

export class PriorityScheduler {
  private queues: Map<RequestPriority, QueueRequest[]> = new Map();
  private activeRequests: Map<string, QueueRequest> = new Map();
  private priorityWeights: Map<RequestPriority, number> = new Map();
  private resourceMonitor: ResourceMonitor;

  constructor(
    priorityWeights: Record<RequestPriority, number> = {
      [RequestPriority.CRITICAL]: 10,
      [RequestPriority.HIGH]: 7,
      [RequestPriority.NORMAL]: 5,
      [RequestPriority.LOW]: 3,
      [RequestPriority.BACKGROUND]: 1
    }
  ) {
    // Initialize priority queues
    Object.values(RequestPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.queues.set(priority, []);
        this.priorityWeights.set(priority, priorityWeights[priority] || 1);
      }
    });

    this.resourceMonitor = new ResourceMonitor();
  }

  /**
   * Add request to appropriate priority queue
   */
  enqueue(request: QueueRequest): void {
    const queue = this.queues.get(request.priority);
    if (!queue) {
      throw new Error(`Invalid priority: ${request.priority}`);
    }

    // Insert request in sorted position based on creation time for FIFO within priority
    const insertIndex = this.findInsertPosition(queue, request);
    queue.splice(insertIndex, 0, request);

    request.status = RequestStatus.PENDING;
    request.scheduledAt = Date.now();
  }

  /**
   * Get next request to process based on priority and resource availability
   */
  dequeue(availableResources: SystemResources): QueueRequest | null {
    // Check each priority level starting from highest
    for (const priority of this.getSortedPriorities()) {
      const queue = this.queues.get(priority);
      if (!queue || queue.length === 0) continue;

      // Find first request that can be processed with available resources
      for (let i = 0; i < queue.length; i++) {
        const request = queue[i];
        
        // Check if dependencies are satisfied
        if (!this.areDependenciesSatisfied(request)) continue;

        // Check if resources are available
        if (this.canProcessWithResources(request, availableResources)) {
          queue.splice(i, 1);
          this.activeRequests.set(request.id, request);
          request.status = RequestStatus.PROCESSING;
          request.startedAt = Date.now();
          return request;
        }
      }
    }

    return null;
  }

  /**
   * Remove request from queue or active requests
   */
  remove(requestId: string): boolean {
    // Check active requests first
    if (this.activeRequests.has(requestId)) {
      this.activeRequests.delete(requestId);
      return true;
    }

    // Check all priority queues
    for (const queue of this.queues.values()) {
      const index = queue.findIndex(req => req.id === requestId);
      if (index !== -1) {
        queue.splice(index, 1);
        return true;
      }
    }

    return false;
  }

  /**
   * Mark request as completed
   */
  complete(requestId: string, result?: any): boolean {
    const request = this.activeRequests.get(requestId);
    if (!request) return false;

    request.status = RequestStatus.COMPLETED;
    request.completedAt = Date.now();
    request.result = result;
    
    this.activeRequests.delete(requestId);
    return true;
  }

  /**
   * Mark request as failed and potentially requeue for retry
   */
  fail(requestId: string, error: Error): boolean {
    const request = this.activeRequests.get(requestId);
    if (!request) return false;

    request.error = error;
    request.retryCount++;

    if (request.retryCount < request.maxRetries) {
      request.status = RequestStatus.RETRYING;
      // Requeue with exponential backoff
      const delay = Math.pow(2, request.retryCount) * 1000;
      setTimeout(() => {
        request.status = RequestStatus.PENDING;
        this.enqueue(request);
      }, delay);
    } else {
      request.status = RequestStatus.FAILED;
      request.completedAt = Date.now();
    }

    this.activeRequests.delete(requestId);
    return true;
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const totalPending = Array.from(this.queues.values())
      .reduce((sum, queue) => sum + queue.length, 0);

    const priorityBreakdown = new Map<RequestPriority, number>();
    for (const [priority, queue] of this.queues) {
      priorityBreakdown.set(priority, queue.length);
    }

    return {
      totalPending,
      activeRequests: this.activeRequests.size,
      priorityBreakdown: Object.fromEntries(priorityBreakdown),
      oldestWaitingTime: this.getOldestWaitingTime(),
      averageWaitTime: this.getAverageWaitTime()
    };
  }

  /**
   * Get all pending requests (for monitoring)
   */
  getPendingRequests(): QueueRequest[] {
    const allRequests: QueueRequest[] = [];
    for (const queue of this.queues.values()) {
      allRequests.push(...queue);
    }
    return allRequests.sort((a, b) => this.compareRequestPriority(a, b));
  }

  /**
   * Get all active requests
   */
  getActiveRequests(): QueueRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.queues.forEach(queue => queue.length = 0);
    this.activeRequests.clear();
  }

  private findInsertPosition(queue: QueueRequest[], request: QueueRequest): number {
    // Insert at end for FIFO within same priority
    return queue.length;
  }

  private getSortedPriorities(): RequestPriority[] {
    return Array.from(this.priorityWeights.keys()).sort((a, b) => a - b);
  }

  private areDependenciesSatisfied(request: QueueRequest): boolean {
    if (!request.dependencies || request.dependencies.length === 0) {
      return true;
    }

    return request.dependencies.every(depId => {
      // Check if dependency is completed
      const activeReq = this.activeRequests.get(depId);
      return !activeReq; // If not active, assume it's completed
    });
  }

  private canProcessWithResources(request: QueueRequest, available: SystemResources): boolean {
    const required = request.resourceRequirements;
    
    return (
      available.cpu.available >= required.cpu &&
      available.memory.available >= required.memory &&
      available.network.bandwidth >= required.network &&
      available.disk.available >= required.disk
    );
  }

  private compareRequestPriority(a: QueueRequest, b: QueueRequest): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority; // Lower number = higher priority
    }
    return a.createdAt - b.createdAt; // FIFO within same priority
  }

  private getOldestWaitingTime(): number {
    let oldest = 0;
    const now = Date.now();
    
    for (const queue of this.queues.values()) {
      for (const request of queue) {
        const waitTime = now - request.createdAt;
        oldest = Math.max(oldest, waitTime);
      }
    }
    
    return oldest;
  }

  private getAverageWaitTime(): number {
    let totalWaitTime = 0;
    let requestCount = 0;
    const now = Date.now();
    
    for (const queue of this.queues.values()) {
      for (const request of queue) {
        totalWaitTime += now - request.createdAt;
        requestCount++;
      }
    }
    
    return requestCount > 0 ? totalWaitTime / requestCount : 0;
  }
}

// Resource monitoring utility
class ResourceMonitor {
  private lastUpdate = 0;
  private updateInterval = 1000; // 1 second
  private cachedResources: SystemResources | null = null;

  async getCurrentResources(): Promise<SystemResources> {
    const now = Date.now();
    if (this.cachedResources && (now - this.lastUpdate) < this.updateInterval) {
      return this.cachedResources;
    }

    // In a browser environment, we'll estimate resources
    const resources: SystemResources = {
      cpu: {
        usage: this.estimateCpuUsage(),
        available: 1.0 - this.estimateCpuUsage(),
        cores: navigator.hardwareConcurrency || 4
      },
      memory: {
        used: this.estimateMemoryUsage(),
        available: this.estimateAvailableMemory(),
        total: this.estimateTotalMemory()
      },
      network: {
        bandwidth: this.estimateNetworkBandwidth(),
        latency: this.estimateNetworkLatency()
      },
      disk: {
        usage: 0, // Not available in browser
        available: Infinity // Assume unlimited for local processing
      }
    };

    this.cachedResources = resources;
    this.lastUpdate = now;
    return resources;
  }

  private estimateCpuUsage(): number {
    // Simple estimation based on performance timing
    const start = performance.now();
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      Math.random();
    }
    const duration = performance.now() - start;
    
    // Normalize to 0-1 scale (rough estimation)
    return Math.min(duration / 10, 1.0);
  }

  private estimateMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  private estimateAvailableMemory(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return (memory.jsHeapSizeLimit || 2147483648) - (memory.usedJSHeapSize || 0);
    }
    return 2147483648; // 2GB default
  }

  private estimateTotalMemory(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit || 2147483648;
    }
    return 2147483648; // 2GB default
  }

  private estimateNetworkBandwidth(): number {
    // Use connection API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return (connection.downlink || 10) * 1000; // Convert Mbps to Kbps
    }
    return 10000; // 10 Mbps default
  }

  private estimateNetworkLatency(): number {
    // Use connection API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.rtt || 50;
    }
    return 50; // 50ms default
  }
}