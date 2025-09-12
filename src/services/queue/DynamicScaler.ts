// Dynamic Scaling Based on System Resources

import { SystemResources, ScalingThresholds, QueueMetrics } from './types';
import { ResourceManager } from './ResourceManager';
import { WorkerPool } from './workers/WorkerPool';
import { QueueMetricsCollector } from './metrics/QueueMetrics';

interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'maintain';
  targetWorkers: number;
  reason: string;
  confidence: number;
  timestamp: number;
}

interface ScalingEvent {
  timestamp: number;
  action: 'scale_up' | 'scale_down';
  fromWorkers: number;
  toWorkers: number;
  reason: string;
  duration: number;
  success: boolean;
  metrics: QueueMetrics;
}

interface PredictiveModel {
  type: 'linear' | 'exponential' | 'neural';
  weights: number[];
  accuracy: number;
  lastTrained: number;
}

export class DynamicScaler {
  private resourceManager: ResourceManager;
  private workerPools: Map<string, WorkerPool> = new Map();
  private metricsCollector: QueueMetricsCollector;
  private thresholds: ScalingThresholds;
  private scalingHistory: ScalingEvent[] = [];
  private pendingScalingActions: Map<string, ScalingDecision> = new Map();
  private predictiveModel: PredictiveModel;
  private evaluationTimer?: NodeJS.Timeout;
  private evaluationInterval: number;
  private minWorkers: number;
  private maxWorkers: number;
  private cooldownPeriod: number;
  private lastScalingAction = 0;

  constructor(
    resourceManager: ResourceManager,
    metricsCollector: QueueMetricsCollector,
    thresholds: ScalingThresholds = {
      cpuThreshold: 0.75,
      memoryThreshold: 0.80,
      queueLengthThreshold: 50,
      latencyThreshold: 3000,
      scaleUpDelay: 30000,
      scaleDownDelay: 60000
    },
    minWorkers = 2,
    maxWorkers = 16,
    evaluationInterval = 10000, // 10 seconds
    cooldownPeriod = 30000 // 30 seconds
  ) {
    this.resourceManager = resourceManager;
    this.metricsCollector = metricsCollector;
    this.thresholds = thresholds;
    this.minWorkers = minWorkers;
    this.maxWorkers = maxWorkers;
    this.evaluationInterval = evaluationInterval;
    this.cooldownPeriod = cooldownPeriod;
    
    this.predictiveModel = {
      type: 'linear',
      weights: [0.3, 0.3, 0.2, 0.2], // CPU, Memory, Queue, Latency
      accuracy: 0.5,
      lastTrained: Date.now()
    };

    this.startEvaluation();
  }

  /**
   * Register a worker pool for scaling
   */
  registerWorkerPool(poolId: string, workerPool: WorkerPool): void {
    this.workerPools.set(poolId, workerPool);
  }

  /**
   * Unregister a worker pool
   */
  unregisterWorkerPool(poolId: string): void {
    this.workerPools.delete(poolId);
    this.pendingScalingActions.delete(poolId);
  }

  /**
   * Manually trigger scaling evaluation
   */
  async evaluateScaling(): Promise<Map<string, ScalingDecision>> {
    const decisions = new Map<string, ScalingDecision>();
    
    for (const [poolId, workerPool] of this.workerPools) {
      const decision = await this.evaluatePoolScaling(poolId, workerPool);
      decisions.set(poolId, decision);
      
      if (decision.action !== 'maintain') {
        this.pendingScalingActions.set(poolId, decision);
      }
    }
    
    return decisions;
  }

  /**
   * Execute pending scaling actions
   */
  async executeScalingActions(): Promise<void> {
    const now = Date.now();
    
    // Check cooldown period
    if (now - this.lastScalingAction < this.cooldownPeriod) {
      return;
    }

    for (const [poolId, decision] of this.pendingScalingActions) {
      const workerPool = this.workerPools.get(poolId);
      if (!workerPool) continue;

      try {
        const startTime = Date.now();
        const currentStats = workerPool.getStats();
        const fromWorkers = currentStats.totalWorkers;

        await this.executeScalingDecision(workerPool, decision);

        const endTime = Date.now();
        const newStats = workerPool.getStats();
        const toWorkers = newStats.totalWorkers;

        // Record scaling event
        const event: ScalingEvent = {
          timestamp: startTime,
          action: decision.action,
          fromWorkers,
          toWorkers,
          reason: decision.reason,
          duration: endTime - startTime,
          success: true,
          metrics: this.metricsCollector.getCurrentMetrics()
        };

        this.scalingHistory.push(event);
        this.lastScalingAction = now;

        console.log(`Scaling ${decision.action} executed for pool ${poolId}: ${fromWorkers} -> ${toWorkers} workers`);

      } catch (error) {
        console.error(`Failed to execute scaling action for pool ${poolId}:`, error);
        
        // Record failed scaling event
        const event: ScalingEvent = {
          timestamp: now,
          action: decision.action,
          fromWorkers: 0,
          toWorkers: 0,
          reason: `Failed: ${error}`,
          duration: 0,
          success: false,
          metrics: this.metricsCollector.getCurrentMetrics()
        };
        
        this.scalingHistory.push(event);
      }
    }

    this.pendingScalingActions.clear();
  }

  /**
   * Get scaling statistics
   */
  getScalingStats() {
    const recentEvents = this.scalingHistory.filter(
      event => Date.now() - event.timestamp < 3600000 // Last hour
    );

    const scaleUpCount = recentEvents.filter(e => e.action === 'scale_up').length;
    const scaleDownCount = recentEvents.filter(e => e.action === 'scale_down').length;
    const successRate = recentEvents.length > 0 
      ? recentEvents.filter(e => e.success).length / recentEvents.length 
      : 1.0;

    const averageDuration = recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + e.duration, 0) / recentEvents.length
      : 0;

    return {
      totalEvents: this.scalingHistory.length,
      recentEvents: recentEvents.length,
      scaleUpCount,
      scaleDownCount,
      successRate,
      averageDuration,
      lastScalingAction: this.lastScalingAction,
      pendingActions: this.pendingScalingActions.size,
      modelAccuracy: this.predictiveModel.accuracy,
      thresholds: this.thresholds
    };
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metricsCollector.getCurrentMetrics();
    const resources = this.resourceManager.getCurrentResources();
    
    // Analyze recent scaling patterns
    const recentEvents = this.scalingHistory.filter(
      event => Date.now() - event.timestamp < 3600000
    );

    if (recentEvents.filter(e => e.action === 'scale_up').length > 5) {
      recommendations.push('Consider increasing base worker pool size - frequent scale-up events detected');
    }

    if (recentEvents.filter(e => e.action === 'scale_down').length > 10) {
      recommendations.push('Consider decreasing base worker pool size - frequent scale-down events detected');
    }

    // Resource-based recommendations
    if (resources.cpu.usage > 0.9) {
      recommendations.push('CPU usage is critically high - consider scaling up immediately');
    }

    if (resources.memory.used / resources.memory.total > 0.9) {
      recommendations.push('Memory usage is critically high - implement memory optimization');
    }

    if (metrics.pendingRequests > this.thresholds.queueLengthThreshold * 2) {
      recommendations.push('Queue length is extremely high - emergency scaling recommended');
    }

    // Predictive recommendations
    const prediction = this.predictFutureLoad();
    if (prediction.confidence > 0.7) {
      if (prediction.expectedLoad > 1.5) {
        recommendations.push('Predicted high load - proactive scaling up recommended');
      } else if (prediction.expectedLoad < 0.5) {
        recommendations.push('Predicted low load - proactive scaling down possible');
      }
    }

    return recommendations;
  }

  /**
   * Update scaling thresholds
   */
  updateThresholds(newThresholds: Partial<ScalingThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Train predictive model with recent data
   */
  trainPredictiveModel(): void {
    const trainingData = this.prepareTrainingData();
    
    if (trainingData.length < 10) {
      return; // Not enough data for training
    }

    // Simple linear regression training
    const model = this.trainLinearModel(trainingData);
    
    if (model.accuracy > this.predictiveModel.accuracy) {
      this.predictiveModel = {
        ...model,
        lastTrained: Date.now()
      };
      
      console.log(`Predictive model updated - accuracy: ${model.accuracy.toFixed(3)}`);
    }
  }

  /**
   * Stop dynamic scaling
   */
  stop(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }
  }

  /**
   * Evaluate scaling for a specific worker pool
   */
  private async evaluatePoolScaling(poolId: string, workerPool: WorkerPool): Promise<ScalingDecision> {
    const metrics = this.metricsCollector.getCurrentMetrics();
    const resources = this.resourceManager.getCurrentResources();
    const stats = workerPool.getStats();
    
    // Calculate scaling score
    const scalingScore = this.calculateScalingScore(metrics, resources, stats);
    
    // Make scaling decision
    const decision = this.makeScalingDecision(scalingScore, stats.totalWorkers);
    
    return {
      ...decision,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate scaling score based on multiple factors
   */
  private calculateScalingScore(
    metrics: QueueMetrics, 
    resources: SystemResources, 
    stats: any
  ): number {
    const weights = this.predictiveModel.weights;
    
    // CPU factor (0-1, higher means need to scale up)
    const cpuFactor = Math.min(1, resources.cpu.usage / this.thresholds.cpuThreshold);
    
    // Memory factor (0-1, higher means need to scale up)
    const memoryFactor = Math.min(1, 
      (resources.memory.used / resources.memory.total) / this.thresholds.memoryThreshold
    );
    
    // Queue factor (0-1, higher means need to scale up)
    const queueFactor = Math.min(1, metrics.pendingRequests / this.thresholds.queueLengthThreshold);
    
    // Latency factor (0-1, higher means need to scale up)
    const latencyFactor = Math.min(1, metrics.averageProcessingTime / this.thresholds.latencyThreshold);
    
    // Weighted score
    const score = (
      cpuFactor * weights[0] +
      memoryFactor * weights[1] +
      queueFactor * weights[2] +
      latencyFactor * weights[3]
    );
    
    return score;
  }

  /**
   * Make scaling decision based on score
   */
  private makeScalingDecision(score: number, currentWorkers: number): ScalingDecision {
    let action: 'scale_up' | 'scale_down' | 'maintain' = 'maintain';
    let targetWorkers = currentWorkers;
    let reason = 'All metrics within normal range';
    let confidence = 0.5;

    if (score > 0.8 && currentWorkers < this.maxWorkers) {
      action = 'scale_up';
      targetWorkers = Math.min(this.maxWorkers, Math.ceil(currentWorkers * 1.5));
      reason = `High resource pressure (score: ${score.toFixed(2)})`;
      confidence = Math.min(1.0, score);
    } else if (score < 0.3 && currentWorkers > this.minWorkers) {
      action = 'scale_down';
      targetWorkers = Math.max(this.minWorkers, Math.floor(currentWorkers * 0.8));
      reason = `Low resource utilization (score: ${score.toFixed(2)})`;
      confidence = Math.min(1.0, 1.0 - score);
    }

    // Apply predictive adjustment
    const prediction = this.predictFutureLoad();
    if (prediction.confidence > 0.6) {
      if (prediction.expectedLoad > 1.2 && action !== 'scale_up') {
        action = 'scale_up';
        targetWorkers = Math.min(this.maxWorkers, currentWorkers + 2);
        reason = `Predicted load increase (${prediction.expectedLoad.toFixed(2)}x)`;
        confidence = prediction.confidence;
      } else if (prediction.expectedLoad < 0.6 && action !== 'scale_down') {
        action = 'scale_down';
        targetWorkers = Math.max(this.minWorkers, currentWorkers - 1);
        reason = `Predicted load decrease (${prediction.expectedLoad.toFixed(2)}x)`;
        confidence = prediction.confidence;
      }
    }

    return { action, targetWorkers, reason, confidence, timestamp: Date.now() };
  }

  /**
   * Execute scaling decision
   */
  private async executeScalingDecision(
    workerPool: WorkerPool, 
    decision: ScalingDecision
  ): Promise<void> {
    if (decision.action === 'scale_up' || decision.action === 'scale_down') {
      await workerPool.scaleToSize(decision.targetWorkers);
    }
  }

  /**
   * Predict future load based on historical patterns
   */
  private predictFutureLoad(): { expectedLoad: number; confidence: number } {
    const recentMetrics = this.metricsCollector.getHistory(300000); // Last 5 minutes
    
    if (recentMetrics.length < 5) {
      return { expectedLoad: 1.0, confidence: 0.1 };
    }

    // Simple trend analysis
    const throughputs = recentMetrics.map(m => m.metrics.throughput);
    const trend = this.calculateTrend(throughputs);
    
    const currentThroughput = throughputs[throughputs.length - 1] || 1;
    const averageThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
    
    let expectedLoad = 1.0;
    let confidence = 0.5;
    
    if (trend > 0.1) {
      // Increasing load
      expectedLoad = 1.0 + trend;
      confidence = Math.min(0.9, trend * 2);
    } else if (trend < -0.1) {
      // Decreasing load
      expectedLoad = Math.max(0.1, 1.0 + trend);
      confidence = Math.min(0.9, Math.abs(trend) * 2);
    }
    
    // Adjust based on current vs average throughput
    const currentVsAverage = currentThroughput / (averageThroughput || 1);
    expectedLoad *= currentVsAverage;
    
    return { expectedLoad, confidence };
  }

  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Normalize slope to percentage change
    const averageY = sumY / n;
    return averageY > 0 ? slope / averageY : 0;
  }

  /**
   * Start scaling evaluation timer
   */
  private startEvaluation(): void {
    this.evaluationTimer = setInterval(async () => {
      await this.evaluateScaling();
      await this.executeScalingActions();
      
      // Periodically retrain model
      if (Date.now() - this.predictiveModel.lastTrained > 3600000) { // Every hour
        this.trainPredictiveModel();
      }
    }, this.evaluationInterval);
  }

  /**
   * Prepare training data for predictive model
   */
  private prepareTrainingData(): Array<{ features: number[]; target: number }> {
    const history = this.metricsCollector.getHistory(3600000); // Last hour
    const data: Array<{ features: number[]; target: number }> = [];
    
    for (let i = 1; i < history.length; i++) {
      const current = history[i - 1];
      const next = history[i];
      
      const features = [
        current.metrics.resourceUtilization.cpu.usage,
        current.metrics.resourceUtilization.memory.used / current.metrics.resourceUtilization.memory.total,
        Math.min(1, current.metrics.pendingRequests / this.thresholds.queueLengthThreshold),
        Math.min(1, current.metrics.averageProcessingTime / this.thresholds.latencyThreshold)
      ];
      
      const target = next.metrics.throughput / (current.metrics.throughput || 1);
      
      data.push({ features, target });
    }
    
    return data;
  }

  /**
   * Train linear regression model
   */
  private trainLinearModel(data: Array<{ features: number[]; target: number }>): PredictiveModel {
    // Simple linear regression implementation
    const n = data.length;
    const featureCount = data[0].features.length;
    
    // Initialize weights
    const weights = new Array(featureCount).fill(0.25);
    
    // Gradient descent
    const learningRate = 0.01;
    const epochs = 100;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;
      
      for (const sample of data) {
        const predicted = sample.features.reduce((sum, feature, idx) => 
          sum + feature * weights[idx], 0
        );
        
        const error = predicted - sample.target;
        totalError += error * error;
        
        // Update weights
        for (let i = 0; i < weights.length; i++) {
          weights[i] -= learningRate * error * sample.features[i];
        }
      }
    }
    
    // Calculate accuracy
    let correctPredictions = 0;
    for (const sample of data) {
      const predicted = sample.features.reduce((sum, feature, idx) => 
        sum + feature * weights[idx], 0
      );
      
      if (Math.abs(predicted - sample.target) < 0.2) {
        correctPredictions++;
      }
    }
    
    const accuracy = correctPredictions / n;
    
    return {
      type: 'linear',
      weights,
      accuracy,
      lastTrained: Date.now()
    };
  }
}