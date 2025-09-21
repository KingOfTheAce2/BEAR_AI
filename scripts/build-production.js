#!/usr/bin/env node

/**
 * Production Build Script for BEAR AI Legal Assistant
 * Optimizes build configuration for cross-platform releases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TAURI_DIR = path.join(PROJECT_ROOT, 'src-tauri');
const RUN_TAURI_SCRIPT = path.join('scripts', 'run-tauri-build.js');

// Build configuration
const BUILD_CONFIG = {
  platforms: ['windows', 'macos', 'linux'],
  targets: {
    windows: ['x86_64-pc-windows-msvc'],
    macos: ['x86_64-apple-darwin', 'aarch64-apple-darwin'],
    linux: ['x86_64-unknown-linux-gnu']
  },
  bundles: {
    windows: ['msi', 'nsis'],
    macos: ['dmg', 'app'],
    linux: ['deb', 'rpm', 'appimage']
  }
};

class ProductionBuilder {
  constructor() {
    this.startTime = Date.now();
    this.buildResults = {};
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateEnvironment() {
    this.log('Validating build environment...');

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      if (!nodeVersion.match(/^v(16|18|20|21)\./)) {
        throw new Error(`Unsupported Node.js version: ${nodeVersion}. Required: >= 16.0.0`);
      }

      // Check Rust toolchain
      execSync('rustc --version', { stdio: 'pipe' });
      execSync('cargo --version', { stdio: 'pipe' });

      // Check Tauri CLI
      execSync('npx tauri --version', { cwd: PROJECT_ROOT, stdio: 'pipe' });

      // Validate package.json
      const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
      if (!packageJson.scripts['tauri:build']) {
        throw new Error('Missing tauri:build script in package.json');
      }

      this.log('Environment validation successful', 'success');
      return true;
    } catch (error) {
      this.log(`Environment validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async optimizeFrontend() {
    this.log('Optimizing frontend build...');

    try {
      // Clean previous builds
      if (fs.existsSync(path.join(PROJECT_ROOT, 'build'))) {
        execSync('rm -rf build', { cwd: PROJECT_ROOT });
      }

      // Build with optimizations
      execSync('npm run build:unified', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          GENERATE_SOURCEMAP: 'false',
          INLINE_RUNTIME_CHUNK: 'false'
        }
      });

      // Analyze bundle size
      const buildStats = this.analyzeBundleSize();
      this.log(`Frontend build completed. Total size: ${buildStats.totalSize}MB`, 'success');

      return buildStats;
    } catch (error) {
      this.log(`Frontend optimization failed: ${error.message}`, 'error');
      throw error;
    }
  }

  analyzeBundleSize() {
    const buildDir = path.join(PROJECT_ROOT, 'build');
    let totalSize = 0;

    const analyzeDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          analyzeDir(filePath);
        } else {
          totalSize += stats.size;
        }
      });
    };

    analyzeDir(buildDir);
    return {
      totalSize: (totalSize / (1024 * 1024)).toFixed(2),
      files: fs.readdirSync(path.join(buildDir, 'static', 'js')).filter(f => f.endsWith('.js')).length
    };
  }

  async buildTauri(target = null, bundle = null) {
    this.log(`Building Tauri application${target ? ` for ${target}` : ''}...`);

    try {
      let buildCommand = `node ${RUN_TAURI_SCRIPT}`;

      if (target) {
        buildCommand += ` --target ${target}`;
      }

      if (bundle) {
        buildCommand += ` --bundles ${bundle}`;
      }

      const buildEnv = {
        ...process.env,
        CARGO_PROFILE_RELEASE_LTO: 'fat',
        CARGO_PROFILE_RELEASE_CODEGEN_UNITS: '1',
        CARGO_PROFILE_RELEASE_PANIC: 'abort',
        CARGO_PROFILE_RELEASE_OPT_LEVEL: 's',
        CARGO_PROFILE_RELEASE_STRIP: 'true'
      };

      execSync(buildCommand, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: buildEnv,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      this.log(`Tauri build completed${target ? ` for ${target}` : ''}`, 'success');
      return true;
    } catch (error) {
      this.log(`Tauri build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async buildForPlatform(platform) {
    this.log(`Building for platform: ${platform}`);

    const targets = BUILD_CONFIG.targets[platform] || [];
    const bundles = BUILD_CONFIG.bundles[platform] || [];

    for (const target of targets) {
      try {
        await this.buildTauri(target, bundles.join(','));
        this.buildResults[`${platform}-${target}`] = 'success';
      } catch (error) {
        this.buildResults[`${platform}-${target}`] = 'failed';
        this.log(`Build failed for ${platform}-${target}: ${error.message}`, 'error');
      }
    }
  }

  async buildAllPlatforms() {
    this.log('Starting cross-platform builds...');

    for (const platform of BUILD_CONFIG.platforms) {
      await this.buildForPlatform(platform);
    }
  }

  async generateBuildReport() {
    const buildTime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
    const targetDir = path.join(TAURI_DIR, 'target', 'release');

    const report = {
      timestamp: new Date().toISOString(),
      buildTime: `${buildTime} minutes`,
      results: this.buildResults,
      artifacts: {},
      summary: {
        total: Object.keys(this.buildResults).length,
        successful: Object.values(this.buildResults).filter(r => r === 'success').length,
        failed: Object.values(this.buildResults).filter(r => r === 'failed').length
      }
    };

    // Analyze build artifacts
    if (fs.existsSync(targetDir)) {
      const bundleDir = path.join(targetDir, 'bundle');
      if (fs.existsSync(bundleDir)) {
        report.artifacts = this.analyzeBuildArtifacts(bundleDir);
      }
    }

    // Save report
    const reportsDir = path.join(PROJECT_ROOT, 'build-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `build-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Build report saved to: ${reportPath}`, 'success');
    this.log(`Build completed in ${buildTime} minutes`, 'success');
    this.log(`Success rate: ${report.summary.successful}/${report.summary.total}`, 'success');

    return report;
  }

  analyzeBuildArtifacts(bundleDir) {
    const artifacts = {};

    const scanDir = (dir, platform) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      artifacts[platform] = files.map(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: `${(stats.size / (1024 * 1024)).toFixed(2)}MB`,
          path: filePath
        };
      });
    };

    // Scan platform-specific directories
    ['msi', 'nsis', 'dmg', 'deb', 'rpm', 'appimage'].forEach(platform => {
      scanDir(path.join(bundleDir, platform), platform);
    });

    return artifacts;
  }

  async run() {
    try {
      this.log('Starting BEAR AI Legal Assistant production build...');

      // Validate environment
      const envValid = await this.validateEnvironment();
      if (!envValid) {
        throw new Error('Environment validation failed');
      }

      // Optimize frontend
      await this.optimizeFrontend();

      // Build for all platforms
      await this.buildAllPlatforms();

      // Generate report
      const report = await this.generateBuildReport();

      if (report.summary.failed > 0) {
        this.log('Build completed with some failures. Check the report for details.', 'error');
        process.exit(1);
      } else {
        this.log('All builds completed successfully!', 'success');
        process.exit(0);
      }

    } catch (error) {
      this.log(`Build process failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const builder = new ProductionBuilder();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
BEAR AI Legal Assistant Production Build Script

Usage:
  node build-production.js [options]

Options:
  --help, -h          Show this help message
  --platform <name>   Build for specific platform (windows, macos, linux)
  --target <target>   Build for specific target
  --validate-only     Only validate environment

Examples:
  node build-production.js
  node build-production.js --platform windows
  node build-production.js --validate-only
    `);
    process.exit(0);
  }

  if (args.includes('--validate-only')) {
    builder.validateEnvironment().then(valid => {
      process.exit(valid ? 0 : 1);
    });
  } else if (args.includes('--platform')) {
    const platformIndex = args.indexOf('--platform');
    const platform = args[platformIndex + 1];
    if (!BUILD_CONFIG.platforms.includes(platform)) {
      console.error(`Invalid platform: ${platform}. Valid options: ${BUILD_CONFIG.platforms.join(', ')}`);
      process.exit(1);
    }
    builder.buildForPlatform(platform).then(() => {
      builder.generateBuildReport();
    });
  } else {
    builder.run();
  }
}