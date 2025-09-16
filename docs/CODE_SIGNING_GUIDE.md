# BEAR AI Code Signing Guide

## Overview

This guide provides comprehensive instructions for setting up code signing for BEAR AI cross-platform releases. Code signing is essential for:

- Building user trust and avoiding security warnings
- Meeting platform requirements for distribution
- Ensuring application integrity and authenticity
- Enabling automatic updates and app store distribution

## Platform Requirements Summary

| Platform | Certificate Type | Required For | Cost | Validity |
|----------|------------------|--------------|------|----------|
| **Windows** | Code Signing (OV/EV) | Executable signing | $200-500/year | 1-3 years |
| **macOS** | Developer ID Application | Outside App Store | $99/year | 1 year |
| **macOS** | Mac App Store | App Store distribution | $99/year | 1 year |
| **Linux** | GPG Key | Package signing | Free | 1-2 years (recommended) |

## Quick Start

1. **Choose your signing method** based on your distribution requirements
2. **Obtain certificates** from appropriate certificate authorities
3. **Configure environment variables** in your CI/CD pipeline
4. **Test signing locally** before deploying to production
5. **Set up automated signing** in GitHub Actions

## Windows Code Signing

### Certificate Types

#### Organization Validation (OV) Certificates
- **Cost**: $200-400/year
- **Validation**: Business verification required
- **SmartScreen**: Will show warnings initially until reputation builds
- **Storage**: Must be stored on HSM for certificates issued after June 1, 2023

#### Extended Validation (EV) Certificates
- **Cost**: $400-600/year
- **Validation**: Rigorous business verification
- **SmartScreen**: Immediate reputation, no warnings
- **Storage**: Always required to be on HSM

### Modern Signing Methods

#### 1. Azure Key Vault (Recommended)

**Setup:**
```bash
# Install Azure SignTool
dotnet tool install --global AzureSignTool

# Configure environment variables
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_CLIENT_ID=your-app-registration-client-id
AZURE_CLIENT_SECRET=your-app-registration-secret
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CERTIFICATE_NAME=your-certificate-name
```

**Tauri Configuration:**
```json
{
  "bundle": {
    "windows": {
      "signCommand": "azuresigntool sign -kvu \"${AZURE_KEY_VAULT_URL}\" -kvi \"${AZURE_CLIENT_ID}\" -kvs \"${AZURE_CLIENT_SECRET}\" -kvc \"${AZURE_CERTIFICATE_NAME}\" -tr http://timestamp.sectigo.com -td sha256 \"{{path}}\""
    }
  }
}
```

#### 2. Hardware Security Module (HSM)

**Setup:**
```bash
# Install HSM drivers (vendor-specific)
# Configure HSM connection

# Environment variables
WINDOWS_HSM_CONTAINER=your-container-name
WINDOWS_HSM_KEY=your-key-name
WINDOWS_HSM_PIN=your-hsm-pin
```

**Tauri Configuration:**
```json
{
  "bundle": {
    "windows": {
      "signCommand": "signtool sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /csp \"eToken Base Cryptographic Provider\" /k \"[{{container_name}}]={{key_name}}\" \"{{path}}\""
    }
  }
}
```

#### 3. Traditional Certificate (Legacy)

**Note**: Only works for OV certificates issued before June 1, 2023

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "A1B1A2B2A3B3A4B4A5B5A6B6A7B7A8B8A9B9A0B0",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.sectigo.com"
    }
  }
}
```

### GitHub Actions Setup

```yaml
- name: Setup Windows Code Signing
  if: matrix.platform == 'windows-latest'
  shell: powershell
  run: |
    # For traditional certificates (legacy)
    $cert = [Convert]::FromBase64String('${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}')
    [IO.File]::WriteAllBytes('certificate.pfx', $cert)
    Import-PfxCertificate -FilePath certificate.pfx -CertStoreLocation Cert:\LocalMachine\My -Password (ConvertTo-SecureString '${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}' -AsPlainText -Force)
    Remove-Item certificate.pfx

- name: Build and Sign Windows
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    WINDOWS_CERTIFICATE_THUMBPRINT: ${{ secrets.WINDOWS_CERTIFICATE_THUMBPRINT }}
    # Or for Azure Key Vault
    AZURE_KEY_VAULT_URL: ${{ secrets.AZURE_KEY_VAULT_URL }}
    AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    AZURE_CERTIFICATE_NAME: ${{ secrets.AZURE_CERTIFICATE_NAME }}
```

## macOS Code Signing

### Certificate Types

#### Developer ID Application
- **Use**: Distribution outside App Store
- **Requirements**: Apple Developer Program membership ($99/year)
- **Notarization**: Required to avoid Gatekeeper warnings

#### Mac App Store
- **Use**: App Store distribution only
- **Requirements**: Apple Developer Program membership
- **Notarization**: Handled automatically by App Store

### Setup Process

1. **Enroll in Apple Developer Program**
   - Visit [developer.apple.com](https://developer.apple.com)
   - Pay $99 annual fee
   - Complete enrollment process

2. **Create Certificates**
   - Log into Apple Developer Portal
   - Navigate to Certificates, Identifiers & Profiles
   - Create new "Developer ID Application" certificate
   - Download and install in Keychain Access

3. **Export Certificate**
   ```bash
   # Export as .p12 file from Keychain Access
   # Convert to base64 for CI/CD
   base64 -i certificate.p12 -o certificate.txt
   ```

### Environment Variables

```bash
# Required for signing
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
APPLE_CERTIFICATE="base64-encoded-p12-certificate"
APPLE_CERTIFICATE_PASSWORD="certificate-password"

# Required for notarization
APPLE_ID="your-apple-id@example.com"
APPLE_PASSWORD="app-specific-password"
APPLE_TEAM_ID="your-10-character-team-id"
```

### Tauri Configuration

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "${APPLE_SIGNING_IDENTITY}",
      "entitlements": "entitlements.plist",
      "hardenedRuntime": true,
      "notarize": true
    }
  }
}
```

### Entitlements Configuration

**Production Entitlements** (`entitlements.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-only</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.print</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
</dict>
</plist>
```

### GitHub Actions Setup

```yaml
- name: Setup macOS Code Signing
  if: matrix.platform == 'macos-latest'
  run: |
    # Create temporary keychain
    security create-keychain -p temp_password temp.keychain
    security default-keychain -s temp.keychain
    security unlock-keychain -p temp_password temp.keychain

    # Import certificate
    echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
    security import certificate.p12 -k temp.keychain -P $APPLE_CERTIFICATE_PASSWORD -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k temp_password temp.keychain

    # Clean up
    rm certificate.p12

- name: Build and Sign macOS
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

## Linux Package Signing

### GPG Key Setup

1. **Generate GPG Key**
   ```bash
   gpg --full-generate-key
   # Choose RSA, 4096 bits, 2-year expiration
   # Use: BEAR AI Team <releases@bearai.com>
   ```

2. **Export Keys**
   ```bash
   # Export public key
   gpg --armor --export your-email@domain.com > public.key

   # Export private key (for CI/CD)
   gpg --armor --export-secret-keys your-email@domain.com > private.key

   # Convert to base64 for secrets
   base64 -w 0 private.key > private.key.base64
   ```

### Environment Variables

```bash
GPG_PRIVATE_KEY="base64-encoded-private-key"
GPG_PASSPHRASE="private-key-passphrase"
GPG_KEY_ID="your-gpg-key-id"
```

### Signing Methods

#### AppImage Signing
```bash
# Sign AppImage
gpg --detach-sign --armor MyApp.AppImage

# Verify signature
gpg --verify MyApp.AppImage.sig MyApp.AppImage
```

#### DEB Package Signing
```bash
# Install dpkg-sig
sudo apt install dpkg-sig

# Sign package
dpkg-sig --sign builder MyApp.deb

# Verify signature
dpkg-sig --verify MyApp.deb
```

#### RPM Package Signing
```bash
# Configure ~/.rpmmacros
echo "%_signature gpg" >> ~/.rpmmacros
echo "%_gpg_path ~/.gnupg" >> ~/.rpmmacros
echo "%_gpg_name Your Name <your-email@domain.com>" >> ~/.rpmmacros

# Sign package
rpm --addsign MyApp.rpm

# Verify signature
rpm --checksig MyApp.rpm
```

### Automated Signing Script

Use the provided script at `scripts/sign-linux-packages.sh`:

```bash
# Make executable
chmod +x scripts/sign-linux-packages.sh

# Set environment variables
export GPG_KEY_ID="your-key-id"

# Run signing
./scripts/sign-linux-packages.sh
```

### GitHub Actions Setup

```yaml
- name: Setup Linux Package Signing
  if: matrix.platform == 'ubuntu-latest'
  run: |
    # Import GPG private key
    echo "$GPG_PRIVATE_KEY" | base64 --decode | gpg --batch --import

    # Configure git with GPG key
    git config --global user.signingkey $GPG_KEY_ID
    git config --global commit.gpgsign true

    # Set GPG TTY for non-interactive signing
    export GPG_TTY=$(tty)

- name: Build and Sign Linux
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GPG_PRIVATE_KEY: ${{ secrets.GPG_PRIVATE_KEY }}
    GPG_PASSPHRASE: ${{ secrets.GPG_PASSPHRASE }}
    GPG_KEY_ID: ${{ secrets.GPG_KEY_ID }}
```

## GitHub Actions Workflow Example

Complete workflow example for all platforms:

```yaml
name: 'Release'

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Setup Rust
      uses: dtolnay/rust-toolchain@stable

    - name: Install dependencies (Ubuntu)
      if: matrix.platform == 'ubuntu-latest'
      run: |
        sudo apt-get update
        sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev dpkg-sig

    - name: Setup Windows Code Signing
      if: matrix.platform == 'windows-latest'
      shell: powershell
      run: |
        $cert = [Convert]::FromBase64String('${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}')
        [IO.File]::WriteAllBytes('certificate.pfx', $cert)
        Import-PfxCertificate -FilePath certificate.pfx -CertStoreLocation Cert:\LocalMachine\My -Password (ConvertTo-SecureString '${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}' -AsPlainText -Force)
        Remove-Item certificate.pfx

    - name: Setup macOS Code Signing
      if: matrix.platform == 'macos-latest'
      run: |
        security create-keychain -p temp_password temp.keychain
        security default-keychain -s temp.keychain
        security unlock-keychain -p temp_password temp.keychain
        echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
        security import certificate.p12 -k temp.keychain -P $APPLE_CERTIFICATE_PASSWORD -T /usr/bin/codesign
        security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k temp_password temp.keychain
        rm certificate.p12

    - name: Setup Linux Package Signing
      if: matrix.platform == 'ubuntu-latest'
      run: |
        echo "$GPG_PRIVATE_KEY" | base64 --decode | gpg --batch --import
        git config --global user.signingkey $GPG_KEY_ID
        export GPG_TTY=$(tty)

    - name: Install NPM dependencies
      run: npm ci

    - uses: tauri-apps/tauri-action@v0
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        # Windows
        WINDOWS_CERTIFICATE_THUMBPRINT: ${{ secrets.WINDOWS_CERTIFICATE_THUMBPRINT }}
        # macOS
        APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
        APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
        APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
        APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        # Linux
        GPG_PRIVATE_KEY: ${{ secrets.GPG_PRIVATE_KEY }}
        GPG_PASSPHRASE: ${{ secrets.GPG_PASSPHRASE }}
        GPG_KEY_ID: ${{ secrets.GPG_KEY_ID }}
        # Updater
        TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
        TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
      with:
        tagName: ${{ github.ref_name }}
        releaseName: 'BEAR AI v__VERSION__'
        releaseBody: 'See the assets to download this version.'
        releaseDraft: true
        prerelease: false
```

## Required GitHub Secrets

### Windows Secrets
- `WINDOWS_CERTIFICATE_THUMBPRINT` - Certificate thumbprint (traditional method)
- `WINDOWS_CERTIFICATE_BASE64` - Base64 encoded .pfx file (traditional method)
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password (traditional method)
- `AZURE_KEY_VAULT_URL` - Azure Key Vault URL (Azure method)
- `AZURE_CLIENT_ID` - Azure application client ID (Azure method)
- `AZURE_CLIENT_SECRET` - Azure application client secret (Azure method)
- `AZURE_TENANT_ID` - Azure tenant ID (Azure method)
- `AZURE_CERTIFICATE_NAME` - Certificate name in Key Vault (Azure method)

### macOS Secrets
- `APPLE_SIGNING_IDENTITY` - Signing identity name
- `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_ID` - Apple ID for notarization
- `APPLE_PASSWORD` - App-specific password for notarization
- `APPLE_TEAM_ID` - Apple Developer Team ID

### Linux Secrets
- `GPG_PRIVATE_KEY` - Base64 encoded GPG private key
- `GPG_PASSPHRASE` - GPG key passphrase
- `GPG_KEY_ID` - GPG key ID

### Updater Secrets
- `TAURI_PRIVATE_KEY` - Tauri updater private key
- `TAURI_KEY_PASSWORD` - Tauri updater key password

## Testing Code Signing

### Local Testing

1. **Windows**: Build locally and check if executable is signed
   ```bash
   npm run tauri build
   # Check signature
   Get-AuthenticodeSignature "target\release\bear-ai-legal-assistant.exe"
   ```

2. **macOS**: Build locally and verify notarization
   ```bash
   npm run tauri build
   # Check signature
   codesign -dv --verbose=4 "target/release/bundle/macos/BEAR AI Legal Assistant.app"
   # Check notarization
   spctl -a -vvv "target/release/bundle/macos/BEAR AI Legal Assistant.app"
   ```

3. **Linux**: Build and verify package signatures
   ```bash
   npm run tauri build
   # Verify AppImage
   gpg --verify "target/release/bundle/appimage/bear-ai-legal-assistant.AppImage.sig"
   # Verify DEB
   dpkg-sig --verify "target/release/bundle/deb/bear-ai-legal-assistant.deb"
   ```

### Automated Testing

Set up test builds in GitHub Actions to verify signing works before release:

```yaml
name: 'Test Code Signing'

on:
  pull_request:
    paths:
      - 'src-tauri/**'
      - '.github/workflows/**'

# Same job structure as release workflow
```

## Troubleshooting

### Common Issues

#### Windows
- **Certificate not found**: Verify certificate is installed in Local Machine store
- **Timestamp server unreachable**: Try alternative timestamp servers
- **HSM not detected**: Check HSM drivers and connection
- **Azure authentication failed**: Verify Azure credentials and permissions

#### macOS
- **Certificate not found**: Check certificate is in keychain and identity name is correct
- **Notarization fails**: Verify entitlements and ensure all binaries are signed
- **Gatekeeper blocks app**: Ensure notarization completed and ticket is stapled

#### Linux
- **GPG key not found**: Verify key is imported and GPG_KEY_ID is correct
- **Permission denied**: Check file permissions and GPG agent configuration
- **Package verification fails**: Ensure public key is distributed correctly

### Getting Help

1. Check Tauri documentation: https://tauri.app/v1/guides/distribution/
2. Review platform-specific signing guides
3. Test with simple applications first
4. Use verbose logging to debug issues
5. Contact certificate authorities for certificate issues

## Security Best Practices

1. **Protect Private Keys**: Never commit private keys to version control
2. **Use Strong Passwords**: Generate secure passwords for certificates and keys
3. **Regular Rotation**: Rotate signing keys every 1-2 years
4. **Audit Access**: Regularly review who has access to signing credentials
5. **Backup Keys**: Maintain secure backups of signing certificates and keys
6. **Test Regularly**: Verify signing works in test environments before production
7. **Monitor Certificates**: Set up alerts for certificate expiration
8. **Use HSMs**: Consider hardware security modules for production signing keys

## Cost Planning

### Annual Costs (Estimated)
- **Windows OV Certificate**: $200-400
- **Windows EV Certificate**: $400-600
- **Apple Developer Program**: $99
- **Linux GPG**: Free
- **HSM Services**: $100-500 (optional)

**Total Annual Cost**: $300-1200 depending on certificate choices and HSM usage

### One-time Costs
- HSM Hardware: $100-1000
- Setup and Integration: 8-16 hours of development time

This comprehensive setup ensures your BEAR AI applications are properly signed and trusted across all major platforms, providing users with confidence in the authenticity and integrity of your software.