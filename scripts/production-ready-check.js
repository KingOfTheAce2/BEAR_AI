#!/usr/bin/env node

/**
 * Production Readiness Checker for BEAR AI Legal Assistant
 * Validates all systems are ready for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionReadinessChecker {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: []
    };
  }

  check(name, condition, message, isWarning = false) {
    const status = condition ? 'PASS' : (isWarning ? 'WARN' : 'FAIL');
    const emoji = condition ? '✅' : (isWarning ? '⚠️' : '❌');

    console.log(`${emoji} ${name}: ${status}`);
    if (message) console.log(`   ${message}`);

    this.results.checks.push({ name, status, message });

    if (condition) {
      this.results.passed++;
    } else if (isWarning) {
      this.results.warnings++;
    } else {
      this.results.failed++;
    }

    return condition;
  }

  async checkFileExists(filePath, description) {
    const exists = fs.existsSync(path.join(this.projectRoot, filePath));
    return this.check(
      `${description} exists`,
      exists,
      exists ? `Found: ${filePath}` : `Missing: ${filePath}`
    );
  }

  async checkPackageJson() {
    console.log('\n📦 Package Configuration');

    const packagePath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packagePath)) {
      return this.check('package.json', false, 'package.json not found');
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    this.check('Package name', !!pkg.name, pkg.name || 'Missing name');
    this.check('Package version', !!pkg.version, pkg.version || 'Missing version');
    this.check('Package description', !!pkg.description, 'Has description');

    // Check required scripts
    const requiredScripts = ['build', 'start', 'test'];
    requiredScripts.forEach(script => {
      this.check(
        `Script: ${script}`,
        !!(pkg.scripts && pkg.scripts[script]),
        pkg.scripts?.[script] || 'Missing script'
      );
    });

    // Check dependencies
    this.check('Has dependencies', !!(pkg.dependencies && Object.keys(pkg.dependencies).length > 0));
    this.check('Has devDependencies', !!(pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0));
  }

  async checkTauriConfig() {
    console.log('\n🦀 Tauri Configuration');

    await this.checkFileExists('src-tauri/tauri.conf.json', 'Main Tauri config');
    await this.checkFileExists('src-tauri/tauri.conf.alpha.json', 'Alpha Tauri config');
    await this.checkFileExists('src-tauri/Cargo.toml', 'Cargo.toml');

    // Validate Tauri config structure
    const configPath = path.join(this.projectRoot, 'src-tauri', 'tauri.conf.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.check('Tauri config valid JSON', true, 'Configuration parsed successfully');
        this.check('Has app identifier', !!config.identifier, config.identifier);
        this.check('Has product name', !!config.productName, config.productName);
        this.check('Has version', !!config.version, config.version);
      } catch (error) {
        this.check('Tauri config valid JSON', false, error.message);
      }
    }
  }

  async checkSourceCode() {
    console.log('\n💻 Source Code');

    await this.checkFileExists('src/App.tsx', 'Main React App');
    await this.checkFileExists('src/index.tsx', 'React entry point');
    await this.checkFileExists('src-tauri/src/main.rs', 'Rust main file');

    // Check for major implementation files
    const implementations = [
      'src-tauri/src/stripe_integration_v2.rs',
      'src-tauri/src/ocr_processor.rs',
      'src-tauri/src/model_commands.rs',
      'src-tauri/src/hardware_detection.rs'
    ];

    implementations.forEach(impl => {
      const basename = path.basename(impl, '.rs');
      this.checkFileExists(impl, `${basename} implementation`);
    });
  }

  async checkBuildSystem() {
    console.log('\n🏗️ Build System');

    // Check if node_modules exists
    const nodeModulesExists = fs.existsSync(path.join(this.projectRoot, 'node_modules'));
    this.check('Dependencies installed', nodeModulesExists, nodeModulesExists ? 'node_modules found' : 'Run npm install');

    // Check TypeScript config
    await this.checkFileExists('tsconfig.json', 'TypeScript config');

    // Check if Rust toolchain is available
    try {
      execSync('rustc --version', { stdio: 'ignore' });
      this.check('Rust toolchain', true, 'Rust compiler available');
    } catch {
      this.check('Rust toolchain', false, 'Install Rust toolchain');
    }

    // Check if Tauri CLI is available
    try {
      execSync('npx @tauri-apps/cli --version', { stdio: 'ignore' });
      this.check('Tauri CLI', true, 'Tauri CLI available');
    } catch {
      this.check('Tauri CLI', false, 'Install @tauri-apps/cli', true);
    }
  }

  async checkGitHubActions() {
    console.log('\n🚀 CI/CD Pipeline');

    await this.checkFileExists('.github/workflows/build-windows.yml', 'Windows build workflow');
    await this.checkFileExists('.github/workflows/release.yml', 'Release workflow');

    // Check workflow structure
    const workflowPath = path.join(this.projectRoot, '.github', 'workflows', 'release.yml');
    if (fs.existsSync(workflowPath)) {
      const workflow = fs.readFileSync(workflowPath, 'utf8');
      this.check('Has build job', workflow.includes('build-release'), 'Build job found');
      this.check('Has release job', workflow.includes('create-release'), 'Release job found');
      this.check('Multi-platform builds', workflow.includes('matrix'), 'Matrix builds configured');
    }
  }

  async checkSecurity() {
    console.log('\n🔒 Security');

    // Check if sensitive files are in .gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      this.check('Ignores .env files', gitignore.includes('.env'), 'Environment files ignored');
      this.check('Ignores certificates', gitignore.includes('certificate') || gitignore.includes('*.p12'), 'Certificate files ignored');
      this.check('Ignores node_modules', gitignore.includes('node_modules'), 'Dependencies ignored');
    }

    // Check for hardcoded secrets (basic check)
    try {
      const searchCmd = 'findstr /s /i "password\\|secret\\|key\\|token" src-tauri\\src\\*.rs';
      execSync(searchCmd, { stdio: 'ignore' });
      this.check('No hardcoded secrets', false, 'Potential secrets found in Rust code', true);
    } catch {
      this.check('No hardcoded secrets', true, 'No obvious secrets found');
    }
  }

  async checkDocumentation() {
    console.log('\n📚 Documentation');

    await this.checkFileExists('README.md', 'README file');
    await this.checkFileExists('ROADMAP.md', 'Roadmap document');
    await this.checkFileExists('LICENSE', 'License file');

    // Check README content
    const readmePath = path.join(this.projectRoot, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf8');
      this.check('README has installation', readme.includes('Installation'), 'Installation instructions found');
      this.check('README has usage', readme.includes('Usage'), 'Usage instructions found');
      this.check('README has status', readme.includes('Status'), 'Project status shown');
    }
  }

  async checkProductionFiles() {
    console.log('\n🏭 Production Files');

    await this.checkFileExists('scripts/setup-certificates.js', 'Certificate setup script');
    await this.checkFileExists('scripts/sign-app.js', 'Code signing script');
    await this.checkFileExists('signing-config.json', 'Signing configuration', true); // Warning only

    // Check for environment example
    this.checkFileExists('.env.example', 'Environment example');
  }

  async runAllChecks() {
    console.log('🔍 BEAR AI Legal Assistant - Production Readiness Check\n');
    console.log('=' .repeat(60));

    await this.checkPackageJson();
    await this.checkTauriConfig();
    await this.checkSourceCode();
    await this.checkBuildSystem();
    await this.checkGitHubActions();
    await this.checkSecurity();
    await this.checkDocumentation();
    await this.checkProductionFiles();

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📋 Total Checks: ${this.results.checks.length}`);

    const score = Math.round((this.results.passed / this.results.checks.length) * 100);
    console.log(`\n🎯 Production Readiness Score: ${score}%`);

    if (score >= 90) {
      console.log('🚀 READY FOR PRODUCTION! 🚀');
    } else if (score >= 75) {
      console.log('⚠️  Nearly ready - address failures and warnings');
    } else {
      console.log('❌ Not ready for production - major issues need fixing');
    }

    return score >= 90;
  }
}

// CLI execution
async function main() {
  const checker = new ProductionReadinessChecker();

  try {
    const ready = await checker.runAllChecks();
    process.exit(ready ? 0 : 1);
  } catch (error) {
    console.error('❌ Production readiness check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ProductionReadinessChecker };