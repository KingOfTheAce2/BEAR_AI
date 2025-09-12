#!/usr/bin/env node

/**
 * BEAR AI Windows Installation Validator
 * Comprehensive testing and validation of Windows installation
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class WindowsInstallValidator {
    constructor() {
        this.projectRoot = path.dirname(__dirname);
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    log(message, color = '') {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            cyan: '\x1b[36m',
            reset: '\x1b[0m'
        };
        console.log(`${colors[color] || ''}${message}${colors.reset}`);
    }

    async runTest(name, testFunction) {
        try {
            this.log(`🧪 Testing: ${name}`, 'cyan');
            const result = await testFunction();
            if (result.success) {
                this.results.passed.push({ name, details: result.details });
                this.log(`✅ PASS: ${name}`, 'green');
                if (result.details) {
                    this.log(`   ${result.details}`, 'green');
                }
            } else {
                this.results.failed.push({ name, error: result.error });
                this.log(`❌ FAIL: ${name}`, 'red');
                this.log(`   ${result.error}`, 'red');
            }
        } catch (error) {
            this.results.failed.push({ name, error: error.message });
            this.log(`❌ ERROR: ${name} - ${error.message}`, 'red');
        }
    }

    runCommand(command, options = {}) {
        try {
            const result = execSync(command, {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 30000,
                ...options
            });
            return { success: true, output: result.trim() };
        } catch (error) {
            return { 
                success: false, 
                error: error.message, 
                output: error.stdout ? error.stdout.trim() : '' 
            };
        }
    }

    // Test functions
    async testNodeInstallation() {
        const result = this.runCommand('node --version');
        if (result.success) {
            const version = result.output.replace('v', '');
            const [major] = version.split('.').map(Number);
            if (major >= 16) {
                return { success: true, details: `Node.js ${version} (Compatible)` };
            } else {
                return { success: false, error: `Node.js ${version} is too old. Requires 16.0.0+` };
            }
        }
        return { success: false, error: 'Node.js not found in PATH' };
    }

    async testNpmInstallation() {
        const result = this.runCommand('npm --version');
        if (result.success) {
            return { success: true, details: `npm ${result.output}` };
        }
        return { success: false, error: 'npm not found in PATH' };
    }

    async testProjectStructure() {
        const requiredFiles = [
            'package.json',
            'scripts/install-bear-ai.js',
            'scripts/start-bear-ai.js',
            'scripts/fix-python-deps.js',
            'scripts/cleanup-installers.js'
        ];

        const missing = [];
        for (const file of requiredFiles) {
            if (!fs.existsSync(path.join(this.projectRoot, file))) {
                missing.push(file);
            }
        }

        if (missing.length === 0) {
            return { success: true, details: 'All required files present' };
        }
        return { success: false, error: `Missing files: ${missing.join(', ')}` };
    }

    async testPackageJson() {
        try {
            const packagePath = path.join(this.projectRoot, 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            const requiredScripts = ['start', 'build', 'test'];
            const missingScripts = requiredScripts.filter(script => !packageData.scripts[script]);
            
            if (missingScripts.length === 0) {
                return { success: true, details: `Package: ${packageData.name} v${packageData.version}` };
            }
            return { success: false, error: `Missing scripts: ${missingScripts.join(', ')}` };
        } catch (error) {
            return { success: false, error: `Invalid package.json: ${error.message}` };
        }
    }

    async testDependencyInstallation() {
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            return { success: false, error: 'node_modules directory not found. Run npm install.' };
        }

        // Check for key dependencies
        const keyDependencies = ['react', 'express', '@types/node'];
        const missing = [];
        
        for (const dep of keyDependencies) {
            if (!fs.existsSync(path.join(nodeModulesPath, dep))) {
                missing.push(dep);
            }
        }

        if (missing.length === 0) {
            return { success: true, details: 'Key dependencies installed' };
        }
        return { success: false, error: `Missing dependencies: ${missing.join(', ')}` };
    }

    async testWindowsLauncher() {
        const launcherPath = path.join(this.projectRoot, 'START_BEAR_AI.bat');
        if (!fs.existsSync(launcherPath)) {
            return { success: false, error: 'START_BEAR_AI.bat not found' };
        }

        const content = fs.readFileSync(launcherPath, 'utf8');
        if (content.includes('node scripts/start-bear-ai.js')) {
            return { success: true, details: 'Windows launcher properly configured' };
        }
        return { success: false, error: 'Windows launcher has incorrect configuration' };
    }

    async testNodeLauncher() {
        const launcherPath = path.join(this.projectRoot, 'scripts', 'start-bear-ai.js');
        if (!fs.existsSync(launcherPath)) {
            return { success: false, error: 'start-bear-ai.js not found' };
        }

        // Test syntax by requiring it (but not executing)
        try {
            require(launcherPath);
            return { success: true, details: 'Node.js launcher syntax valid' };
        } catch (error) {
            return { success: false, error: `Syntax error in launcher: ${error.message}` };
        }
    }

    async testBuildProcess() {
        this.log('   This may take a moment...', 'yellow');
        const result = this.runCommand('npm run build', { 
            cwd: this.projectRoot,
            timeout: 120000 // 2 minute timeout
        });
        
        if (result.success) {
            const buildPath = path.join(this.projectRoot, 'build');
            if (fs.existsSync(buildPath)) {
                return { success: true, details: 'Build process completed successfully' };
            }
            return { success: false, error: 'Build completed but build directory not found' };
        }
        return { success: false, error: `Build failed: ${result.error}` };
    }

    async testPythonEnvironment() {
        const pythonResult = this.runCommand('python --version');
        if (!pythonResult.success) {
            this.results.warnings.push('Python not found - AI features may be limited');
            return { success: true, details: 'Python not installed (optional)' };
        }

        const version = pythonResult.output;
        return { success: true, details: `Python environment: ${version}` };
    }

    async generateReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            platform: `${os.platform()} ${os.arch()}`,
            nodeVersion: process.version,
            results: this.results,
            summary: {
                total: this.results.passed.length + this.results.failed.length,
                passed: this.results.passed.length,
                failed: this.results.failed.length,
                warnings: this.results.warnings.length
            }
        };

        const reportPath = path.join(this.projectRoot, 'windows-validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

        // Also create a human-readable report
        const humanReport = `BEAR AI Windows Installation Validation Report
=================================================

Generated: ${new Date().toLocaleString()}
Platform: ${os.platform()} ${os.arch()}
Node.js: ${process.version}

SUMMARY
-------
Total Tests: ${reportData.summary.total}
Passed: ${reportData.summary.passed}
Failed: ${reportData.summary.failed}
Warnings: ${reportData.summary.warnings}

PASSED TESTS
------------
${this.results.passed.map(test => `✅ ${test.name}: ${test.details || ''}`).join('\n')}

FAILED TESTS
------------
${this.results.failed.map(test => `❌ ${test.name}: ${test.error}`).join('\n')}

WARNINGS
--------
${this.results.warnings.map(warning => `⚠️  ${warning}`).join('\n')}

NEXT STEPS
----------
${this.results.failed.length === 0 ? 
    '🎉 All tests passed! Your installation is ready.' : 
    '❌ Some tests failed. Please address the failed tests above.'}

To start BEAR AI:
- Double-click START_BEAR_AI.bat
- Or run: npm start
- Or run: node scripts/start-bear-ai.js
`;

        const humanReportPath = path.join(this.projectRoot, 'windows-validation-report.txt');
        fs.writeFileSync(humanReportPath, humanReport);

        this.log(`📄 Reports saved:`, 'cyan');
        this.log(`   ${humanReportPath}`, 'cyan');
        this.log(`   ${reportPath}`, 'cyan');
    }

    async main() {
        this.log('🔍 BEAR AI Windows Installation Validator', 'cyan');
        this.log('=========================================', 'cyan');
        this.log(`Platform: ${os.platform()} ${os.arch()}`, 'cyan');
        this.log(`Node.js: ${process.version}`, 'cyan');
        this.log('');

        // Run all tests
        await this.runTest('Node.js Installation', () => this.testNodeInstallation());
        await this.runTest('npm Installation', () => this.testNpmInstallation());
        await this.runTest('Project Structure', () => this.testProjectStructure());
        await this.runTest('Package Configuration', () => this.testPackageJson());
        await this.runTest('Dependencies', () => this.testDependencyInstallation());
        await this.runTest('Windows Launcher', () => this.testWindowsLauncher());
        await this.runTest('Node.js Launcher', () => this.testNodeLauncher());
        await this.runTest('Build Process', () => this.testBuildProcess());
        await this.runTest('Python Environment', () => this.testPythonEnvironment());

        // Generate reports
        await this.generateReport();

        // Summary
        this.log('', '');
        this.log('📊 VALIDATION SUMMARY', 'cyan');
        this.log('====================', 'cyan');
        this.log(`✅ Passed: ${this.results.passed.length}`, 'green');
        this.log(`❌ Failed: ${this.results.failed.length}`, 'red');
        this.log(`⚠️  Warnings: ${this.results.warnings.length}`, 'yellow');

        if (this.results.failed.length === 0) {
            this.log('\n🎉 All tests passed! Your BEAR AI installation is ready.', 'green');
            this.log('To start: Double-click START_BEAR_AI.bat or run "npm start"', 'green');
        } else {
            this.log('\n❌ Some tests failed. Please check the report and fix the issues.', 'red');
        }

        return this.results.failed.length === 0;
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new WindowsInstallValidator();
    validator.main().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { WindowsInstallValidator };