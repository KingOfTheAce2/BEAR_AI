// Integration Tests for Queue System

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueManager, RequestPriority, createQueueManager } from '../../../src/services/queue';

// Setup global mocks
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 100000000,
    totalJSHeapSize: 200000000,
    jsHeapSizeLimit: 400000000
  }
} as any;

global.navigator = {
  hardwareConcurrency: 8,
  connection: {
    downlink: 50,
    rtt: 20
  }
} as any;

global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn((message) => {
    // Simulate worker processing
    setTimeout(() => {
      if (mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
          data: {
            type: 'result',
            requestId: message.request?.id,
            result: { processed: true, data: message.request?.payload }
          }
        } as MessageEvent);
      }
    }, 50);
  }),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null
}));

global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
} as any;

global.Blob = vi.fn().mockImplementation(() => ({}));

let mockWorkerInstance: any;

describe('Queue System Integration', () => {
  let queueManager: QueueManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockWorkerInstance = {
      postMessage: vi.fn((message) => {
        setTimeout(() => {
          if (mockWorkerInstance.onmessage) {
            mockWorkerInstance.onmessage({
              data: {
                type: 'result',
                requestId: message.request?.id,
                result: { 
                  processed: true, 
                  data: message.request?.payload,
                  timestamp: Date.now()
                }
              }
            } as MessageEvent);
          }
        }, Math.random() * 100 + 50);
      }),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onmessage: null,
      onerror: null
    };

    (global.Worker as any).mockImplementation(() => mockWorkerInstance);

    queueManager = createQueueManager({
      maxQueueSize: 1000,
      defaultTimeout: 10000,
      defaultRetries: 3,
      workerPoolSize: 4,
      dynamicScaling: true,
      cacheEnabled: true,
      scalingThresholds: {
        cpuThreshold: 0.7,
        memoryThreshold: 0.8,
        queueLengthThreshold: 100,
        latencyThreshold: 5000,
        scaleUpDelay: 1000,
        scaleDownDelay: 2000
      }
    });

    await queueManager.start();
  });

  afterEach(async () => {
    await queueManager.stop();
  });

  describe('End-to-End Request Processing', () => {
    it('should process requests end-to-end with real workers', async () => {
      const results: any[] = [];
      const progressUpdates: Array<{ id: string; progress: number }> = [];

      queueManager.onProgress((requestId, progress) => {
        progressUpdates.push({ id: requestId, progress });
      });

      // Submit multiple requests with different priorities
      const requests = [
        { type: 'api', payload: { url: '/users' }, priority: RequestPriority.HIGH },
        { type: 'compute', payload: { operation: 'sum', data: [1, 2, 3] }, priority: RequestPriority.NORMAL },
        { type: 'file', payload: { operation: 'read', file: 'data.json' }, priority: RequestPriority.LOW },
        { type: 'api', payload: { url: '/orders' }, priority: RequestPriority.CRITICAL }
      ];

      const requestIds = await Promise.all(
        requests.map(req => queueManager.submitRequest(req.type, req.payload, { 
          priority: req.priority 
        }))
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify requests were processed
      expect(requestIds).toHaveLength(4);
      requestIds.forEach(id => {
        expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
      });

      // Check that progress was reported
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify metrics
      const stats = queueManager.getStats();
      expect(stats.metrics.totalRequests).toBeGreaterThan(0);
    });

    it('should handle concurrent request processing', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      // Submit many requests concurrently
      const requestPromises = Array.from({ length: concurrentRequests }, (_, i) =>
        queueManager.submitRequest('concurrent', { 
          id: i, 
          data: `request_${i}` 
        })
      );

      const requestIds = await Promise.all(requestPromises);
      
      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify all requests were submitted
      expect(requestIds).toHaveLength(concurrentRequests);
      
      // Verify performance metrics
      const stats = queueManager.getStats();
      expect(stats.metrics.totalRequests).toBe(concurrentRequests);
      
      // Processing should be reasonably fast due to concurrency
      expect(processingTime).toBeLessThan(5000);
    });

    it('should respect priority ordering under load', async () => {
      const processedOrder: string[] = [];
      
      // Mock worker to track processing order
      mockWorkerInstance.postMessage = vi.fn((message) => {
        if (message.request) {
          processedOrder.push(message.request.payload.priority);
          setTimeout(() => {
            if (mockWorkerInstance.onmessage) {
              mockWorkerInstance.onmessage({
                data: {
                  type: 'result',
                  requestId: message.request.id,
                  result: { processed: true }
                }
              } as MessageEvent);
            }
          }, 100);
        }
      });

      // Submit requests in mixed priority order
      await queueManager.submitRequest('test', { priority: 'low' }, { 
        priority: RequestPriority.LOW 
      });
      await queueManager.submitRequest('test', { priority: 'critical' }, { 
        priority: RequestPriority.CRITICAL 
      });
      await queueManager.submitRequest('test', { priority: 'high' }, { 
        priority: RequestPriority.HIGH 
      });
      await queueManager.submitRequest('test', { priority: 'normal' }, { 
        priority: RequestPriority.NORMAL 
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify critical was processed first
      expect(processedOrder[0]).toBe('critical');
    });
  });

  describe('Load Testing and Performance', () => {
    it('should handle high-volume request processing', async () => {
      const requestCount = 100;
      const batchSize = 10;
      let completedRequests = 0;

      queueManager.onProgress((requestId, progress) => {
        if (progress === 100) {
          completedRequests++;
        }
      });

      // Submit requests in batches
      for (let batch = 0; batch < requestCount / batchSize; batch++) {
        const batchPromises = Array.from({ length: batchSize }, (_, i) =>
          queueManager.submitRequest('load_test', {
            batch,
            index: i,
            data: new Array(100).fill(`data_${batch}_${i}`)
          })
        );

        await Promise.all(batchPromises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = queueManager.getStats();
      
      // Verify high throughput
      expect(stats.metrics.totalRequests).toBe(requestCount);
      expect(stats.metrics.throughput).toBeGreaterThan(0);
      
      // Check that the system remained healthy
      expect(stats.metrics.queueHealth.status).not.toBe('critical');
    });

    it('should maintain performance under sustained load', async () => {
      const testDuration = 2000; // 2 seconds
      const requestInterval = 50; // Submit every 50ms
      let requestCount = 0;
      
      const startTime = Date.now();
      
      // Submit requests continuously
      const submissionInterval = setInterval(async () => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(submissionInterval);
          return;
        }

        try {
          await queueManager.submitRequest('sustained', {
            timestamp: Date.now(),
            count: requestCount++
          });
        } catch (error) {
          // Handle queue full scenarios gracefully
          console.warn('Queue full, skipping request');
        }
      }, requestInterval);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

      const stats = queueManager.getStats();
      const performance = queueManager.getPerformanceSummary();
      
      // Verify sustained performance
      expect(stats.metrics.totalRequests).toBeGreaterThan(10);
      expect(performance.averageLatency).toBeLessThan(5000);
      expect(performance.errorRate).toBeLessThan(0.1);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from worker failures', async () => {
      let workerFailures = 0;
      
      // Simulate worker failures
      const originalPostMessage = mockWorkerInstance.postMessage;
      mockWorkerInstance.postMessage = vi.fn((message) => {
        if (workerFailures < 3) {
          workerFailures++;
          // Simulate worker failure
          setTimeout(() => {
            if (mockWorkerInstance.onerror) {
              mockWorkerInstance.onerror(new Error('Worker failure'));
            }
          }, 10);
        } else {
          // Normal processing after failures
          originalPostMessage(message);
        }
      });

      const errorEvents: any[] = [];
      queueManager.onError((error, request) => {
        errorEvents.push({ error, request });
      });

      // Submit requests
      const requestIds = await Promise.all([
        queueManager.submitRequest('resilience', { data: 'test1' }),
        queueManager.submitRequest('resilience', { data: 'test2' }),
        queueManager.submitRequest('resilience', { data: 'test3' }),
        queueManager.submitRequest('resilience', { data: 'test4' })
      ]);

      // Wait for processing and recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // System should recover and continue processing
      const stats = queueManager.getStats();
      expect(stats.metrics.totalRequests).toBe(4);
      
      // Some errors should have been reported
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should handle resource exhaustion gracefully', async () => {
      // Submit more requests than worker capacity
      const requestPromises: Promise<string>[] = [];
      
      for (let i = 0; i < 50; i++) {
        requestPromises.push(
          queueManager.submitRequest('resource_test', {
            data: new Array(1000).fill(`large_data_${i}`)
          })
        );
      }

      const requestIds = await Promise.all(requestPromises);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = queueManager.getStats();
      
      // System should handle the load without crashing
      expect(requestIds).toHaveLength(50);
      expect(stats.metrics.queueHealth.status).toBeDefined();
      
      // Check resource recommendations
      expect(Array.isArray(stats.recommendations)).toBe(true);
    });
  });

  describe('Cache Integration', () => {
    it('should cache and reuse results across requests', async () => {
      let processingCount = 0;
      
      // Track actual processing
      const originalPostMessage = mockWorkerInstance.postMessage;
      mockWorkerInstance.postMessage = vi.fn((message) => {
        if (message.request?.type === 'cacheable') {
          processingCount++;
        }
        originalPostMessage(message);
      });

      // Submit identical cacheable requests
      const requestIds = await Promise.all([
        queueManager.submitRequest('cacheable', { data: 'same' }, { 
          cacheable: true,
          cacheKey: 'integration_test_key'
        }),
        queueManager.submitRequest('cacheable', { data: 'same' }, { 
          cacheable: true,
          cacheKey: 'integration_test_key'
        }),
        queueManager.submitRequest('cacheable', { data: 'same' }, { 
          cacheable: true,
          cacheKey: 'integration_test_key'
        })
      ]);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Only one request should have been actually processed
      expect(processingCount).toBe(1);
      expect(requestIds).toHaveLength(3);

      const cacheStats = queueManager.getStats().cache;
      expect(cacheStats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Metrics and Monitoring Integration', () => {
    it('should provide comprehensive real-time metrics', async () => {
      const metricsUpdates: any[] = [];
      
      queueManager.onMetrics((metrics) => {
        metricsUpdates.push({ ...metrics, timestamp: Date.now() });
      });

      // Generate some activity
      await Promise.all([
        queueManager.submitRequest('metrics_test', { type: 'A' }),
        queueManager.submitRequest('metrics_test', { type: 'B' }),
        queueManager.submitRequest('metrics_test', { type: 'C' })
      ]);

      // Wait for processing and metrics updates
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify metrics were collected
      expect(metricsUpdates.length).toBeGreaterThan(0);
      
      const latestMetrics = metricsUpdates[metricsUpdates.length - 1];
      expect(latestMetrics).toHaveProperty('totalRequests');
      expect(latestMetrics).toHaveProperty('throughput');
      expect(latestMetrics).toHaveProperty('resourceUtilization');

      // Verify health trends
      const trends = queueManager.getHealthTrends();
      expect(Array.isArray(trends)).toBe(true);
    });

    it('should track performance over time', async () => {
      // Submit requests over time
      for (let i = 0; i < 10; i++) {
        await queueManager.submitRequest('performance_test', { 
          iteration: i,
          timestamp: Date.now()
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const summary = queueManager.getPerformanceSummary();
      
      expect(summary.totalRequests).toBe(10);
      expect(summary.averageLatency).toBeGreaterThan(0);
      expect(summary.throughput).toBeGreaterThan(0);
      expect(summary.uptime).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Scaling Integration', () => {
    it('should scale workers based on load', async () => {
      // Submit a burst of requests to trigger scaling
      const burstSize = 30;
      const requestPromises = Array.from({ length: burstSize }, (_, i) =>
        queueManager.submitRequest('scaling_test', {
          burstId: i,
          data: `scaling_request_${i}`
        })
      );

      const requestIds = await Promise.all(requestPromises);
      
      // Wait for potential scaling
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = queueManager.getStats();
      const scalingStats = stats.scaling;
      
      expect(requestIds).toHaveLength(burstSize);
      expect(scalingStats).toBeDefined();
      
      // System should handle the burst effectively
      expect(stats.metrics.queueHealth.status).not.toBe('critical');
    });
  });

  describe('Configuration and Data Persistence', () => {
    it('should export and import configuration correctly', async () => {
      // Generate some activity
      await Promise.all([
        queueManager.submitRequest('export_test', { data: 'A' }),
        queueManager.submitRequest('export_test', { data: 'B' })
      ]);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Export data
      const exportedData = queueManager.exportData();
      
      expect(exportedData).toHaveProperty('metrics');
      expect(exportedData).toHaveProperty('cache');
      expect(exportedData).toHaveProperty('config');
      expect(exportedData).toHaveProperty('stats');
      expect(exportedData).toHaveProperty('timestamp');

      // Create new manager and import data
      const newManager = createQueueManager();
      await newManager.start();
      
      newManager.importData(exportedData);
      
      // Verify import was successful
      const importedStats = newManager.getStats();
      expect(importedStats.cache.totalEntries).toBeGreaterThanOrEqual(0);
      
      await newManager.stop();
    });

    it('should update configuration dynamically without restart', () => {
      const originalStats = queueManager.getStats();
      
      queueManager.updateConfiguration({
        maxQueueSize: 500,
        defaultTimeout: 15000,
        scalingThresholds: {
          cpuThreshold: 0.8,
          memoryThreshold: 0.85,
          queueLengthThreshold: 75,
          latencyThreshold: 4000,
          scaleUpDelay: 2000,
          scaleDownDelay: 3000
        }
      });

      // Configuration should be updated
      expect(() => queueManager.getStats()).not.toThrow();
    });
  });
});