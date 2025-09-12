#!/usr/bin/env node

/**
 * BEAR AI Installation Cleanup
 * Consolidates confusing installer files into single clear process
 */

const fs = require('fs');
const path = require('path');

class InstallationCleanup {
    constructor() {
        this.projectRoot = path.dirname(__dirname);
        this.toDelete = [];
        this.toKeep = [];
        this.toCreate = [];
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

    async analyzeInstallerFiles() {
        this.log('🔍 Analyzing installation files...', 'cyan');

        const files = [
            'INSTALLATION_GUIDE.md',
            'WINDOWS_INSTALLATION_GUIDE.md', 
            'installation-test-report.md',
            'scripts/build-windows-installer.ps1',
            'scripts/test-installation.ps1',
            'scripts/test-unified-installation.js',
            'scripts/validate-installation.js',
            'scripts/install-bear-ai.sh',
            'CREATE_SHORTCUT.bat',
            'CLEANUP.bat'
        ];

        for (const file of files) {
            const fullPath = path.join(this.projectRoot, file);
            if (fs.existsSync(fullPath)) {
                // Mark old confusing files for deletion
                if (file.includes('CLEANUP.bat') || file.includes('CREATE_SHORTCUT.bat')) {
                    this.toDelete.push(fullPath);
                    this.log(`❌ Will delete: ${file}`, 'red');
                } else if (file.includes('test-') || file.includes('validate-')) {
                    // Keep test files but organize them
                    this.toKeep.push(fullPath);
                    this.log(`✅ Will keep: ${file}`, 'green');
                } else {
                    this.log(`📋 Found: ${file}`, 'yellow');
                }
            }
        }
    }

    async consolidateInstallationGuides() {
        this.log('📚 Consolidating installation guides...', 'cyan');

        const unifiedGuide = `# BEAR AI Legal Assistant - Installation Guide

## Quick Start (Recommended)

### One-Command Installation
\`\`\`bash
# For all platforms:
npm run setup

# Or directly:
node scripts/install-bear-ai.js
\`\`\`

## Manual Installation

### Prerequisites
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher  
- Python 3.8+ (optional, for AI features)
- Git (for cloning repository)

### Step-by-Step Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/KingOfTheAce2/BEAR_AI.git
   cd BEAR_AI
   \`\`\`

2. **Install Node.js dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Fix Python dependencies (if needed)**
   \`\`\`bash
   node scripts/fix-python-deps.js
   \`\`\`

4. **Start the application**
   \`\`\`bash
   npm start
   \`\`\`

## Platform-Specific Notes

### Windows
- Use \`scripts/start-bear-ai.js\` for proper launcher
- Desktop shortcut will be created automatically
- If Python dependencies fail, fallback requirements will be created

### macOS
- May require Xcode command line tools for some dependencies
- Application bundle will be created in Applications folder

### Linux
- Desktop entry will be created automatically
- May require additional system packages for PyQt6

## Troubleshooting

### Common Issues

1. **llama-cpp-python build failure**
   - Run: \`node scripts/fix-python-deps.js\`
   - Use fallback requirements if build fails

2. **Desktop shortcut not working**
   - Use: \`node scripts/start-bear-ai.js\`
   - Or run: \`npm start\` from project directory

3. **Permission errors**
   - On Windows: Run as Administrator
   - On Unix: Check file permissions with \`chmod +x\`

### Getting Help
- Check the [Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues) page
- Review the installation report generated after setup

## Development

### Development Installation
\`\`\`bash
node scripts/install-bear-ai.js --dev --verbose
\`\`\`

### Available Commands
- \`npm start\` - Start the application
- \`npm run dev\` - Development mode with hot reload
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
- \`npm run typecheck\` - TypeScript type checking

## Features
- ✅ Web interface (React + TypeScript)
- ✅ API server (Express.js)
- ✅ Desktop integration (cross-platform)
- ✅ AI-powered legal document analysis
- ✅ Automated testing and validation
`;

        // Write the unified installation guide
        const guidePath = path.join(this.projectRoot, 'INSTALLATION_GUIDE.md');
        fs.writeFileSync(guidePath, unifiedGuide);
        this.log(`✅ Created unified installation guide: INSTALLATION_GUIDE.md`, 'green');

        // Mark old guides for deletion
        const oldGuides = [
            'WINDOWS_INSTALLATION_GUIDE.md',
            'installation-test-report.md'
        ];

        for (const guide of oldGuides) {
            const guidePath = path.join(this.projectRoot, guide);
            if (fs.existsSync(guidePath)) {
                this.toDelete.push(guidePath);
            }
        }
    }

    async createMasterLauncher() {
        this.log('🚀 Creating master launcher script...', 'cyan');

        const masterLauncher = `@echo off
REM BEAR AI Legal Assistant - Master Launcher
REM This is the ONLY launcher script you need!

echo.
echo ==========================================
echo   🐻 BEAR AI Legal Assistant Launcher
echo ==========================================
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if this is first run
if not exist "node_modules" (
    echo 📦 First time setup - installing dependencies...
    echo This may take a few minutes...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully!
    echo.
)

REM Start the application using the proper launcher
echo 🚀 Starting BEAR AI Legal Assistant...
node scripts/start-bear-ai.js

echo.
echo 👋 BEAR AI has closed. Thank you for using BEAR AI Legal Assistant!
pause`;

        const launcherPath = path.join(this.projectRoot, 'START_BEAR_AI.bat');
        fs.writeFileSync(launcherPath, masterLauncher);
        this.log(`✅ Created master launcher: START_BEAR_AI.bat`, 'green');
    }

    async cleanupFiles() {
        this.log('🧹 Cleaning up old files...', 'cyan');

        for (const filePath of this.toDelete) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    this.log(`✅ Deleted: ${path.relative(this.projectRoot, filePath)}`, 'green');
                }
            } catch (error) {
                this.log(`❌ Failed to delete: ${path.relative(this.projectRoot, filePath)} - ${error.message}`, 'red');
            }
        }
    }

    async updatePackageJson() {
        this.log('📦 Updating package.json scripts...', 'cyan');

        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            this.log('❌ package.json not found', 'red');
            return;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Add/update convenience scripts
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts['fix-python'] = 'node scripts/fix-python-deps.js';
        packageJson.scripts['cleanup-install'] = 'node scripts/cleanup-installers.js';
        packageJson.scripts['windows-launcher'] = 'node scripts/start-bear-ai.js';

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        this.log('✅ Updated package.json with new scripts', 'green');
    }

    async main() {
        this.log('🧹 BEAR AI Installation Cleanup Tool', 'cyan');
        this.log('===================================', 'cyan');

        await this.analyzeInstallerFiles();
        await this.consolidateInstallationGuides();
        await this.createMasterLauncher();
        await this.updatePackageJson();
        await this.cleanupFiles();

        this.log('\n✅ Cleanup completed successfully!', 'green');
        this.log('\n📋 Summary:', 'cyan');
        this.log('- Use START_BEAR_AI.bat to launch the application', 'green');
        this.log('- Check INSTALLATION_GUIDE.md for detailed setup instructions', 'green');
        this.log('- Run "npm run fix-python" if you have Python dependency issues', 'green');
        this.log('- All old confusing files have been removed', 'green');
    }
}

// Run if called directly
if (require.main === module) {
    const cleanup = new InstallationCleanup();
    cleanup.main().catch(error => {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { InstallationCleanup };