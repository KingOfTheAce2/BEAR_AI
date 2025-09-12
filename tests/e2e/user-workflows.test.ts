import { test, expect } from '@playwright/test';

test.describe('BEAR AI User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial Setup and Onboarding', () => {
    test('should complete first-time user setup', async ({ page }) => {
      // Check if onboarding modal appears for new users
      const onboardingModal = page.locator('[data-testid="onboarding-modal"]');
      
      if (await onboardingModal.isVisible()) {
        // Complete onboarding steps
        await page.click('[data-testid="start-onboarding"]');
        
        // Step 1: Welcome
        await expect(page.locator('h1')).toContainText('Welcome to BEAR AI');
        await page.click('[data-testid="next-step"]');
        
        // Step 2: Model Selection
        await page.click('[data-testid="select-default-model"]');
        await page.click('[data-testid="next-step"]');
        
        // Step 3: Preferences
        await page.selectOption('[data-testid="theme-select"]', 'dark');
        await page.click('[data-testid="finish-onboarding"]');
        
        // Verify onboarding completion
        await expect(onboardingModal).not.toBeVisible();
      }
      
      // Verify main application is accessible
      await expect(page.locator('[data-testid="main-dashboard"]')).toBeVisible();
    });

    test('should persist user preferences', async ({ page }) => {
      // Set preferences
      await page.click('[data-testid="settings-button"]');
      await page.selectOption('[data-testid="theme-select"]', 'dark');
      await page.click('[data-testid="save-settings"]');
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify preferences are maintained
      await page.click('[data-testid="settings-button"]');
      const themeSelect = page.locator('[data-testid="theme-select"]');
      await expect(themeSelect).toHaveValue('dark');
    });
  });

  test.describe('Model Management Workflow', () => {
    test('should browse and select models', async ({ page }) => {
      // Navigate to models page
      await page.click('[data-testid="models-nav"]');
      await expect(page.locator('h1')).toContainText('Models');
      
      // Browse available models
      await expect(page.locator('[data-testid="model-grid"]')).toBeVisible();
      
      // Filter models
      await page.selectOption('[data-testid="provider-filter"]', 'openai');
      await expect(page.locator('[data-testid="model-card"]')).toHaveCount(2);
      
      // Select a model
      await page.click('[data-testid="model-card"]:first-child');
      await page.click('[data-testid="set-as-current"]');
      
      // Verify model selection
      await expect(page.locator('[data-testid="current-model-badge"]')).toBeVisible();
    });

    test('should configure model parameters', async ({ page }) => {
      await page.click('[data-testid="models-nav"]');
      await page.click('[data-testid="model-card"]:first-child');
      await page.click('[data-testid="configure-model"]');
      
      // Adjust parameters
      await page.fill('[data-testid="temperature-input"]', '0.8');
      await page.fill('[data-testid="max-tokens-input"]', '2048');
      await page.click('[data-testid="save-configuration"]');
      
      // Verify configuration saved
      await expect(page.locator('[data-testid="config-saved-toast"]')).toBeVisible();
    });

    test('should add custom model', async ({ page }) => {
      await page.click('[data-testid="models-nav"]');
      await page.click('[data-testid="add-custom-model"]');
      
      // Fill custom model form
      await page.fill('[data-testid="model-id-input"]', 'custom-llama');
      await page.fill('[data-testid="model-name-input"]', 'Custom Llama Model');
      await page.selectOption('[data-testid="provider-select"]', 'custom');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8080');
      
      // Save custom model
      await page.click('[data-testid="save-custom-model"]');
      
      // Verify model appears in grid
      await expect(page.locator('[data-testid="model-card"]').filter({ hasText: 'Custom Llama Model' })).toBeVisible();
    });
  });

  test.describe('Chat Interaction Workflow', () => {
    test('should conduct basic conversation', async ({ page }) => {
      // Navigate to chat
      await page.click('[data-testid="chat-nav"]');
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      
      // Send message
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('Hello, how are you?');
      await page.click('[data-testid="send-message"]');
      
      // Verify message appears
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Hello, how are you?');
      
      // Wait for and verify response
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
    });

    test('should handle code snippets', async ({ page }) => {
      await page.click('[data-testid="chat-nav"]');
      
      // Send code request
      await page.fill('[data-testid="message-input"]', 'Write a Python function to calculate fibonacci numbers');
      await page.click('[data-testid="send-message"]');
      
      // Wait for response
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 15000 });
      
      // Verify code block appears
      await expect(page.locator('[data-testid="code-block"]')).toBeVisible();
      
      // Test copy functionality
      await page.click('[data-testid="copy-code-button"]');
      await expect(page.locator('[data-testid="copy-success-toast"]')).toBeVisible();
    });

    test('should manage chat history', async ({ page }) => {
      await page.click('[data-testid="chat-nav"]');
      
      // Send multiple messages
      for (let i = 1; i <= 3; i++) {
        await page.fill('[data-testid="message-input"]', `Test message ${i}`);
        await page.click('[data-testid="send-message"]');
        await page.waitForTimeout(1000);
      }
      
      // Open chat history
      await page.click('[data-testid="chat-history-button"]');
      await expect(page.locator('[data-testid="chat-history-panel"]')).toBeVisible();
      
      // Verify messages in history
      await expect(page.locator('[data-testid="history-message"]')).toHaveCount(6); // 3 user + 3 assistant
      
      // Clear history
      await page.click('[data-testid="clear-history-button"]');
      await page.click('[data-testid="confirm-clear"]');
      
      // Verify history cleared
      await expect(page.locator('[data-testid="history-message"]')).toHaveCount(0);
    });

    test('should export chat conversation', async ({ page }) => {
      await page.click('[data-testid="chat-nav"]');
      
      // Create some conversation
      await page.fill('[data-testid="message-input"]', 'Test conversation for export');
      await page.click('[data-testid="send-message"]');
      await page.waitForTimeout(2000);
      
      // Export conversation
      await page.click('[data-testid="export-chat-button"]');
      await page.selectOption('[data-testid="export-format"]', 'markdown');
      
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-export"]');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/chat-export.*\.md$/);
    });
  });

  test.describe('Agent Management Workflow', () => {
    test('should create and configure agent', async ({ page }) => {
      // Navigate to agents page
      await page.click('[data-testid="agents-nav"]');
      await expect(page.locator('h1')).toContainText('Agents');
      
      // Create new agent
      await page.click('[data-testid="create-agent-button"]');
      
      // Fill agent details
      await page.fill('[data-testid="agent-name-input"]', 'Test Agent');
      await page.selectOption('[data-testid="agent-type-select"]', 'coder');
      await page.fill('[data-testid="agent-description-input"]', 'Agent for testing purposes');
      
      // Configure capabilities
      await page.check('[data-testid="capability-coding"]');
      await page.check('[data-testid="capability-analysis"]');
      
      // Save agent
      await page.click('[data-testid="save-agent"]');
      
      // Verify agent created
      await expect(page.locator('[data-testid="agent-card"]').filter({ hasText: 'Test Agent' })).toBeVisible();
    });

    test('should execute agent task', async ({ page }) => {
      await page.click('[data-testid="agents-nav"]');
      
      // Assume agent already exists from previous test or setup
      await page.click('[data-testid="agent-card"]:first-child');
      await page.click('[data-testid="assign-task-button"]');
      
      // Define task
      await page.fill('[data-testid="task-description"]', 'Analyze the following code for potential improvements');
      await page.fill('[data-testid="task-input"]', 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)');
      
      // Execute task
      await page.click('[data-testid="execute-task"]');
      
      // Monitor task progress
      await expect(page.locator('[data-testid="task-status"]')).toContainText('Running');
      
      // Wait for completion
      await expect(page.locator('[data-testid="task-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Verify results
      await expect(page.locator('[data-testid="task-results"]')).toBeVisible();
    });

    test('should coordinate multiple agents', async ({ page }) => {
      await page.click('[data-testid="agents-nav"]');
      await page.click('[data-testid="multi-agent-task"]');
      
      // Select agents for coordination
      await page.check('[data-testid="select-agent-1"]');
      await page.check('[data-testid="select-agent-2"]');
      
      // Define collaborative task
      await page.fill('[data-testid="coordination-task"]', 'Create a web application with backend API and frontend interface');
      
      // Set coordination mode
      await page.selectOption('[data-testid="coordination-mode"]', 'hierarchical');
      
      // Start coordination
      await page.click('[data-testid="start-coordination"]');
      
      // Monitor coordination progress
      await expect(page.locator('[data-testid="coordination-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-communication-log"]')).toBeVisible();
    });
  });

  test.describe('Jan Integration Workflow', () => {
    test('should connect to Jan instance', async ({ page }) => {
      await page.click('[data-testid="integrations-nav"]');
      await page.click('[data-testid="jan-integration-card"]');
      
      // Configure Jan connection
      await page.fill('[data-testid="jan-endpoint-input"]', 'http://localhost:1337');
      await page.click('[data-testid="test-jan-connection"]');
      
      // Verify connection
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      
      // Save configuration
      await page.click('[data-testid="save-jan-config"]');
      await expect(page.locator('[data-testid="config-saved-toast"]')).toBeVisible();
    });

    test('should sync models from Jan', async ({ page }) => {
      await page.click('[data-testid="integrations-nav"]');
      await page.click('[data-testid="jan-integration-card"]');
      
      // Trigger model sync
      await page.click('[data-testid="sync-jan-models"]');
      
      // Monitor sync progress
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-complete-message"]')).toBeVisible({ timeout: 30000 });
      
      // Verify models synced
      await page.click('[data-testid="models-nav"]');
      await expect(page.locator('[data-testid="jan-model-badge"]')).toBeVisible();
    });

    test('should use Jan model for chat', async ({ page }) => {
      // Assuming Jan integration is set up
      await page.click('[data-testid="models-nav"]');
      
      // Select Jan model
      await page.click('[data-testid="model-card"]').filter({ hasText: 'Jan' }).first();
      await page.click('[data-testid="set-as-current"]');
      
      // Navigate to chat
      await page.click('[data-testid="chat-nav"]');
      
      // Verify Jan model is active
      await expect(page.locator('[data-testid="current-model-indicator"]')).toContainText('Jan');
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'Hello from Jan integration test');
      await page.click('[data-testid="send-message"]');
      
      // Verify response from Jan model
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Performance and Monitoring', () => {
    test('should display performance metrics', async ({ page }) => {
      await page.click('[data-testid="performance-nav"]');
      
      // Verify performance dashboard
      await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
      
      // Check metric cards
      await expect(page.locator('[data-testid="memory-usage-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="cpu-usage-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time-card"]')).toBeVisible();
      
      // Verify charts
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    });

    test('should handle performance alerts', async ({ page }) => {
      await page.click('[data-testid="performance-nav"]');
      
      // Simulate high memory usage scenario
      await page.evaluate(() => {
        // Trigger performance alert (would be done through actual system load)
        window.dispatchEvent(new CustomEvent('performance-alert', {
          detail: { type: 'memory', level: 'warning', value: 85 }
        }));
      });
      
      // Verify alert appears
      await expect(page.locator('[data-testid="performance-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-message"]')).toContainText('memory');
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();
      
      // Navigate through main elements
      const navigationElements = ['models-nav', 'chat-nav', 'agents-nav', 'settings-nav'];
      
      for (const element of navigationElements) {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await expect(page.locator(`[data-testid="${element}"]`)).toHaveClass(/active|selected/);
      }
    });

    test('should support screen reader accessibility', async ({ page }) => {
      // Check for proper ARIA labels and roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      
      // Verify heading structure
      const headings = await page.locator('h1, h2, h3').all();
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = await page.locator('img').all();
      for (const img of images) {
        await expect(img).toHaveAttribute('alt');
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Enable high contrast simulation
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      // Verify interface adapts
      await expect(page.locator('body')).toHaveCSS('background-color', /#000000|rgb\(0, 0, 0\)|#[0-9a-f]{6}/);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network connectivity issues', async ({ page }) => {
      // Simulate offline state
      await page.context().setOffline(true);
      
      await page.click('[data-testid="chat-nav"]');
      await page.fill('[data-testid="message-input"]', 'Test message during offline');
      await page.click('[data-testid="send-message"]');
      
      // Verify offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Restore connectivity
      await page.context().setOffline(false);
      
      // Verify reconnection
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    });

    test('should recover from API errors', async ({ page }) => {
      // This would require mocking API responses to return errors
      // For now, we'll test the error handling UI
      
      await page.click('[data-testid="chat-nav"]');
      
      // Simulate API error scenario
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('api-error', {
          detail: { message: 'Service temporarily unavailable' }
        }));
      });
      
      // Verify error message appears
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });
  });
});