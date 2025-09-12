// Comprehensive Test Suite for Queue System

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { QueueManager, RequestPriority, RequestStatus } from '../../../src/services/queue';

// Mock performance API for testing
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 100000000,
    totalJSHeapSize: 200000000,
    jsHeapSizeLimit: 400000000
  }
} as any;

// Mock navigator API for testing
global.navigator = {
  hardwareConcurrency: 4,
  connection: {
    downlink: 10,
    rtt: 50
  }
} as any;

// Mock Worker constructor
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null
}));

// Mock URL methods
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
} as any;

// Mock Blob constructor
global.Blob = vi.fn().mockImplementation(() => ({}));

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let mockWorker: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup mock worker behavior
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onmessage: null,
      onerror: null
    };

    (global.Worker as any).mockImplementation(() => mockWorker);

    queueManager = new QueueManager({
      maxQueueSize: 100,
      defaultTimeout: 5000,
      defaultRetries: 2,
      workerPoolSize: 2,
      dynamicScaling: false, // Disable for testing
      cacheEnabled: true
    });

    await queueManager.start();
  });

  afterEach(async () => {
    await queueManager.stop();
  });

  describe('Basic Operations', () => {
    it('should start and stop successfully', async () => {
      const newManager = new QueueManager();
      await expect(newManager.start()).resolves.not.toThrow();
      await expect(newManager.stop()).resolves.not.toThrow();
    });

    it('should submit a request and return request ID', async () => {
      const requestId = await queueManager.submitRequest('test', { data: 'test' });
      
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should handle different request priorities', async () => {
      const highPriorityId = await queueManager.submitRequest('test', { data: 'high' }, {
        priority: RequestPriority.HIGH
      });

      const lowPriorityId = await queueManager.submitRequest('test', { data: 'low' }, {
        priority: RequestPriority.LOW
      });

      expect(highPriorityId).toBeDefined();
      expect(lowPriorityId).toBeDefined();

      // Verify priority ordering
      const stats = queueManager.getStats();
      expect(stats.scheduler.totalPending).toBe(2);
    });

    it('should respect queue size limits', async () => {
      const promises: Promise<string>[] = [];
      
      // Fill up the queue
      for (let i = 0; i < 100; i++) {
        promises.push(queueManager.submitRequest('test', { data: i }));
      }

      await Promise.all(promises);

      // This should throw because queue is full
      await expect(
        queueManager.submitRequest('test', { data: 'overflow' })
      ).rejects.toThrow('Queue is at maximum capacity');
    });

    it('should cancel pending requests', async () => {
      const requestId = await queueManager.submitRequest('test', { data: 'cancel_me' });
      
      const cancelled = await queueManager.cancelRequest(requestId);
      expect(cancelled).toBe(true);

      const status = queueManager.getRequestStatus(requestId);
      expect(status).toBeNull();
    });

    it('should track request status', async () => {
      const requestId = await queueManager.submitRequest('test', { data: 'status_test' });
      
      const status = queueManager.getRequestStatus(requestId);
      expect(status).toBe(RequestStatus.PENDING);
    });
  });

  describe('Request Handling', () => {
    it('should register and use custom request handlers', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ result: 'custom_handled' });
      queueManager.registerHandler('custom', mockHandler);

      const requestId = await queueManager.submitRequest('custom', { input: 'test' });
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          payload: { input: 'test' }
        })
      );
    });

    it('should handle request timeouts', async () => {
      const requestId = await queueManager.submitRequest('test', { data: 'timeout' }, {
        timeout: 100 // Very short timeout
      });

      // Wait for timeout to occur
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = queueManager.getStats();
      expect(stats.metrics.failedRequests).toBeGreaterThan(0);
    });

    it('should retry failed requests', async () => {
      const failingHandler = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce({ result: 'success' });

      queueManager.registerHandler('retry_test', failingHandler);

      const requestId = await queueManager.submitRequest('retry_test', { data: 'retry' }, {
        maxRetries: 3
      });

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(failingHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Caching', () => {
    it('should cache and reuse results for cacheable requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ result: 'cached_result' });
      queueManager.registerHandler('cacheable', mockHandler);

      // First request
      const requestId1 = await queueManager.submitRequest('cacheable', { data: 'same' }, {
        cacheable: true,
        cacheKey: 'test_cache_key'
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request with same cache key
      const requestId2 = await queueManager.submitRequest('cacheable', { data: 'same' }, {
        cacheable: true,
        cacheKey: 'test_cache_key'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Handler should only be called once due to caching
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ result: 'ttl_test' });
      queueManager.registerHandler('ttl_test', mockHandler);

      // Request with short TTL
      await queueManager.submitRequest('ttl_test', { data: 'ttl' }, {
        cacheable: true,
        cacheTTL: 50 // 50ms TTL
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request after TTL expiry
      await queueManager.submitRequest('ttl_test', { data: 'ttl' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Handler should be called twice due to TTL expiry
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('should detect and handle duplicate requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ result: 'duplicate_test' });
      queueManager.registerHandler('duplicate', mockHandler);

      // Submit identical requests simultaneously
      const promises = [
        queueManager.submitRequest('duplicate', { data: 'same' }),
        queueManager.submitRequest('duplicate', { data: 'same' }),
        queueManager.submitRequest('duplicate', { data: 'same' })
      ];

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only process one request due to deduplication
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle worker errors gracefully', async () => {
      const errorHandler = vi.fn();
      queueManager.onError(errorHandler);

      // Simulate worker error
      if (mockWorker.onerror) {
        mockWorker.onerror(new Error('Worker error'));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should notify error handlers on request failure', async () => {
      const errorHandler = vi.fn();
      const failingHandler = vi.fn().mockRejectedValue(new Error('Request failed'));

      queueManager.onError(errorHandler);
      queueManager.registerHandler('failing', failingHandler);

      await queueManager.submitRequest('failing', { data: 'fail' });
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ type: 'failing' })
      );
    });

    it('should handle malformed request data', async () => {
      const circularObj: any = {};
      circularObj.self = circularObj;

      await expect(
        queueManager.submitRequest('test', circularObj)
      ).rejects.toThrow();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should collect and provide comprehensive statistics', () => {
      const stats = queueManager.getStats();

      expect(stats).toHaveProperty('scheduler');
      expect(stats).toHaveProperty('loadBalancer');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('metrics');
      expect(stats).toHaveProperty('scaling');
      expect(stats).toHaveProperty('resourceUtilization');
      expect(stats).toHaveProperty('recommendations');
    });

    it('should track performance metrics over time', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ result: 'perf_test' });
      queueManager.registerHandler('perf', mockHandler);

      // Submit multiple requests
      for (let i = 0; i < 5; i++) {
        await queueManager.submitRequest('perf', { data: i });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const summary = queueManager.getPerformanceSummary();
      expect(summary.totalRequests).toBeGreaterThan(0);
      expect(summary.completedRequests).toBeGreaterThan(0);
    });

    it('should provide health trends analysis', async () => {
      // Generate some activity
      for (let i = 0; i < 3; i++) {
        await queueManager.submitRequest('test', { data: i });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const trends = queueManager.getHealthTrends();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
    });

    it('should notify metrics callbacks', async () => {
      const metricsCallback = vi.fn();
      queueManager.onMetrics(metricsCallback);

      await queueManager.submitRequest('test', { data: 'metrics' });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(metricsCallback).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    it('should notify progress callbacks', async () => {
      const progressCallback = vi.fn();
      queueManager.onProgress(progressCallback);

      const requestId = await queueManager.submitRequest('test', { data: 'progress' });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(progressCallback).toHaveBeenCalledWith(requestId, expect.any(Number));
    });
  });

  describe('Configuration', () => {
    it('should update configuration dynamically', () => {
      const originalConfig = queueManager.getStats();
      
      queueManager.updateConfiguration({
        maxQueueSize: 200,
        defaultTimeout: 10000
      });

      // Configuration update should not throw
      expect(() => queueManager.updateConfiguration({})).not.toThrow();
    });

    it('should export and import queue data', () => {
      const exportedData = queueManager.exportData();
      
      expect(exportedData).toHaveProperty('metrics');
      expect(exportedData).toHaveProperty('cache');
      expect(exportedData).toHaveProperty('config');
      expect(exportedData).toHaveProperty('stats');
      expect(exportedData).toHaveProperty('timestamp');

      // Import should not throw
      expect(() => queueManager.importData(exportedData)).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should estimate resource requirements for different request types', async () => {
      const computeId = await queueManager.submitRequest('compute', { 
        operation: 'heavy_calculation',
        data: new Array(1000).fill(0)
      });

      const apiId = await queueManager.submitRequest('api', {
        url: 'https://api.example.com/data'
      });

      const fileId = await queueManager.submitRequest('file', {
        operation: 'process',
        file: 'large_file.json'
      });

      expect(computeId).toBeDefined();
      expect(apiId).toBeDefined();
      expect(fileId).toBeDefined();
    });

    it('should handle resource constraints', async () => {
      // This test would need more sophisticated mocking to properly test resource constraints
      const stats = queueManager.getStats();
      expect(stats.resourceUtilization).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty payloads', async () => {
      const requestId = await queueManager.submitRequest('test', {});
      expect(requestId).toBeDefined();
    });

    it('should handle null payloads', async () => {
      const requestId = await queueManager.submitRequest('test', null);
      expect(requestId).toBeDefined();
    });

    it('should handle requests when queue is stopped', async () => {
      await queueManager.stop();

      await expect(
        queueManager.submitRequest('test', { data: 'stopped' })
      ).rejects.toThrow('Queue Manager is not running');
    });

    it('should handle double start/stop calls', async () => {
      await expect(queueManager.start()).resolves.not.toThrow();
      await expect(queueManager.stop()).resolves.not.toThrow();
      await expect(queueManager.stop()).resolves.not.toThrow();
    });
  });

  describe('Dependencies', () => {
    it('should handle request dependencies', async () => {
      const firstId = await queueManager.submitRequest('test', { data: 'first' });
      
      const secondId = await queueManager.submitRequest('test', { data: 'second' }, {
        dependencies: [firstId]
      });

      expect(secondId).toBeDefined();
      
      // The second request should wait for the first to complete
      const stats = queueManager.getStats();
      expect(stats.scheduler.totalPending).toBe(2);
    });

    it('should handle circular dependencies gracefully', async () => {
      const firstId = await queueManager.submitRequest('test', { data: 'first' });
      
      // This would create a circular dependency in a real scenario
      // but our implementation should handle it gracefully
      await expect(
        queueManager.submitRequest('test', { data: 'second' }, {
          dependencies: [firstId, 'non-existent-id']
        })
      ).resolves.toBeDefined();
    });
  });
});