import { test, expect } from '@playwright/test'

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Use pre-authenticated state
    await page.goto('/chat')
  })

  test('should display chat interface @smoke', async ({ page }) => {
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
  })

  test('should send a message @smoke', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')

    await messageInput.fill('What are the elements of a valid contract?')
    await sendButton.click()

    // Message should appear in chat
    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('What are the elements of a valid contract?')

    // Should show typing indicator
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible()

    // Wait for AI response
    await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible()
  })

  test('should send message with Enter key', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]')

    await messageInput.fill('Test message with Enter key')
    await messageInput.press('Enter')

    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('Test message with Enter key')
  })

  test('should not send empty messages', async ({ page }) => {
    const sendButton = page.locator('[data-testid="send-button"]')

    // Button should be disabled when input is empty
    await expect(sendButton).toBeDisabled()

    // Try to send empty message
    await sendButton.click({ force: true })

    // No new message should appear
    const messageCount = await page.locator('[data-testid^="message-"]').count()
    expect(messageCount).toBe(0)
  })

  test('should handle file attachments', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]')
    const messageInput = page.locator('[data-testid="message-input"]')

    // Create a test file
    const testFile = {
      name: 'test-contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test PDF content'),
    }

    await messageInput.fill('Please review this contract')
    await fileInput.setInputFiles(testFile)

    // File should be shown as attached
    await expect(page.locator('[data-testid="attached-file"]')).toBeVisible()
    await expect(page.locator('[data-testid="attached-file"]')).toContainText('test-contract.pdf')

    await page.locator('[data-testid="send-button"]').click()

    // Message should include attachment
    const lastMessage = page.locator('[data-testid="message-user"]').last()
    await expect(lastMessage).toContainText('Please review this contract')
    await expect(lastMessage.locator('[data-testid="message-attachment"]')).toBeVisible()
  })

  test('should remove attached files', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]')

    const testFile = {
      name: 'removable-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test content'),
    }

    await fileInput.setInputFiles(testFile)
    await expect(page.locator('[data-testid="attached-file"]')).toBeVisible()

    // Remove the file
    await page.locator('[data-testid="remove-file"]').click()
    await expect(page.locator('[data-testid="attached-file"]')).not.toBeVisible()
  })

  test('should create new conversation', async ({ page }) => {
    await page.locator('[data-testid="new-chat-button"]').click()

    // Should clear current messages
    await expect(page.locator('[data-testid^="message-"]')).toHaveCount(0)

    // Should show new conversation in sidebar
    await expect(page.locator('[data-testid="conversation-list"] [data-testid="conversation-item"]').first()).toContainText('New Conversation')
  })

  test('should switch between conversations', async ({ page }) => {
    // Create first conversation
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('First conversation message')
    await page.locator('[data-testid="send-button"]').click()

    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('First conversation message')

    // Create new conversation
    await page.locator('[data-testid="new-chat-button"]').click()
    await messageInput.fill('Second conversation message')
    await page.locator('[data-testid="send-button"]').click()

    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('Second conversation message')

    // Switch back to first conversation
    await page.locator('[data-testid="conversation-list"] [data-testid="conversation-item"]').nth(1).click()

    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('First conversation message')
  })

  test('should delete conversations', async ({ page }) => {
    // Create a conversation
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Message to delete')
    await page.locator('[data-testid="send-button"]').click()

    // Get conversation count before deletion
    const initialCount = await page.locator('[data-testid="conversation-item"]').count()

    // Delete conversation
    await page.locator('[data-testid="conversation-item"]').first().hover()
    await page.locator('[data-testid="delete-conversation"]').first().click()
    
    // Confirm deletion
    await page.locator('[data-testid="confirm-delete"]').click()

    // Conversation should be removed
    const finalCount = await page.locator('[data-testid="conversation-item"]').count()
    expect(finalCount).toBe(initialCount - 1)
  })

  test('should export conversations', async ({ page }) => {
    // Create a conversation with messages
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Export test message')
    await page.locator('[data-testid="send-button"]').click()

    // Wait for AI response
    await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({ timeout: 30000 })

    // Export conversation
    await page.locator('[data-testid="conversation-item"]').first().hover()
    await page.locator('[data-testid="export-conversation"]').first().click()

    // Choose export format
    await page.locator('[data-testid="export-json"]').click()

    // Download should start
    const downloadPromise = page.waitForEvent('download')
    await downloadPromise
  })

  test('should copy message content', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Message to copy')
    await page.locator('[data-testid="send-button"]').click()

    const message = page.locator('[data-testid="message-user"]').last()
    await message.hover()
    await page.locator('[data-testid="copy-message"]').first().click()

    // Should show copy confirmation
    await expect(page.locator('[data-testid="copy-confirmation"]')).toBeVisible()
  })

  test('should regenerate AI responses', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Regeneration test message')
    await page.locator('[data-testid="send-button"]').click()

    // Wait for initial AI response
    await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({ timeout: 30000 })
    
    const initialResponse = await page.locator('[data-testid="message-assistant"]').last().textContent()

    // Regenerate response
    await page.locator('[data-testid="message-assistant"]').last().hover()
    await page.locator('[data-testid="regenerate-response"]').click()

    // Should show typing indicator
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible()

    // Wait for new response
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible({ timeout: 30000 })
    
    const newResponse = await page.locator('[data-testid="message-assistant"]').last().textContent()
    expect(newResponse).not.toBe(initialResponse)
  })

  test('should display citations in responses', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('What does the Constitution say about due process?')
    await page.locator('[data-testid="send-button"]').click()

    // Wait for AI response with citations
    await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({ timeout: 30000 })

    const assistantMessage = page.locator('[data-testid="message-assistant"]').last()
    await expect(assistantMessage.locator('[data-testid="citations"]')).toBeVisible()
    await expect(assistantMessage.locator('[data-testid="citation-item"]').first()).toBeVisible()
  })

  test('should handle connection errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/chat/messages', (route) => {
      route.abort('failed')
    })

    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('This message will fail')
    await page.locator('[data-testid="send-button"]').click()

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/failed|error/i)

    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('should search through conversations', async ({ page }) => {
    // Create conversations with searchable content
    const messageInput = page.locator('[data-testid="message-input"]')
    
    await messageInput.fill('Contract law discussion')
    await page.locator('[data-testid="send-button"]').click()

    await page.locator('[data-testid="new-chat-button"]').click()

    await messageInput.fill('Employment rights question')
    await page.locator('[data-testid="send-button"]').click()

    // Search conversations
    const searchInput = page.locator('[data-testid="conversation-search"]')
    await searchInput.fill('contract')

    // Should filter conversations
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="conversation-item"]').first()).toContainText('Contract')

    // Clear search
    await searchInput.clear()
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(2)
  })

  test('should auto-scroll to latest message', async ({ page }) => {
    // Fill chat with many messages
    const messageInput = page.locator('[data-testid="message-input"]')
    
    for (let i = 1; i <= 10; i++) {
      await messageInput.fill(`Message ${i}`)
      await page.locator('[data-testid="send-button"]').click()
      await page.waitForTimeout(1000) // Wait between messages
    }

    // Latest message should be visible
    const latestMessage = page.locator('[data-testid="message-user"]').last()
    await expect(latestMessage).toBeInViewport()
  })
})