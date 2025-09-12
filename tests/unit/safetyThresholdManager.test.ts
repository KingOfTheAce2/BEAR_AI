/**
 * Unit Tests for Safety Threshold Manager
 * Testing memory threshold management and automated responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  SafetyThresholdManager,
  MemoryThreshold,
  MemoryAction,
  SystemMemoryInfo
} from '../../src/integrations/memory-safety-system'

describe('SafetyThresholdManager', () => {
  let manager: SafetyThresholdManager
  let mockMemoryInfo: SystemMemoryInfo

  beforeEach(() => {
    manager = new SafetyThresholdManager()
    
    mockMemoryInfo = {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      available: 8 * 1024 * 1024 * 1024, // 8GB
      used: 8 * 1024 * 1024 * 1024, // 8GB
      usagePercentage: 50,
      platform: 'win32'
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default thresholds', () => {
      const thresholds = manager.getThresholds()
      
      expect(thresholds).toHaveLength(4)
      expect(thresholds.map(t => t.level)).toEqual(['normal', 'warning', 'critical', 'emergency'])
      expect(thresholds.find(t => t.level === 'warning')?.percentage).toBe(75)
      expect(thresholds.find(t => t.level === 'critical')?.percentage).toBe(85)
      expect(thresholds.find(t => t.level === 'emergency')?.percentage).toBe(92)
    })

    it('should initialize with correct action priorities', () => {
      const thresholds = manager.getThresholds()
      
      thresholds.forEach(threshold => {
        threshold.actions.forEach((action, index) => {
          expect(action.priority).toBeGreaterThan(0)
          // Actions should be sorted by priority
          if (index > 0) {
            expect(action.priority).toBeGreaterThanOrEqual(threshold.actions[index - 1].priority)
          }
        })
      })
    })

    it('should have escalating estimated savings', () => {
      const thresholds = manager.getThresholds()
      const warningActions = thresholds.find(t => t.level === 'warning')?.actions || []
      const criticalActions = thresholds.find(t => t.level === 'critical')?.actions || []
      const emergencyActions = thresholds.find(t => t.level === 'emergency')?.actions || []
      
      const warningMaxSavings = Math.max(...warningActions.map(a => a.estimatedSavings))
      const criticalMaxSavings = Math.max(...criticalActions.map(a => a.estimatedSavings))
      const emergencyMaxSavings = Math.max(...emergencyActions.map(a => a.estimatedSavings))
      
      expect(criticalMaxSavings).toBeGreaterThan(warningMaxSavings)
      expect(emergencyMaxSavings).toBeGreaterThan(criticalMaxSavings)
    })
  })

  describe('Threshold Evaluation', () => {
    it('should return null for usage below warning threshold', () => {
      mockMemoryInfo.usagePercentage = 60 // Below 75% warning threshold
      
      const result = manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(result).toBeNull()
    })

    it('should trigger warning threshold', () => {
      mockMemoryInfo.usagePercentage = 80 // Above 75% warning threshold
      
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      const result = manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(result).not.toBeNull()
      expect(result?.level).toBe('warning')
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should trigger critical threshold', () => {
      mockMemoryInfo.usagePercentage = 90 // Above 85% critical threshold
      
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      const result = manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(result).not.toBeNull()
      expect(result?.level).toBe('critical')
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should trigger emergency threshold', () => {
      mockMemoryInfo.usagePercentage = 95 // Above 92% emergency threshold
      
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      const result = manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(result).not.toBeNull()
      expect(result?.level).toBe('emergency')
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should select highest applicable threshold', () => {
      mockMemoryInfo.usagePercentage = 95 // Triggers both warning and critical and emergency
      
      const result = manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(result?.level).toBe('emergency') // Highest level
    })

    it('should only emit event when threshold level changes', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      // First evaluation at warning level
      mockMemoryInfo.usagePercentage = 80
      manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(eventSpy).toHaveBeenCalledTimes(1)
      
      // Second evaluation at same warning level
      mockMemoryInfo.usagePercentage = 82
      manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(eventSpy).toHaveBeenCalledTimes(1) // Should not trigger again
      
      // Third evaluation at critical level
      mockMemoryInfo.usagePercentage = 90
      manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(eventSpy).toHaveBeenCalledTimes(2) // Should trigger for level change
    })

    it('should handle threshold downgrade correctly', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      // Start at critical level
      mockMemoryInfo.usagePercentage = 90
      manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(manager.getCurrentLevel()).toBe('critical')
      
      // Drop to warning level
      mockMemoryInfo.usagePercentage = 80
      manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(manager.getCurrentLevel()).toBe('warning')
      expect(eventSpy).toHaveBeenCalledTimes(2)
      
      // Drop to normal level
      mockMemoryInfo.usagePercentage = 60
      const result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result).toBeNull()
      expect(manager.getCurrentLevel()).toBe('normal')
    })
  })

  describe('Threshold Actions', () => {
    it('should include notify actions for all threshold levels', () => {
      const thresholds = manager.getThresholds()
      
      thresholds.forEach(threshold => {
        if (threshold.level !== 'normal') {
          const notifyActions = threshold.actions.filter(a => a.type === 'notify')
          expect(notifyActions.length).toBeGreaterThan(0)
        }
      })
    })

    it('should include cleanup actions for warning and above', () => {
      const thresholds = manager.getThresholds()
      const warningThreshold = thresholds.find(t => t.level === 'warning')
      const criticalThreshold = thresholds.find(t => t.level === 'critical')
      
      expect(warningThreshold?.actions.some(a => a.type === 'cleanup')).toBe(true)
      expect(criticalThreshold?.actions.some(a => a.type === 'unload-model')).toBe(true)
    })

    it('should include emergency actions for emergency level', () => {
      const thresholds = manager.getThresholds()
      const emergencyThreshold = thresholds.find(t => t.level === 'emergency')
      
      expect(emergencyThreshold?.actions.some(a => a.type === 'emergency-stop')).toBe(true)
    })

    it('should have increasing action severity by level', () => {
      const thresholds = manager.getThresholds()
      
      const warningActions = thresholds.find(t => t.level === 'warning')?.actions || []
      const criticalActions = thresholds.find(t => t.level === 'critical')?.actions || []
      const emergencyActions = thresholds.find(t => t.level === 'emergency')?.actions || []
      
      // Warning should have basic cleanup
      expect(warningActions.some(a => a.type === 'cleanup')).toBe(true)
      
      // Critical should have model management
      expect(criticalActions.some(a => a.type === 'unload-model')).toBe(true)
      expect(criticalActions.some(a => a.type === 'limit-processing')).toBe(true)
      
      // Emergency should have drastic measures
      expect(emergencyActions.some(a => a.type === 'emergency-stop')).toBe(true)
    })
  })

  describe('Threshold Customization', () => {
    it('should allow updating threshold percentages', () => {
      const newActions: MemoryAction[] = [
        {
          type: 'notify',
          priority: 1,
          estimatedSavings: 0,
          params: { level: 'custom-warning' }
        }
      ]
      
      manager.updateThreshold('warning', 70, newActions)
      
      const thresholds = manager.getThresholds()
      const warningThreshold = thresholds.find(t => t.level === 'warning')
      
      expect(warningThreshold?.percentage).toBe(70)
      expect(warningThreshold?.actions).toEqual(newActions)
    })

    it('should emit update event when threshold is modified', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdUpdated', eventSpy)
      
      const newActions: MemoryAction[] = []
      manager.updateThreshold('warning', 80, newActions)
      
      expect(eventSpy).toHaveBeenCalledWith({
        level: 'warning',
        percentage: 80,
        actions: newActions
      })
    })

    it('should ignore updates for non-existent threshold levels', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdUpdated', eventSpy)
      
      manager.updateThreshold('nonexistent', 50, [])
      
      expect(eventSpy).not.toHaveBeenCalled()
    })

    it('should validate threshold ordering after updates', () => {
      // Update thresholds to ensure proper ordering
      manager.updateThreshold('warning', 60, [])
      manager.updateThreshold('critical', 70, [])
      manager.updateThreshold('emergency', 80, [])
      
      const thresholds = manager.getThresholds()
      const percentages = thresholds
        .filter(t => t.level !== 'normal')
        .map(t => t.percentage)
        .sort((a, b) => a - b)
      
      // Should be in ascending order
      for (let i = 1; i < percentages.length; i++) {
        expect(percentages[i]).toBeGreaterThan(percentages[i - 1])
      }
    })
  })

  describe('Memory Action Validation', () => {
    it('should validate action types', () => {
      const thresholds = manager.getThresholds()
      const validActionTypes = ['notify', 'cleanup', 'unload-model', 'limit-processing', 'emergency-stop']
      
      thresholds.forEach(threshold => {
        threshold.actions.forEach(action => {
          expect(validActionTypes).toContain(action.type)
        })
      })
    })

    it('should validate priority values', () => {
      const thresholds = manager.getThresholds()
      
      thresholds.forEach(threshold => {
        threshold.actions.forEach(action => {
          expect(action.priority).toBeGreaterThan(0)
          expect(action.priority).toBeLessThan(100)
        })
      })
    })

    it('should validate estimated savings', () => {
      const thresholds = manager.getThresholds()
      
      thresholds.forEach(threshold => {
        threshold.actions.forEach(action => {
          expect(action.estimatedSavings).toBeGreaterThanOrEqual(0)
          expect(typeof action.estimatedSavings).toBe('number')
        })
      })
    })

    it('should include required parameters for each action type', () => {
      const thresholds = manager.getThresholds()
      
      thresholds.forEach(threshold => {
        threshold.actions.forEach(action => {
          if (action.type === 'notify') {
            expect(action.params).toHaveProperty('level')
            expect(action.params).toHaveProperty('title')
          }
          if (action.type === 'unload-model') {
            expect(action.params).toHaveProperty('strategy')
          }
          if (action.type === 'limit-processing') {
            expect(action.params).toHaveProperty('maxConcurrentTasks')
          }
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle exactly threshold boundary values', () => {
      // Test exact threshold values
      mockMemoryInfo.usagePercentage = 75 // Exact warning threshold
      let result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('warning')
      
      mockMemoryInfo.usagePercentage = 85 // Exact critical threshold  
      result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('critical')
      
      mockMemoryInfo.usagePercentage = 92 // Exact emergency threshold
      result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('emergency')
    })

    it('should handle values just below thresholds', () => {
      mockMemoryInfo.usagePercentage = 74.9 // Just below warning
      let result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result).toBeNull()
      
      mockMemoryInfo.usagePercentage = 84.9 // Just below critical
      result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('warning')
      
      mockMemoryInfo.usagePercentage = 91.9 // Just below emergency
      result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('critical')
    })

    it('should handle extreme memory usage values', () => {
      // Test 100% usage
      mockMemoryInfo.usagePercentage = 100
      let result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('emergency')
      
      // Test over 100% (edge case)
      mockMemoryInfo.usagePercentage = 105
      result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result?.level).toBe('emergency')
      
      // Test 0% usage
      mockMemoryInfo.usagePercentage = 0
      result = manager.evaluateMemoryUsage(mockMemoryInfo)
      expect(result).toBeNull()
    })

    it('should handle rapid threshold level changes', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      // Rapid escalation
      mockMemoryInfo.usagePercentage = 76
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      mockMemoryInfo.usagePercentage = 86
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      mockMemoryInfo.usagePercentage = 94
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      // Rapid de-escalation
      mockMemoryInfo.usagePercentage = 85
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      mockMemoryInfo.usagePercentage = 70
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      // Should have triggered for each level change
      expect(eventSpy).toHaveBeenCalledTimes(4)
    })

    it('should handle invalid memory info gracefully', () => {
      const invalidMemoryInfo = {
        ...mockMemoryInfo,
        usagePercentage: NaN
      }
      
      expect(() => {
        manager.evaluateMemoryUsage(invalidMemoryInfo)
      }).not.toThrow()
    })

    it('should handle missing memory info properties', () => {
      const incompleteMemoryInfo = {
        usagePercentage: 80
      } as SystemMemoryInfo
      
      expect(() => {
        manager.evaluateMemoryUsage(incompleteMemoryInfo)
      }).not.toThrow()
    })
  })

  describe('Event System', () => {
    it('should emit threshold triggered event with correct data', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      mockMemoryInfo.usagePercentage = 80
      const threshold = manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(eventSpy).toHaveBeenCalledWith({
        threshold,
        memoryInfo: mockMemoryInfo,
        previousLevel: expect.any(String)
      })
    })

    it('should provide current level in event data', () => {
      const eventSpy = vi.fn()
      manager.on('thresholdTriggered', eventSpy)
      
      // Start at normal
      expect(manager.getCurrentLevel()).toBe('normal')
      
      // Trigger warning
      mockMemoryInfo.usagePercentage = 80
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      const eventData = eventSpy.mock.calls[0][0]
      expect(eventData.previousLevel).toBe('normal')
      expect(manager.getCurrentLevel()).toBe('warning')
    })

    it('should handle multiple event listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()
      
      manager.on('thresholdTriggered', listener1)
      manager.on('thresholdTriggered', listener2)
      manager.on('thresholdTriggered', listener3)
      
      mockMemoryInfo.usagePercentage = 80
      manager.evaluateMemoryUsage(mockMemoryInfo)
      
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()
    })

    it('should handle event listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()
      
      manager.on('thresholdTriggered', errorListener)
      manager.on('thresholdTriggered', normalListener)
      
      mockMemoryInfo.usagePercentage = 80
      
      expect(() => {
        manager.evaluateMemoryUsage(mockMemoryInfo)
      }).not.toThrow()
      
      expect(normalListener).toHaveBeenCalled()
    })
  })

  describe('Performance and Memory Impact', () => {
    it('should efficiently evaluate thresholds', () => {
      const iterations = 1000
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        mockMemoryInfo.usagePercentage = Math.random() * 100
        manager.evaluateMemoryUsage(mockMemoryInfo)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete 1000 evaluations in reasonable time
      expect(duration).toBeLessThan(100) // Less than 100ms
    })

    it('should not create memory leaks with frequent evaluations', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Perform many evaluations
      for (let i = 0; i < 10000; i++) {
        mockMemoryInfo.usagePercentage = (i % 100) + Math.random()
        manager.evaluateMemoryUsage(mockMemoryInfo)
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle concurrent threshold evaluations', () => {
      const promises = []
      
      for (let i = 0; i < 100; i++) {
        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            mockMemoryInfo.usagePercentage = Math.random() * 100
            manager.evaluateMemoryUsage(mockMemoryInfo)
            resolve()
          }, Math.random() * 10)
        })
        promises.push(promise)
      }
      
      return expect(Promise.all(promises)).resolves.toBeDefined()
    })
  })
})