#!/usr/bin/env node

/**
 * BEAR AI Python Dependencies Fixer
 * Fixes llama-cpp-python build issues on Windows
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class PythonDepsFixer {
    constructor() {
        this.isWindows = os.platform() === 'win32';
        this.projectRoot = path.dirname(__dirname);
        this.requirementsPath = path.join(this.projectRoot, 'requirements.txt');
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

    async fixLlamaCppPython() {
        this.log('🔧 Fixing llama-cpp-python Windows build issues...', 'cyan');

        try {
            // Check if we have a working Python installation
            const pythonResult = this.runCommand('python --version');
            if (!pythonResult.success) {
                this.log('❌ Python not found. Please install Python 3.8+ from python.org', 'red');
                return false;
            }
            this.log(`✅ Python found: ${pythonResult.output.trim()}`, 'green');

            // Check for pip
            const pipResult = this.runCommand('pip --version');
            if (!pipResult.success) {
                this.log('❌ pip not found. Please install pip', 'red');
                return false;
            }
            this.log(`✅ pip found: ${pipResult.output.trim()}`, 'green');

            // Install wheel and setuptools first
            this.log('📦 Installing build tools...', 'cyan');
            const buildToolsResult = this.runCommand('pip install --upgrade pip wheel setuptools');
            if (!buildToolsResult.success) {
                this.log('⚠️  Failed to install build tools - continuing anyway', 'yellow');
            }

            // Try installing Visual Studio Build Tools if on Windows
            if (this.isWindows) {
                this.log('🔨 Checking for Visual Studio Build Tools...', 'cyan');
                // Check for common paths where VS Build Tools might be installed
                const commonPaths = [
                    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools',
                    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools',
                    'C:\\Program Files\\Microsoft Visual Studio\\2019\\Community',
                    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community'
                ];

                let vsFound = false;
                for (const vsPath of commonPaths) {
                    if (fs.existsSync(vsPath)) {
                        this.log(`✅ Found Visual Studio at: ${vsPath}`, 'green');
                        vsFound = true;
                        break;
                    }
                }

                if (!vsFound) {
                    this.log('⚠️  Visual Studio Build Tools not found. You may need to install them:', 'yellow');
                    this.log('   https://visualstudio.microsoft.com/visual-cpp-build-tools/', 'yellow');
                }
            }

            // Try to install llama-cpp-python with specific options for Windows
            this.log('🦙 Installing llama-cpp-python with Windows optimizations...', 'cyan');
            
            const installCommands = [
                // Try precompiled wheel first
                'pip install llama-cpp-python --only-binary=all --no-cache-dir',
                // If that fails, try with CPU-only build
                'pip install llama-cpp-python --no-cache-dir --force-reinstall --no-deps --verbose',
                // Last resort: install from source with minimal requirements
                'pip install llama-cpp-python --no-build-isolation --no-cache-dir'
            ];

            let success = false;
            for (const command of installCommands) {
                this.log(`📦 Trying: ${command}`, 'cyan');
                const result = this.runCommand(command, { timeout: 600000 }); // 10 minute timeout
                
                if (result.success) {
                    this.log('✅ llama-cpp-python installed successfully!', 'green');
                    success = true;
                    break;
                } else {
                    this.log(`❌ Failed: ${result.error}`, 'red');
                    this.log('🔄 Trying next method...', 'yellow');
                }
            }

            if (!success) {
                this.log('⚠️  All installation methods failed. Creating fallback configuration...', 'yellow');
                this.createFallbackConfig();
            }

            return success;

        } catch (error) {
            this.log(`❌ Error fixing Python dependencies: ${error.message}`, 'red');
            return false;
        }
    }

    createFallbackConfig() {
        // Create a fallback requirements file without problematic dependencies
        const fallbackRequirements = `
# BEAR AI Legal Assistant - Fallback Requirements (Windows Compatible)
pydantic>=1.10.0
pydantic-settings
tqdm
appdirs
huggingface_hub
PyQt6
openai
pynvml
watchdog

# RAG system dependencies  
pypdf>=4.0.0
python-docx>=1.1.0

# Testing dependencies
pytest>=7.0.0
pytest-cov>=4.0.0

# PII Detection and Scrubbing (lighter alternatives)
spacy>=3.4.0
transformers>=4.21.0

# Note: llama-cpp-python removed due to Windows build issues
# Alternative: Use OpenAI API or other cloud-based inference
        `.trim();

        const fallbackPath = path.join(this.projectRoot, 'requirements-windows-fallback.txt');
        fs.writeFileSync(fallbackPath, fallbackRequirements);
        
        this.log(`📝 Created fallback requirements: ${fallbackPath}`, 'cyan');
        this.log('💡 Use this file if the main installation fails', 'yellow');
    }

    runCommand(command, options = {}) {
        try {
            const result = execSync(command, {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: options.timeout || 120000, // 2 minute default timeout
                ...options
            });
            return { success: true, output: result };
        } catch (error) {
            return { success: false, error: error.message, output: error.stdout || '' };
        }
    }

    async checkPythonEnvironment() {
        this.log('🐍 Checking Python environment...', 'cyan');

        const checks = [
            { name: 'Python', command: 'python --version' },
            { name: 'pip', command: 'pip --version' },
            { name: 'Virtual Environment Support', command: 'python -m venv --help' }
        ];

        for (const check of checks) {
            const result = this.runCommand(check.command);
            if (result.success) {
                this.log(`✅ ${check.name}: ${result.output.split('\n')[0]}`, 'green');
            } else {
                this.log(`❌ ${check.name}: Not found`, 'red');
            }
        }
    }

    async main() {
        this.log('🔧 BEAR AI Python Dependencies Fixer', 'cyan');
        this.log('=====================================', 'cyan');

        await this.checkPythonEnvironment();
        const success = await this.fixLlamaCppPython();

        if (success) {
            this.log('\n✅ Python dependencies fixed successfully!', 'green');
        } else {
            this.log('\n⚠️  Some issues remain. Check the fallback requirements file.', 'yellow');
        }
    }
}

// Run if called directly
if (require.main === module) {
    const fixer = new PythonDepsFixer();
    fixer.main().catch(error => {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { PythonDepsFixer };