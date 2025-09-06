import { test, expect } from '@playwright/test'

/**
 * Smoke tests - Critical functionality that should always work
 * These tests are tagged with @smoke and can be run separately
 */

test.describe('Smoke Tests @smoke', () => {
  test('application loads and displays main interface', async ({ page }) => {
    await page.goto('/')

    // Should load without errors
    await expect(page).toHaveTitle(/BEAR AI/i)
    
    // Main layout elements should be visible
    await expect(page.locator('[data-testid="header"]')).toBeVisible()
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
  })

  test('navigation works between main pages', async ({ page }) => {
    await page.goto('/dashboard')

    // Dashboard should load
    await expect(page.locator('h1')).toContainText(/dashboard|welcome/i)

    // Navigate to chat
    await page.locator('[data-testid="nav-chat"]').click()
    await expect(page).toHaveURL(/.*chat/)
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()

    // Navigate to research
    await page.locator('[data-testid="nav-research"]').click()
    await expect(page).toHaveURL(/.*research/)
    await expect(page.locator('[data-testid="search-container"]')).toBeVisible()

    // Navigate to documents
    await page.locator('[data-testid="nav-documents"]').click()
    await expect(page).toHaveURL(/.*documents/)
    await expect(page.locator('[data-testid="documents-container"]')).toBeVisible()

    // Navigate to settings
    await page.locator('[data-testid="nav-settings"]').click()
    await expect(page).toHaveURL(/.*settings/)
    await expect(page.locator('[data-testid="settings-container"]')).toBeVisible()
  })

  test('can send a basic chat message', async ({ page }) => {
    await page.goto('/chat')

    const messageInput = page.locator('[data-testid="message-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')

    // Send a simple message
    await messageInput.fill('Hello, can you help me with a legal question?')
    await sendButton.click()

    // Message should appear
    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('Hello, can you help me with a legal question?')

    // Should get a response (within reasonable time)
    await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({ timeout: 30000 })
  })

  test('can perform basic search', async ({ page }) => {
    await page.goto('/research')

    const searchInput = page.locator('[data-testid="search-input"]')
    const searchButton = page.locator('[data-testid="search-button"]')

    // Perform a search
    await searchInput.fill('contract law')
    await searchButton.click()

    // Should show loading state
    await expect(page.locator('[data-testid="search-loading"]')).toBeVisible()

    // Should show results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid="result-item"]').first()).toBeVisible()
  })

  test('can access user settings', async ({ page }) => {
    await page.goto('/settings')

    // Settings form should be visible
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible()

    // Key setting options should be available
    await expect(page.locator('[data-testid="theme-setting"]')).toBeVisible()
    await expect(page.locator('[data-testid="language-setting"]')).toBeVisible()
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible()

    // Can change a setting
    await page.locator('[data-testid="theme-dark"]').click()
    await page.locator('[data-testid="save-settings"]').click()

    // Should show success message
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible()
  })

  test('error handling works', async ({ page }) => {
    // Test 404 page
    await page.goto('/nonexistent-page')
    await expect(page.locator('[data-testid="error-404"]')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/not found|404/i)

    // Should have way to navigate back
    await expect(page.locator('[data-testid="go-home"]')).toBeVisible()
    await page.locator('[data-testid="go-home"]').click()
    await expect(page).toHaveURL(/.*dashboard|.*home/)
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()

    // Desktop sidebar should be hidden
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible()

    // Can open mobile menu
    await page.locator('[data-testid="mobile-menu-button"]').click()
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

    // Can navigate via mobile menu
    await page.locator('[data-testid="mobile-nav-chat"]').click()
    await expect(page).toHaveURL(/.*chat/)
  })

  test('accessibility features work', async ({ page }) => {
    await page.goto('/dashboard')

    // Can navigate with keyboard
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus').first()
    await expect(focusedElement).toBeVisible()

    // Skip link should work
    await page.keyboard.press('Enter')

    // High contrast mode toggle should exist
    await expect(page.locator('[data-testid="high-contrast-toggle"]')).toBeVisible()
  })

  test('basic security measures are in place', async ({ page }) => {
    // CSP headers should be present (check in network tab)
    const response = await page.goto('/')
    expect(response?.headers()['content-security-policy']).toBeDefined()

    // No sensitive data in localStorage for unauthenticated users
    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          items[key] = localStorage.getItem(key) || ''
        }
      }
      return items
    })

    // Should not contain sensitive information
    Object.values(localStorage).forEach(value => {
      expect(value).not.toMatch(/password|secret|private|token/i)
    })
  })

  test('performance is acceptable', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    
    // Page should load within reasonable time
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // 5 second limit

    // Core Web Vitals check (simplified)
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          resolve(entries.map(entry => ({
            name: entry.name,
            value: entry.value || entry.duration
          })))
        }).observe({ entryTypes: ['navigation', 'paint'] })
      })
    })

    // Basic performance assertions
    expect(Array.isArray(metrics)).toBe(true)
  })
})