/**
 * Component Tests for Memory Dashboard
 * Testing React components and UI elements for memory monitoring
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryDashboard } from '../../src/components/memory/MemoryDashboard'
import { memorySafetySystem } from '../../src/integrations/memory-safety-system'
import type { SystemMemoryInfo, MemoryAlert } from '../../src/integrations/memory-safety-system'

// Mock the memory safety system
vi.mock('../../src/integrations/memory-safety-system', () => ({
  memorySafetySystem: {
    getCurrentMemoryStatus: vi.fn(),
    getActiveAlerts: vi.fn(),
    getModelMemoryStatus: vi.fn(),
    acknowledgeAlert: vi.fn()
  }
}))

// Mock UI components
vi.mock('../../src/components/ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`card ${className}`}>{children}</div>
  )
}))

vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ 
    children, 
    onClick, 
    variant = 'default', 
    size = 'default',
    className 
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    className?: string
  }) => (
    <button 
      onClick={onClick} 
      className={`button ${variant} ${size} ${className}`}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

vi.mock('../../src/components/ui/Badge', () => ({
  Badge: ({ 
    children, 
    variant = 'default',
    className 
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
      {children}
    </span>
  )
}))

describe('MemoryDashboard Component', () => {
  const mockSystemMemory: SystemMemoryInfo = {
    total: 16 * 1024 * 1024 * 1024, // 16GB
    used: 8 * 1024 * 1024 * 1024,   // 8GB
    available: 8 * 1024 * 1024 * 1024, // 8GB
    usagePercentage: 50,
    platform: 'win32',
    gpu: {
      total: 8 * 1024 * 1024 * 1024,
      used: 2 * 1024 * 1024 * 1024,
      available: 6 * 1024 * 1024 * 1024,
      devices: [
        {
          name: 'NVIDIA RTX 4080',
          memory: 8 * 1024 * 1024 * 1024,
          utilization: 25.5
        }
      ]
    }
  }

  const mockModelSummary = {
    totalUsed: 4 * 1024 * 1024 * 1024, // 4GB
    totalBudget: 8 * 1024 * 1024 * 1024, // 8GB
    utilizationPercentage: 50,
    loadedModels: 2,
    modelsCanUnload: 1
  }

  const mockAlerts: MemoryAlert[] = [
    {
      id: 'alert-1',
      level: 'warning',
      title: 'High Memory Usage',
      message: 'System memory usage is approaching warning threshold',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      acknowledged: false,
      autoResolve: true,
      actions: [
        {
          label: 'Optimize Memory',
          action: vi.fn(),
          estimatedSavings: 1024 * 1024 * 1024
        }
      ]
    },
    {
      id: 'alert-2',
      level: 'critical',
      title: 'Critical Memory Pressure',
      message: 'Immediate action required to prevent system instability',
      timestamp: new Date('2024-01-15T10:35:00Z'),
      acknowledged: true,
      autoResolve: false
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Setup default mock implementations
    vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockResolvedValue(mockSystemMemory)
    vi.mocked(memorySafetySystem.getActiveAlerts).mockReturnValue(mockAlerts)
    vi.mocked(memorySafetySystem.getModelMemoryStatus).mockReturnValue(mockModelSummary)
    vi.mocked(memorySafetySystem.acknowledgeAlert).mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      render(<MemoryDashboard />)
      
      expect(screen.getByText('Memory Monitor')).toBeInTheDocument()
      
      // Should show loading placeholder
      const loadingElement = document.querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })

    it('should render memory dashboard after loading', async () => {
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Memory Monitor')).toBeInTheDocument()
        expect(screen.getByText('System Memory')).toBeInTheDocument()
        expect(screen.getByText('AI Model Memory')).toBeInTheDocument()
        expect(screen.queryBy('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('should display custom className', () => {
      const { container } = render(<MemoryDashboard className="custom-class" />)
      
      const dashboard = container.firstChild as HTMLElement
      expect(dashboard).toHaveClass('custom-class')
    })
  })

  describe('System Memory Display', () => {
    beforeEach(async () => {
      render(<MemoryDashboard />)
      await waitFor(() => {
        expect(screen.queryBy('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('should display system memory usage percentage', async () => {
      await waitFor(() => {
        expect(screen.getByText('50.0% Used')).toBeInTheDocument()
      })
    })

    it('should display formatted memory sizes', async () => {
      await waitFor(() => {
        expect(screen.getByText('16.0 GB')).toBeInTheDocument() // Total
        expect(screen.getByText('8.0 GB')).toBeInTheDocument() // Used and Available
      })
    })

    it('should display platform information', async () => {
      await waitFor(() => {
        expect(screen.getByText('win32')).toBeInTheDocument()
      })
    })

    it('should render memory usage bar with correct color', async () => {
      await waitFor(() => {
        const memoryBar = document.querySelector('.bg-green-500')
        expect(memoryBar).toBeInTheDocument()
      })
    })

    it('should show GPU information when available', async () => {
      await waitFor(() => {
        expect(screen.getByText('GPU Memory')).toBeInTheDocument()
        expect(screen.getByText('NVIDIA RTX 4080: 25.5% utilization')).toBeInTheDocument()
      })
    })

    it('should color-code memory usage levels', async () => {
      // Test high memory usage
      const highUsageMemory = {
        ...mockSystemMemory,
        usagePercentage: 85
      }
      
      vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockResolvedValue(highUsageMemory)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('85.0% Used')).toBeInTheDocument()
        const criticalBadge = screen.getByTestId('badge')
        expect(criticalBadge).toHaveClass('destructive')
      })
    })
  })

  describe('Model Memory Display', () => {
    beforeEach(async () => {
      render(<MemoryDashboard />)
      await waitFor(() => {
        expect(screen.queryBy('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('should display model memory statistics', async () => {
      await waitFor(() => {
        expect(screen.getByText('AI Model Memory')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument() // Loaded models
        expect(screen.getByText('1')).toBeInTheDocument() // Can unload
        expect(screen.getByText('50.0%')).toBeInTheDocument() // Budget used
      })
    })

    it('should display formatted model memory sizes', async () => {
      await waitFor(() => {
        // Should show 4GB / 8GB
        const memoryText = screen.getByText(/4\.0 GB \/ 8\.0 GB/)
        expect(memoryText).toBeInTheDocument()
      })
    })

    it('should render model memory usage bar', async () => {
      await waitFor(() => {
        // Should have memory usage visualization
        const usageBars = document.querySelectorAll('.h-3.rounded-full')
        expect(usageBars.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Alert System', () => {
    beforeEach(async () => {
      render(<MemoryDashboard />)
      await waitFor(() => {
        expect(screen.queryBy('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('should display active alerts', async () => {
      await waitFor(() => {
        expect(screen.getByText('Memory Alerts (2)')).toBeInTheDocument()
        expect(screen.getByText('High Memory Usage')).toBeInTheDocument()
        expect(screen.getByText('Critical Memory Pressure')).toBeInTheDocument()
      })
    })

    it('should show alert levels with appropriate styling', async () => {
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge')
        const warningBadge = badges.find(badge => badge.textContent === 'WARNING')
        const criticalBadge = badges.find(badge => badge.textContent === 'CRITICAL')
        
        expect(warningBadge).toBeInTheDocument()
        expect(criticalBadge).toBeInTheDocument()
      })
    })

    it('should display alert timestamps', async () => {
      await waitFor(() => {
        // Check for formatted time strings
        expect(screen.getByText(/10:30/)).toBeInTheDocument()
        expect(screen.getByText(/10:35/)).toBeInTheDocument()
      })
    })

    it('should show acknowledged status', async () => {
      await waitFor(() => {
        expect(screen.getByText('Acknowledged')).toBeInTheDocument()
      })
    })

    it('should handle alert acknowledgment', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      await waitFor(() => {
        const acknowledgeButton = screen.getByText('Acknowledge')
        expect(acknowledgeButton).toBeInTheDocument()
      })
      
      const acknowledgeButton = screen.getByText('Acknowledge')
      await user.click(acknowledgeButton)
      
      expect(memorySafetySystem.acknowledgeAlert).toHaveBeenCalledWith('alert-1')
    })

    it('should execute alert actions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      await waitFor(() => {
        const optimizeButton = screen.getByText('Optimize Memory')
        expect(optimizeButton).toBeInTheDocument()
      })
      
      const optimizeButton = screen.getByText('Optimize Memory')
      await user.click(optimizeButton)
      
      expect(mockAlerts[0].actions![0].action).toHaveBeenCalled()
    })

    it('should not show alerts section when no alerts', async () => {
      vi.mocked(memorySafetySystem.getActiveAlerts).mockReturnValue([])
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.queryByText(/Memory Alerts/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Health Status Indicators', () => {
    beforeEach(async () => {
      render(<MemoryDashboard />)
      await waitFor(() => {
        expect(screen.queryBy('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('should display memory health status', async () => {
      await waitFor(() => {
        expect(screen.getByText('Memory Health Status')).toBeInTheDocument()
        expect(screen.getByText('System Status')).toBeInTheDocument()
        expect(screen.getByText('Model Memory')).toBeInTheDocument()
        expect(screen.getByText('Alert Status')).toBeInTheDocument()
      })
    })

    it('should show healthy status for normal usage', async () => {
      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeInTheDocument()
        expect(screen.getByText('Optimal')).toBeInTheDocument()
      })
    })

    it('should show warning status for high usage', async () => {
      const highUsageMemory = {
        ...mockSystemMemory,
        usagePercentage: 82
      }
      
      vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockResolvedValue(highUsageMemory)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Warning')).toBeInTheDocument()
      })
    })

    it('should show critical status for very high usage', async () => {
      const criticalUsageMemory = {
        ...mockSystemMemory,
        usagePercentage: 95
      }
      
      vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockResolvedValue(criticalUsageMemory)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument()
      })
    })

    it('should display alert status correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('2 Active')).toBeInTheDocument()
      })
    })

    it('should show no issues when no unacknowledged alerts', async () => {
      const acknowledgedAlerts = mockAlerts.map(alert => ({
        ...alert,
        acknowledged: true
      }))
      
      vi.mocked(memorySafetySystem.getActiveAlerts).mockReturnValue(acknowledgedAlerts)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('No Issues')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-Refresh Functionality', () => {
    it('should auto-refresh by default', async () => {
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Auto-Refresh On')).toBeInTheDocument()
      })
      
      // Clear initial calls
      vi.clearAllMocks()
      
      // Advance time by 2 seconds (auto-refresh interval)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      await waitFor(() => {
        expect(memorySafetySystem.getCurrentMemoryStatus).toHaveBeenCalled()
      })
    })

    it('should allow disabling auto-refresh', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        const autoRefreshButton = screen.getByText('Auto-Refresh On')
        expect(autoRefreshButton).toBeInTheDocument()
      })
      
      const autoRefreshButton = screen.getByText('Auto-Refresh On')
      await user.click(autoRefreshButton)
      
      expect(screen.getByText('Auto-Refresh Off')).toBeInTheDocument()
      
      // Clear calls and advance time
      vi.clearAllMocks()
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      // Should not have been called since auto-refresh is off
      expect(memorySafetySystem.getCurrentMemoryStatus).not.toHaveBeenCalled()
    })

    it('should allow manual refresh', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh')
        expect(refreshButton).toBeInTheDocument()
      })
      
      // Clear initial calls
      vi.clearAllMocks()
      
      const refreshButton = screen.getByText('Refresh')
      await user.click(refreshButton)
      
      expect(memorySafetySystem.getCurrentMemoryStatus).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle memory status fetch errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockRejectedValue(
        new Error('Memory status fetch failed')
      )
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch memory stats:',
          expect.any(Error)
        )
      })
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle missing GPU information', async () => {
      const memoryWithoutGPU = {
        ...mockSystemMemory,
        gpu: undefined
      }
      
      vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockResolvedValue(memoryWithoutGPU)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        expect(screen.queryByText('GPU Memory')).not.toBeInTheDocument()
      })
    })

    it('should handle null memory status', async () => {
      vi.mocked(memorySafetySystem.getCurrentMemoryStatus).mockResolvedValue(null as any)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        // Should not crash and should show some fallback content
        expect(screen.getByText('Memory Monitor')).toBeInTheDocument()
      })
    })

    it('should handle acknowledgment failures', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.mocked(memorySafetySystem.acknowledgeAlert).mockReturnValue(false)
      
      render(<MemoryDashboard />)
      
      await waitFor(() => {
        const acknowledgeButton = screen.getByText('Acknowledge')
        expect(acknowledgeButton).toBeInTheDocument()
      })
      
      const acknowledgeButton = screen.getByText('Acknowledge')
      await user.click(acknowledgeButton)
      
      // Should still attempt acknowledgment even if it fails
      expect(memorySafetySystem.acknowledgeAlert).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<MemoryDashboard />)
      await waitFor(() => {
        expect(screen.queryBy('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('should have proper heading hierarchy', async () => {
      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 2 })
        expect(mainHeading).toHaveTextContent('Memory Monitor')
        
        const subHeadings = screen.getAllByRole('heading', { level: 3 })
        expect(subHeadings.length).toBeGreaterThan(0)
      })
    })

    it('should have accessible buttons', async () => {
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toBeVisible()
          expect(button).not.toHaveAttribute('disabled')
        })
      })
    })

    it('should provide meaningful text for screen readers', async () => {
      await waitFor(() => {
        // Check that percentages are properly formatted
        expect(screen.getByText('50.0% Used')).toBeInTheDocument()
        
        // Check that memory sizes are human-readable
        expect(screen.getByText('16.0 GB')).toBeInTheDocument()
      })
    })
  })
})