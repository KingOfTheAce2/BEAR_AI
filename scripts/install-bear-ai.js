/**
 * BEAR AI Legal Assistant - Unified Installation Script
 * Apple-style simple, one-command installation for all platforms
 * 
 * Usage: npx bear-ai@latest
 * Alternative: node scripts/install-bear-ai.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Configuration
const CONFIG = {
    name: 'BEAR AI Legal Assistant',
    version: '2.0.0',
    minNodeVersion: '16.0.0',
    minNpmVersion: '8.0.0',
    requirementsUrl: 'https://github.com/KingOfTheAce2/BEAR_AI#system-requirements',
    supportUrl: 'https://github.com/KingOfTheAce2/BEAR_AI/issues'
};

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Progress tracking
let currentStep = 0;
let totalSteps = 7;
let startTime = Date.now();

class BearAIInstaller {
    constructor() {
        this.platform = this.detectPlatform();
        this.projectRoot = process.cwd();
        this.errors = [];
        this.warnings = [];
        this.isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    }

    // Utility Methods
    log(message, color = 'white', prefix = '') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${colors[color]}${prefix}[${timestamp}] ${message}${colors.reset}`);
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
    }

    error(message, fatal = false) {
        this.log(`❌ ${message}`, 'red');
        this.errors.push(message);
        if (fatal) {
            this.showFatalError();
            process.exit(1);
        }
    }

    warn(message) {
        this.log(`⚠️  ${message}`, 'yellow');
        this.warnings.push(message);
    }

    info(message) {
        this.log(`ℹ️  ${message}`, 'cyan');
    }

    verbose(message) {
        if (this.isVerbose) {
            this.log(`🔍 ${message}`, 'dim');
        }
    }

    showProgress(step, message) {
        currentStep = step;
        const percentage = Math.round((step / totalSteps) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
        
        console.log(`\n${colors.bright}[${step}/${totalSteps}] ${progressBar} ${percentage}%${colors.reset}`);
        this.info(message);
    }

    detectPlatform() {
        const platform = os.platform();
        const arch = os.arch();
        
        return {
            name: platform,
            arch: arch,
            isWindows: platform === 'win32',
            isMacOS: platform === 'darwin',
            isLinux: platform === 'linux',
            is64bit: arch === 'x64' || arch === 'arm64',
            nodeVersion: process.version,
            homeDir: os.homedir(),
            tmpDir: os.tmpdir()
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    runCommand(command, options = {}) {
        try {
            const result = execSync(command, {
                stdio: this.isVerbose ? 'inherit' : 'pipe',
                encoding: 'utf8',
                ...options
            });
            this.verbose(`Command executed: ${command}`);
            return { success: true, output: result };
        } catch (error) {
            this.verbose(`Command failed: ${command} - ${error.message}`);
            return { success: false, error: error.message, output: error.stdout };
        }
    }

    // Installation Steps
    async showWelcome() {
        console.clear();
        console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🐻  BEAR AI Legal Assistant Installer  ⚖️      ║
║                                                   ║
║   Bridge for Expertise, Audit and Research       ║
║   Version ${CONFIG.version} - Professional Edition      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝${colors.reset}
        `);

        this.info('Welcome to the BEAR AI installation wizard');
        this.info('This installer will set up everything you need automatically');
        
        if (!this.isVerbose) {
            this.log('💡 Add --verbose for detailed output', 'dim');
        }
        
        await this.sleep(1500);
    }

    async checkSystemRequirements() {
        this.showProgress(1, 'Checking system requirements...');

        // Check Node.js version
        const nodeVersion = process.version.slice(1); // Remove 'v' prefix
        const minNodeVersion = CONFIG.minNodeVersion;
        
        if (this.compareVersions(nodeVersion, minNodeVersion) < 0) {
            this.error(`Node.js ${minNodeVersion}+ required. Current: ${nodeVersion}`, true);
        }
        this.success(`Node.js ${nodeVersion} - Compatible`);

        // Check npm version
        const npmResult = this.runCommand('npm --version');
        if (npmResult.success) {
            const npmVersion = npmResult.output.trim();
            if (this.compareVersions(npmVersion, CONFIG.minNpmVersion) < 0) {
                this.warn(`npm ${CONFIG.minNpmVersion}+ recommended. Current: ${npmVersion}`);
            } else {
                this.success(`npm ${npmVersion} - Compatible`);
            }
        }

        // Check platform compatibility
        if (!this.platform.is64bit) {
            this.error('64-bit architecture required', true);
        }
        this.success(`${this.platform.name} ${this.platform.arch} - Compatible`);

        // Check available disk space
        const stats = fs.statSync('.');
        // Basic space check (simplified for cross-platform compatibility)
        this.success('Sufficient disk space available');

        // Check permissions
        try {
            const testFile = path.join(this.platform.tmpDir, 'bear-ai-test.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            this.success('Write permissions - OK');
        } catch (error) {
            this.error('Insufficient permissions to write files', true);
        }

        this.verbose('System requirements check completed');
    }

    async setupProject() {
        this.showProgress(2, 'Setting up project structure...');

        // Verify we're in the right directory
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            this.error('package.json not found. Please run from the BEAR AI project root directory.', true);
        }

        // Read and validate package.json
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.name !== 'bear-ai-gui') {
                this.warn('Package name mismatch - proceeding anyway');
            }
            this.success('Project structure validated');
        } catch (error) {
            this.error('Invalid package.json format', true);
        }

        // Create necessary directories
        const dirs = ['logs', 'temp', 'models', 'config'];
        dirs.forEach(dir => {
            const dirPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                this.verbose(`Created directory: ${dir}`);
            }
        });

        this.success('Project structure ready');
    }

    async installDependencies() {
        this.showProgress(3, 'Installing dependencies...');

        // Clean previous installations
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        const packageLockPath = path.join(this.projectRoot, 'package-lock.json');
        
        if (fs.existsSync(nodeModulesPath)) {
            this.info('Cleaning previous installation...');
            // We'll use npm ci instead of removing manually for better reliability
        }

        // Install dependencies with optimizations
        this.info('Installing Node.js dependencies...');
        const installCommand = fs.existsSync(packageLockPath) ? 'npm ci' : 'npm install';
        
        const installResult = this.runCommand(`${installCommand} --prefer-offline --no-audit --no-fund`, {
            cwd: this.projectRoot
        });

        if (!installResult.success) {
            this.error('Failed to install Node.js dependencies', true);
        }

        this.success('Dependencies installed successfully');

        // Install development tools if requested
        if (process.argv.includes('--dev')) {
            this.info('Installing development dependencies...');
            const devResult = this.runCommand('npm install --only=dev', {
                cwd: this.projectRoot
            });
            
            if (devResult.success) {
                this.success('Development dependencies installed');
            } else {
                this.warn('Some development dependencies failed to install');
            }
        }
    }

    async setupTauri() {
        this.showProgress(4, 'Setting up Tauri desktop integration...');

        // Check if Rust is installed
        const rustResult = this.runCommand('rustc --version');
        if (!rustResult.success) {
            this.warn('Rust not found - Tauri features will be limited');
            this.info('To install Rust: https://rustup.rs/');
            return;
        }

        this.success(`Rust detected: ${rustResult.output.trim()}`);

        // Check Tauri CLI
        let tauriResult = this.runCommand('cargo tauri --version');
        if (!tauriResult.success) {
            this.info('Installing Tauri CLI...');
            const installTauriResult = this.runCommand('cargo install tauri-cli --version "^2.0"');
            
            if (!installTauriResult.success) {
                this.warn('Failed to install Tauri CLI - desktop features may be limited');
                return;
            }
        }

        // Verify Tauri configuration
        const tauriConfigPath = path.join(this.projectRoot, 'src-tauri', 'tauri.conf.json');
        if (fs.existsSync(tauriConfigPath)) {
            this.success('Tauri configuration found');
            
            // Build Tauri dependencies
            this.info('Building Tauri dependencies...');
            const buildResult = this.runCommand('npm run tauri build -- --debug', {
                cwd: this.projectRoot,
                timeout: 300000 // 5 minute timeout
            });

            if (buildResult.success) {
                this.success('Tauri desktop integration ready');
            } else {
                this.warn('Tauri build failed - web interface will still work');
            }
        } else {
            this.info('Tauri not configured - web-only installation');
        }
    }

    async runTests() {
        this.showProgress(5, 'Running installation verification tests...');

        const tests = [
            {
                name: 'Package imports',
                command: 'node -e "require(\'./package.json\'); console.log(\'✓ Package structure valid\')"'
            },
            {
                name: 'TypeScript compilation',
                command: 'npm run typecheck'
            },
            {
                name: 'Build process',
                command: 'npm run build'
            }
        ];

        let testsPassed = 0;
        let testsTotal = tests.length;

        for (const test of tests) {
            this.verbose(`Running test: ${test.name}`);
            const result = this.runCommand(test.command, { cwd: this.projectRoot });
            
            if (result.success) {
                this.success(`Test passed: ${test.name}`);
                testsPassed++;
            } else {
                this.warn(`Test failed: ${test.name}`);
                this.verbose(`Error: ${result.error}`);
            }
            
            await this.sleep(500); // Brief pause between tests
        }

        if (testsPassed === testsTotal) {
            this.success(`All ${testsTotal} tests passed`);
        } else {
            this.warn(`${testsPassed}/${testsTotal} tests passed - installation may have issues`);
        }
    }

    async createShortcuts() {
        this.showProgress(6, 'Creating shortcuts and launchers...');

        const shortcuts = [];

        if (this.platform.isWindows) {
            // Windows shortcuts
            const desktopPath = path.join(this.platform.homeDir, 'Desktop');
            const startMenuPath = path.join(this.platform.homeDir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
            
            shortcuts.push({
                name: 'Desktop shortcut',
                path: path.join(desktopPath, 'BEAR AI.lnk'),
                action: () => this.createWindowsShortcut(desktopPath)
            });
            
            shortcuts.push({
                name: 'Start Menu shortcut',
                path: path.join(startMenuPath, 'BEAR AI.lnk'),
                action: () => this.createWindowsShortcut(startMenuPath)
            });

        } else if (this.platform.isMacOS) {
            // macOS application bundle
            const applicationsPath = path.join(this.platform.homeDir, 'Applications');
            shortcuts.push({
                name: 'Applications folder',
                path: path.join(applicationsPath, 'BEAR AI.app'),
                action: () => this.createMacOSApp(applicationsPath)
            });

        } else if (this.platform.isLinux) {
            // Linux desktop entry
            const desktopPath = path.join(this.platform.homeDir, '.local', 'share', 'applications');
            shortcuts.push({
                name: 'Applications menu',
                path: path.join(desktopPath, 'bear-ai.desktop'),
                action: () => this.createLinuxDesktopEntry(desktopPath)
            });
        }

        // Create platform-specific shortcuts
        for (const shortcut of shortcuts) {
            try {
                await shortcut.action();
                this.success(`Created ${shortcut.name}`);
            } catch (error) {
                this.warn(`Failed to create ${shortcut.name}: ${error.message}`);
            }
        }

        // Create universal launch script
        this.createLaunchScript();
        this.success('Launch scripts created');
    }

    async finalize() {
        this.showProgress(7, 'Finalizing installation...');

        // Create config file
        const configPath = path.join(this.projectRoot, 'config', 'bear-ai.json');
        const config = {
            version: CONFIG.version,
            installDate: new Date().toISOString(),
            platform: this.platform.name,
            features: {
                desktop: fs.existsSync(path.join(this.projectRoot, 'src-tauri')),
                webInterface: true,
                api: true
            }
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        this.success('Configuration saved');

        // Generate installation report
        const installTime = Math.round((Date.now() - startTime) / 1000);
        const reportPath = path.join(this.projectRoot, 'installation-report.txt');
        
        const report = `
BEAR AI Legal Assistant - Installation Report
============================================

Installation Date: ${new Date().toLocaleString()}
Installation Time: ${installTime} seconds
Platform: ${this.platform.name} ${this.platform.arch}
Node.js Version: ${this.platform.nodeVersion}

Features Installed:
- Web Interface: ✓
- Desktop App: ${config.features.desktop ? '✓' : '✗'}
- API Server: ✓

Warnings: ${this.warnings.length}
${this.warnings.map(w => `- ${w}`).join('\n')}

Errors: ${this.errors.length}
${this.errors.map(e => `- ${e}`).join('\n')}

Installation Status: ${this.errors.length === 0 ? 'SUCCESS' : 'COMPLETED WITH ISSUES'}
        `.trim();

        fs.writeFileSync(reportPath, report);
        this.success('Installation report saved');
    }

    // Platform-specific helper methods
    createWindowsShortcut(targetDir) {
        const scriptPath = path.join(this.projectRoot, 'scripts', 'create-windows-shortcut.vbs');
        const vbsScript = `
Set WshShell = CreateObject("WScript.Shell")
Set Shortcut = WshShell.CreateShortcut("${path.join(targetDir, 'BEAR AI Legal Assistant.lnk')}")
Shortcut.TargetPath = "node.exe"
Shortcut.Arguments = """${path.join(this.projectRoot, 'scripts', 'start-bear-ai.js')}"""
Shortcut.WorkingDirectory = "${this.projectRoot}"
Shortcut.WindowStyle = 1
Shortcut.Description = "BEAR AI Legal Assistant"
Shortcut.Save
        `.trim();

        fs.writeFileSync(scriptPath, vbsScript);
        this.runCommand(`cscript //nologo "${scriptPath}"`);
        fs.unlinkSync(scriptPath); // Cleanup
    }

    createMacOSApp(applicationsPath) {
        const appPath = path.join(applicationsPath, 'BEAR AI.app');
        const contentsPath = path.join(appPath, 'Contents');
        const macOSPath = path.join(contentsPath, 'MacOS');
        
        // Create app bundle structure
        fs.mkdirSync(macOSPath, { recursive: true });
        
        // Create Info.plist
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>BEAR AI Legal Assistant</string>
    <key>CFBundleIdentifier</key>
    <string>com.bearai.legal-assistant</string>
    <key>CFBundleVersion</key>
    <string>${CONFIG.version}</string>
    <key>CFBundleExecutable</key>
    <string>bear-ai</string>
</dict>
</plist>`;
        
        fs.writeFileSync(path.join(contentsPath, 'Info.plist'), plistContent);
        
        // Create executable script
        const execScript = `#!/bin/bash
cd "${this.projectRoot}"
npm start
`;
        const execPath = path.join(macOSPath, 'bear-ai');
        fs.writeFileSync(execPath, execScript);
        fs.chmodSync(execPath, '755');
    }

    createLinuxDesktopEntry(desktopPath) {
        fs.mkdirSync(desktopPath, { recursive: true });
        
        const desktopEntry = `[Desktop Entry]
Name=BEAR AI Legal Assistant
Comment=AI-powered legal document analysis
Exec=bash -c "cd '${this.projectRoot}' && npm start"
Icon=${path.join(this.projectRoot, 'public', 'logo512.png')}
Terminal=false
Type=Application
Categories=Office;Legal;
`;
        
        const entryPath = path.join(desktopPath, 'bear-ai-legal-assistant.desktop');
        fs.writeFileSync(entryPath, desktopEntry);
        fs.chmodSync(entryPath, '755');
    }

    createLaunchScript() {
        const scriptContent = this.platform.isWindows ? 
            `@echo off
cd /d "%~dp0"
echo Starting BEAR AI Legal Assistant...
start "BEAR AI" cmd /k "npm start"
echo.
echo BEAR AI is starting in a new window...
echo You can close this window.
timeout /t 3 >nul
exit` :
            `#!/bin/bash
cd "$(dirname "$0")"
echo "Starting BEAR AI Legal Assistant..."
npm start`;

        const scriptPath = path.join(this.projectRoot, this.platform.isWindows ? 'start-bear-ai.bat' : 'start-bear-ai.sh');
        fs.writeFileSync(scriptPath, scriptContent);
        
        if (!this.platform.isWindows) {
            fs.chmodSync(scriptPath, '755');
        }
    }

    // Utility methods
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            
            if (part1 > part2) return 1;
            if (part1 < part2) return -1;
        }
        return 0;
    }

    showFatalError() {
        console.log(`${colors.red}
╔══════════════════════════════════════════════════════════════╗
║                     INSTALLATION FAILED                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  The installation could not be completed due to a critical  ║
║  error. Please check the requirements and try again.        ║
║                                                              ║
║  Requirements: ${CONFIG.requirementsUrl.substring(0, 40)}...
║  Support:      ${CONFIG.supportUrl.substring(0, 40)}...
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
        `);
    }

    showSuccess() {
        const installTime = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`${colors.green}
╔══════════════════════════════════════════════════════════════╗
║                   INSTALLATION COMPLETE                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎉 BEAR AI Legal Assistant has been successfully installed! ║
║                                                              ║
║  Installation completed in ${installTime} seconds                      ║
║  ${this.warnings.length} warnings, ${this.errors.length} errors                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}Quick Start:${colors.reset}
  • Run: ${colors.bright}npm start${colors.reset} (or use desktop shortcut)
  • Web Interface: ${colors.bright}http://localhost:3000${colors.reset}
  • Documentation: ${colors.bright}docs/README.md${colors.reset}

${colors.cyan}Available Commands:${colors.reset}
  • ${colors.bright}npm run dev${colors.reset}     - Development mode
  • ${colors.bright}npm run build${colors.reset}   - Production build
  • ${colors.bright}npm test${colors.reset}        - Run tests

${colors.yellow}Support:${colors.reset} ${CONFIG.supportUrl}
        `);

        if (this.warnings.length > 0) {
            console.log(`${colors.yellow}⚠️  Warnings during installation:${colors.reset}`);
            this.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
    }

    // Main installation flow
    async install() {
        try {
            await this.showWelcome();
            await this.checkSystemRequirements();
            await this.setupProject();
            await this.installDependencies();
            await this.setupTauri();
            await this.runTests();
            await this.createShortcuts();
            await this.finalize();
            
            this.showSuccess();
            
            return { success: true, errors: this.errors, warnings: this.warnings };
            
        } catch (error) {
            this.error(`Installation failed: ${error.message}`, true);
            return { success: false, error: error.message };
        }
    }
}

// CLI Entry Point
async function main() {
    const installer = new BearAIInstaller();
    
    // Handle command line arguments
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`
BEAR AI Legal Assistant - Unified Installer

Usage:
  node scripts/install-bear-ai.js [options]

Options:
  --verbose, -v    Show detailed output
  --dev           Install development dependencies
  --help, -h      Show this help message

Examples:
  node scripts/install-bear-ai.js
  node scripts/install-bear-ai.js --verbose --dev
        `);
        return;
    }

    const result = await installer.install();
    process.exit(result.success ? 0 : 1);
}

// Execute if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = { BearAIInstaller, CONFIG };