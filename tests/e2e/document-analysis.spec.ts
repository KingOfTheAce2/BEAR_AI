import { test, expect, Page } from '@playwright/test';

// Test document samples for different analysis scenarios
const TEST_DOCUMENTS = {
  contract: {
    filename: 'sample-contract.pdf',
    content: `
      PROFESSIONAL SERVICES AGREEMENT

      This Agreement is entered into between Client Corp and Provider LLC.
      Term: 12 months beginning January 1, 2024
      Payment: $10,000 monthly, due on the 1st of each month
      Scope: Software development and consulting services

      Termination clause: Either party may terminate with 30 days notice.
      Confidentiality: All information shared shall remain confidential.
    `,
    expectedAnalysis: {
      documentType: 'contract',
      keyTerms: ['termination', 'confidentiality', 'payment'],
      parties: ['Client Corp', 'Provider LLC'],
      dates: ['January 1, 2024'],
      amounts: ['$10,000']
    }
  },
  litigation: {
    filename: 'motion-to-dismiss.pdf',
    content: `
      IN THE UNITED STATES DISTRICT COURT
      FOR THE SOUTHERN DISTRICT OF NEW YORK

      Case No. 23-CV-12345

      PLAINTIFF vs DEFENDANT

      MOTION TO DISMISS

      Comes now Defendant, by and through undersigned counsel,
      and respectfully moves this Court to dismiss the complaint
      pursuant to Fed. R. Civ. P. 12(b)(6) for failure to state
      a claim upon which relief can be granted.
    `,
    expectedAnalysis: {
      documentType: 'motion',
      court: 'Southern District of New York',
      caseNumber: '23-CV-12345',
      motionType: 'Motion to Dismiss',
      rule: 'Fed. R. Civ. P. 12(b)(6)'
    }
  },
  legislation: {
    filename: 'bill-analysis.txt',
    content: `
      H.R. 1234 - Privacy Protection Act of 2024

      Section 1. Short Title
      This Act may be cited as the "Privacy Protection Act of 2024"

      Section 2. Definitions
      (a) Personal Data - any information relating to an identified individual
      (b) Processing - any operation performed on personal data

      Section 3. Data Protection Requirements
      Organizations must implement appropriate technical and organizational measures
    `,
    expectedAnalysis: {
      documentType: 'legislation',
      billNumber: 'H.R. 1234',
      title: 'Privacy Protection Act of 2024',
      sections: ['Short Title', 'Definitions', 'Data Protection Requirements']
    }
  }
};

test.describe('Document Analysis System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to document analysis page
    await page.goto('/documents/analyze');
    await page.waitForLoadState('networkidle');
  });

  test('should analyze contract documents and extract key terms', async ({ page }) => {
    const doc = TEST_DOCUMENTS.contract;

    // Upload contract document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: doc.filename,
      mimeType: 'application/pdf',
      buffer: Buffer.from(doc.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-document"]');

    // Wait for analysis completion
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Verify document type detection
    const documentType = page.locator('[data-testid="document-type"]');
    await expect(documentType).toContainText(doc.expectedAnalysis.documentType);

    // Check key terms extraction
    for (const term of doc.expectedAnalysis.keyTerms) {
      const keyTerm = page.locator(`[data-testid="key-term"][data-term="${term}"]`);
      await expect(keyTerm).toBeVisible();
    }

    // Verify parties identification
    for (const party of doc.expectedAnalysis.parties) {
      const partyElement = page.locator(`[data-testid="party"]`);
      await expect(partyElement).toContainText(party);
    }

    // Check dates and amounts extraction
    const datesSection = page.locator('[data-testid="extracted-dates"]');
    await expect(datesSection).toContainText('January 1, 2024');

    const amountsSection = page.locator('[data-testid="extracted-amounts"]');
    await expect(amountsSection).toContainText('$10,000');
  });

  test('should identify litigation documents and legal citations', async ({ page }) => {
    const doc = TEST_DOCUMENTS.litigation;

    // Upload litigation document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: doc.filename,
      mimeType: 'application/pdf',
      buffer: Buffer.from(doc.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-document"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Verify document type
    const documentType = page.locator('[data-testid="document-type"]');
    await expect(documentType).toContainText('motion');

    // Check court identification
    const courtInfo = page.locator('[data-testid="court-info"]');
    await expect(courtInfo).toContainText('Southern District of New York');

    // Verify case number extraction
    const caseNumber = page.locator('[data-testid="case-number"]');
    await expect(caseNumber).toContainText('23-CV-12345');

    // Check legal citations
    const citations = page.locator('[data-testid="legal-citations"]');
    await expect(citations).toContainText('Fed. R. Civ. P. 12(b)(6)');

    // Verify motion type identification
    const motionType = page.locator('[data-testid="motion-type"]');
    await expect(motionType).toContainText('Motion to Dismiss');
  });

  test('should process legislation and regulatory documents', async ({ page }) => {
    const doc = TEST_DOCUMENTS.legislation;

    // Upload legislation document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: doc.filename,
      mimeType: 'text/plain',
      buffer: Buffer.from(doc.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-document"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Verify document type
    const documentType = page.locator('[data-testid="document-type"]');
    await expect(documentType).toContainText('legislation');

    // Check bill identification
    const billNumber = page.locator('[data-testid="bill-number"]');
    await expect(billNumber).toContainText('H.R. 1234');

    // Verify title extraction
    const billTitle = page.locator('[data-testid="bill-title"]');
    await expect(billTitle).toContainText('Privacy Protection Act of 2024');

    // Check sections structure
    const sectionsOutline = page.locator('[data-testid="sections-outline"]');
    for (const section of doc.expectedAnalysis.sections) {
      await expect(sectionsOutline).toContainText(section);
    }
  });

  test('should provide comprehensive analysis summary', async ({ page }) => {
    // Upload contract for comprehensive analysis
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'comprehensive-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(TEST_DOCUMENTS.contract.content)
    });

    // Start analysis
    await page.click('[data-testid="analyze-document"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Check analysis summary sections
    const summaryPanel = page.locator('[data-testid="analysis-summary"]');
    await expect(summaryPanel).toBeVisible();

    // Verify summary components
    await expect(summaryPanel.locator('[data-testid="document-overview"]')).toBeVisible();
    await expect(summaryPanel.locator('[data-testid="key-findings"]')).toBeVisible();
    await expect(summaryPanel.locator('[data-testid="risk-assessment"]')).toBeVisible();
    await expect(summaryPanel.locator('[data-testid="recommendations"]')).toBeVisible();

    // Check confidence scores
    const confidenceScore = page.locator('[data-testid="confidence-score"]');
    await expect(confidenceScore).toBeVisible();

    // Verify score is reasonable (between 0-100)
    const scoreText = await confidenceScore.textContent();
    const score = parseInt(scoreText?.match(/\d+/)?.[0] || '0');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('should support batch document analysis', async ({ page }) => {
    // Navigate to batch analysis
    await page.click('[data-testid="batch-analysis-tab"]');

    const batchUpload = page.locator('[data-testid="batch-upload-area"]');
    await expect(batchUpload).toBeVisible();

    // Upload multiple documents
    const files = [
      {
        name: 'contract1.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(TEST_DOCUMENTS.contract.content)
      },
      {
        name: 'motion1.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(TEST_DOCUMENTS.litigation.content)
      },
      {
        name: 'bill1.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(TEST_DOCUMENTS.legislation.content)
      }
    ];

    const fileInput = page.locator('[data-testid="batch-file-input"]');
    await fileInput.setInputFiles(files);

    // Start batch analysis
    await page.click('[data-testid="start-batch-analysis"]');

    // Monitor batch progress
    const progressBar = page.locator('[data-testid="batch-progress"]');
    await expect(progressBar).toBeVisible();

    // Wait for all documents to complete
    await page.waitForSelector('[data-testid="batch-complete"]', { timeout: 180000 });

    // Verify results for each document
    const resultsTable = page.locator('[data-testid="batch-results-table"]');
    await expect(resultsTable).toBeVisible();

    const resultRows = resultsTable.locator('tbody tr');
    await expect(resultRows).toHaveCount(3);

    // Check each document was processed
    for (let i = 0; i < files.length; i++) {
      const row = resultRows.nth(i);
      await expect(row.locator('[data-testid="status"]')).toContainText('Complete');
      await expect(row.locator('[data-testid="document-type"]')).toBeVisible();
    }
  });

  test('should export analysis results in multiple formats', async ({ page }) => {
    // Upload and analyze document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'export-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(TEST_DOCUMENTS.contract.content)
    });

    await page.click('[data-testid="analyze-document"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Test PDF export
    const pdfDownload = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf"]');
    const pdfFile = await pdfDownload;
    expect(pdfFile.suggestedFilename()).toMatch(/analysis.*\.pdf$/);

    // Test JSON export
    const jsonDownload = page.waitForEvent('download');
    await page.click('[data-testid="export-json"]');
    const jsonFile = await jsonDownload;
    expect(jsonFile.suggestedFilename()).toMatch(/analysis.*\.json$/);

    // Test Word export
    const wordDownload = page.waitForEvent('download');
    await page.click('[data-testid="export-word"]');
    const wordFile = await wordDownload;
    expect(wordFile.suggestedFilename()).toMatch(/analysis.*\.(docx|doc)$/);
  });

  test('should handle document comparison analysis', async ({ page }) => {
    // Navigate to comparison feature
    await page.click('[data-testid="comparison-analysis-tab"]');

    // Upload first document
    const firstFileInput = page.locator('[data-testid="first-document-input"]');
    await firstFileInput.setInputFiles({
      name: 'contract-v1.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(TEST_DOCUMENTS.contract.content)
    });

    // Upload second document (modified version)
    const modifiedContent = TEST_DOCUMENTS.contract.content.replace('$10,000', '$12,000');
    const secondFileInput = page.locator('[data-testid="second-document-input"]');
    await secondFileInput.setInputFiles({
      name: 'contract-v2.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(modifiedContent)
    });

    // Start comparison
    await page.click('[data-testid="start-comparison"]');

    // Wait for comparison results
    await page.waitForSelector('[data-testid="comparison-complete"]', { timeout: 90000 });

    // Verify comparison results
    const comparisonResults = page.locator('[data-testid="comparison-results"]');
    await expect(comparisonResults).toBeVisible();

    // Check differences detected
    const differences = page.locator('[data-testid="detected-differences"]');
    await expect(differences).toBeVisible();
    await expect(differences).toContainText('$10,000');
    await expect(differences).toContainText('$12,000');

    // Verify change highlighting
    const changedText = page.locator('[data-testid="changed-text"]');
    await expect(changedText).toBeVisible();
  });

  test('should provide AI-powered insights and recommendations', async ({ page }) => {
    // Upload contract document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'insights-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(TEST_DOCUMENTS.contract.content)
    });

    // Start analysis with AI insights enabled
    await page.check('[data-testid="enable-ai-insights"]');
    await page.click('[data-testid="analyze-document"]');

    // Wait for AI analysis
    await page.waitForSelector('[data-testid="ai-insights-ready"]', { timeout: 120000 });

    // Check AI insights panel
    const insightsPanel = page.locator('[data-testid="ai-insights-panel"]');
    await expect(insightsPanel).toBeVisible();

    // Verify insights categories
    await expect(insightsPanel.locator('[data-testid="risk-analysis"]')).toBeVisible();
    await expect(insightsPanel.locator('[data-testid="compliance-check"]')).toBeVisible();
    await expect(insightsPanel.locator('[data-testid="missing-clauses"]')).toBeVisible();
    await expect(insightsPanel.locator('[data-testid="improvement-suggestions"]')).toBeVisible();

    // Check specific recommendations
    const recommendations = page.locator('[data-testid="recommendations-list"]');
    await expect(recommendations.locator('li')).toHaveCountGreaterThan(0);
  });

  test('should handle OCR for scanned documents', async ({ page }) => {
    // Upload scanned document (simulated with image)
    const scannedDocContent = Buffer.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'scanned-contract.png',
      mimeType: 'image/png',
      buffer: scannedDocContent
    });

    // Enable OCR processing
    await page.check('[data-testid="enable-ocr"]');

    // Start analysis
    await page.click('[data-testid="analyze-document"]');

    // Wait for OCR processing
    await page.waitForSelector('[data-testid="ocr-processing"]', { timeout: 30000 });

    // Check OCR progress indicator
    const ocrProgress = page.locator('[data-testid="ocr-progress"]');
    await expect(ocrProgress).toBeVisible();

    // Wait for OCR completion
    await page.waitForSelector('[data-testid="ocr-complete"]', { timeout: 120000 });

    // Verify extracted text is available
    const extractedText = page.locator('[data-testid="extracted-text"]');
    await expect(extractedText).toBeVisible();

    // Check text confidence score
    const ocrConfidence = page.locator('[data-testid="ocr-confidence"]');
    await expect(ocrConfidence).toBeVisible();
  });

  test('should maintain analysis history and allow reanalysis', async ({ page }) => {
    // Upload and analyze a document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'history-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(TEST_DOCUMENTS.contract.content)
    });

    await page.click('[data-testid="analyze-document"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Navigate to analysis history
    await page.goto('/documents/history');

    // Verify document appears in history
    const historyTable = page.locator('[data-testid="analysis-history"]');
    await expect(historyTable).toBeVisible();

    const historyItems = historyTable.locator('[data-testid="history-item"]');
    await expect(historyItems).toHaveCountGreaterThan(0);

    // Check first history item
    const firstItem = historyItems.first();
    await expect(firstItem.locator('[data-testid="document-name"]')).toContainText('history-test.pdf');
    await expect(firstItem.locator('[data-testid="analysis-date"]')).toBeVisible();

    // Test reanalysis
    await firstItem.locator('[data-testid="reanalyze-button"]').click();

    // Should navigate back to analysis page with document loaded
    await page.waitForURL('**/documents/analyze**');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    // Verify reanalysis completed
    const reanalysisIndicator = page.locator('[data-testid="reanalysis-complete"]');
    await expect(reanalysisIndicator).toBeVisible();
  });
});