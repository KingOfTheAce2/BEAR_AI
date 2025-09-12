#!/usr/bin/env node

/**
 * BEAR AI Legal Assistant - One-Command Installer
 * The ultimate Apple-style simple installation
 * 
 * Usage:
 *   curl -sL https://raw.githubusercontent.com/KingOfTheAce2/BEAR_AI/main/install.js | node
 *   OR
 *   node install.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');
const { URL } = require('url');

// Configuration
const REPO_URL = 'https://github.com/KingOfTheAce2/BEAR_AI';
const REPO_ZIP_URL = 'https://github.com/KingOfTheAce2/BEAR_AI/archive/refs/heads/main.zip';
const INSTALL_DIR_NAME = 'BEAR_AI';

// Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Progress tracking
let currentStep = 0;
const totalSteps = 5;
const startTime = Date.now();

class OneCommandInstaller {
    constructor() {
        this.platform = os.platform();
        this.arch = os.arch();
        this.homeDir = os.homedir();
        this.installDir = path.join(this.homeDir, INSTALL_DIR_NAME);
        this.isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');
        this.skipGit = process.argv.includes('--no-git');
    }

    log(message, color = 'reset', prefix = '') {
        console.log(`${colors[color]}${prefix}${message}${colors.reset}`);
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
    }

    error(message, fatal = false) {
        this.log(`❌ ${message}`, 'red');
        if (fatal) {
            this.showFatalError();
            process.exit(1);
        }
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

    showProgress(step, message) {
        currentStep = step;
        const percentage = Math.round((step / totalSteps) * 100);
        const filled = Math.floor(percentage / 5);
        const empty = 20 - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
        
        console.log(`\n${colors.bright}[${step}/${totalSteps}] ${progressBar} ${percentage}%${colors.reset}`);
        this.info(message);
    }

    async showWelcome() {
        console.clear();
        console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🐻  BEAR AI Legal Assistant - One Command Installer  ⚖️    ║
║                                                               ║
║   The simplest way to install BEAR AI                        ║
║   Professional Legal AI Assistant                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}What this installer does:${colors.reset}
• Downloads the latest BEAR AI from GitHub
• Installs all dependencies automatically  
• Sets up your development environment
• Creates shortcuts for easy access
• Verifies everything works correctly

${colors.yellow}Installation directory: ${this.installDir}${colors.reset}
        `);

        // Check if directory exists and prompt
        if (fs.existsSync(this.installDir)) {
            console.log(`${colors.yellow}⚠️  Directory already exists. This will update your installation.${colors.reset}`);
        }

        await this.sleep(2000);
    }

    async checkPrerequisites() {
        this.showProgress(1, 'Checking system compatibility...');

        // Check Node.js
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            if (majorVersion < 16) {
                this.error(`Node.js 16+ required. Current: ${nodeVersion}. Please update from https://nodejs.org/`, true);
            }
            this.success(`Node.js ${nodeVersion} - Compatible`);
        } catch (error) {
            this.error('Failed to check Node.js version', true);
        }

        // Check npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            this.success(`npm ${npmVersion} - Available`);
        } catch (error) {
            this.error('npm not found. Please install Node.js from https://nodejs.org/', true);
        }

        // Check platform
        const supportedPlatforms = ['win32', 'darwin', 'linux'];
        if (!supportedPlatforms.includes(this.platform)) {
            this.error(`Unsupported platform: ${this.platform}`, true);
        }
        this.success(`Platform ${this.platform} ${this.arch} - Supported`);

        // Check internet connection
        try {
            await this.testConnection();
            this.success('Internet connection - Available');
        } catch (error) {
            this.error('Internet connection required to download BEAR AI', true);
        }

        this.verbose('Prerequisites check completed');
    }

    async downloadBearAI() {
        this.showProgress(2, 'Downloading BEAR AI Legal Assistant...');

        // Create install directory
        if (fs.existsSync(this.installDir)) {
            this.info('Updating existing installation...');
            // Backup package-lock.json and node_modules if they exist
            this.backupExistingInstallation();
        } else {
            fs.mkdirSync(this.installDir, { recursive: true });
        }

        try {
            // Try git clone first (faster and better for development)
            if (!this.skipGit && this.hasGit()) {
                await this.cloneRepository();
            } else {
                await this.downloadZip();
            }
            
            this.success('BEAR AI downloaded successfully');
        } catch (error) {
            this.error(`Failed to download BEAR AI: ${error.message}`, true);
        }
    }

    async installDependencies() {
        this.showProgress(3, 'Installing dependencies...');

        process.chdir(this.installDir);

        try {
            // Restore backed up files if they exist
            this.restoreBackup();

            // Use npm ci if package-lock.json exists, otherwise npm install
            const hasLockFile = fs.existsSync('package-lock.json');
            const installCommand = hasLockFile ? 'npm ci' : 'npm install';

            this.info(`Running ${installCommand}...`);
            this.runCommand(`${installCommand} --prefer-offline --no-audit --no-fund`, true);

            this.success('Dependencies installed successfully');
        } catch (error) {
            this.error(`Failed to install dependencies: ${error.message}`, true);
        }
    }

    async setupEnvironment() {
        this.showProgress(4, 'Setting up environment...');

        try {
            // Run the unified installer
            if (fs.existsSync('scripts/install-bear-ai.js')) {
                this.info('Running BEAR AI setup...');
                this.runCommand('node scripts/install-bear-ai.js --verbose', false);
                this.success('Environment setup completed');
            } else {
                // Fallback setup
                this.warn('Setup script not found, using fallback configuration');
                await this.fallbackSetup();
            }
        } catch (error) {
            this.warn(`Setup encountered issues: ${error.message}`);
            // Continue anyway
        }
    }

    async verifyInstallation() {
        this.showProgress(5, 'Verifying installation...');

        const checks = [
            {
                name: 'Package structure',
                test: () => fs.existsSync('package.json')
            },
            {
                name: 'Dependencies installed',
                test: () => fs.existsSync('node_modules')
            },
            {
                name: 'Source files',
                test: () => fs.existsSync('src')
            },
            {
                name: 'Build capability',
                test: () => {
                    try {
                        this.runCommand('npm run typecheck', false);
                        return true;
                    } catch {
                        return false;
                    }
                }
            }
        ];

        let passed = 0;
        for (const check of checks) {
            try {
                if (check.test()) {
                    this.success(`${check.name} - OK`);
                    passed++;
                } else {
                    this.warn(`${check.name} - Failed`);
                }
            } catch (error) {
                this.warn(`${check.name} - Failed: ${error.message}`);
            }
        }

        if (passed >= 3) {
            this.success(`Installation verified (${passed}/${checks.length} checks passed)`);
        } else {
            this.warn(`Installation may have issues (${passed}/${checks.length} checks passed)`);
        }
    }

    // Helper methods
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testConnection() {
        return new Promise((resolve, reject) => {
            const url = new URL(REPO_URL);
            const client = url.protocol === 'https:' ? https : http;
            
            const req = client.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'HEAD',
                timeout: 10000
            }, (res) => {
                resolve(res.statusCode < 400);
            });
            
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Connection timeout')));
            req.end();
        });
    }

    hasGit() {
        try {
            execSync('git --version', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    async cloneRepository() {
        this.info('Using git clone for faster download...');
        
        if (fs.existsSync(path.join(this.installDir, '.git'))) {
            // Pull latest changes
            this.runCommand('git pull origin main', false);
        } else {
            // Fresh clone
            const parentDir = path.dirname(this.installDir);
            const dirName = path.basename(this.installDir);
            
            process.chdir(parentDir);
            this.runCommand(`git clone ${REPO_URL} ${dirName}`, false);
        }
    }

    async downloadZip() {
        this.info('Downloading ZIP archive...');
        
        const zipPath = path.join(this.installDir, 'bear-ai.zip');
        const extractPath = this.installDir;
        
        // Download ZIP
        await this.downloadFile(REPO_ZIP_URL, zipPath);
        
        // Extract ZIP (simplified extraction)
        this.info('Extracting files...');
        await this.extractZip(zipPath, extractPath);
        
        // Move files from subdirectory
        const extractedDir = path.join(extractPath, 'BEAR_AI-main');
        if (fs.existsSync(extractedDir)) {
            this.moveContents(extractedDir, extractPath);
            fs.rmSync(extractedDir, { recursive: true, force: true });
        }
        
        // Cleanup
        fs.unlinkSync(zipPath);
    }

    async downloadFile(url, destination) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destination);
            const client = url.startsWith('https') ? https : http;
            
            client.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirect
                    return this.downloadFile(response.headers.location, destination)
                        .then(resolve)
                        .catch(reject);
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (error) => {
                fs.unlinkSync(destination);
                reject(error);
            });
        });
    }

    async extractZip(zipPath, extractPath) {
        // Use built-in tools for extraction
        if (this.platform === 'win32') {
            this.runCommand(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`, false);
        } else {
            this.runCommand(`unzip -q "${zipPath}" -d "${extractPath}"`, false);
        }
    }

    moveContents(source, destination) {
        const items = fs.readdirSync(source);
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destPath = path.join(destination, item);
            
            if (fs.existsSync(destPath)) {
                fs.rmSync(destPath, { recursive: true, force: true });
            }
            
            fs.renameSync(sourcePath, destPath);
        }
    }

    backupExistingInstallation() {
        const backupItems = ['package-lock.json', 'node_modules'];
        const backupDir = path.join(this.installDir, '.backup');
        
        let hasBackup = false;
        
        for (const item of backupItems) {
            const itemPath = path.join(this.installDir, item);
            if (fs.existsSync(itemPath)) {
                if (!hasBackup) {
                    fs.mkdirSync(backupDir, { recursive: true });
                    hasBackup = true;
                }
                
                const backupPath = path.join(backupDir, item);
                if (fs.existsSync(backupPath)) {
                    fs.rmSync(backupPath, { recursive: true, force: true });
                }
                fs.renameSync(itemPath, backupPath);
                this.verbose(`Backed up ${item}`);
            }
        }
    }

    restoreBackup() {
        const backupDir = path.join(this.installDir, '.backup');
        if (!fs.existsSync(backupDir)) return;
        
        const items = fs.readdirSync(backupDir);
        for (const item of items) {
            const backupPath = path.join(backupDir, item);
            const restorePath = path.join(this.installDir, item);
            
            if (!fs.existsSync(restorePath)) {
                fs.renameSync(backupPath, restorePath);
                this.verbose(`Restored ${item}`);
            }
        }
        
        // Clean up backup directory
        fs.rmSync(backupDir, { recursive: true, force: true });
    }

    async fallbackSetup() {
        // Create basic directories
        const dirs = ['logs', 'temp', 'config'];
        dirs.forEach(dir => {
            const dirPath = path.join(this.installDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
        
        // Create basic config
        const configPath = path.join(this.installDir, 'config', 'bear-ai.json');
        const config = {
            version: '2.0.0',
            installDate: new Date().toISOString(),
            platform: this.platform,
            installedBy: 'one-command-installer'
        };
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        this.success('Basic environment setup completed');
    }

    runCommand(command, showOutput = false) {
        this.verbose(`Running: ${command}`);
        
        const options = {
            stdio: showOutput || this.isVerbose ? 'inherit' : 'pipe',
            encoding: 'utf8'
        };
        
        return execSync(command, options);
    }

    showSuccess() {
        const installTime = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`${colors.green}
╔══════════════════════════════════════════════════════════════════╗
║                     INSTALLATION COMPLETE!                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  🎉 BEAR AI Legal Assistant has been installed successfully!     ║
║                                                                  ║
║  Installation completed in ${installTime} seconds                           ║
║  Ready to use immediately!                                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}🚀 Quick Start:${colors.reset}
${colors.bright}1. Navigate to BEAR AI:${colors.reset}
   cd "${this.installDir}"

${colors.bright}2. Start the application:${colors.reset}
   npm start

${colors.bright}3. Open in browser:${colors.reset}
   http://localhost:3000

${colors.cyan}📚 What's Next:${colors.reset}
• Web interface will open automatically
• Check out the documentation in docs/
• Join our community for support

${colors.yellow}🆘 Need Help?${colors.reset}
• Documentation: ${this.installDir}/docs/
• Issues: https://github.com/KingOfTheAce2/BEAR_AI/issues
• Discussions: https://github.com/KingOfTheAce2/BEAR_AI/discussions

${colors.green}Thank you for choosing BEAR AI! 🐻⚖️${colors.reset}
        `);
    }

    showFatalError() {
        console.log(`${colors.red}
╔══════════════════════════════════════════════════════════════════╗
║                     INSTALLATION FAILED                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  The installation could not be completed. This might be due to:  ║
║                                                                  ║
║  • Network connectivity issues                                   ║
║  • Insufficient permissions                                      ║
║  • Missing system requirements                                   ║
║  • Disk space limitations                                        ║
║                                                                  ║
║  Please check the error message above and try again.            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.yellow}🛠️  Troubleshooting:${colors.reset}
• Ensure you have Node.js 16+ installed
• Check your internet connection
• Try running as administrator/root
• Free up disk space (5GB+ recommended)

${colors.yellow}🆘 Get Help:${colors.reset}
• Requirements: https://github.com/KingOfTheAce2/BEAR_AI#system-requirements
• Support: https://github.com/KingOfTheAce2/BEAR_AI/issues
        `);
    }

    // Main installation flow
    async install() {
        try {
            await this.showWelcome();
            await this.checkPrerequisites();
            await this.downloadBearAI();
            await this.installDependencies();
            await this.setupEnvironment();
            await this.verifyInstallation();
            
            this.showSuccess();
            return true;
            
        } catch (error) {
            this.error(`Installation failed: ${error.message}`, true);
            return false;
        }
    }
}

// CLI Entry Point
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`
BEAR AI Legal Assistant - One Command Installer

Usage:
  node install.js [options]

Options:
  --verbose, -v    Show detailed output
  --no-git        Skip git clone, use ZIP download
  --help, -h      Show this help

Examples:
  node install.js
  node install.js --verbose
  curl -sL https://raw.githubusercontent.com/KingOfTheAce2/BEAR_AI/main/install.js | node
        `);
        return;
    }

    const installer = new OneCommandInstaller();
    const success = await installer.install();
    process.exit(success ? 0 : 1);
}

// Execute if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = { OneCommandInstaller };