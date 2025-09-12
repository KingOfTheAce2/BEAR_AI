#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  command: string;
  args: string[];
  timeout?: number;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Unit Tests',
    command: 'npm',
    args: ['run', 'test:unit'],
    timeout: 60000
  },
  {
    name: 'Integration Tests',
    command: 'npm',
    args: ['run', 'test:integration'],
    timeout: 120000
  },
  {
    name: 'E2E Tests',
    command: 'npm',
    args: ['run', 'test:e2e'],
    timeout: 300000
  },
  {
    name: 'Performance Tests',
    command: 'npm',
    args: ['run', 'test:performance'],
    timeout: 180000
  },
  {
    name: 'Accessibility Tests',
    command: 'npm',
    args: ['run', 'test:a11y'],
    timeout: 120000
  }
];

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive test suite...\n');
    this.startTime = performance.now();

    for (const suite of TEST_SUITES) {
      console.log(`📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.success) {
        console.log(`✅ ${suite.name} passed (${result.duration.toFixed(2)}ms)\n`);
      } else {
        console.log(`❌ ${suite.name} failed (${result.duration.toFixed(2)}ms)`);
        console.log(`Error: ${result.error}\n`);
      }
    }

    this.generateReport();
  }

  async runSpecificTests(suiteNames: string[]): Promise<void> {
    console.log(`🎯 Running specific test suites: ${suiteNames.join(', ')}\n`);
    this.startTime = performance.now();

    const suitesToRun = TEST_SUITES.filter(suite => 
      suiteNames.some(name => suite.name.toLowerCase().includes(name.toLowerCase()))
    );

    if (suitesToRun.length === 0) {
      console.log('❌ No matching test suites found');
      return;
    }

    for (const suite of suitesToRun) {
      console.log(`📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.success) {
        console.log(`✅ ${suite.name} passed (${result.duration.toFixed(2)}ms)\n`);
      } else {
        console.log(`❌ ${suite.name} failed (${result.duration.toFixed(2)}ms)`);
        console.log(`Error: ${result.error}\n`);
      }
    }

    this.generateReport();
  }

  private runTestSuite(suite: TestSuite): Promise<TestResult> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let output = '';
      let error = '';

      const process = spawn(suite.command, suite.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        resolve({
          name: suite.name,
          success: false,
          duration: performance.now() - startTime,
          output,
          error: `Test suite timed out after ${suite.timeout || 60000}ms`
        });
      }, suite.timeout || 60000);

      process.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          name: suite.name,
          success: code === 0,
          duration: performance.now() - startTime,
          output,
          error: code !== 0 ? error : undefined
        });
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          name: suite.name,
          success: false,
          duration: performance.now() - startTime,
          output,
          error: err.message
        });
      });
    });
  }

  private generateReport(): void {
    const totalDuration = performance.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log('📊 Test Results Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Test Suites: ${this.results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${status} ${result.name.padEnd(20)} ${duration}s`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (failed > 0) {
      console.log('\n❌ Failed Test Details:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`\n${result.name}:`);
        console.log(`Error: ${result.error}`);
        if (result.output) {
          console.log(`Output: ${result.output.slice(-500)}`); // Last 500 chars
        }
      });
    }

    // Write detailed report to file
    this.writeReportToFile();

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }

  private writeReportToFile(): void {
    const fs = require('fs');
    const path = require('path');

    const reportData = {
      timestamp: new Date().toISOString(),
      totalDuration: performance.now() - this.startTime,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      results: this.results.map(result => ({
        name: result.name,
        success: result.success,
        duration: result.duration,
        error: result.error
      }))
    };

    const reportsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFile = path.join(reportsDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.length === 0) {
    await runner.runAllTests();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('BEAR AI Test Runner');
    console.log('');
    console.log('Usage:');
    console.log('  npm run test                    # Run all test suites');
    console.log('  npm run test unit              # Run unit tests only');
    console.log('  npm run test integration e2e   # Run integration and e2e tests');
    console.log('');
    console.log('Available test suites:');
    TEST_SUITES.forEach(suite => {
      console.log(`  - ${suite.name.toLowerCase().replace(/\s+/g, '')}`);
    });
  } else {
    await runner.runSpecificTests(args);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestRunner };