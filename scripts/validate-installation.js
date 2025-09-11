#!/usr/bin/env node

/**
 * BEAR AI Installation Validation Script
 * Validates successful installation and readiness for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🚀 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}📋 ${msg}${colors.reset}`)
};

class InstallationValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
    this.startTime = Date.now();
  }

  async validate() {
    log.header('BEAR AI Installation Validation');
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);

    await this.validateProjectStructure();
    await this.validateDependencies();
    await this.validateConfiguration();
    await this.validateDocumentation();
    await this.validateSecurity();
    await this.validateArchitecture();
    
    this.generateReport();
  }

  async validateProjectStructure() {
    log.step('Validating Project Structure...');
    
    const requiredDirs = [
      'src',
      'src/components', 
      'src/types',
      'src/services',
      'docs',
      'tests',
      'config'
    ];

    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'README.md',
      'src/App.tsx',
      'src/index.tsx'
    ];

    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        log.success(`Directory exists: ${dir}`);
        this.results.passed++;
      } else {
        log.error(`Missing directory: ${dir}`);
        this.results.failed++;
      }
    }

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        log.success(`File exists: ${file}`);
        this.results.passed++;
      } else {
        log.error(`Missing file: ${file}`);
        this.results.failed++;
      }
    }
  }

  async validateDependencies() {
    log.step('Validating Dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for key dependencies
      const keyDeps = [
        'react',
        'react-dom', 
        'typescript',
        'tailwindcss'
      ];

      for (const dep of keyDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          log.success(`Dependency found: ${dep}`);
          this.results.passed++;
        } else {
          log.error(`Missing dependency: ${dep}`);
          this.results.failed++;
        }
      }

      // Validate Python dependencies
      if (fs.existsSync('pyproject.toml')) {
        const pyprojectContent = fs.readFileSync('pyproject.toml', 'utf8');
        if (pyprojectContent.includes('lancedb')) {
          log.success('LanceDB dependency found in pyproject.toml');
          this.results.passed++;
        } else {
          log.error('LanceDB dependency missing from pyproject.toml');
          this.results.failed++;
        }

        if (!pyprojectContent.includes('chromadb')) {
          log.success('ChromaDB successfully removed from pyproject.toml');
          this.results.passed++;
        } else {
          log.warning('ChromaDB still referenced in pyproject.toml');
          this.results.warnings++;
        }
      }

    } catch (error) {
      log.error(`Error reading package.json: ${error.message}`);
      this.results.failed++;
    }
  }

  async validateConfiguration() {
    log.step('Validating Configuration...');
    
    try {
      // Validate TypeScript config
      if (fs.existsSync('tsconfig.json')) {
        const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        if (tsconfig.compilerOptions?.jsx === 'react-jsx') {
          log.success('TypeScript configuration valid');
          this.results.passed++;
        } else {
          log.error('TypeScript configuration invalid');
          this.results.failed++;
        }
      }

      // Check for proper path aliases
      const tsconfigContent = fs.readFileSync('tsconfig.json', 'utf8');
      if (tsconfigContent.includes('@/*')) {
        log.success('Path aliases configured');
        this.results.passed++;
      } else {
        log.warning('Path aliases not configured');
        this.results.warnings++;
      }

    } catch (error) {
      log.error(`Configuration validation error: ${error.message}`);
      this.results.failed++;
    }
  }

  async validateDocumentation() {
    log.step('Validating Documentation...');
    
    const requiredDocs = [
      'README.md',
      'docs/INSTALLATION.md',
      'docs/ENHANCED_ARCHITECTURE.md'
    ];

    for (const doc of requiredDocs) {
      if (fs.existsSync(doc)) {
        const content = fs.readFileSync(doc, 'utf8');
        if (content.length > 100) {
          log.success(`Documentation complete: ${doc}`);
          this.results.passed++;
        } else {
          log.warning(`Documentation minimal: ${doc}`);
          this.results.warnings++;
        }
      } else {
        log.error(`Missing documentation: ${doc}`);
        this.results.failed++;
      }
    }
  }

  async validateSecurity() {
    log.step('Validating Security Implementation...');
    
    try {
      // Check for PII detection
      if (fs.existsSync('src/bear_ai/security/pii_detection.py')) {
        log.success('PII detection module found');
        this.results.passed++;
      } else {
        log.error('PII detection module missing');
        this.results.failed++;
      }

      // Check for privacy components
      const privacyFiles = [
        'src/components/privacy',
        'src/contexts/PrivacyContext.tsx'
      ];

      for (const file of privacyFiles) {
        if (fs.existsSync(file)) {
          log.success(`Privacy component found: ${file}`);
          this.results.passed++;
        } else {
          log.warning(`Privacy component missing: ${file}`);
          this.results.warnings++;
        }
      }

    } catch (error) {
      log.error(`Security validation error: ${error.message}`);
      this.results.failed++;
    }
  }

  async validateArchitecture() {
    log.step('Validating Architecture Implementation...');
    
    try {
      // Check for key architectural components
      const keyComponents = [
        'src/App.tsx',
        'src/components/layout',
        'src/types/index.ts',
        'src/services'
      ];

      for (const component of keyComponents) {
        if (fs.existsSync(component)) {
          log.success(`Architecture component found: ${component}`);
          this.results.passed++;
        } else {
          log.error(`Architecture component missing: ${component}`);
          this.results.failed++;
        }
      }

      // Validate vector storage implementation
      if (fs.existsSync('src/bear_ai/rag/vector_store.py')) {
        const vectorStoreContent = fs.readFileSync('src/bear_ai/rag/vector_store.py', 'utf8');
        if (vectorStoreContent.includes('LanceVectorStore')) {
          log.success('LanceDB vector storage implemented');
          this.results.passed++;
        } else {
          log.error('LanceDB vector storage not properly implemented');
          this.results.failed++;
        }

        if (!vectorStoreContent.includes('ChromaVectorStore')) {
          log.success('ChromaDB successfully removed from vector storage');
          this.results.passed++;
        } else {
          log.warning('ChromaDB still present in vector storage');
          this.results.warnings++;
        }
      }

    } catch (error) {
      log.error(`Architecture validation error: ${error.message}`);
      this.results.failed++;
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    
    console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    log.header('VALIDATION REPORT');
    
    const totalTests = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    
    console.log(`
${colors.bold}📊 Test Results:${colors.reset}
${colors.green}✅ Passed: ${this.results.passed}${colors.reset}
${colors.red}❌ Failed: ${this.results.failed}${colors.reset}
${colors.yellow}⚠️  Warnings: ${this.results.warnings}${colors.reset}
${colors.white}📈 Success Rate: ${successRate}%${colors.reset}
${colors.blue}⏱️  Duration: ${duration}s${colors.reset}
`);

    // Determine overall status
    if (this.results.failed === 0) {
      if (this.results.warnings === 0) {
        log.success('🎉 INSTALLATION PERFECT - Ready for Production!');
      } else {
        log.success('✅ INSTALLATION SUCCESSFUL - Minor warnings present');
      }
    } else if (this.results.failed <= 2) {
      log.warning('⚠️ INSTALLATION MOSTLY SUCCESSFUL - Fix critical issues');
    } else {
      log.error('❌ INSTALLATION INCOMPLETE - Major issues detected');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      results: this.results,
      successRate: successRate,
      recommendation: this.results.failed === 0 ? 'READY_FOR_PRODUCTION' : 'NEEDS_FIXES'
    };

    fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
    log.info('Detailed report saved to validation-report.json');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new InstallationValidator();
  validator.validate().catch(error => {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = InstallationValidator;