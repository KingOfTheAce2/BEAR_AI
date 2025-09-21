// Global Jest Setup
// Runs once before all test suites

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export default async function globalSetup() {
  console.log('🚀 Starting BEAR AI Test Suite Global Setup...');

  try {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.CI = process.env.CI || 'false';
    process.env.TEST_TIMEOUT = '30000';
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001';
    process.env.REACT_APP_ENVIRONMENT = 'test';

    // Disable console warnings for cleaner test output
    process.env.DISABLE_ESLINT_PLUGIN = 'true';
    process.env.GENERATE_SOURCEMAP = 'false';
    process.env.SKIP_PREFLIGHT_CHECK = 'true';

    // Create test directories if they don't exist
    const testDirs = [
      'test-results',
      'coverage',
      '.jest-cache',
      'tests/fixtures',
      'tests/mocks'
    ];

    for (const dir of testDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created test directory: ${dir}`);
      }
    }

    // Set up test database (if needed)
    await setupTestDatabase();

    // Initialize test fixtures
    await createTestFixtures();

    // Verify test dependencies
    await verifyTestDependencies();

    // Start test servers if in CI or integration test mode
    if (process.env.CI === 'true' || process.env.TEST_MODE === 'integration') {
      await startTestServers();
    }

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    process.exit(1);
  }
}

async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');

  try {
    // Create test database file if it doesn't exist
    const testDbPath = path.join(process.cwd(), 'test-database.sqlite');

    if (!fs.existsSync(testDbPath)) {
      // Initialize empty database
      fs.writeFileSync(testDbPath, '');
      console.log('📊 Test database created');
    }

    // Set database URL for tests
    process.env.DATABASE_URL = `sqlite://${testDbPath}`;

  } catch (error) {
    console.warn('⚠️ Test database setup failed, tests will use mocked data:', error);
  }
}

async function createTestFixtures() {
  console.log('🔧 Creating test fixtures...');

  const fixturesDir = path.join(process.cwd(), 'tests/fixtures');

  // Sample test documents
  const sampleDocuments = {
    'sample-contract.txt': `
      PROFESSIONAL SERVICES AGREEMENT

      This Agreement is entered into between Client Corp and Provider LLC.
      Term: 12 months beginning January 1, 2024
      Payment: $10,000 monthly, due on the 1st of each month

      Contact: john.doe@company.com
      Phone: (555) 123-4567
    `,

    'sample-motion.txt': `
      IN THE UNITED STATES DISTRICT COURT
      FOR THE SOUTHERN DISTRICT OF NEW YORK

      Case No. 23-CV-12345

      MOTION TO DISMISS

      Pursuant to Fed. R. Civ. P. 12(b)(6)
    `,

    'sample-pii-document.txt': `
      Personal Information Test Document

      Name: John Smith
      Email: john.smith@example.com
      Phone: (555) 987-6543
      SSN: 123-45-6789
      Credit Card: 4532-1234-5678-9012
    `,

    'sample-clean-document.txt': `
      This is a clean document without any personal information.
      It contains general legal text and policy information.
      No sensitive data should be detected here.
    `
  };

  // Sample API responses
  const sampleApiResponses = {
    'auth-success.json': JSON.stringify({
      success: true,
      data: {
        access_token: 'test-token-123',
        refresh_token: 'test-refresh-456',
        user: {
          id: 'test-user-123',
          email: 'test@bearai.com',
          subscription: 'professional'
        }
      },
      timestamp: new Date().toISOString()
    }, null, 2),

    'pii-detection-result.json': JSON.stringify({
      success: true,
      data: {
        detected_pii: [
          {
            type: 'email',
            value: 'john.smith@example.com',
            confidence: 0.95,
            start_pos: 45,
            end_pos: 67
          },
          {
            type: 'phone',
            value: '(555) 987-6543',
            confidence: 0.90,
            start_pos: 75,
            end_pos: 89
          }
        ]
      },
      timestamp: new Date().toISOString()
    }, null, 2),

    'document-analysis-result.json': JSON.stringify({
      success: true,
      data: {
        document_classification: {
          type: 'contract',
          confidence: 0.92
        },
        extracted_entities: [
          {
            type: 'organization',
            text: 'Client Corp',
            confidence: 0.88
          },
          {
            type: 'date',
            text: 'January 1, 2024',
            confidence: 0.95
          }
        ]
      },
      timestamp: new Date().toISOString()
    }, null, 2)
  };

  // Write fixtures to files
  for (const [filename, content] of Object.entries(sampleDocuments)) {
    const filePath = path.join(fixturesDir, filename);
    fs.writeFileSync(filePath, content.trim());
  }

  for (const [filename, content] of Object.entries(sampleApiResponses)) {
    const filePath = path.join(fixturesDir, filename);
    fs.writeFileSync(filePath, content);
  }

  console.log('📄 Test fixtures created');
}

async function verifyTestDependencies() {
  console.log('🔍 Verifying test dependencies...');

  const requiredPackages = [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'jest',
    'ts-jest',
    '@playwright/test'
  ];

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const missingPackages = requiredPackages.filter(pkg => !allDependencies[pkg]);

  if (missingPackages.length > 0) {
    console.warn('⚠️ Missing test dependencies:', missingPackages.join(', '));
    console.warn('Consider running: npm install --save-dev', missingPackages.join(' '));
  } else {
    console.log('✅ All test dependencies verified');
  }
}

async function startTestServers() {
  console.log('🖥️ Starting test servers...');

  try {
    // Check if we need to start the React development server
    const isReactServerRunning = await checkServerRunning('http://localhost:3000');
    if (!isReactServerRunning) {
      console.log('🚀 React development server needed for E2E tests');
      console.log('Please run: npm start (in a separate terminal)');
    }

    // Check if we need to start the API server
    const isApiServerRunning = await checkServerRunning('http://localhost:3001');
    if (!isApiServerRunning) {
      console.log('🚀 API server needed for integration tests');
      console.log('Please run: npm run dev:api (in a separate terminal)');
    }

  } catch (error) {
    console.warn('⚠️ Could not verify test servers:', error);
  }
}

async function checkServerRunning(url: string): Promise<boolean> {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}

// Export utilities for tests
export const testGlobals = {
  fixturesPath: path.join(process.cwd(), 'tests/fixtures'),
  testResultsPath: path.join(process.cwd(), 'test-results'),

  loadFixture: (filename: string) => {
    const filePath = path.join(process.cwd(), 'tests/fixtures', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test fixture not found: ${filename}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  },

  loadJsonFixture: (filename: string) => {
    const content = testGlobals.loadFixture(filename);
    return JSON.parse(content);
  }
};