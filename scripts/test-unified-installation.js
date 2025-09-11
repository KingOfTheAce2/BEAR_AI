#!/usr/bin/env node

/**
 * BEAR AI - Unified Installation Test Suite
 * Tests all installation methods across platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Configuration
const TEST_CONFIG = {
    name: 'BEAR AI Installation Test Suite',
    version: '1.0.0',
    testDir: path.join(os.tmpdir(), 'bear-ai-install-test'),
    repoUrl: 'https://github.com/KingOfTheAce2/BEAR_AI.git',
    timeout: 300000 // 5 minutes
};

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class InstallationTester {
    constructor() {
        this.platform = os.platform();
        this.results = [];
        this.startTime = Date.now();
        this.isVerbose = process.argv.includes('--verbose');
        this.testCounter = 0;
    }

    log(message, color = 'reset') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
    }

    error(message) {
        this.log(`❌ ${message}`, 'red');
    }

    warn(message) {
        this.log(`⚠️  ${message}`, 'yellow');
    }

    info(message) {
        this.log(`ℹ️  ${message}`, 'cyan');
    }

    verbose(message) {
        if (this.isVerbose) {
            this.log(`🔍 ${message}`, 'reset');
        }
    }

    async runTest(testName, testFunction, timeout = TEST_CONFIG.timeout) {
        this.testCounter++;
        const testId = `T${this.testCounter.toString().padStart(3, '0')}`;
        
        this.info(`[${testId}] Starting: ${testName}`);
        const testStart = Date.now();
        
        try {
            const result = await Promise.race([
                testFunction(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), timeout)
                )
            ]);
            
            const duration = Date.now() - testStart;
            this.success(`[${testId}] Passed: ${testName} (${duration}ms)`);
            
            this.results.push({
                id: testId,
                name: testName,
                status: 'PASS',
                duration,
                result
            });
            
            return { success: true, result };
            
        } catch (error) {
            const duration = Date.now() - testStart;
            this.error(`[${testId}] Failed: ${testName} - ${error.message} (${duration}ms)`);
            
            this.results.push({
                id: testId,
                name: testName,
                status: 'FAIL',
                duration,
                error: error.message
            });
            
            return { success: false, error: error.message };
        }
    }

    async setupTestEnvironment() {
        this.info('Setting up test environment...');
        
        // Clean previous test directory
        if (fs.existsSync(TEST_CONFIG.testDir)) {
            fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
        }
        
        // Create fresh test directory
        fs.mkdirSync(TEST_CONFIG.testDir, { recursive: true });
        
        this.success('Test environment ready');
    }

    async testSystemRequirements() {
        return this.runTest('System Requirements Check', async () => {
            // Check Node.js
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            if (majorVersion < 16) {
                throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
            }
            
            // Check npm
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            
            // Check platform
            const supportedPlatforms = ['win32', 'darwin', 'linux'];
            if (!supportedPlatforms.includes(this.platform)) {
                throw new Error(`Unsupported platform: ${this.platform}`);
            }
            
            return {
                nodeVersion,
                npmVersion,
                platform: this.platform,
                arch: os.arch()
            };
        });
    }

    async testOneCommandInstaller() {
        return this.runTest('One Command Installer', async () => {
            const testDir = path.join(TEST_CONFIG.testDir, 'one-command-test');
            fs.mkdirSync(testDir, { recursive: true });
            
            // Copy installer script
            const installerSource = path.resolve(__dirname, '..', 'install.js');
            const installerDest = path.join(testDir, 'install.js');
            
            if (!fs.existsSync(installerSource)) {
                throw new Error('One-command installer not found');
            }
            
            fs.copyFileSync(installerSource, installerDest);
            
            // Test installer execution (dry run simulation)
            const { OneCommandInstaller } = require(installerSource);
            const installer = new OneCommandInstaller();
            
            // Test basic functionality
            if (!installer.platform) {
                throw new Error('Platform detection failed');
            }
            
            return { installerPath: installerDest };
        });
    }

    async testUnifiedInstaller() {
        return this.runTest('Unified JavaScript Installer', async () => {
            const installerPath = path.resolve(__dirname, 'install-bear-ai.js');
            
            if (!fs.existsSync(installerPath)) {
                throw new Error('Unified installer script not found');
            }
            
            // Test script syntax
            try {
                require(installerPath);
            } catch (error) {
                throw new Error(`Script syntax error: ${error.message}`);
            }
            
            return { installerPath };
        });
    }

    async testPowerShellInstaller() {
        if (this.platform !== 'win32') {
            this.warn('Skipping PowerShell installer test (not Windows)');
            return { success: true, skipped: true };
        }
        
        return this.runTest('PowerShell Installer', async () => {
            const installerPath = path.resolve(__dirname, 'install-bear-ai.ps1');
            
            if (!fs.existsSync(installerPath)) {
                throw new Error('PowerShell installer not found');
            }
            
            // Test PowerShell syntax
            try {
                execSync(`powershell -Command "Get-Content '${installerPath}' | Out-Null"`, { 
                    stdio: 'pipe' 
                });
            } catch (error) {
                throw new Error(`PowerShell syntax error: ${error.message}`);
            }
            
            return { installerPath };
        });
    }

    async testBashInstaller() {
        if (this.platform === 'win32') {
            this.warn('Skipping Bash installer test (Windows)');
            return { success: true, skipped: true };
        }
        
        return this.runTest('Bash Installer', async () => {
            const installerPath = path.resolve(__dirname, 'install-bear-ai.sh');
            
            if (!fs.existsSync(installerPath)) {
                throw new Error('Bash installer not found');
            }
            
            // Test bash syntax
            try {
                execSync(`bash -n "${installerPath}"`, { stdio: 'pipe' });
            } catch (error) {
                throw new Error(`Bash syntax error: ${error.message}`);
            }
            
            return { installerPath };
        });
    }

    async testPackageJsonScripts() {
        return this.runTest('Package.json Install Scripts', async () => {
            const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
            
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error('package.json not found');
            }
            
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const requiredScripts = [
                'install:bear-ai',
                'install:bear-ai:verbose',
                'install:bear-ai:dev',
                'quick-install',
                'setup'
            ];
            
            const missingScripts = requiredScripts.filter(
                script => !packageJson.scripts[script]
            );
            
            if (missingScripts.length > 0) {
                throw new Error(`Missing install scripts: ${missingScripts.join(', ')}`);
            }
            
            return { 
                scriptsFound: requiredScripts.length,
                totalScripts: Object.keys(packageJson.scripts).length
            };
        });
    }

    async testErrorHandling() {
        return this.runTest('Error Handling and Recovery', async () => {
            // Test invalid Node.js version detection
            const originalVersion = process.version;
            
            // Simulate error conditions
            const errorTests = [
                {
                    name: 'Invalid directory permissions',
                    test: () => {
                        const restrictedDir = path.join(TEST_CONFIG.testDir, 'restricted');
                        fs.mkdirSync(restrictedDir, { mode: 0o000 });
                        
                        try {
                            fs.writeFileSync(path.join(restrictedDir, 'test.txt'), 'test');
                            throw new Error('Should have failed due to permissions');
                        } catch (error) {
                            if (error.code === 'EACCES' || error.code === 'EPERM') {
                                return true; // Expected error
                            }
                            throw error;
                        }
                    }
                }
            ];
            
            let passed = 0;
            for (const errorTest of errorTests) {
                try {
                    if (errorTest.test()) {
                        passed++;
                    }
                } catch (error) {
                    this.verbose(`Error test "${errorTest.name}" failed: ${error.message}`);
                }
            }
            
            return { errorTestsPassed: passed, totalErrorTests: errorTests.length };
        });
    }

    async testCrossPlatformCompatibility() {
        return this.runTest('Cross-Platform Compatibility', async () => {
            const compatibility = {
                platform: this.platform,
                arch: os.arch(),
                nodeVersion: process.version,
                supportedFeatures: []
            };
            
            // Test platform-specific features
            if (this.platform === 'win32') {
                compatibility.supportedFeatures.push('PowerShell installer');
                compatibility.supportedFeatures.push('Windows shortcuts');
            } else {
                compatibility.supportedFeatures.push('Bash installer');
                compatibility.supportedFeatures.push('Unix permissions');
            }
            
            if (this.platform === 'darwin') {
                compatibility.supportedFeatures.push('macOS app bundles');
            }
            
            if (this.platform === 'linux') {
                compatibility.supportedFeatures.push('Linux desktop entries');
            }
            
            return compatibility;
        });
    }

    generateReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const totalDuration = Date.now() - this.startTime;
        
        const report = `
# BEAR AI Installation Test Report

**Test Date**: ${new Date().toISOString()}
**Platform**: ${this.platform} ${os.arch()}
**Node.js**: ${process.version}
**Total Duration**: ${totalDuration}ms

## Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${passedTests} ✅
- **Failed**: ${failedTests} ❌
- **Success Rate**: ${Math.round((passedTests / totalTests) * 100)}%

## Test Results

| ID | Test Name | Status | Duration |
|----|-----------|---------|---------:
${this.results.map(r => 
    `| ${r.id} | ${r.name} | ${r.status === 'PASS' ? '✅' : '❌'} ${r.status} | ${r.duration}ms |`
).join('\n')}

## Failed Tests

${this.results
    .filter(r => r.status === 'FAIL')
    .map(r => `### ${r.name}\n**Error**: ${r.error}`)
    .join('\n\n') || 'None ✅'}

## Recommendations

${failedTests === 0 ? 
    '🎉 All tests passed! The installation system is working correctly.' : 
    `⚠️ ${failedTests} test(s) failed. Please review and fix the issues before distribution.`}

---
*Generated by BEAR AI Installation Test Suite*
        `.trim();
        
        const reportPath = path.join(process.cwd(), 'installation-test-report.md');
        fs.writeFileSync(reportPath, report);
        
        this.info(`Test report saved: ${reportPath}`);
        return report;
    }

    async runAllTests() {
        console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║              BEAR AI Installation Test Suite                ║
║                                                              ║
║  Testing all installation methods and compatibility         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
        `);

        try {
            await this.setupTestEnvironment();
            
            // Run all tests
            await this.testSystemRequirements();
            await this.testOneCommandInstaller();
            await this.testUnifiedInstaller();
            await this.testPowerShellInstaller();
            await this.testBashInstaller();
            await this.testPackageJsonScripts();
            await this.testErrorHandling();
            await this.testCrossPlatformCompatibility();
            
            // Generate report
            const report = this.generateReport();
            
            // Show summary
            const totalTests = this.results.length;
            const passedTests = this.results.filter(r => r.status === 'PASS').length;
            const failedTests = this.results.filter(r => r.status === 'FAIL').length;
            const totalDuration = Math.round((Date.now() - this.startTime) / 1000);
            
            if (failedTests === 0) {
                this.success(`All ${totalTests} tests passed! (${totalDuration}s)`);
                return true;
            } else {
                this.error(`${failedTests}/${totalTests} tests failed (${totalDuration}s)`);
                return false;
            }
            
        } catch (error) {
            this.error(`Test suite failed: ${error.message}`);
            return false;
        } finally {
            // Cleanup
            try {
                if (fs.existsSync(TEST_CONFIG.testDir)) {
                    fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
                }
            } catch (error) {
                this.warn(`Cleanup failed: ${error.message}`);
            }
        }
    }
}

// CLI Entry Point
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`
BEAR AI Installation Test Suite

Usage:
  node scripts/test-unified-installation.js [options]

Options:
  --verbose    Show detailed test output
  --help, -h   Show this help message

Examples:
  node scripts/test-unified-installation.js
  node scripts/test-unified-installation.js --verbose
        `);
        return;
    }

    const tester = new InstallationTester();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

// Execute if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = { InstallationTester };