import { test, expect, Page } from '@playwright/test';

// Test payment plans and configurations
const PAYMENT_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    features: ['Document Analysis', 'Basic PII Detection', 'Email Support']
  },
  professional: {
    id: 'professional',
    name: 'Professional Plan',
    price: 99.99,
    currency: 'USD',
    interval: 'month',
    features: ['Advanced Analysis', 'Real-time PII Detection', 'Priority Support', 'API Access']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 299.99,
    currency: 'USD',
    interval: 'month',
    features: ['All Features', 'Custom Integrations', 'Dedicated Support', 'On-premise Deployment']
  }
};

const TEST_CARDS = {
  valid: {
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123',
    name: 'Test User',
    zip: '12345'
  },
  declined: {
    number: '4000000000000002',
    expiry: '12/25',
    cvc: '123',
    name: 'Test User',
    zip: '12345'
  },
  insufficient_funds: {
    number: '4000000000009995',
    expiry: '12/25',
    cvc: '123',
    name: 'Test User',
    zip: '12345'
  }
};

test.describe('Payment Flow System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
  });

  test('should display all available plans correctly', async ({ page }) => {
    // Verify all payment plans are displayed
    for (const plan of Object.values(PAYMENT_PLANS)) {
      const planCard = page.locator(`[data-testid="plan-${plan.id}"]`);
      await expect(planCard).toBeVisible();

      // Check plan details
      await expect(planCard.locator('[data-testid="plan-name"]')).toContainText(plan.name);
      await expect(planCard.locator('[data-testid="plan-price"]')).toContainText(plan.price.toString());

      // Verify features are listed
      for (const feature of plan.features) {
        await expect(planCard.locator(`[data-testid="feature"]`)).toContainText(feature);
      }
    }
  });

  test('should complete successful subscription flow', async ({ page }) => {
    // Select Professional plan
    await page.click('[data-testid="plan-professional"] [data-testid="select-plan"]');

    // Should navigate to checkout
    await page.waitForURL('**/checkout**');

    // Verify plan details in checkout
    const checkoutSummary = page.locator('[data-testid="checkout-summary"]');
    await expect(checkoutSummary).toContainText('Professional Plan');
    await expect(checkoutSummary).toContainText('$99.99');

    // Fill billing information
    await page.fill('[data-testid="billing-name"]', 'John Doe');
    await page.fill('[data-testid="billing-email"]', 'john.doe@example.com');

    // Fill payment information
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[name="cardnumber"]').fill(TEST_CARDS.valid.number);
    await stripeFrame.locator('[name="exp-date"]').fill(TEST_CARDS.valid.expiry);
    await stripeFrame.locator('[name="cvc"]').fill(TEST_CARDS.valid.cvc);
    await stripeFrame.locator('[name="postal"]').fill(TEST_CARDS.valid.zip);

    // Submit payment
    await page.click('[data-testid="submit-payment"]');

    // Wait for payment processing
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });

    // Verify success message
    const successMessage = page.locator('[data-testid="payment-success"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Payment successful');

    // Should redirect to dashboard with active subscription
    await page.waitForURL('**/dashboard**');

    // Verify subscription status
    const subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    await expect(subscriptionStatus).toContainText('Professional');
    await expect(subscriptionStatus).toContainText('Active');
  });

  test('should handle payment failures gracefully', async ({ page }) => {
    // Select Basic plan
    await page.click('[data-testid="plan-basic"] [data-testid="select-plan"]');
    await page.waitForURL('**/checkout**');

    // Fill billing information
    await page.fill('[data-testid="billing-name"]', 'Test User');
    await page.fill('[data-testid="billing-email"]', 'test@example.com');

    // Use declined card
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[name="cardnumber"]').fill(TEST_CARDS.declined.number);
    await stripeFrame.locator('[name="exp-date"]').fill(TEST_CARDS.declined.expiry);
    await stripeFrame.locator('[name="cvc"]').fill(TEST_CARDS.declined.cvc);
    await stripeFrame.locator('[name="postal"]').fill(TEST_CARDS.declined.zip);

    // Submit payment
    await page.click('[data-testid="submit-payment"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="payment-error"]', { timeout: 15000 });

    // Verify error handling
    const errorMessage = page.locator('[data-testid="payment-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/declined|failed/i);

    // Verify user remains on checkout page
    expect(page.url()).toContain('/checkout');

    // Verify form is still accessible for retry
    const retryButton = page.locator('[data-testid="retry-payment"]');
    await expect(retryButton).toBeVisible();
  });

  test('should support plan upgrades', async ({ page }) => {
    // Navigate to account settings (assuming user already has basic plan)
    await page.goto('/account/subscription');

    // Current plan should be displayed
    const currentPlan = page.locator('[data-testid="current-plan"]');
    await expect(currentPlan).toBeVisible();

    // Click upgrade button
    await page.click('[data-testid="upgrade-plan"]');

    // Should show upgrade options
    const upgradeModal = page.locator('[data-testid="upgrade-modal"]');
    await expect(upgradeModal).toBeVisible();

    // Select Professional plan upgrade
    await page.click('[data-testid="upgrade-to-professional"]');

    // Verify upgrade pricing (prorated)
    const upgradePrice = page.locator('[data-testid="upgrade-price"]');
    await expect(upgradePrice).toBeVisible();
    await expect(upgradePrice).toContainText('$'); // Should show prorated amount

    // Confirm upgrade
    await page.click('[data-testid="confirm-upgrade"]');

    // Wait for upgrade completion
    await page.waitForSelector('[data-testid="upgrade-success"]', { timeout: 30000 });

    // Verify new plan is active
    await expect(currentPlan).toContainText('Professional');
  });

  test('should handle subscription cancellation', async ({ page }) => {
    // Navigate to subscription management
    await page.goto('/account/subscription');

    // Click cancel subscription
    await page.click('[data-testid="cancel-subscription"]');

    // Confirm cancellation in modal
    const cancelModal = page.locator('[data-testid="cancel-modal"]');
    await expect(cancelModal).toBeVisible();

    // Verify cancellation warning
    await expect(cancelModal).toContainText('will lose access');
    await expect(cancelModal).toContainText('end of billing period');

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancellation"]');

    // Wait for cancellation success
    await page.waitForSelector('[data-testid="cancellation-success"]', { timeout: 15000 });

    // Verify subscription status shows cancellation
    const subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    await expect(subscriptionStatus).toContainText('Cancelled');

    // Verify access period is shown
    const accessPeriod = page.locator('[data-testid="access-until"]');
    await expect(accessPeriod).toBeVisible();
  });

  test('should display billing history', async ({ page }) => {
    // Navigate to billing history
    await page.goto('/account/billing');

    // Verify billing history table
    const billingTable = page.locator('[data-testid="billing-history"]');
    await expect(billingTable).toBeVisible();

    // Check table headers
    await expect(billingTable.locator('th')).toContainText(['Date', 'Amount', 'Status', 'Invoice']);

    // Verify at least one billing record exists (from setup)
    const billingRows = billingTable.locator('tbody tr');
    await expect(billingRows).toHaveCountGreaterThan(0);

    // Test invoice download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-invoice"]:first-of-type');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf$/);
  });

  test('should handle enterprise custom billing', async ({ page }) => {
    // Select Enterprise plan
    await page.click('[data-testid="plan-enterprise"] [data-testid="select-plan"]');

    // Should show contact form instead of direct checkout
    await page.waitForSelector('[data-testid="enterprise-contact-form"]');

    const contactForm = page.locator('[data-testid="enterprise-contact-form"]');
    await expect(contactForm).toBeVisible();

    // Fill enterprise contact form
    await page.fill('[data-testid="company-name"]', 'Acme Legal Corp');
    await page.fill('[data-testid="contact-name"]', 'Jane Smith');
    await page.fill('[data-testid="contact-email"]', 'jane.smith@acmelegal.com');
    await page.fill('[data-testid="company-size"]', '500');
    await page.fill('[data-testid="requirements"]', 'Need custom integration with existing legal software');

    // Submit enterprise inquiry
    await page.click('[data-testid="submit-enterprise-inquiry"]');

    // Verify submission success
    await page.waitForSelector('[data-testid="enterprise-inquiry-success"]');
    const successMessage = page.locator('[data-testid="enterprise-inquiry-success"]');
    await expect(successMessage).toContainText('We will contact you within 24 hours');
  });

  test('should validate payment form inputs', async ({ page }) => {
    // Select Basic plan
    await page.click('[data-testid="plan-basic"] [data-testid="select-plan"]');
    await page.waitForURL('**/checkout**');

    // Try to submit empty form
    await page.click('[data-testid="submit-payment"]');

    // Verify validation errors
    const nameError = page.locator('[data-testid="billing-name-error"]');
    await expect(nameError).toBeVisible();
    await expect(nameError).toContainText('required');

    const emailError = page.locator('[data-testid="billing-email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('required');

    // Test invalid email format
    await page.fill('[data-testid="billing-email"]', 'invalid-email');
    await page.blur('[data-testid="billing-email"]');

    await expect(emailError).toContainText('valid email');

    // Test card validation
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[name="cardnumber"]').fill('1234');

    // Should show card validation error
    const cardError = page.locator('[data-testid="card-error"]');
    await expect(cardError).toBeVisible();
  });

  test('should handle subscription renewal notifications', async ({ page }) => {
    // Navigate to notification settings
    await page.goto('/account/notifications');

    // Verify billing notification preferences
    const billingNotifications = page.locator('[data-testid="billing-notifications"]');
    await expect(billingNotifications).toBeVisible();

    // Enable renewal reminders
    const renewalReminder = page.locator('[data-testid="renewal-reminder-toggle"]');
    await renewalReminder.check();

    // Set reminder timing
    await page.selectOption('[data-testid="reminder-timing"]', '7'); // 7 days before

    // Save notification settings
    await page.click('[data-testid="save-notifications"]');

    // Verify settings saved
    const saveSuccess = page.locator('[data-testid="notifications-saved"]');
    await expect(saveSuccess).toBeVisible();
  });

  test('should support multiple payment methods', async ({ page }) => {
    // Navigate to payment methods
    await page.goto('/account/payment-methods');

    // Add new payment method
    await page.click('[data-testid="add-payment-method"]');

    const paymentMethodModal = page.locator('[data-testid="payment-method-modal"]');
    await expect(paymentMethodModal).toBeVisible();

    // Add second card
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[name="cardnumber"]').fill('5555555555554444'); // Mastercard
    await stripeFrame.locator('[name="exp-date"]').fill('12/26');
    await stripeFrame.locator('[name="cvc"]').fill('456');
    await stripeFrame.locator('[name="postal"]').fill('54321');

    // Save payment method
    await page.click('[data-testid="save-payment-method"]');

    // Verify payment method added
    await page.waitForSelector('[data-testid="payment-method-list"]');
    const paymentMethods = page.locator('[data-testid="payment-method-item"]');
    await expect(paymentMethods).toHaveCountGreaterThan(1);

    // Set as default payment method
    await page.click('[data-testid="set-default"]:nth-of-type(2)');

    // Verify default status updated
    const defaultBadge = page.locator('[data-testid="default-payment-badge"]');
    await expect(defaultBadge).toBeVisible();
  });
});