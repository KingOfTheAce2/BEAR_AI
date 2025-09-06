import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to login when not authenticated @smoke', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/)
    await expect(page.locator('h1')).toContainText('Sign In')
  })

  test('should login with valid credentials @smoke', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('h1')).toContainText(/welcome|dashboard/i)
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid|error/i)
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('input[data-testid="email-input"]:invalid')).toBeVisible()
  })

  test('should require password', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('input[data-testid="password-input"]:invalid')).toBeVisible()
  })

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')

    // Click login button
    const loginButton = page.locator('[data-testid="login-button"]')
    await loginButton.click()

    // Should show loading state
    await expect(loginButton).toBeDisabled()
    await expect(loginButton).toContainText(/loading|signing/i)
  })

  test('should logout successfully', async ({ page }) => {
    // Login first (using pre-authenticated state would be better)
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/)

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })

  test('should remember me functionality', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.check('[data-testid="remember-me"]')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL(/.*dashboard/)

    // Simulate page refresh
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('h1')).toContainText(/welcome|dashboard/i)
  })

  test('should handle session expiration', async ({ page }) => {
    // This would require mocking token expiration
    // For now, just test that expired sessions redirect to login
    
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL(/.*dashboard/)

    // Mock expired token scenario
    await page.evaluate(() => {
      localStorage.removeItem('auth-token')
      sessionStorage.removeItem('auth-token')
    })

    // Try to access protected route
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Registration Flow', () => {
  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[data-testid="name-input"]', 'New User')
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'securepassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'securepassword123')
    await page.check('[data-testid="terms-checkbox"]')

    await page.click('[data-testid="register-button"]')

    // Should redirect to dashboard or email verification
    await expect(page).toHaveURL(/.*dashboard|verify/)
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'differentpassword')

    const confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]')
    await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('should require terms acceptance', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[data-testid="name-input"]', 'New User')
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')

    // Don't check terms checkbox
    await page.click('[data-testid="register-button"]')

    await expect(page.locator('[data-testid="terms-error"]')).toBeVisible()
  })

  test('should handle duplicate email registration', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[data-testid="name-input"]', 'Existing User')
    await page.fill('[data-testid="email-input"]', 'existing@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')
    await page.check('[data-testid="terms-checkbox"]')

    await page.click('[data-testid="register-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/already exists|duplicate/i)
  })
})