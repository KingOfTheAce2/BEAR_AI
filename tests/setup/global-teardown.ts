// Global Jest Teardown
// Runs once after all test suites complete

import * as path from 'path';
import * as fs from 'fs';

export default async function globalTeardown() {
  console.log('🧹 Starting BEAR AI Test Suite Global Teardown...');

  try {
    // Clean up test files and artifacts
    await cleanupTestArtifacts();

    // Generate test summary report
    await generateTestSummary();

    // Clean up test database
    await cleanupTestDatabase();

    // Archive test results if in CI
    if (process.env.CI === 'true') {
      await archiveTestResults();
    }

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't exit with error in teardown to avoid masking test results
  }
}

async function cleanupTestArtifacts() {
  console.log('🗑️ Cleaning up test artifacts...');

  const artifactsToClean = [
    '.jest-cache',
    'tests/fixtures/temp',
    'test-database.sqlite',
    'test-database.sqlite-journal'
  ];

  for (const artifact of artifactsToClean) {
    const fullPath = path.join(process.cwd(), artifact);

    try {
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }

        console.log(`🗂️ Cleaned up: ${artifact}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not clean up ${artifact}:`, error);
    }
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary report...');

  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');

    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    // Look for Jest results
    const jestResultsPath = path.join(testResultsDir, 'junit.xml');
    const playwrightResultsPath = path.join(testResultsDir, 'results.json');

    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        npm_version: process.env.npm_version || 'unknown',
        ci: process.env.CI === 'true',
        platform: process.platform,
        arch: process.arch
      },
      test_results: {
        jest: fs.existsSync(jestResultsPath) ? 'completed' : 'not_run',
        playwright: fs.existsSync(playwrightResultsPath) ? 'completed' : 'not_run'
      },
      coverage: {
        available: fs.existsSync(path.join(process.cwd(), 'coverage'))
      }
    };

    // Try to extract test statistics from Jest results
    if (fs.existsSync(jestResultsPath)) {
      try {
        const jestXml = fs.readFileSync(jestResultsPath, 'utf8');
        const testsuiteMatch = jestXml.match(/testsuite[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*errors="(\d+)"/);

        if (testsuiteMatch) {
          summary.test_results = {
            ...summary.test_results,
            jest_stats: {
              total: parseInt(testsuiteMatch[1]),
              failures: parseInt(testsuiteMatch[2]),
              errors: parseInt(testsuiteMatch[3]),
              passed: parseInt(testsuiteMatch[1]) - parseInt(testsuiteMatch[2]) - parseInt(testsuiteMatch[3])
            }
          };
        }
      } catch (error) {
        console.warn('⚠️ Could not parse Jest results:', error);
      }
    }

    // Try to extract Playwright statistics
    if (fs.existsSync(playwrightResultsPath)) {
      try {
        const playwrightResults = JSON.parse(fs.readFileSync(playwrightResultsPath, 'utf8'));

        if (playwrightResults.stats) {
          summary.test_results = {
            ...summary.test_results,
            playwright_stats: {
              total: playwrightResults.stats.total || 0,
              passed: playwrightResults.stats.passed || 0,
              failed: playwrightResults.stats.failed || 0,
              skipped: playwrightResults.stats.skipped || 0
            }
          };
        }
      } catch (error) {
        console.warn('⚠️ Could not parse Playwright results:', error);
      }
    }

    // Write summary report
    const summaryPath = path.join(testResultsDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate human-readable summary
    const readableSummary = generateReadableSummary(summary);
    const readablePath = path.join(testResultsDir, 'test-summary.txt');
    fs.writeFileSync(readablePath, readableSummary);

    console.log('📋 Test summary generated');

  } catch (error) {
    console.warn('⚠️ Could not generate test summary:', error);
  }
}

function generateReadableSummary(summary: any): string {
  let report = `BEAR AI Test Suite Summary
==============================
Timestamp: ${summary.timestamp}
Environment: ${summary.environment.platform} ${summary.environment.arch}
Node.js: ${summary.environment.node_version}
CI Mode: ${summary.environment.ci ? 'Yes' : 'No'}

Test Results:
`;

  if (summary.test_results.jest_stats) {
    const stats = summary.test_results.jest_stats;
    report += `
Jest Tests:
  Total: ${stats.total}
  Passed: ${stats.passed}
  Failed: ${stats.failures}
  Errors: ${stats.errors}
  Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%
`;
  } else {
    report += '\nJest Tests: Not run or results unavailable\n';
  }

  if (summary.test_results.playwright_stats) {
    const stats = summary.test_results.playwright_stats;
    report += `
Playwright E2E Tests:
  Total: ${stats.total}
  Passed: ${stats.passed}
  Failed: ${stats.failed}
  Skipped: ${stats.skipped}
  Success Rate: ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%
`;
  } else {
    report += '\nPlaywright E2E Tests: Not run or results unavailable\n';
  }

  report += `\nCoverage Report: ${summary.coverage.available ? 'Available in ./coverage/' : 'Not generated'}\n`;

  return report;
}

async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...');

  const testDbPath = path.join(process.cwd(), 'test-database.sqlite');
  const testDbJournalPath = path.join(process.cwd(), 'test-database.sqlite-journal');

  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('🗃️ Test database removed');
    }

    if (fs.existsSync(testDbJournalPath)) {
      fs.unlinkSync(testDbJournalPath);
      console.log('📄 Test database journal removed');
    }
  } catch (error) {
    console.warn('⚠️ Could not clean up test database:', error);
  }
}

async function archiveTestResults() {
  console.log('📦 Archiving test results for CI...');

  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const coverageDir = path.join(process.cwd(), 'coverage');

    if (!fs.existsSync(testResultsDir)) {
      console.log('📁 No test results to archive');
      return;
    }

    // Create archive directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(testResultsDir, `archive-${timestamp}`);

    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Copy important files to archive
    const filesToArchive = [
      'junit.xml',
      'test-report.html',
      'test-summary.json',
      'test-summary.txt',
      'results.json'
    ];

    for (const file of filesToArchive) {
      const sourcePath = path.join(testResultsDir, file);
      const destPath = path.join(archiveDir, file);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Archive coverage report if available
    if (fs.existsSync(coverageDir)) {
      const coverageArchiveDir = path.join(archiveDir, 'coverage');
      fs.mkdirSync(coverageArchiveDir, { recursive: true });

      // Copy coverage files
      const coverageFiles = fs.readdirSync(coverageDir);
      for (const file of coverageFiles) {
        const sourcePath = path.join(coverageDir, file);
        const destPath = path.join(coverageArchiveDir, file);

        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }

    console.log(`📦 Test results archived in: ${archiveDir}`);

    // Set environment variable for CI systems
    process.env.TEST_RESULTS_ARCHIVE = archiveDir;

  } catch (error) {
    console.warn('⚠️ Could not archive test results:', error);
  }
}

// Performance metrics tracking
async function trackPerformanceMetrics() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  console.log(`📊 Test Suite Performance Metrics:
  Memory Usage:
    RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB
    Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
    Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
    External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB

  Total Runtime: ${uptime.toFixed(2)} seconds
  `);
}