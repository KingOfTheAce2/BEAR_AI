#!/usr/bin/env ts-node
/**
 * BEAR AI Test Runner
 *
 * Comprehensive test execution orchestrator for the BEAR AI application.
 * Coordinates Jest, Playwright, Rust, and other testing tools to provide
 * a unified testing experience with detailed reporting.
 */

import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

interface TestSuite {
  name: string;
  command: string;
  args: string[];
  timeout?: number;
  required?: boolean;
  description: string;
}

interface TestResults {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class TestRunner {
  private results: TestResults[] = [];
  private startTime: number = Date.now();

  constructor(private options: {
    verbose?: boolean;
    bail?: boolean;
    coverage?: boolean;
    parallel?: boolean;
    filter?: string[];
  } = {}) {}

  async run(): Promise<void> {
    console.log(chalk.blue.bold('🚀 BEAR AI Test Suite Runner'));
    console.log(chalk.gray('Starting comprehensive test execution...\n'));

    const testSuites = this.getTestSuites();
    const filteredSuites = this.filterSuites(testSuites);

    if (filteredSuites.length === 0) {
      console.log(chalk.yellow('No test suites to run'));
      return;
    }

    console.log(chalk.blue(`Running ${filteredSuites.length} test suite(s):\n`));

    for (const suite of filteredSuites) {
      console.log(chalk.cyan(`• ${suite.name}: ${suite.description}`));
    }

    console.log('');

    // Run test suites
    if (this.options.parallel && filteredSuites.length > 1) {
      await this.runParallel(filteredSuites);
    } else {
      await this.runSequential(filteredSuites);
    }

    // Generate summary
    this.generateSummary();

    // Exit with appropriate code
    const hasFailures = this.results.some(r => !r.passed);
    process.exit(hasFailures ? 1 : 0);
  }

  private getTestSuites(): TestSuite[] {
    return [
      {
        name: 'Rust Unit Tests',
        command: 'cargo',
        args: ['test', '--lib'],
        timeout: 120000,
        required: true,
        description: 'Tauri backend unit tests'
      },
      {
        name: 'Rust Integration Tests',
        command: 'cargo',
        args: ['test', '--test', '*'],
        timeout: 180000,
        required: true,
        description: 'Tauri backend integration tests'
      },
      {
        name: 'JavaScript Unit Tests',
        command: 'jest',
        args: [
          '--config', 'tests/jest.config.js',
          '--testPathPattern=tests/unit',
          ...(this.options.coverage ? ['--coverage'] : [])
        ],
        timeout: 120000,
        required: true,
        description: 'Frontend React component tests'
      },
      {
        name: 'JavaScript Integration Tests',
        command: 'jest',
        args: [
          '--config', 'tests/jest.config.js',
          '--testPathPattern=tests/integration'
        ],
        timeout: 180000,
        required: true,
        description: 'API and service integration tests'
      },
      {
        name: 'End-to-End Tests',
        command: 'npx',
        args: [
          'playwright', 'test',
          '--config', 'tests/playwright.config.ts'
        ],
        timeout: 300000,
        required: false,
        description: 'Full application workflow tests'
      },
      {
        name: 'Accessibility Tests',
        command: 'jest',
        args: [
          '--config', 'tests/jest.config.js',
          '--testPathPattern=tests/accessibility'
        ],
        timeout: 120000,
        required: false,
        description: 'WCAG compliance and accessibility tests'
      },
      {
        name: 'Performance Tests',
        command: 'jest',
        args: [
          '--config', 'tests/jest.config.js',
          '--testPathPattern=tests/performance'
        ],
        timeout: 240000,
        required: false,
        description: 'Load testing and performance benchmarks'
      }
    ];
  }

  private filterSuites(suites: TestSuite[]): TestSuite[] {
    if (!this.options.filter || this.options.filter.length === 0) {
      return suites;
    }

    return suites.filter(suite =>
      this.options.filter!.some(filter =>
        suite.name.toLowerCase().includes(filter.toLowerCase()) ||
        suite.description.toLowerCase().includes(filter.toLowerCase())
      )
    );
  }

  private async runSequential(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      const result = await this.runSuite(suite);
      this.results.push(result);

      if (!result.passed && suite.required && this.options.bail) {
        console.log(chalk.red('\n🛑 Stopping due to required test failure (--bail mode)'));
        break;
      }
    }
  }

  private async runParallel(suites: TestSuite[]): Promise<void> {
    console.log(chalk.blue('Running test suites in parallel...\n'));

    const promises = suites.map(suite => this.runSuite(suite));
    const results = await Promise.all(promises);
    this.results.push(...results);
  }

  private async runSuite(suite: TestSuite): Promise<TestResults> {
    const startTime = Date.now();

    console.log(chalk.yellow(`🧪 Running ${suite.name}...`));

    try {
      // Determine working directory
      const workingDir = suite.command === 'cargo' ?
        path.join(process.cwd(), 'src-tauri') :
        process.cwd();

      const result = await this.executeCommand(
        suite.command,
        suite.args,
        workingDir,
        suite.timeout || 120000
      );

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(chalk.green(`✅ ${suite.name} completed (${duration}ms)`));

        if (this.options.verbose) {
          console.log(chalk.gray(result.output));
        }

        return {
          suite: suite.name,
          passed: true,
          duration,
          output: result.output
        };
      } else {
        console.log(chalk.red(`❌ ${suite.name} failed (${duration}ms)`));
        console.log(chalk.red(result.error));

        return {
          suite: suite.name,
          passed: false,
          duration,
          output: result.output,
          error: result.error
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.log(chalk.red(`💥 ${suite.name} crashed (${duration}ms)`));
      console.log(chalk.red(errorMessage));

      return {
        suite: suite.name,
        passed: false,
        duration,
        output: '',
        error: errorMessage
      };
    }
  }

  private executeCommand(
    command: string,
    args: string[],
    cwd: string,
    timeout: number
  ): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      let output = '';
      let error = '';

      const child = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({
          success: false,
          output,
          error: `Process timed out after ${timeout}ms`
        });
      }, timeout);

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;

        if (this.options.verbose) {
          process.stdout.write(chalk.gray(text));
        }
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        error += text;

        if (this.options.verbose) {
          process.stderr.write(chalk.red(text));
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0,
          output,
          error
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          output,
          error: err.message
        });
      });
    });
  }

  private generateSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n' + chalk.blue.bold('📊 Test Summary'));
    console.log(chalk.gray('='.repeat(50)));

    // Overall statistics
    console.log(`Total Suites: ${total}`);
    console.log(chalk.green(`Passed: ${passed}`));
    if (failed > 0) {
      console.log(chalk.red(`Failed: ${failed}`));
    }
    console.log(`Total Time: ${this.formatDuration(totalDuration)}`);

    // Success rate
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    const rateColor = successRate === 100 ? chalk.green :
                     successRate >= 80 ? chalk.yellow : chalk.red;
    console.log(rateColor(`Success Rate: ${successRate.toFixed(1)}%`));

    // Individual suite results
    console.log('\n' + chalk.blue('Suite Results:'));
    for (const result of this.results) {
      const status = result.passed ? chalk.green('✅') : chalk.red('❌');
      const duration = this.formatDuration(result.duration);
      console.log(`${status} ${result.suite} (${duration})`);

      if (!result.passed && result.error) {
        console.log(chalk.red(`   Error: ${result.error.split('\n')[0]}`));
      }
    }

    // Coverage information
    if (this.options.coverage) {
      const coverageDir = path.join(process.cwd(), 'coverage');
      if (fs.existsSync(coverageDir)) {
        console.log('\n' + chalk.blue('📋 Coverage Report:'));
        console.log(`Available at: ${coverageDir}/index.html`);
      }
    }

    // Recommendations
    if (failed > 0) {
      console.log('\n' + chalk.yellow('💡 Recommendations:'));
      console.log('• Run with --verbose flag for detailed output');
      console.log('• Check individual test logs for specific failures');
      console.log('• Consider running test:watch for iterative development');
    }

    console.log('\n' + chalk.gray('='.repeat(50)));
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

// Command line interface
function parseArgs(): {
  verbose: boolean;
  bail: boolean;
  coverage: boolean;
  parallel: boolean;
  filter: string[];
  help: boolean;
} {
  const args = process.argv.slice(2);

  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    bail: args.includes('--bail'),
    coverage: args.includes('--coverage'),
    parallel: args.includes('--parallel'),
    filter: args.filter(arg => arg.startsWith('--filter=')).map(arg => arg.split('=')[1]),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp(): void {
  console.log(chalk.blue.bold('BEAR AI Test Runner'));
  console.log('\nUsage: npm run test [options]\n');

  console.log('Options:');
  console.log('  --verbose, -v    Show detailed output from test suites');
  console.log('  --bail           Stop on first required test failure');
  console.log('  --coverage       Include code coverage analysis');
  console.log('  --parallel       Run test suites in parallel (faster)');
  console.log('  --filter=<name>  Run only suites matching name');
  console.log('  --help, -h       Show this help message');

  console.log('\nExamples:');
  console.log('  npm run test --verbose --coverage');
  console.log('  npm run test --filter=unit --parallel');
  console.log('  npm run test --bail --filter=rust');
}

// Main execution
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const runner = new TestRunner(options);
  await runner.run();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Test runner failed:'), error);
    process.exit(1);
  });
}

export { TestRunner };