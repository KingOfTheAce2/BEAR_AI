// Load Balancer and Resource Allocator

import { QueueRequest, SystemResources, LoadBalancingStrategy, WorkerConfiguration } from './types';
import { WorkerPool } from './workers/WorkerPool';
import { ResourceManager } from './ResourceManager';

interface LoadBalancerNode {
  id: string;
  workerPool: WorkerPool;
  weight: number;
  health: NodeHealth;
  metrics: NodeMetrics;
  lastHealthCheck: number;
}

interface NodeHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100
  issues: string[];
  lastCheck: number;
}

interface NodeMetrics {
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  queueLength: number;
  activeConnections: number;
}

export class LoadBalancer {
  private nodes: Map<string, LoadBalancerNode> = new Map();
  private strategy: LoadBalancingStrategy;
  private resourceManager: ResourceManager;
  private healthCheckInterval: number;
  private healthCheckTimer?: NodeJS.Timeout;
  private roundRobinIndex = 0;
  private requestCounts: Map<string, number> = new Map();
  private latencyHistory: Map<string, number[]> = new Map();

  constructor(
    strategy: LoadBalancingStrategy = { type: 'resource-aware' },
    resourceManager: ResourceManager,
    healthCheckInterval = 30000 // 30 seconds
  ) {
    this.strategy = strategy;
    this.resourceManager = resourceManager;
    this.healthCheckInterval = healthCheckInterval;
    
    this.startHealthChecking();
  }

  /**
   * Add a worker pool node to the load balancer
   */
  addNode(nodeId: string, workerPool: WorkerPool, weight = 1): void {
    const node: LoadBalancerNode = {
      id: nodeId,
      workerPool,
      weight,
      health: {
        status: 'healthy',
        score: 100,
        issues: [],
        lastCheck: Date.now()
      },
      metrics: {
        requestsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        queueLength: 0,
        activeConnections: 0
      },
      lastHealthCheck: Date.now()
    };

    this.nodes.set(nodeId, node);
    this.requestCounts.set(nodeId, 0);
    this.latencyHistory.set(nodeId, []);
  }

  /**
   * Remove a node from the load balancer
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.workerPool.shutdown();
      this.nodes.delete(nodeId);
      this.requestCounts.delete(nodeId);
      this.latencyHistory.delete(nodeId);
    }
  }

  /**
   * Route request to appropriate node based on load balancing strategy
   */
  async routeRequest(request: QueueRequest): Promise<any> {
    const selectedNode = this.selectNode(request);
    
    if (!selectedNode) {
      throw new Error('No healthy nodes available');
    }

    const startTime = Date.now();
    
    try {
      const result = await selectedNode.workerPool.processRequest(request);
      
      // Record success metrics
      this.recordRequestMetrics(selectedNode.id, startTime, true);
      
      return result;
    } catch (error) {
      // Record failure metrics
      this.recordRequestMetrics(selectedNode.id, startTime, false);
      throw error;
    }
  }

  /**
   * Get load balancer statistics
   */
  getStats() {
    const nodeStats = new Map<string, any>();
    let totalRequests = 0;
    let totalLatency = 0;
    let totalErrors = 0;

    for (const [nodeId, node] of this.nodes) {
      const requestCount = this.requestCounts.get(nodeId) || 0;
      const latencyHistory = this.latencyHistory.get(nodeId) || [];
      const avgLatency = latencyHistory.length > 0 
        ? latencyHistory.reduce((sum, lat) => sum + lat, 0) / latencyHistory.length 
        : 0;

      totalRequests += requestCount;
      totalLatency += avgLatency * requestCount;
      totalErrors += Math.floor(requestCount * node.metrics.errorRate);

      nodeStats.set(nodeId, {
        requestCount,
        averageLatency: avgLatency,
        health: node.health,
        metrics: node.metrics,
        weight: node.weight
      });
    }

    return {
      totalNodes: this.nodes.size,
      healthyNodes: Array.from(this.nodes.values()).filter(n => n.health.status === 'healthy').length,
      totalRequests,
      averageLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      totalErrors,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      strategy: this.strategy,
      nodeStats: Object.fromEntries(nodeStats)
    };
  }

  /**
   * Get healthy nodes
   */
  getHealthyNodes(): LoadBalancerNode[] {
    return Array.from(this.nodes.values()).filter(node => 
      node.health.status === 'healthy' || node.health.status === 'degraded'
    );
  }

  /**
   * Update load balancing strategy
   */
  updateStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.roundRobinIndex = 0; // Reset round robin counter
  }

  /**
   * Force health check on all nodes
   */
  async performHealthCheck(): Promise<void> {
    const healthCheckPromises = Array.from(this.nodes.values()).map(node =>
      this.checkNodeHealth(node)
    );

    await Promise.all(healthCheckPromises);
  }

  /**
   * Shutdown load balancer
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const shutdownPromises = Array.from(this.nodes.values()).map(node =>
      node.workerPool.shutdown()
    );

    await Promise.all(shutdownPromises);
    this.nodes.clear();
  }

  /**
   * Select node based on load balancing strategy
   */
  private selectNode(request: QueueRequest): LoadBalancerNode | null {
    const healthyNodes = this.getHealthyNodes();
    
    if (healthyNodes.length === 0) {
      return null;
    }

    switch (this.strategy.type) {
      case 'round-robin':
        return this.selectRoundRobin(healthyNodes);
      
      case 'least-loaded':
        return this.selectLeastLoaded(healthyNodes);
      
      case 'resource-aware':
        return this.selectResourceAware(healthyNodes, request);
      
      case 'priority-based':
        return this.selectPriorityBased(healthyNodes, request);
      
      default:
        return this.selectRoundRobin(healthyNodes);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(nodes: LoadBalancerNode[]): LoadBalancerNode {
    const node = nodes[this.roundRobinIndex % nodes.length];
    this.roundRobinIndex++;
    return node;
  }

  /**
   * Least loaded selection
   */
  private selectLeastLoaded(nodes: LoadBalancerNode[]): LoadBalancerNode {
    return nodes.reduce((leastLoaded, current) => {
      const currentLoad = this.calculateNodeLoad(current);
      const leastLoad = this.calculateNodeLoad(leastLoaded);
      return currentLoad < leastLoad ? current : leastLoaded;
    });
  }

  /**
   * Resource-aware selection
   */
  private selectResourceAware(nodes: LoadBalancerNode[], request: QueueRequest): LoadBalancerNode {
    const suitableNodes = nodes.filter(node => 
      this.canNodeHandleRequest(node, request)
    );

    if (suitableNodes.length === 0) {
      // Fallback to least loaded if no node can optimally handle the request
      return this.selectLeastLoaded(nodes);
    }

    // Select node with best resource match
    return suitableNodes.reduce((best, current) => {
      const currentScore = this.calculateResourceScore(current, request);
      const bestScore = this.calculateResourceScore(best, request);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Priority-based selection
   */
  private selectPriorityBased(nodes: LoadBalancerNode[], request: QueueRequest): LoadBalancerNode {
    // For high-priority requests, prefer nodes with lower latency
    if (request.priority <= 1) {
      return nodes.reduce((lowest, current) => 
        current.metrics.averageLatency < lowest.metrics.averageLatency ? current : lowest
      );
    }

    // For normal priority, use least loaded
    return this.selectLeastLoaded(nodes);
  }

  /**
   * Calculate node load score
   */
  private calculateNodeLoad(node: LoadBalancerNode): number {
    const stats = node.workerPool.getStats();
    const cpuWeight = 0.4;
    const memoryWeight = 0.3;
    const queueWeight = 0.2;
    const errorWeight = 0.1;

    return (
      node.metrics.cpuUsage * cpuWeight +
      node.metrics.memoryUsage * memoryWeight +
      (stats.activeWorkers / stats.totalWorkers) * queueWeight +
      node.metrics.errorRate * errorWeight
    );
  }

  /**
   * Check if node can handle request
   */
  private canNodeHandleRequest(node: LoadBalancerNode, request: QueueRequest): boolean {
    const resources = this.resourceManager.getCurrentResources();
    const required = request.resourceRequirements;

    // Estimate if node has sufficient resources
    const cpuAvailable = 1.0 - node.metrics.cpuUsage;
    const memoryAvailable = resources.memory.available * (1.0 - node.metrics.memoryUsage);

    return (
      cpuAvailable >= required.cpu &&
      memoryAvailable >= required.memory &&
      node.health.status !== 'unhealthy'
    );
  }

  /**
   * Calculate resource score for node-request match
   */
  private calculateResourceScore(node: LoadBalancerNode, request: QueueRequest): number {
    const required = request.resourceRequirements;
    const available = {
      cpu: 1.0 - node.metrics.cpuUsage,
      memory: 1.0 - node.metrics.memoryUsage
    };

    // Higher score for better resource match
    const cpuScore = Math.max(0, available.cpu - required.cpu);
    const memoryScore = Math.max(0, available.memory - (required.memory / 1024 / 1024 / 1024)); // Convert to GB
    const latencyScore = Math.max(0, 1.0 - (node.metrics.averageLatency / 5000)); // Normalize to 5s max
    const healthScore = node.health.score / 100;

    return (cpuScore * 0.3 + memoryScore * 0.3 + latencyScore * 0.2 + healthScore * 0.2);
  }

  /**
   * Record request metrics for a node
   */
  private recordRequestMetrics(nodeId: string, startTime: number, success: boolean): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const latency = Date.now() - startTime;
    const requestCount = this.requestCounts.get(nodeId) || 0;
    
    // Update request count
    this.requestCounts.set(nodeId, requestCount + 1);

    // Update latency history
    const latencyHistory = this.latencyHistory.get(nodeId) || [];
    latencyHistory.push(latency);
    
    // Keep only last 100 measurements
    if (latencyHistory.length > 100) {
      latencyHistory.shift();
    }
    this.latencyHistory.set(nodeId, latencyHistory);

    // Update node metrics
    node.metrics.averageLatency = latencyHistory.reduce((sum, lat) => sum + lat, 0) / latencyHistory.length;
    
    if (!success) {
      const errorCount = Math.floor(requestCount * node.metrics.errorRate) + 1;
      node.metrics.errorRate = errorCount / (requestCount + 1);
    }

    // Update requests per second (simplified calculation)
    node.metrics.requestsPerSecond = requestCount / ((Date.now() - node.lastHealthCheck) / 1000);
  }

  /**
   * Start health checking timer
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Check health of a specific node
   */
  private async checkNodeHealth(node: LoadBalancerNode): Promise<void> {
    const now = Date.now();
    const stats = node.workerPool.getStats();
    
    try {
      // Update metrics from worker pool
      node.metrics.queueLength = stats.totalRequests - stats.completedRequests;
      node.metrics.activeConnections = stats.activeWorkers;

      // Calculate health score
      let healthScore = 100;
      const issues: string[] = [];

      // Check error rate
      if (node.metrics.errorRate > 0.1) {
        healthScore -= 30;
        issues.push('High error rate');
      }

      // Check latency
      if (node.metrics.averageLatency > 5000) {
        healthScore -= 25;
        issues.push('High latency');
      }

      // Check resource usage
      if (node.metrics.cpuUsage > 0.9) {
        healthScore -= 20;
        issues.push('High CPU usage');
      }

      if (node.metrics.memoryUsage > 0.9) {
        healthScore -= 20;
        issues.push('High memory usage');
      }

      // Check queue length
      if (node.metrics.queueLength > 100) {
        healthScore -= 15;
        issues.push('Long queue');
      }

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthScore >= 80) {
        status = 'healthy';
      } else if (healthScore >= 50) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      // Update health information
      node.health = {
        status,
        score: Math.max(0, healthScore),
        issues,
        lastCheck: now
      };

      node.lastHealthCheck = now;

    } catch (error) {
      node.health = {
        status: 'unhealthy',
        score: 0,
        issues: ['Health check failed', String(error)],
        lastCheck: now
      };
    }
  }
}

// Adaptive load balancing strategy
export class AdaptiveLoadBalancer extends LoadBalancer {
  private performanceHistory: Map<string, number[]> = new Map();
  private strategyPerformance: Map<string, number> = new Map();
  private currentStrategyIndex = 0;
  private strategies: LoadBalancingStrategy[] = [
    { type: 'round-robin' },
    { type: 'least-loaded' },
    { type: 'resource-aware' },
    { type: 'priority-based' }
  ];

  constructor(resourceManager: ResourceManager) {
    super({ type: 'round-robin' }, resourceManager);
    this.initializeStrategyPerformance();
    this.startAdaptiveOptimization();
  }

  /**
   * Initialize performance tracking for all strategies
   */
  private initializeStrategyPerformance(): void {
    for (const strategy of this.strategies) {
      this.strategyPerformance.set(strategy.type, 1.0); // Start with neutral performance
    }
  }

  /**
   * Start adaptive optimization process
   */
  private startAdaptiveOptimization(): void {
    setInterval(() => {
      this.evaluateAndAdapt();
    }, 60000); // Evaluate every minute
  }

  /**
   * Evaluate current strategy performance and adapt if needed
   */
  private evaluateAndAdapt(): void {
    const currentStrategy = this.strategy.type;
    const stats = this.getStats();
    
    // Calculate performance score based on latency and error rate
    const performanceScore = this.calculatePerformanceScore(stats);
    
    // Update strategy performance
    const history = this.performanceHistory.get(currentStrategy) || [];
    history.push(performanceScore);
    
    // Keep only last 10 measurements
    if (history.length > 10) {
      history.shift();
    }
    this.performanceHistory.set(currentStrategy, history);

    // Calculate average performance for this strategy
    const avgPerformance = history.reduce((sum, score) => sum + score, 0) / history.length;
    this.strategyPerformance.set(currentStrategy, avgPerformance);

    // Check if we should try a different strategy
    if (this.shouldSwitchStrategy(avgPerformance)) {
      const bestStrategy = this.findBestStrategy();
      if (bestStrategy !== currentStrategy) {
        this.updateStrategy({ type: bestStrategy as any });
        console.log(`Adaptive load balancer switched to strategy: ${bestStrategy}`);
      }
    }
  }

  /**
   * Calculate performance score from stats
   */
  private calculatePerformanceScore(stats: any): number {
    const latencyScore = Math.max(0, 1.0 - (stats.averageLatency / 5000)); // Normalize to 5s
    const errorScore = Math.max(0, 1.0 - stats.errorRate);
    const throughputScore = Math.min(1.0, stats.totalRequests / 1000); // Normalize to 1000 req/min
    
    return (latencyScore * 0.4 + errorScore * 0.4 + throughputScore * 0.2);
  }

  /**
   * Determine if strategy should be switched
   */
  private shouldSwitchStrategy(currentPerformance: number): boolean {
    // Switch if performance is below threshold or randomly for exploration
    return currentPerformance < 0.7 || Math.random() < 0.1;
  }

  /**
   * Find best performing strategy
   */
  private findBestStrategy(): string {
    let bestStrategy = 'round-robin';
    let bestPerformance = 0;

    for (const [strategy, performance] of this.strategyPerformance) {
      if (performance > bestPerformance) {
        bestPerformance = performance;
        bestStrategy = strategy;
      }
    }

    return bestStrategy;
  }
}