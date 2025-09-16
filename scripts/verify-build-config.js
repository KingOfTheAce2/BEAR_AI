#!/usr/bin/env node

/**
 * Build Configuration Verification Script for BEAR AI Legal Assistant
 * Validates all build configurations and dependencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

class BuildConfigVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addResult(message, type) {
    if (type === 'error') {
      this.errors.push(message);
      this.log(message, 'error');
    } else if (type === 'warning') {
      this.warnings.push(message);
      this.log(message, 'warning');
    } else {
      this.passed.push(message);
      this.log(message, 'success');
    }
  }

  checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.addResult(`${description} exists`, 'success');
      return true;
    } else {
      this.addResult(`${description} missing: ${filePath}`, 'error');
      return false;
    }
  }

  checkTauriConfig() {
    this.log('Checking Tauri configuration...');

    const configPath = path.join(PROJECT_ROOT, 'src-tauri', 'tauri.conf.json');
    if (!this.checkFileExists(configPath, 'Tauri configuration')) return;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Check required fields
      const requiredFields = ['productName', 'version', 'identifier'];
      requiredFields.forEach(field => {
        if (config[field]) {
          this.addResult(`Tauri config has ${field}`, 'success');
        } else {
          this.addResult(`Tauri config missing ${field}`, 'error');
        }
      });

      // Check bundle configuration
      if (config.bundle) {
        if (config.bundle.active) {
          this.addResult('Bundle configuration is active', 'success');
        } else {
          this.addResult('Bundle configuration is not active', 'warning');
        }

        // Check icons
        if (config.bundle.icon && config.bundle.icon.length > 0) {
          this.addResult('Bundle icons configured', 'success');

          // Verify icon files exist
          config.bundle.icon.forEach(iconPath => {
            const fullIconPath = path.join(PROJECT_ROOT, 'src-tauri', iconPath);
            if (!fs.existsSync(fullIconPath)) {
              this.addResult(`Icon file missing: ${iconPath}`, 'warning');
            }
          });
        } else {
          this.addResult('Bundle icons not configured', 'error');
        }

        // Check platform-specific configurations
        ['windows', 'macOS', 'linux'].forEach(platform => {
          if (config.bundle[platform]) {
            this.addResult(`${platform} bundle configuration present`, 'success');
          } else {
            this.addResult(`${platform} bundle configuration missing`, 'warning');
          }
        });
      } else {
        this.addResult('Bundle configuration missing', 'error');
      }

      // Check security configuration
      if (config.app && config.app.security) {
        if (config.app.security.csp) {
          this.addResult('CSP security policy configured', 'success');
        } else {
          this.addResult('CSP security policy missing', 'warning');
        }
      } else {
        this.addResult('Security configuration missing', 'warning');
      }

      // Check updater configuration
      if (config.plugins && config.plugins.updater) {
        if (config.plugins.updater.active) {
          this.addResult('Auto-updater is enabled', 'success');
        } else {
          this.addResult('Auto-updater is disabled', 'warning');
        }

        if (config.plugins.updater.pubkey) {
          this.addResult('Updater public key configured', 'success');
        } else {
          this.addResult('Updater public key missing', 'warning');
        }
      }

    } catch (error) {
      this.addResult(`Error parsing Tauri config: ${error.message}`, 'error');
    }
  }

  checkCargoConfig() {
    this.log('Checking Cargo configuration...');

    const cargoPath = path.join(PROJECT_ROOT, 'src-tauri', 'Cargo.toml');
    if (!this.checkFileExists(cargoPath, 'Cargo.toml')) return;

    try {
      const cargoContent = fs.readFileSync(cargoPath, 'utf8');

      // Check for required dependencies
      const requiredDeps = ['tauri', 'serde', 'serde_json'];
      requiredDeps.forEach(dep => {
        if (cargoContent.includes(`${dep} =`) || cargoContent.includes(`"${dep}"`)) {
          this.addResult(`Cargo dependency ${dep} found`, 'success');
        } else {
          this.addResult(`Cargo dependency ${dep} missing`, 'error');
        }
      });

      // Check for build optimizations
      if (cargoContent.includes('[profile.release]')) {
        this.addResult('Release profile configuration found', 'success');

        const optimizations = ['lto = true', 'opt-level', 'codegen-units = 1'];
        optimizations.forEach(opt => {
          if (cargoContent.includes(opt)) {
            this.addResult(`Build optimization: ${opt}`, 'success');
          } else {
            this.addResult(`Missing optimization: ${opt}`, 'warning');
          }
        });
      } else {
        this.addResult('Release profile not configured', 'warning');
      }

      // Check for tauri-build dependency
      if (cargoContent.includes('tauri-build')) {
        this.addResult('Tauri build dependency found', 'success');
      } else {
        this.addResult('Tauri build dependency missing', 'error');
      }

    } catch (error) {
      this.addResult(`Error reading Cargo.toml: ${error.message}`, 'error');
    }

    // Check for Cargo config directory
    const cargoConfigPath = path.join(PROJECT_ROOT, 'src-tauri', '.cargo', 'config.toml');
    if (this.checkFileExists(cargoConfigPath, 'Cargo build configuration')) {
      try {
        const cargoConfigContent = fs.readFileSync(cargoConfigPath, 'utf8');
        if (cargoConfigContent.includes('[target.')) {
          this.addResult('Platform-specific build configurations found', 'success');
        }
      } catch (error) {
        this.addResult(`Error reading Cargo config: ${error.message}`, 'warning');
      }
    }
  }

  checkPackageJson() {
    this.log('Checking package.json configuration...');

    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    if (!this.checkFileExists(packagePath, 'package.json')) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check for required scripts
      const requiredScripts = ['build', 'tauri:build', 'tauri:dev'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addResult(`NPM script ${script} found`, 'success');
        } else {
          this.addResult(`NPM script ${script} missing`, 'error');
        }
      });

      // Check for Tauri dependencies
      const tauriDeps = ['@tauri-apps/api', '@tauri-apps/cli'];
      tauriDeps.forEach(dep => {
        if ((packageJson.dependencies && packageJson.dependencies[dep]) ||
            (packageJson.devDependencies && packageJson.devDependencies[dep])) {
          this.addResult(`Package dependency ${dep} found`, 'success');
        } else {
          this.addResult(`Package dependency ${dep} missing`, 'warning');
        }
      });

      // Check for production build scripts
      const productionScripts = ['tauri:build:production', 'build:complete'];
      productionScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addResult(`Production script ${script} found`, 'success');
        } else {
          this.addResult(`Production script ${script} missing`, 'warning');
        }
      });

    } catch (error) {
      this.addResult(`Error parsing package.json: ${error.message}`, 'error');
    }
  }

  checkBuildScripts() {
    this.log('Checking build scripts...');

    const scripts = [
      { path: 'scripts/build-production.js', description: 'Production build script' },
      { path: 'scripts/optimize-build.sh', description: 'Build optimization script' },
      { path: 'src-tauri/build.rs', description: 'Rust build script' }
    ];

    scripts.forEach(({ path: scriptPath, description }) => {
      const fullPath = path.join(PROJECT_ROOT, scriptPath);
      this.checkFileExists(fullPath, description);
    });

    // Check for installer hooks
    const hookPath = path.join(PROJECT_ROOT, 'src-tauri', 'installer-hooks');
    if (fs.existsSync(hookPath)) {
      this.addResult('Installer hooks directory found', 'success');
    } else {
      this.addResult('Installer hooks directory missing', 'warning');
    }
  }

  checkIcons() {
    this.log('Checking application icons...');

    const iconDir = path.join(PROJECT_ROOT, 'src-tauri', 'icons');
    if (!fs.existsSync(iconDir)) {
      this.addResult('Icons directory missing', 'error');
      return;
    }

    const requiredIcons = [
      '32x32.png',
      '128x128.png',
      '128x128@2x.png',
      'icon.ico',
      'icon.icns'
    ];

    requiredIcons.forEach(icon => {
      const iconPath = path.join(iconDir, icon);
      if (fs.existsSync(iconPath)) {
        this.addResult(`Icon ${icon} found`, 'success');
      } else {
        this.addResult(`Icon ${icon} missing`, 'warning');
      }
    });
  }

  checkSystemRequirements() {
    this.log('Checking system requirements...');

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
      if (majorVersion >= 16) {
        this.addResult(`Node.js version ${nodeVersion} is supported`, 'success');
      } else {
        this.addResult(`Node.js version ${nodeVersion} is too old (require >= 16)`, 'error');
      }

      // Check for Rust
      try {
        const rustVersion = execSync('rustc --version', { encoding: 'utf8', stdio: 'pipe' });
        this.addResult(`Rust compiler found: ${rustVersion.trim()}`, 'success');
      } catch (error) {
        this.addResult('Rust compiler not found', 'error');
      }

      // Check for Cargo
      try {
        const cargoVersion = execSync('cargo --version', { encoding: 'utf8', stdio: 'pipe' });
        this.addResult(`Cargo found: ${cargoVersion.trim()}`, 'success');
      } catch (error) {
        this.addResult('Cargo not found', 'error');
      }

      // Check for Tauri CLI
      try {
        const tauriVersion = execSync('npx tauri --version', {
          encoding: 'utf8',
          stdio: 'pipe',
          cwd: PROJECT_ROOT
        });
        this.addResult(`Tauri CLI found: ${tauriVersion.trim()}`, 'success');
      } catch (error) {
        this.addResult('Tauri CLI not found or not working', 'error');
      }

    } catch (error) {
      this.addResult(`Error checking system requirements: ${error.message}`, 'error');
    }
  }

  checkCapabilities() {
    this.log('Checking capabilities configuration...');

    const capabilitiesDir = path.join(PROJECT_ROOT, 'src-tauri', 'capabilities');
    if (fs.existsSync(capabilitiesDir)) {
      this.addResult('Capabilities directory found', 'success');

      // Check for legal compliance capabilities
      const legalCapPath = path.join(capabilitiesDir, 'legal-compliance.json');
      if (fs.existsSync(legalCapPath)) {
        this.addResult('Legal compliance capabilities configured', 'success');
      } else {
        this.addResult('Legal compliance capabilities missing', 'warning');
      }
    } else {
      this.addResult('Capabilities directory missing', 'warning');
    }

    // Check for entitlements (macOS)
    const entitlementsPath = path.join(PROJECT_ROOT, 'src-tauri', 'entitlements.plist');
    if (fs.existsSync(entitlementsPath)) {
      this.addResult('macOS entitlements file found', 'success');
    } else {
      this.addResult('macOS entitlements file missing', 'warning');
    }
  }

  generateReport() {
    this.log('Generating verification report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.passed.length + this.warnings.length + this.errors.length,
        passed: this.passed.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        success_rate: (this.passed.length / (this.passed.length + this.warnings.length + this.errors.length) * 100).toFixed(2)
      },
      results: {
        passed: this.passed,
        warnings: this.warnings,
        errors: this.errors
      }
    };

    // Save report
    const reportsDir = path.join(PROJECT_ROOT, 'build-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `verification-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Verification report saved to: ${reportPath}`);
    return report;
  }

  run() {
    this.log('Starting BEAR AI build configuration verification...');

    // Run all checks
    this.checkSystemRequirements();
    this.checkPackageJson();
    this.checkTauriConfig();
    this.checkCargoConfig();
    this.checkBuildScripts();
    this.checkIcons();
    this.checkCapabilities();

    // Generate report
    const report = this.generateReport();

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`❌ Errors: ${report.summary.errors}`);
    console.log(`📈 Success Rate: ${report.summary.success_rate}%`);

    if (report.summary.errors > 0) {
      console.log('\n❌ Build configuration has errors that must be fixed.');
      process.exit(1);
    } else if (report.summary.warnings > 0) {
      console.log('\n⚠️  Build configuration has warnings but should work.');
      process.exit(0);
    } else {
      console.log('\n✅ Build configuration is optimal!');
      process.exit(0);
    }
  }
}

// CLI handling
if (require.main === module) {
  const verifier = new BuildConfigVerifier();
  verifier.run();
}

module.exports = BuildConfigVerifier;