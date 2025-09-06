import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')

  // Start mock API server if needed
  // await startMockApiServer()

  // Pre-authenticate user for tests that need auth
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to login page and authenticate
    await page.goto('http://localhost:3000/login')
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login
    await page.waitForURL('**/dashboard')
    
    // Save authentication state
    await context.storageState({ path: 'tests/e2e/.auth/user.json' })
    console.log('✅ Authentication state saved')
    
  } catch (error) {
    console.warn('⚠️ Pre-authentication failed, tests will run unauthenticated:', error)
  }

  await browser.close()

  console.log('✅ Global setup completed')
}

export default globalSetup