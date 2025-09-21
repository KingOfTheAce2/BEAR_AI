#!/usr/bin/env node

/**
 * Certificate Setup Script for BEAR AI Legal Assistant
 * Handles code signing certificate management across platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class CertificateManager {
  constructor() {
    this.platform = process.platform;
    this.verbose = process.argv.includes('--verbose');
    this.dryRun = process.argv.includes('--dry-run');
  }

  log(message) {
    if (this.verbose) {
      console.log(`[${new Date().toISOString()}] ${message}`);
    }
  }

  /**
   * Generate a self-signed certificate for development
   */
  async generateDevCertificate() {
    this.log('Generating development certificate...');

    const certDir = path.join(__dirname, '..', 'certificates', 'dev');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const keyPath = path.join(certDir, 'dev-key.pem');
    const certPath = path.join(certDir, 'dev-cert.pem');
    const p12Path = path.join(certDir, 'dev-cert.p12');

    try {
      // Generate private key
      const keyCmd = `openssl genrsa -out "${keyPath}" 2048`;
      if (!this.dryRun) {
        execSync(keyCmd, { stdio: 'inherit' });
      }

      // Generate certificate
      const certCmd = [
        'openssl', 'req', '-new', '-x509',
        '-key', `"${keyPath}"`,
        '-out', `"${certPath}"`,
        '-days', '365',
        '-subj', '"/C=US/ST=CA/L=San Francisco/O=BEAR AI Dev/CN=BEAR AI Legal Assistant Dev"'
      ].join(' ');

      if (!this.dryRun) {
        execSync(certCmd, { stdio: 'inherit' });
      }

      // Convert to P12 format for Windows
      const p12Cmd = [
        'openssl', 'pkcs12', '-export',
        '-out', `"${p12Path}"`,
        '-inkey', `"${keyPath}"`,
        '-in', `"${certPath}"`,
        '-passout', 'pass:dev123'
      ].join(' ');

      if (!this.dryRun) {
        execSync(p12Cmd, { stdio: 'inherit' });
      }

      this.log('Development certificate generated successfully');
      return {
        key: keyPath,
        cert: certPath,
        p12: p12Path,
        password: 'dev123'
      };

    } catch (error) {
      console.error('Failed to generate development certificate:', error.message);
      throw error;
    }
  }

  /**
   * Setup Windows code signing certificate
   */
  async setupWindowsCertificate() {
    this.log('Setting up Windows code signing certificate...');

    const certData = process.env.WINDOWS_CERTIFICATE;
    const certPassword = process.env.WINDOWS_CERTIFICATE_PASSWORD;

    if (!certData) {
      throw new Error('WINDOWS_CERTIFICATE environment variable not set');
    }

    if (!certPassword) {
      throw new Error('WINDOWS_CERTIFICATE_PASSWORD environment variable not set');
    }

    try {
      // Decode base64 certificate
      const certBuffer = Buffer.from(certData, 'base64');
      const certPath = path.join(__dirname, '..', 'certificates', 'windows-cert.p12');

      if (!this.dryRun) {
        fs.writeFileSync(certPath, certBuffer);
      }

      // Import certificate into Windows certificate store
      const importCmd = [
        'powershell', '-Command',
        `"Import-PfxCertificate -FilePath '${certPath}' -CertStoreLocation Cert:\\CurrentUser\\My -Password (ConvertTo-SecureString -String '${certPassword}' -AsPlainText -Force)"`
      ].join(' ');

      if (!this.dryRun) {
        execSync(importCmd, { stdio: 'inherit' });
      }

      // Verify certificate installation
      const verifyCmd = [
        'powershell', '-Command',
        '"Get-ChildItem -Path Cert:\\CurrentUser\\My | Where-Object {$_.Subject -like \'*BEAR AI*\'}"'
      ].join(' ');

      if (!this.dryRun) {
        execSync(verifyCmd, { stdio: 'inherit' });
      }

      this.log('Windows certificate setup completed');
      return { path: certPath, installed: true };

    } catch (error) {
      console.error('Windows certificate setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup macOS code signing certificate
   */
  async setupMacOSCertificate() {
    this.log('Setting up macOS code signing certificate...');

    const certData = process.env.APPLE_CERTIFICATE;
    const certPassword = process.env.APPLE_CERTIFICATE_PASSWORD;

    if (!certData) {
      throw new Error('APPLE_CERTIFICATE environment variable not set');
    }

    if (!certPassword) {
      throw new Error('APPLE_CERTIFICATE_PASSWORD environment variable not set');
    }

    try {
      // Decode base64 certificate
      const certBuffer = Buffer.from(certData, 'base64');
      const certPath = path.join(__dirname, '..', 'certificates', 'apple-cert.p12');

      if (!this.dryRun) {
        fs.writeFileSync(certPath, certBuffer);
      }

      // Import certificate into keychain
      const importCmd = [
        'security', 'import', `"${certPath}"`,
        '-P', certPassword,
        '-k', '~/Library/Keychains/login.keychain',
        '-T', '/usr/bin/codesign'
      ].join(' ');

      if (!this.dryRun) {
        execSync(importCmd, { stdio: 'inherit' });
      }

      // Unlock keychain
      const unlockCmd = 'security unlock-keychain ~/Library/Keychains/login.keychain';
      if (!this.dryRun) {
        execSync(unlockCmd, { stdio: 'inherit' });
      }

      // Verify certificate installation
      const verifyCmd = 'security find-identity -v -p codesigning';
      if (!this.dryRun) {
        execSync(verifyCmd, { stdio: 'inherit' });
      }

      this.log('macOS certificate setup completed');
      return { path: certPath, installed: true };

    } catch (error) {
      console.error('macOS certificate setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Linux GPG signing key
   */
  async setupLinuxGPGKey() {
    this.log('Setting up Linux GPG signing key...');

    const gpgKey = process.env.GPG_SIGNING_KEY;
    const gpgPassphrase = process.env.GPG_PASSPHRASE;

    if (!gpgKey) {
      this.log('No GPG key provided, generating development key...');
      return this.generateDevGPGKey();
    }

    try {
      // Import GPG key
      const keyBuffer = Buffer.from(gpgKey, 'base64');
      const keyPath = path.join(__dirname, '..', 'certificates', 'gpg-key.asc');

      if (!this.dryRun) {
        fs.writeFileSync(keyPath, keyBuffer);
      }

      // Import the key
      const importCmd = `gpg --import "${keyPath}"`;
      if (!this.dryRun) {
        execSync(importCmd, { stdio: 'inherit' });
      }

      // List imported keys
      const listCmd = 'gpg --list-secret-keys';
      if (!this.dryRun) {
        execSync(listCmd, { stdio: 'inherit' });
      }

      this.log('Linux GPG key setup completed');
      return { path: keyPath, installed: true };

    } catch (error) {
      console.error('Linux GPG key setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate a development GPG key
   */
  async generateDevGPGKey() {
    this.log('Generating development GPG key...');

    const keyConfig = `
Key-Type: RSA
Key-Length: 2048
Subkey-Type: RSA
Subkey-Length: 2048
Name-Real: BEAR AI Development Team
Name-Email: dev@bear-ai.com
Expire-Date: 1y
Passphrase: dev123
%commit
%echo done
`;

    const configPath = path.join(__dirname, '..', 'certificates', 'gpg-config.txt');

    try {
      if (!this.dryRun) {
        fs.writeFileSync(configPath, keyConfig);

        // Generate key
        const generateCmd = `gpg --batch --generate-key "${configPath}"`;
        execSync(generateCmd, { stdio: 'inherit' });

        // Export public key
        const exportCmd = `gpg --armor --export dev@bear-ai.com > "${path.join(__dirname, '..', 'certificates', 'dev-public.asc')}"`;
        execSync(exportCmd, { stdio: 'inherit' });

        // Cleanup config file
        fs.unlinkSync(configPath);
      }

      this.log('Development GPG key generated successfully');
      return { generated: true, email: 'dev@bear-ai.com' };

    } catch (error) {
      console.error('Development GPG key generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate certificate setup
   */
  async validateSetup() {
    this.log('Validating certificate setup...');

    const results = {
      platform: this.platform,
      certificates: {},
      valid: true
    };

    try {
      switch (this.platform) {
        case 'win32':
          // Check if signtool is available
          try {
            execSync('signtool.exe /?', { stdio: 'ignore' });
            results.certificates.signtool = true;
          } catch {
            results.certificates.signtool = false;
            results.valid = false;
          }

          // Check for installed certificates
          try {
            const certCheck = 'powershell -Command "Get-ChildItem -Path Cert:\\CurrentUser\\My"';
            execSync(certCheck, { stdio: 'ignore' });
            results.certificates.installed = true;
          } catch {
            results.certificates.installed = false;
          }
          break;

        case 'darwin':
          // Check codesign availability
          try {
            execSync('codesign --version', { stdio: 'ignore' });
            results.certificates.codesign = true;
          } catch {
            results.certificates.codesign = false;
            results.valid = false;
          }

          // Check for signing identities
          try {
            execSync('security find-identity -v -p codesigning', { stdio: 'ignore' });
            results.certificates.identities = true;
          } catch {
            results.certificates.identities = false;
          }
          break;

        case 'linux':
          // Check GPG availability
          try {
            execSync('gpg --version', { stdio: 'ignore' });
            results.certificates.gpg = true;
          } catch {
            results.certificates.gpg = false;
            results.valid = false;
          }

          // Check for signing keys
          try {
            execSync('gpg --list-secret-keys', { stdio: 'ignore' });
            results.certificates.keys = true;
          } catch {
            results.certificates.keys = false;
          }
          break;
      }

      this.log(`Certificate validation: ${results.valid ? 'PASSED' : 'FAILED'}`);
      return results;

    } catch (error) {
      console.error('Certificate validation failed:', error.message);
      results.valid = false;
      results.error = error.message;
      return results;
    }
  }

  /**
   * Setup certificates for the current platform
   */
  async setupCertificates() {
    this.log(`Setting up certificates for ${this.platform}...`);

    try {
      let result;

      switch (this.platform) {
        case 'win32':
          result = await this.setupWindowsCertificate();
          break;
        case 'darwin':
          result = await this.setupMacOSCertificate();
          break;
        case 'linux':
          result = await this.setupLinuxGPGKey();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      // Validate setup
      const validation = await this.validateSetup();

      return {
        platform: this.platform,
        setup: result,
        validation: validation,
        success: validation.valid
      };

    } catch (error) {
      console.error('Certificate setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Clean up certificate files
   */
  async cleanup() {
    this.log('Cleaning up certificate files...');

    const certDir = path.join(__dirname, '..', 'certificates');

    if (fs.existsSync(certDir)) {
      const files = fs.readdirSync(certDir);

      for (const file of files) {
        if (file.includes('cert') || file.includes('key') || file.endsWith('.p12')) {
          const filePath = path.join(certDir, file);
          if (!this.dryRun) {
            fs.unlinkSync(filePath);
          }
          this.log(`Removed: ${file}`);
        }
      }
    }

    this.log('Certificate cleanup completed');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Certificate Setup Script for BEAR AI Legal Assistant');
    console.log('');
    console.log('Usage: node setup-certificates.js [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  setup     Setup certificates for current platform');
    console.log('  dev       Generate development certificates');
    console.log('  validate  Validate certificate setup');
    console.log('  cleanup   Clean up certificate files');
    console.log('');
    console.log('Options:');
    console.log('  --verbose    Enable verbose output');
    console.log('  --dry-run    Show what would be done without executing');
    console.log('  --help, -h   Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  WINDOWS_CERTIFICATE          Base64 encoded Windows certificate');
    console.log('  WINDOWS_CERTIFICATE_PASSWORD Password for Windows certificate');
    console.log('  APPLE_CERTIFICATE            Base64 encoded Apple certificate');
    console.log('  APPLE_CERTIFICATE_PASSWORD   Password for Apple certificate');
    console.log('  GPG_SIGNING_KEY              Base64 encoded GPG private key');
    console.log('  GPG_PASSPHRASE               GPG key passphrase');
    process.exit(0);
  }

  const command = args.find(arg => !arg.startsWith('--')) || 'setup';
  const manager = new CertificateManager();

  try {
    let result;

    switch (command) {
      case 'setup':
        result = await manager.setupCertificates();
        break;
      case 'dev':
        result = await manager.generateDevCertificate();
        break;
      case 'validate':
        result = await manager.validateSetup();
        break;
      case 'cleanup':
        await manager.cleanup();
        result = { success: true, message: 'Cleanup completed' };
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }

    if (result.success !== false) {
      console.log('✅ Certificate setup completed successfully');
      if (manager.verbose) {
        console.log(JSON.stringify(result, null, 2));
      }
      process.exit(0);
    } else {
      console.error('❌ Certificate setup failed');
      console.error(result.error || 'Unknown error');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Certificate setup error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CertificateManager };