#!/usr/bin/env node

/**
 * Cross-platform code signing script for BEAR AI Legal Assistant
 * Supports Windows, macOS, and Linux signing processes
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class CodeSigner {
  constructor() {
    this.platform = process.platform;
    this.config = this.loadConfig();
    this.verbose = process.argv.includes('--verbose');
  }

  loadConfig() {
    const configPath = path.join(__dirname, '..', 'signing-config.json');

    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Default configuration
    return {
      windows: {
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE || 'certificate.p12',
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
        timestampUrl: 'http://timestamp.sectigo.com',
        signTool: 'signtool.exe'
      },
      macos: {
        identity: process.env.APPLE_SIGNING_IDENTITY || 'Developer ID Application',
        certificateFile: process.env.APPLE_CERTIFICATE_FILE,
        certificatePassword: process.env.APPLE_CERTIFICATE_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
        appleId: process.env.APPLE_ID,
        applePassword: process.env.APPLE_PASSWORD,
        notarization: true
      },
      linux: {
        gpgKey: process.env.GPG_SIGNING_KEY,
        gpgPassphrase: process.env.GPG_PASSPHRASE
      }
    };
  }

  log(message) {
    if (this.verbose) {
      console.log(`[${new Date().toISOString()}] ${message}`);
    }
  }

  async signWindows(filePath) {
    this.log('Starting Windows code signing...');

    const config = this.config.windows;

    if (!config.certificatePassword) {
      throw new Error('Windows certificate password not provided');
    }

    try {
      // Import certificate if needed
      if (config.certificateFile && fs.existsSync(config.certificateFile)) {
        this.log('Importing Windows certificate...');
        const importCmd = `powershell -Command "Import-PfxCertificate -FilePath '${config.certificateFile}' -CertStoreLocation Cert:\\CurrentUser\\My -Password (ConvertTo-SecureString -String '${config.certificatePassword}' -AsPlainText -Force)"`;
        execSync(importCmd, { stdio: 'inherit' });
      }

      // Sign the file
      this.log(`Signing file: ${filePath}`);
      const signCmd = [
        config.signTool,
        'sign',
        '/fd', 'SHA256',
        '/tr', config.timestampUrl,
        '/td', 'SHA256',
        '/a', // Use best certificate automatically
        `"${filePath}"`
      ].join(' ');

      execSync(signCmd, { stdio: 'inherit' });

      // Verify signature
      const verifyCmd = `${config.signTool} verify /pa "${filePath}"`;
      execSync(verifyCmd, { stdio: 'inherit' });

      this.log('Windows signing completed successfully');
      return true;

    } catch (error) {
      console.error('Windows signing failed:', error.message);
      return false;
    }
  }

  async signMacOS(filePath) {
    this.log('Starting macOS code signing...');

    const config = this.config.macos;

    try {
      // Import certificate if provided
      if (config.certificateFile && config.certificatePassword) {
        this.log('Importing macOS certificate...');
        const importCmd = `security import "${config.certificateFile}" -P "${config.certificatePassword}" -k ~/Library/Keychains/login.keychain -T /usr/bin/codesign`;
        execSync(importCmd, { stdio: 'inherit' });
      }

      // Sign the application
      this.log(`Signing application: ${filePath}`);
      const signCmd = [
        'codesign',
        '--force',
        '--sign', `"${config.identity}"`,
        '--verbose',
        '--timestamp',
        '--options', 'runtime',
        `"${filePath}"`
      ].join(' ');

      execSync(signCmd, { stdio: 'inherit' });

      // Verify signature
      const verifyCmd = `codesign --verify --verbose "${filePath}"`;
      execSync(verifyCmd, { stdio: 'inherit' });

      // Notarize if enabled and credentials are available
      if (config.notarization && config.appleId && config.applePassword && config.teamId) {
        await this.notarizeMacOS(filePath, config);
      }

      this.log('macOS signing completed successfully');
      return true;

    } catch (error) {
      console.error('macOS signing failed:', error.message);
      return false;
    }
  }

  async notarizeMacOS(filePath, config) {
    this.log('Starting macOS notarization...');

    try {
      // Create a zip file for notarization
      const zipPath = filePath.replace(/\.(app|dmg)$/, '-notarization.zip');
      const zipCmd = `ditto -c -k --keepParent "${filePath}" "${zipPath}"`;
      execSync(zipCmd, { stdio: 'inherit' });

      // Submit for notarization
      this.log('Submitting for notarization...');
      const notarizeCmd = [
        'xcrun', 'notarytool', 'submit',
        `"${zipPath}"`,
        '--apple-id', config.appleId,
        '--password', config.applePassword,
        '--team-id', config.teamId,
        '--wait'
      ].join(' ');

      execSync(notarizeCmd, { stdio: 'inherit' });

      // Staple the notarization
      if (filePath.endsWith('.app') || filePath.endsWith('.dmg')) {
        this.log('Stapling notarization...');
        const stapleCmd = `xcrun stapler staple "${filePath}"`;
        execSync(stapleCmd, { stdio: 'inherit' });
      }

      // Clean up zip file
      fs.unlinkSync(zipPath);

      this.log('macOS notarization completed successfully');

    } catch (error) {
      console.error('macOS notarization failed:', error.message);
      throw error;
    }
  }

  async signLinux(filePath) {
    this.log('Starting Linux package signing...');

    const config = this.config.linux;

    if (!config.gpgKey) {
      this.log('No GPG key configured for Linux signing, skipping...');
      return true;
    }

    try {
      // Import GPG key if needed
      if (fs.existsSync(config.gpgKey)) {
        this.log('Importing GPG key...');
        const importCmd = `gpg --import "${config.gpgKey}"`;
        execSync(importCmd, { stdio: 'inherit' });
      }

      // Sign the package
      this.log(`Signing package: ${filePath}`);

      const signatureFile = `${filePath}.sig`;
      const signCmd = [
        'gpg',
        '--detach-sign',
        '--armor',
        '--output', `"${signatureFile}"`,
        `"${filePath}"`
      ].join(' ');

      if (config.gpgPassphrase) {
        process.env.GNUPGHOME = process.env.GNUPGHOME || path.join(process.env.HOME, '.gnupg');
        execSync(`echo "${config.gpgPassphrase}" | ${signCmd} --batch --yes --pinentry-mode loopback --passphrase-fd 0`, { stdio: 'inherit' });
      } else {
        execSync(signCmd, { stdio: 'inherit' });
      }

      // Verify signature
      const verifyCmd = `gpg --verify "${signatureFile}" "${filePath}"`;
      execSync(verifyCmd, { stdio: 'inherit' });

      this.log('Linux signing completed successfully');
      return true;

    } catch (error) {
      console.error('Linux signing failed:', error.message);
      return false;
    }
  }

  async generateChecksums(filePath) {
    this.log('Generating checksums...');

    const algorithms = ['sha256', 'sha512'];
    const checksums = {};

    for (const algorithm of algorithms) {
      const hash = crypto.createHash(algorithm);
      const data = fs.readFileSync(filePath);
      hash.update(data);
      checksums[algorithm] = hash.digest('hex');
    }

    // Write checksums to file
    const checksumFile = `${filePath}.checksums`;
    const checksumContent = algorithms
      .map(alg => `${checksums[alg]}  ${path.basename(filePath)}`)
      .join('\n');

    fs.writeFileSync(checksumFile, checksumContent);

    this.log(`Checksums written to: ${checksumFile}`);
    return checksums;
  }

  async signFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    this.log(`Starting code signing for: ${filePath}`);
    this.log(`Platform: ${this.platform}`);

    let success = false;

    switch (this.platform) {
      case 'win32':
        success = await this.signWindows(filePath);
        break;
      case 'darwin':
        success = await this.signMacOS(filePath);
        break;
      case 'linux':
        success = await this.signLinux(filePath);
        break;
      default:
        console.warn(`Unsupported platform: ${this.platform}`);
        success = true; // Don't fail on unsupported platforms
    }

    if (success) {
      // Generate checksums for all platforms
      await this.generateChecksums(filePath);
    }

    return success;
  }

  async signDirectory(dirPath) {
    this.log(`Scanning directory for signable files: ${dirPath}`);

    const signableExtensions = {
      win32: ['.exe', '.msi', '.msix'],
      darwin: ['.app', '.dmg', '.pkg'],
      linux: ['.AppImage', '.deb', '.rpm', '.snap']
    };

    const extensions = signableExtensions[this.platform] || [];
    const results = [];

    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    };

    scanDir(dirPath);

    this.log(`Found ${results.length} signable files`);

    let allSuccessful = true;
    for (const filePath of results) {
      const success = await this.signFile(filePath);
      if (!success) {
        allSuccessful = false;
      }
    }

    return allSuccessful;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node sign-app.js <file-or-directory-path> [--verbose]');
    console.log('');
    console.log('Environment variables:');
    console.log('  Windows: WINDOWS_CERTIFICATE_PASSWORD');
    console.log('  macOS: APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID');
    console.log('  Linux: GPG_SIGNING_KEY, GPG_PASSPHRASE');
    process.exit(1);
  }

  const targetPath = args.find(arg => !arg.startsWith('--'));

  if (!targetPath) {
    console.error('Error: No target path specified');
    process.exit(1);
  }

  const signer = new CodeSigner();

  try {
    let success;
    const stat = fs.statSync(targetPath);

    if (stat.isDirectory()) {
      success = await signer.signDirectory(targetPath);
    } else {
      success = await signer.signFile(targetPath);
    }

    if (success) {
      console.log('✅ Code signing completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Code signing failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Code signing error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CodeSigner };