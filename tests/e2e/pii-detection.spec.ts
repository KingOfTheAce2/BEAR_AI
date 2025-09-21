import { test, expect, Page } from '@playwright/test';

// Test data containing various PII types
const TEST_DOCUMENTS = {
  withPII: {
    content: `
      John Doe
      Email: john.doe@example.com
      Phone: (555) 123-4567
      SSN: 123-45-6789
      Credit Card: 4532-1234-5678-9012
      Address: 123 Main St, Anytown, ST 12345
      Date of Birth: 01/15/1985
    `,
    expectedPII: [
      { type: 'email', value: 'john.doe@example.com' },
      { type: 'phone', value: '(555) 123-4567' },
      { type: 'ssn', value: '123-45-6789' },
      { type: 'credit_card', value: '4532-1234-5678-9012' },
      { type: 'address', value: '123 Main St, Anytown, ST 12345' }
    ]
  },
  withoutPII: {
    content: `
      This is a sample legal document about contract law.
      It discusses various aspects of commercial agreements
      and does not contain any personal information.
    `,
    expectedPII: []
  },
  mixedContent: {
    content: `
      Contract Agreement

      This agreement is between Company ABC and john.smith@company.com.
      The terms include payment of $50,000 upon completion.
      Contact number for questions: 555-987-6543.

      Legal precedent from Case No. 2023-CV-1234 applies.
    `,
    expectedPII: [
      { type: 'email', value: 'john.smith@company.com' },
      { type: 'phone', value: '555-987-6543' }
    ]
  }
};

test.describe('PII Detection System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the document analysis page
    await page.goto('/documents/analyze');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should detect PII in document upload', async ({ page }) => {
    // Create a test file with PII content
    const testFile = 'test-document-with-pii.txt';

    // Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: testFile,
      mimeType: 'text/plain',
      buffer: Buffer.from(TEST_DOCUMENTS.withPII.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-button"]');

    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // Check that PII was detected
    const piiAlert = page.locator('[data-testid="pii-alert"]');
    await expect(piiAlert).toBeVisible();

    // Verify specific PII types were detected
    for (const expectedPII of TEST_DOCUMENTS.withPII.expectedPII) {
      const piiItem = page.locator(`[data-testid="pii-${expectedPII.type}"]`);
      await expect(piiItem).toBeVisible();

      // Check if the detected value is highlighted or shown
      const detectedValue = page.locator(`[data-pii-value="${expectedPII.value}"]`);
      await expect(detectedValue).toBeVisible();
    }
  });

  test('should not flag documents without PII', async ({ page }) => {
    const testFile = 'test-document-clean.txt';

    // Upload clean document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: testFile,
      mimeType: 'text/plain',
      buffer: Buffer.from(TEST_DOCUMENTS.withoutPII.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-button"]');

    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // Verify no PII alert is shown
    const piiAlert = page.locator('[data-testid="pii-alert"]');
    await expect(piiAlert).not.toBeVisible();

    // Check for clean document indicator
    const cleanIndicator = page.locator('[data-testid="document-clean"]');
    await expect(cleanIndicator).toBeVisible();
  });

  test('should provide real-time PII detection in text editor', async ({ page }) => {
    // Navigate to text editor or input area
    await page.goto('/documents/editor');

    const textEditor = page.locator('[data-testid="document-editor"]');
    await expect(textEditor).toBeVisible();

    // Type content with PII
    await textEditor.fill('');
    await textEditor.type('Contact John at john@example.com for more information.');

    // Wait for real-time detection
    await page.waitForTimeout(1000);

    // Check that PII is highlighted in real-time
    const emailHighlight = page.locator('[data-pii-highlight="email"]');
    await expect(emailHighlight).toBeVisible();

    // Verify PII warning appears
    const piiWarning = page.locator('[data-testid="realtime-pii-warning"]');
    await expect(piiWarning).toBeVisible();
  });

  test('should allow PII redaction with user confirmation', async ({ page }) => {
    const testFile = 'test-document-for-redaction.txt';

    // Upload document with PII
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: testFile,
      mimeType: 'text/plain',
      buffer: Buffer.from(TEST_DOCUMENTS.mixedContent.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-button"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // Click redact PII button
    await page.click('[data-testid="redact-pii-button"]');

    // Confirm redaction in modal
    const confirmModal = page.locator('[data-testid="redaction-confirm-modal"]');
    await expect(confirmModal).toBeVisible();

    await page.click('[data-testid="confirm-redaction"]');

    // Wait for redaction to complete
    await page.waitForSelector('[data-testid="redaction-complete"]', { timeout: 15000 });

    // Verify PII has been redacted
    const redactedDocument = page.locator('[data-testid="redacted-document"]');
    await expect(redactedDocument).toContainText('[REDACTED]');

    // Ensure original PII values are no longer visible
    await expect(redactedDocument).not.toContainText('john.smith@company.com');
    await expect(redactedDocument).not.toContainText('555-987-6543');
  });

  test('should generate PII detection report', async ({ page }) => {
    const testFile = 'test-document-report.txt';

    // Upload document with PII
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: testFile,
      mimeType: 'text/plain',
      buffer: Buffer.from(TEST_DOCUMENTS.withPII.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-button"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // Generate report
    await page.click('[data-testid="generate-report-button"]');

    // Wait for report generation
    await page.waitForSelector('[data-testid="report-ready"]', { timeout: 15000 });

    // Verify report contains expected sections
    const reportModal = page.locator('[data-testid="pii-report-modal"]');
    await expect(reportModal).toBeVisible();

    // Check report sections
    await expect(reportModal.locator('[data-testid="report-summary"]')).toBeVisible();
    await expect(reportModal.locator('[data-testid="report-details"]')).toBeVisible();
    await expect(reportModal.locator('[data-testid="report-recommendations"]')).toBeVisible();

    // Download report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/pii-report.*\.pdf$/);
  });

  test('should handle different file formats for PII detection', async ({ page }) => {
    const fileFormats = [
      {
        name: 'test.pdf',
        content: Buffer.from('%PDF-1.4 test content with email@test.com'),
        mimeType: 'application/pdf'
      },
      {
        name: 'test.docx',
        content: Buffer.from('Test Word document with phone 555-123-4567'),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      {
        name: 'test.txt',
        content: Buffer.from('Plain text with SSN 123-45-6789'),
        mimeType: 'text/plain'
      }
    ];

    for (const file of fileFormats) {
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.content
      });

      // Start analysis
      await page.click('[data-testid="analyze-button"]');

      // Wait for analysis result
      await page.waitForSelector('[data-testid="analysis-complete"], [data-testid="analysis-error"]', { timeout: 30000 });

      // Check that analysis completed (even if no PII found)
      const analysisStatus = page.locator('[data-testid="analysis-status"]');
      await expect(analysisStatus).toContainText(/complete|processed/i);

      // Clear for next iteration
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should respect user privacy settings for PII detection', async ({ page }) => {
    // Navigate to privacy settings
    await page.goto('/settings/privacy');

    // Disable PII detection
    const piiToggle = page.locator('[data-testid="pii-detection-toggle"]');
    await piiToggle.uncheck();

    // Save settings
    await page.click('[data-testid="save-settings"]');

    // Navigate back to document analysis
    await page.goto('/documents/analyze');

    // Upload document with PII
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-pii-disabled.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(TEST_DOCUMENTS.withPII.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-button"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // Verify PII detection was skipped
    const piiSkipped = page.locator('[data-testid="pii-detection-skipped"]');
    await expect(piiSkipped).toBeVisible();

    // Verify no PII alerts are shown
    const piiAlert = page.locator('[data-testid="pii-alert"]');
    await expect(piiAlert).not.toBeVisible();
  });

  test('should handle performance with large documents', async ({ page }) => {
    // Create a large document with mixed content
    const largeContent = Array(1000).fill(TEST_DOCUMENTS.mixedContent.content).join('\n');

    // Upload large document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent)
    });

    // Start analysis and measure time
    const startTime = Date.now();
    await page.click('[data-testid="analyze-button"]');

    // Wait for analysis with extended timeout for large files
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Verify reasonable processing time (under 30 seconds for test)
    expect(processingTime).toBeLessThan(30000);

    // Verify progress indicator was shown during processing
    const progressIndicator = page.locator('[data-testid="analysis-progress"]');
    // Progress should no longer be visible after completion
    await expect(progressIndicator).not.toBeVisible();

    // Verify PII was still detected despite large file size
    const piiAlert = page.locator('[data-testid="pii-alert"]');
    await expect(piiAlert).toBeVisible();
  });
});