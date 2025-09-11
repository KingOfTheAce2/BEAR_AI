# BEAR AI Memory Safety System Integration Guide

## Quick Start

### Installation and Setup

1. **Import the Memory Safety System**
```typescript
import { memorySafetySystem } from './integrations/memory-safety-system'
import { gracefulDegradationManager } from './integrations/graceful-degradation'
import { MemoryDashboard } from './components/memory/MemoryDashboard'
```

2. **Initialize in Your Application**
```typescript
async function initializeApp() {
  try {
    // Initialize memory safety system
    await memorySafetySystem.initialize()
    console.log('Memory safety system initialized')
    
    // Set up event listeners
    setupMemoryEventListeners()
    
  } catch (error) {
    console.error('Failed to initialize memory safety:', error)
  }
}
```

3. **Add Memory Dashboard to UI**
```tsx
function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/memory" element={<MemoryDashboard />} />
        {/* Other routes */}
      </Routes>
    </div>
  )
}
```

## Core Integration Patterns

### 1. Memory Monitoring Integration

#### Basic Memory Status Checking
```typescript
import { memorySafetySystem } from './integrations/memory-safety-system'

// Check current memory status
async function checkMemoryStatus() {
  const memoryInfo = await memorySafetySystem.getCurrentMemoryStatus()
  
  if (memoryInfo.usagePercentage > 80) {
    console.warn('High memory usage detected:', memoryInfo.usagePercentage)
    // Take appropriate action
  }
}
```

#### Real-time Memory Monitoring
```typescript
function setupMemoryEventListeners() {
  // Listen for memory updates
  memorySafetySystem.on('memoryUpdate', (memoryInfo) => {
    updateUIMemoryStatus(memoryInfo)
  })
  
  // Listen for memory alerts
  memorySafetySystem.on('alertCreated', (alert) => {
    showMemoryAlert(alert)
  })
  
  // Listen for threshold changes
  memorySafetySystem.on('thresholdTriggered', ({ threshold, memoryInfo }) => {
    handleMemoryThreshold(threshold, memoryInfo)
  })
}
```

### 2. Model Management Integration

#### Register LLM Models
```typescript
import { useBearStore } from './state/bear-store'

function registerModelsWithMemorySystem() {
  const models = useBearStore.getState().models
  
  Object.values(models).forEach(model => {
    memorySafetySystem.registerModel({
      modelId: model.id,
      memoryUsage: estimateModelMemoryUsage(model.size),
      isLoaded: model.isLoaded,
      lastAccessed: new Date(),
      priority: getModelPriority(model.type),
      canUnload: !model.isLoading,
      unloadSavings: estimateModelMemoryUsage(model.size)
    })
  })
}

function estimateModelMemoryUsage(modelSize: number): number {
  // Rough estimate: model size * 1.5 for loading overhead
  return modelSize * 1.5
}

function getModelPriority(modelType: string): number {
  const priorities = {
    'legal-specialist': 1, // Highest priority
    'document-processor': 2,
    'general-purpose': 3
  }
  return priorities[modelType] || 3
}
```

#### Model Loading with Memory Awareness
```typescript
async function loadModelWithMemoryCheck(modelId: string) {
  // Check if we have enough memory
  const memoryStatus = await memorySafetySystem.getCurrentMemoryStatus()
  const modelInfo = memorySafetySystem.getModelMemoryStatus()
  
  if (memoryStatus.usagePercentage > 75) {
    console.warn('High memory usage, optimizing before loading model')
    
    // Optimize memory usage first
    const optimization = await memorySafetySystem.lifecycleController.optimizeMemoryUsage(
      2 * 1024 * 1024 * 1024 // Need 2GB for new model
    )
    
    console.log(`Freed ${optimization.memorySaved} bytes by unloading:`, optimization.modelsUnloaded)
  }
  
  // Proceed with model loading
  return await loadModel(modelId)
}
```

### 3. Document Processing Integration

#### Memory-Aware Document Processing
```typescript
import { checkFeatureAvailability, getFeatureLimitations } from './integrations/graceful-degradation'

async function processDocument(documentId: string) {
  // Check if document processing is available
  if (!checkFeatureAvailability('document-processing')) {
    throw new Error('Document processing is temporarily disabled due to memory constraints')
  }
  
  // Get any processing limitations
  const limitations = getFeatureLimitations('document-processing')
  const maxSize = limitations?.maxSize || Infinity
  
  const document = getDocument(documentId)
  if (document.size > maxSize) {
    throw new Error(`Document too large (${document.size} bytes). Maximum allowed: ${maxSize} bytes`)
  }
  
  // Check memory before processing
  const memoryInfo = await memorySafetySystem.getCurrentMemoryStatus()
  if (memoryInfo.usagePercentage > 85) {
    // Use minimal processing mode
    return await processDocumentMinimal(documentId)
  }
  
  return await processDocumentFull(documentId)
}
```

#### Batch Processing with Memory Management
```typescript
async function processBatchDocuments(documentIds: string[]) {
  const memoryInfo = await memorySafetySystem.getCurrentMemoryStatus()
  
  // Determine batch size based on available memory
  let batchSize = 5 // Default
  
  if (memoryInfo.usagePercentage > 70) {
    batchSize = 2
  } else if (memoryInfo.usagePercentage > 80) {
    batchSize = 1
  }
  
  console.log(`Processing ${documentIds.length} documents in batches of ${batchSize}`)
  
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize)
    
    // Check memory before each batch
    const currentMemory = await memorySafetySystem.getCurrentMemoryStatus()
    if (currentMemory.usagePercentage > 85) {
      console.log('High memory usage, performing cleanup before next batch')
      await performMemoryCleanup()
    }
    
    await Promise.all(batch.map(id => processDocument(id)))
  }
}
```

### 4. UI Component Integration

#### Memory-Aware Feature Rendering
```tsx
import React from 'react'
import { checkFeatureAvailability } from './integrations/graceful-degradation'

function AdvancedAnalyticsPanel() {
  const isAvailable = checkFeatureAvailability('advanced-analytics')
  
  if (!isAvailable) {
    return (
      <div className="panel-disabled">
        <p>Advanced analytics temporarily disabled due to memory constraints.</p>
        <button onClick={() => requestFeatureRestoration('advanced-analytics')}>
          Request Restoration
        </button>
      </div>
    )
  }
  
  return (
    <div className="analytics-panel">
      {/* Full analytics UI */}
    </div>
  )
}
```

#### Memory Status in TopBar
```tsx
import React, { useState, useEffect } from 'react'
import { memorySafetySystem } from '../integrations/memory-safety-system'

function MemoryStatusIndicator() {
  const [memoryStatus, setMemoryStatus] = useState(null)
  const [alerts, setAlerts] = useState([])
  
  useEffect(() => {
    const updateStatus = async () => {
      const status = await memorySafetySystem.getCurrentMemoryStatus()
      const activeAlerts = memorySafetySystem.getActiveAlerts()
      
      setMemoryStatus(status)
      setAlerts(activeAlerts)
    }
    
    updateStatus()
    const interval = setInterval(updateStatus, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  if (!memoryStatus) return null
  
  const getStatusColor = (percentage) => {
    if (percentage < 70) return 'green'
    if (percentage < 80) return 'yellow'
    if (percentage < 90) return 'orange'
    return 'red'
  }
  
  return (
    <div className="memory-status">
      <div className={`memory-indicator ${getStatusColor(memoryStatus.usagePercentage)}`}>
        RAM: {memoryStatus.usagePercentage.toFixed(1)}%
      </div>
      {alerts.length > 0 && (
        <div className="alert-count">
          {alerts.length}
        </div>
      )}
    </div>
  )
}
```

### 5. Store Integration (Zustand)

#### Memory-Aware State Management
```typescript
import { memorySafetySystem } from '../integrations/memory-safety-system'

const useBearStore = create<BearStore>((set, get) => ({
  // ... existing state
  
  // Memory-aware document processing
  processDocument: async (documentId, analysisType) => {
    const memoryInfo = await memorySafetySystem.getCurrentMemoryStatus()
    
    // Check if we can process the document
    if (memoryInfo.usagePercentage > 85) {
      get().addNotification({
        type: 'warning',
        title: 'Memory Usage High',
        message: 'Document processing may be slower due to memory constraints'
      })
    }
    
    try {
      // Existing processing logic...
      await processDocumentWithMemoryManagement(documentId, analysisType)
    } catch (error) {
      if (error.message.includes('memory')) {
        // Handle memory-related errors
        get().addNotification({
          type: 'error',
          title: 'Processing Failed',
          message: 'Insufficient memory to process document. Try closing unused models.'
        })
      }
      throw error
    }
  },
  
  // Memory-aware model loading
  loadModel: async (id) => {
    const currentMemory = await memorySafetySystem.getCurrentMemoryStatus()
    
    if (currentMemory.usagePercentage > 80) {
      // Try to free up memory first
      const optimization = await memorySafetySystem.lifecycleController.optimizeMemoryUsage(
        2 * 1024 * 1024 * 1024 // 2GB target
      )
      
      if (optimization.memorySaved > 0) {
        get().addNotification({
          type: 'info',
          title: 'Memory Optimized',
          message: `Freed ${formatBytes(optimization.memorySaved)} by unloading unused models`
        })
      }
    }
    
    // Proceed with model loading
    set((state) => {
      if (state.models[id]) {
        state.models[id].isLoading = true
      }
    })
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate loading
      
      // Register with memory system
      memorySafetySystem.registerModel({
        modelId: id,
        memoryUsage: estimateModelMemoryUsage(get().models[id].size),
        isLoaded: true,
        lastAccessed: new Date(),
        priority: 1,
        canUnload: true,
        unloadSavings: estimateModelMemoryUsage(get().models[id].size)
      })
      
      set((state) => {
        if (state.models[id]) {
          state.models[id].isLoaded = true
          state.models[id].isLoading = false
        }
      })
    } catch (error) {
      set((state) => {
        if (state.models[id]) {
          state.models[id].isLoading = false
        }
      })
      throw error
    }
  }
}))
```

## Advanced Integration Scenarios

### 1. Custom Memory Cleanup Procedures

```typescript
import { EmergencyCleanupSystem } from './integrations/memory-safety-system'

// Register custom cleanup procedures
const emergencyCleanup = new EmergencyCleanupSystem()

emergencyCleanup.registerCleanupProcedure('clear-chat-history', async () => {
  // Clear chat history cache
  const store = useBearStore.getState()
  const chatHistorySize = estimateChatHistorySize()
  
  // Clear old conversations
  store.clearOldChatHistory()
  
  return chatHistorySize // Return estimated memory saved
})

emergencyCleanup.registerCleanupProcedure('compress-documents', async () => {
  // Compress loaded documents
  const store = useBearStore.getState()
  let memoryFreed = 0
  
  Object.values(store.documents).forEach(doc => {
    if (doc.analysis) {
      // Compress analysis data
      memoryFreed += compressDocumentAnalysis(doc.id)
    }
  })
  
  return memoryFreed
})
```

### 2. Performance Mode Integration

```typescript
import { gracefulDegradationManager } from './integrations/graceful-degradation'

// Listen for degradation level changes
gracefulDegradationManager.on('degradationLevelChanged', ({ from, to, restrictions }) => {
  const store = useBearStore.getState()
  
  // Update UI based on degradation level
  if (to === 'efficiency') {
    store.addNotification({
      type: 'warning',
      title: 'Performance Mode Changed',
      message: 'Switched to efficiency mode. Some features may be limited.'
    })
    
    // Disable resource-intensive features
    restrictions.forEach(restriction => {
      if (restriction.feature === 'real-time-processing') {
        store.updateSettings({
          processing: { ...store.settings.processing, enableBackgroundProcessing: false }
        })
      }
    })
  }
})

// Manual performance mode switching
function switchToPerformanceMode(mode: 'balanced' | 'performance' | 'efficiency') {
  switch (mode) {
    case 'performance':
      memorySafetySystem.setMemoryBudget(12 * 1024 * 1024 * 1024) // 12GB
      break
    case 'balanced':
      memorySafetySystem.setMemoryBudget(6 * 1024 * 1024 * 1024) // 6GB
      break
    case 'efficiency':
      memorySafetySystem.setMemoryBudget(3 * 1024 * 1024 * 1024) // 3GB
      break
  }
}
```

### 3. Error Handling and Recovery

```typescript
// Global error handler for memory-related issues
function handleMemoryError(error: Error, context: string) {
  const store = useBearStore.getState()
  
  if (error.message.includes('memory') || error.message.includes('heap')) {
    // Memory-related error
    store.addNotification({
      type: 'error',
      title: 'Memory Error',
      message: `Memory error in ${context}. Attempting recovery...`
    })
    
    // Trigger emergency cleanup
    memorySafetySystem.emergencyCleanup.performEmergencyCleanup()
      .then(result => {
        store.addNotification({
          type: 'success',
          title: 'Recovery Successful',
          message: `Freed ${formatBytes(result.totalMemorySaved)} of memory`
        })
      })
      .catch(cleanupError => {
        store.addNotification({
          type: 'error',
          title: 'Recovery Failed',
          message: 'Unable to recover from memory error. Please restart the application.'
        })
      })
  }
}

// Wrapper for memory-sensitive operations
async function withMemoryProtection<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    // Check memory before operation
    const memoryInfo = await memorySafetySystem.getCurrentMemoryStatus()
    if (memoryInfo.usagePercentage > 90) {
      throw new Error('Insufficient memory to perform operation')
    }
    
    return await operation()
  } catch (error) {
    handleMemoryError(error, context)
    throw error
  }
}

// Usage example
const result = await withMemoryProtection(
  () => processLargeDocument(documentId),
  'document processing'
)
```

## Configuration Examples

### Development Configuration
```typescript
// config/memory.development.ts
export const memoryConfig = {
  thresholds: {
    warning: 60,    // Lower thresholds for development
    critical: 70,
    emergency: 80
  },
  modelMemoryBudget: 4 * 1024 * 1024 * 1024, // 4GB
  monitoringInterval: 2000, // 2 seconds
  enableGracefulDegradation: true,
  logLevel: 'debug'
}
```

### Production Configuration
```typescript
// config/memory.production.ts
export const memoryConfig = {
  thresholds: {
    warning: 75,    // Higher thresholds for production
    critical: 85,
    emergency: 92
  },
  modelMemoryBudget: 8 * 1024 * 1024 * 1024, // 8GB
  monitoringInterval: 1000, // 1 second
  enableGracefulDegradation: true,
  logLevel: 'warn'
}
```

## Testing Integration

### Unit Tests for Memory-Aware Components
```typescript
import { memorySafetySystem } from './integrations/memory-safety-system'

describe('Memory-Aware Document Processing', () => {
  beforeEach(async () => {
    // Initialize with test configuration
    await memorySafetySystem.initialize({
      mockMode: true,
      initialMemoryUsage: 50 // 50%
    })
  })
  
  it('should process document normally under low memory usage', async () => {
    // Set low memory usage
    memorySafetySystem.setMockMemoryUsage(50)
    
    const result = await processDocument('test-doc')
    expect(result.processingMode).toBe('full')
  })
  
  it('should use minimal processing under high memory usage', async () => {
    // Set high memory usage
    memorySafetySystem.setMockMemoryUsage(88)
    
    const result = await processDocument('test-doc')
    expect(result.processingMode).toBe('minimal')
  })
  
  it('should reject processing when memory is critical', async () => {
    // Set critical memory usage
    memorySafetySystem.setMockMemoryUsage(95)
    
    await expect(processDocument('test-doc')).rejects.toThrow('Insufficient memory')
  })
})
```

### Integration Tests
```typescript
describe('Memory Safety System Integration', () => {
  it('should optimize memory when threshold is exceeded', async () => {
    // Load multiple models to increase memory usage
    await loadModel('model-1')
    await loadModel('model-2')
    await loadModel('model-3')
    
    // Simulate high memory usage
    const initialMemory = await memorySafetySystem.getCurrentMemoryStatus()
    
    // Trigger optimization
    const optimization = await memorySafetySystem.optimizeMemoryUsage(2 * 1024 * 1024 * 1024)
    
    expect(optimization.memorySaved).toBeGreaterThan(0)
    expect(optimization.modelsUnloaded.length).toBeGreaterThan(0)
  })
})
```

## Best Practices

### 1. Proactive Memory Management
- Check memory status before starting resource-intensive operations
- Register all models and large data structures with the memory system
- Use memory-aware batching for document processing
- Implement graceful degradation in UI components

### 2. Error Handling
- Always handle memory-related errors gracefully
- Provide clear user feedback for memory constraints
- Implement retry mechanisms with memory optimization

### 3. Performance Optimization
- Cache memory status to avoid frequent system calls
- Use debounced memory checks for real-time operations
- Implement intelligent prefetching based on memory availability

### 4. User Experience
- Show memory status in the UI
- Provide actionable recommendations for memory optimization
- Allow manual override of memory-based restrictions

### 5. Monitoring and Alerting
- Log memory events for debugging and optimization
- Set up alerts for consistent high memory usage
- Monitor memory trends to identify potential issues

## Troubleshooting

### Common Issues

1. **High Memory Usage Alerts**
   - Check for memory leaks in document processing
   - Verify model unloading is working correctly
   - Review cache cleanup procedures

2. **Features Disabled Due to Memory**
   - Check current degradation level
   - Free up memory by unloading unused models
   - Restart application if memory cannot be recovered

3. **Slow Performance Under Memory Pressure**
   - Enable efficiency mode manually
   - Reduce concurrent processing
   - Clear document cache

4. **Platform-Specific Issues**
   - Verify platform provider is working correctly
   - Check system permissions for memory monitoring
   - Review platform-specific configuration

### Debug Commands
```typescript
// Check system status
console.log(await memorySafetySystem.getCurrentMemoryStatus())

// View active alerts
console.log(memorySafetySystem.getActiveAlerts())

// Check degradation status
console.log(gracefulDegradationManager.getDegradationStatus())

// View model memory usage
console.log(memorySafetySystem.getModelMemoryStatus())
```

This integration guide provides comprehensive patterns for integrating the memory safety system throughout your BEAR AI application. Follow these patterns to ensure robust memory management and prevent system crashes.