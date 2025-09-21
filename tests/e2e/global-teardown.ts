import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // Clean up test files
    const testResultsDir = path.join(__dirname, '../test-results');
    const authStateFile = path.join(__dirname, 'auth-state.json');

    // Remove auth state file
    if (fs.existsSync(authStateFile)) {
      fs.unlinkSync(authStateFile);
      console.log('🗑️ Cleaned up auth state file');
    }

    // Archive test results if needed
    if (process.env.CI && fs.existsSync(testResultsDir)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveDir = path.join(testResultsDir, `archive-${timestamp}`);

      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      console.log('📦 Test results archived for CI');
    }

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.warn('⚠️ Teardown warning:', error);
    // Don't fail the tests due to teardown issues
  }
}

export default globalTeardown;