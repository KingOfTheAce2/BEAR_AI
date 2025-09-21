import { FullConfig, chromium } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Launch browser for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page and authenticate
    await page.goto('http://localhost:3000/login');

    // Create test user account if needed
    const testUser = {
      email: 'test@bearai.com',
      password: 'TestPassword123!',
      name: 'Test User'
    };

    // Check if we need to register first
    const signUpLink = page.locator('a[href*="signup"], a[href*="register"]');
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await page.fill('[name="name"], [data-testid="name-input"]', testUser.name);
      await page.fill('[name="email"], [data-testid="email-input"]', testUser.email);
      await page.fill('[name="password"], [data-testid="password-input"]', testUser.password);
      await page.click('[type="submit"], [data-testid="submit-button"]');

      // Wait for registration confirmation or redirect
      await page.waitForURL(/dashboard|home|welcome/, { timeout: 10000 });
    } else {
      // Login with existing account
      await page.fill('[name="email"], [data-testid="email-input"]', testUser.email);
      await page.fill('[name="password"], [data-testid="password-input"]', testUser.password);
      await page.click('[type="submit"], [data-testid="login-button"]');

      // Wait for login success
      await page.waitForURL(/dashboard|home/, { timeout: 10000 });
    }

    // Save authentication state
    await context.storageState({ path: 'tests/e2e/auth-state.json' });

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.warn('⚠️ Authentication setup failed, tests will run without auth:', error);
    // Continue with tests even if auth fails
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;