# GPU Acceleration Implementation - Usage Examples

This document demonstrates how to use the newly implemented GPU acceleration system in BEAR AI.

## Quick Start

```typescript
import { quickStartGPU, runGPUBenchmark } from './src/services/gpu';

// Initialize GPU acceleration
const gpu = await quickStartGPU();

// Check what backend is being used
console.log(`Using ${gpu.getCurrentBackend()} backend`);

// Get hardware information
const hardwareInfo = gpu.getHardwareInfo();
console.log('GPU Info:', hardwareInfo?.gpu);
console.log('Memory:', hardwareInfo?.memory);
```

## React Integration

```tsx
import React from 'react';
import { GPUAccelerationProvider, GPUDashboard } from './src/components/gpu';

function App() {
  return (
    <GPUAccelerationProvider autoInitialize={true}>
      <div className="app">
        <h1>BEAR AI with GPU Acceleration</h1>
        
        {/* GPU Status Dashboard */}
        <GPUDashboard className="mb-6" showDetailed={false} />
        
        {/* Your app content */}
        <YourComponents />
      </div>
    </GPUAccelerationProvider>
  );
}
```

## Using GPU Operations

```tsx
import { useGPUOperations } from './src/components/gpu';

function MLComponent() {
  const { matrixMultiply, vectorAdd, isReady } = useGPUOperations();
  
  const handleMatrixOperation = async () => {
    if (!isReady) return;
    
    // Create test matrices
    const size = 1024;
    const a = new Float32Array(size * size).fill(1);
    const b = new Float32Array(size * size).fill(2);
    
    // GPU-accelerated matrix multiplication
    const result = await matrixMultiply(a, b, size, size, size);
    
    console.log('Matrix multiplication completed:', result.success);
    console.log('Backend used:', result.backend);
    console.log('Fallback used:', result.fallbackUsed);
    console.log('Performance:', result.metrics);
  };
  
  return (
    <button onClick={handleMatrixOperation} disabled={!isReady}>
      Run Matrix Multiplication
    </button>
  );
}
```

## Advanced Usage with Custom Kernels

```typescript
import { GPUAccelerationService, GPUKernel } from './src/services/gpu';

// Custom WebGPU compute shader
const customKernel: GPUKernel = {
  id: 'custom-operation',
  name: 'Custom ML Operation',
  source: `
    @group(0) @binding(0) var<storage, read> input: array<f32>;
    @group(0) @binding(1) var<storage, read_write> output: array<f32>;
    
    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let index = global_id.x;
      if (index >= arrayLength(&input)) {
        return;
      }
      
      // Custom operation: ReLU activation
      output[index] = max(0.0, input[index]);
    }
  `,
  workgroupSize: [256, 1, 1],
  backend: 'webgpu'
};

// Execute custom kernel
const gpu = GPUAccelerationService.getInstance();
const input = new Float32Array([-1, 2, -3, 4, -5]);
const output = new ArrayBuffer(input.length * 4);

const result = await gpu.executeKernel(
  customKernel,
  [input.buffer],
  [output]
);

if (result.success) {
  const outputArray = new Float32Array(output);
  console.log('ReLU result:', outputArray); // [0, 2, 0, 4, 0]
}
```

## Performance Monitoring

```tsx
import { useGPUPerformance } from './src/components/gpu';

function PerformanceMonitor() {
  const { performanceMetrics, realTimeMetrics } = useGPUPerformance();
  
  return (
    <div className="performance-monitor">
      <h3>GPU Performance</h3>
      {performanceMetrics && (
        <div>
          <p>Total Operations: {performanceMetrics.totalOperations}</p>
          <p>Average Compute Time: {performanceMetrics.averagePerformance.computeTime}ms</p>
          <p>Throughput: {performanceMetrics.averagePerformance.throughput} MB/s</p>
          <p>Efficiency: {(performanceMetrics.averagePerformance.efficiency * 100).toFixed(1)}%</p>
          <p>Best Backend: {performanceMetrics.bestBackend}</p>
        </div>
      )}
    </div>
  );
}
```

## Optimization for Inference

```typescript
import { InferenceOptimizer } from './src/services/gpu';

const optimizer = InferenceOptimizer.getInstance();

// Define inference configuration
const config = {
  modelSize: 100 * 1024 * 1024, // 100MB model
  sequenceLength: 512,
  batchSize: 1,
  optimization: {
    quantization: 'fp32',
    batching: false,
    parallelism: 1,
    caching: false
  },
  memoryBudget: 1024 * 1024 * 1024, // 1GB
  latencyTarget: 100 // 100ms
};

// Get optimized configuration
const optimizedConfig = await optimizer.optimizeInferenceConfig(config);
console.log('Optimizations applied:', optimizer.getActiveOptimizations());

// Get recommendations
const recommendations = await optimizer.getOptimizationRecommendations(config);
console.log('Recommended optimizations:', recommendations.recommended);
console.log('Estimated speedup:', recommendations.estimated_speedup);
```

## Benchmarking

```typescript
import { runGPUBenchmark } from './src/services/gpu';

// Run comprehensive benchmark
const results = await runGPUBenchmark();

console.log('Benchmark Results:');
Object.entries(results).forEach(([backend, metrics]) => {
  console.log(`${backend.toUpperCase()}:`);
  console.log(`  Matrix Multiply: ${metrics.matrixMultiplyTime.toFixed(2)}ms`);
  console.log(`  Vector Add: ${metrics.vectorAddTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${metrics.throughput.toFixed(2)} MB/s`);
});
```

## Error Handling and Fallbacks

```typescript
import { GPUAccelerationService } from './src/services/gpu';

const gpu = GPUAccelerationService.getInstance();

try {
  // Attempt GPU operation
  const result = await gpu.matrixMultiply(a, b, rows, cols, inner);
  
  if (result.fallbackUsed) {
    console.warn('GPU operation fell back to CPU');
  }
  
  // Process successful result
  processResult(result.result);
} catch (error) {
  console.error('GPU operation failed:', error);
  
  // Handle gracefully - maybe use pure CPU implementation
  const cpuResult = performCPUOperation(a, b, rows, cols, inner);
  processResult(cpuResult);
}
```

## Memory Management

```typescript
import { GPUMemoryManager } from './src/services/gpu';

const memoryManager = GPUMemoryManager.getInstance('webgpu', 1024 * 1024 * 1024);

// Allocate GPU buffer
const buffer = await memoryManager.allocate({
  size: 1024 * 1024, // 1MB
  usage: 'storage',
  persistent: true
});

if (buffer) {
  // Use buffer for operations
  console.log('Buffer allocated:', buffer.id);
  
  // Check memory stats
  const stats = memoryManager.getMemoryStats();
  console.log('Memory usage:', stats.totalAllocated / stats.totalFree);
  
  // Clean up when done
  await memoryManager.deallocate(buffer.id);
}
```

## Hardware Detection

```typescript
import { HardwareDetection } from './src/services/gpu';

const detection = HardwareDetection.getInstance();
const hardwareInfo = await detection.detectHardware();

console.log('Hardware Capabilities:');
console.log('GPU Vendor:', hardwareInfo.gpu.vendor);
console.log('Performance Tier:', hardwareInfo.gpu.tier);
console.log('WebGPU Support:', hardwareInfo.webgpuSupported);
console.log('WebGL Support:', hardwareInfo.webglSupported);
console.log('Preferred Backend:', hardwareInfo.preferredBackend);

// Get optimal configuration for current hardware
const optimalConfig = await detection.getOptimalConfiguration();
console.log('Optimal Configuration:', optimalConfig);
```

## Integration with Existing AI Models

```typescript
// Example: Integrate with transformer model inference
async function runModelInference(inputTokens: number[], modelWeights: Float32Array) {
  const gpu = GPUAccelerationService.getInstance();
  
  // Optimize configuration for this model
  const config = await gpu.optimizeForInference({
    modelSize: modelWeights.length * 4,
    sequenceLength: inputTokens.length,
    batchSize: 1,
    optimization: {
      quantization: 'fp16',
      batching: true,
      parallelism: 4,
      caching: true
    },
    memoryBudget: 2 * 1024 * 1024 * 1024, // 2GB
    latencyTarget: 50 // 50ms target
  });
  
  console.log('Optimized config:', config.optimizedConfig);
  console.log('Expected speedup:', config.estimatedSpeedup);
  
  // Run inference with optimized configuration
  const result = await gpu.accelerate({
    operation: 'inference',
    inputs: [new Float32Array(inputTokens).buffer, modelWeights.buffer],
    config: config.optimizedConfig
  });
  
  return result;
}
```

## Best Practices

1. **Always check if GPU is available before using**:
   ```typescript
   const isAvailable = await isGPUAvailable();
   if (!isAvailable) {
     // Use CPU fallback
   }
   ```

2. **Use appropriate batch sizes**:
   ```typescript
   const optimalConfig = await getOptimalGPUConfig();
   const batchSize = Math.min(yourBatchSize, optimalConfig.maxBatchSize);
   ```

3. **Monitor performance and adjust**:
   ```typescript
   const metrics = gpu.getPerformanceMetrics();
   if (metrics.averagePerformance.efficiency < 0.5) {
     // Consider switching backends or optimizations
   }
   ```

4. **Handle errors gracefully**:
   ```typescript
   const config = {
     enableFallback: true, // Always enable CPU fallback
     enableOptimization: true,
     enablePerformanceMonitoring: true
   };
   ```

5. **Clean up resources**:
   ```typescript
   // Clean up when component unmounts or app closes
   await gpu.cleanup();
   ```

## Features Implemented

✅ **WebGL/WebGPU Integration**: Browser-based GPU acceleration
✅ **Memory Management**: Efficient allocation and pooling
✅ **Hardware Detection**: Automatic capability assessment
✅ **CPU Fallback**: Seamless fallback for unsupported systems
✅ **Performance Monitoring**: Real-time metrics and alerts
✅ **Inference Optimization**: Automatic configuration tuning
✅ **React Integration**: Easy-to-use React components and hooks
✅ **Error Handling**: Robust error handling and recovery
✅ **Benchmarking**: Performance comparison across backends
✅ **Memory Pooling**: Efficient memory reuse and garbage collection

This GPU acceleration system provides comprehensive browser-based acceleration without external dependencies, making it perfect for local AI inference in the BEAR AI application.