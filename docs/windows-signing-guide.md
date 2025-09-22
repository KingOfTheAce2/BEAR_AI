# Windows Code Signing Guide for BEAR AI Legal Assistant

This comprehensive guide covers the Windows code signing automation system for BEAR AI Legal Assistant, including setup, configuration, and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Certificate Setup](#certificate-setup)
4. [Local Development](#local-development)
5. [CI/CD Integration](#ci-cd-integration)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

## Overview

The Windows code signing system for BEAR AI Legal Assistant provides:

- **Automated code signing** for executables, MSI installers, and DLLs
- **Certificate management** with support for various certificate sources
- **CI/CD integration** with GitHub Actions and other platforms
- **Windows Defender compatibility** with automatic exclusion configuration
- **Signature verification** to ensure signing integrity

### Components

- `scripts/windows-signing.ps1` - Main signing automation script
- `scripts/windows-defender-config.ps1` - Defender compatibility configuration
- `scripts/build-pipeline.ps1` - Complete build and signing pipeline
- `.github/workflows/windows-release.yml` - GitHub Actions workflow
- `src-tauri/tauri.conf.json` - Tauri Windows configuration

## Prerequisites

### System Requirements

- Windows 10 version 1903 or later
- PowerShell 5.1 or PowerShell Core 7.0+
- Windows SDK (for SignTool.exe)
- Administrator privileges (for certificate installation)

### Development Tools

```powershell
# Install Windows SDK
choco install windows-sdk-10-version-2004-all -y

# Install Visual Studio Build Tools (if needed)
choco install visualstudio2022buildtools -y

# Verify SignTool availability
where signtool
```

### Required Software

1. **Windows SDK** - Provides SignTool.exe
2. **Visual C++ Redistributables** - Runtime dependencies
3. **PowerShell Execution Policy** - Must allow script execution

```powershell
# Set execution policy (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

## Certificate Setup

### Certificate Types

The signing system supports multiple certificate sources:

1. **PFX/P12 Files** - Traditional certificate files
2. **Base64 Encoded Certificates** - For CI/CD environments
3. **Certificate Store** - Installed certificates
4. **Hardware Security Modules (HSM)** - Enterprise environments

### Local Development Setup

#### Option 1: Self-Signed Certificate (Development Only)

```powershell
# Create self-signed certificate for development
$cert = New-SelfSignedCertificate -Subject "CN=BEAR AI Development" -Type CodeSigning -CertStoreLocation Cert:\CurrentUser\My

# Export certificate
$password = ConvertTo-SecureString -String "YourPassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "dev-cert.p12" -Password $password
```

#### Option 2: Commercial Certificate

1. **Obtain Certificate** from a trusted CA (DigiCert, Comodo, etc.)
2. **Install Certificate** to the Windows certificate store
3. **Configure Environment** variables

```powershell
# Set environment variables for local development
$env:WINDOWS_CERTIFICATE_PATH = "C:\path\to\certificate.p12"
$env:WINDOWS_CERTIFICATE_PASSWORD = "YourCertificatePassword"
```

### CI/CD Certificate Setup

For GitHub Actions and other CI/CD platforms:

1. **Convert Certificate to Base64**:

```powershell
# Convert PFX to Base64
$certBytes = [System.IO.File]::ReadAllBytes("certificate.p12")
$base64Cert = [System.Convert]::ToBase64String($certBytes)
Write-Output $base64Cert
```

2. **Store as Secrets**:
   - `WINDOWS_CERTIFICATE_BASE64` - Base64 encoded certificate
   - `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

## Local Development

### Running the Signing Script

Basic usage:

```powershell
# Sign all files in default build directory
.\scripts\windows-signing.ps1

# Sign with specific certificate
.\scripts\windows-signing.ps1 -CertificatePath "certificate.p12" -CertificatePassword "password"

# Verify signatures only
.\scripts\windows-signing.ps1 -VerifyOnly

# Debug mode with verbose logging
.\scripts\windows-signing.ps1 -LogLevel "DEBUG"
```

### Build Pipeline Integration

Use the complete build pipeline:

```powershell
# Full build with signing
.\scripts\build-pipeline.ps1 -Configuration Release -Architecture x64

# Build without signing (development)
.\scripts\build-pipeline.ps1 -SkipSigning

# Create release package
.\scripts\build-pipeline.ps1 -CreateRelease -Version "1.0.0"
```

### Windows Defender Configuration

Configure Windows Defender exclusions:

```powershell
# Add exclusions for development
.\scripts\windows-defender-config.ps1 -InstallPath "C:\Program Files\BEAR AI" -Verbose

# Remove exclusions
.\scripts\windows-defender-config.ps1 -RemoveExclusions
```

## CI/CD Integration

### GitHub Actions

The provided workflow (`.github/workflows/windows-release.yml`) includes:

- **Automated certificate installation** from secrets
- **Build and signing pipeline** execution
- **Artifact creation** and publishing
- **Windows Defender configuration**

#### Required Secrets

Configure these secrets in your GitHub repository:

- `WINDOWS_CERTIFICATE_BASE64` - Base64 encoded signing certificate
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password
- `TAURI_PRIVATE_KEY` - Tauri updater private key
- `TAURI_KEY_PASSWORD` - Tauri key password

#### Triggering Builds

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# Or trigger manually via GitHub Actions UI
```

### Azure DevOps

Example Azure DevOps configuration:

```yaml
trigger:
  tags:
    include:
    - v*

pool:
  vmImage: 'windows-latest'

variables:
- group: BEAR-AI-Signing

steps:
- powershell: |
    .\scripts\build-pipeline.ps1 -Configuration Release -CreateRelease
  displayName: 'Build and Sign Application'
  env:
    WINDOWS_CERTIFICATE_BASE64: $(CERTIFICATE_BASE64)
    WINDOWS_CERTIFICATE_PASSWORD: $(CERTIFICATE_PASSWORD)
```

### Jenkins

Example Jenkinsfile:

```groovy
pipeline {
    agent { label 'windows' }

    environment {
        WINDOWS_CERTIFICATE_BASE64 = credentials('bear-ai-certificate')
        WINDOWS_CERTIFICATE_PASSWORD = credentials('bear-ai-cert-password')
    }

    stages {
        stage('Build and Sign') {
            steps {
                powershell '''
                    .\\scripts\\build-pipeline.ps1 -Configuration Release -CreateRelease
                '''
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

#### 1. SignTool Not Found

**Error**: `SignTool not found. Please install Windows SDK`

**Solution**:
```powershell
# Install Windows SDK
choco install windows-sdk-10-version-2004-all -y

# Or manually add to PATH
$env:PATH += ";C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64"
```

#### 2. Certificate Installation Failed

**Error**: `Failed to install certificate from base64 string`

**Solution**:
```powershell
# Verify base64 encoding
$certBytes = [System.Convert]::FromBase64String($env:WINDOWS_CERTIFICATE_BASE64)
Write-Output "Certificate size: $($certBytes.Length) bytes"

# Test password
$securePassword = ConvertTo-SecureString -String $env:WINDOWS_CERTIFICATE_PASSWORD -Force -AsPlainText
```

#### 3. Signing Failed with Exit Code

**Error**: `Failed to sign file. Exit code: 1`

**Common causes and solutions**:

- **Invalid certificate**: Verify certificate is valid and not expired
- **Wrong password**: Check certificate password
- **Timestamp server unavailable**: Try different timestamp URL
- **File in use**: Ensure file is not locked by another process

#### 4. Windows Defender Blocking

**Error**: Files being quarantined or blocked

**Solution**:
```powershell
# Add exclusions before building
.\scripts\windows-defender-config.ps1 -Verbose

# Check current exclusions
Get-MpPreference | Select-Object ExclusionPath, ExclusionProcess
```

### Diagnostic Steps

1. **Verify Environment**:

```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Check execution policy
Get-ExecutionPolicy

# Check Windows version
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion
```

2. **Test Certificate**:

```powershell
# List certificates in store
Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -match "BEAR AI" }

# Test signing manually
signtool sign /f "certificate.p12" /p "password" /tr "http://timestamp.digicert.com" /td SHA256 /fd SHA256 "test.exe"
```

3. **Verify Signatures**:

```powershell
# Verify signature
signtool verify /pa /all "signed-file.exe"

# Check signature details
Get-AuthenticodeSignature "signed-file.exe"
```

### Logging and Debugging

Enable verbose logging for troubleshooting:

```powershell
# Enable debug logging
.\scripts\windows-signing.ps1 -LogLevel "DEBUG" -Verbose

# Check build logs
Get-Content "build.log" | Select-String "ERROR"
```

## Security Best Practices

### Certificate Security

1. **Never commit certificates** to version control
2. **Use strong passwords** for certificate protection
3. **Rotate certificates** before expiration
4. **Monitor certificate usage** and unauthorized access
5. **Use HSMs** for production environments when possible

### CI/CD Security

1. **Limit secret access** to necessary workflows only
2. **Use environment-specific secrets** (dev, staging, prod)
3. **Audit secret usage** regularly
4. **Implement approval workflows** for production releases
5. **Monitor build logs** for security issues

### Script Security

1. **Validate inputs** in all PowerShell scripts
2. **Use secure string handling** for passwords
3. **Implement proper error handling** to avoid information disclosure
4. **Clean up temporary files** containing sensitive data
5. **Use least privilege** for script execution

### Windows Defender Configuration

1. **Minimize exclusions** to only necessary paths
2. **Document all exclusions** and their purposes
3. **Regularly review exclusions** for relevance
4. **Monitor for false positives** and adjust as needed
5. **Keep Defender definitions updated**

## Additional Resources

- [Microsoft Code Signing Guide](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Tauri Code Signing Documentation](https://tauri.app/v1/guides/distribution/sign-windows)
- [Windows SDK Documentation](https://docs.microsoft.com/en-us/windows/win32/appxpkg/how-to-sign-a-package-using-signtool)
- [PowerShell Security Best Practices](https://docs.microsoft.com/en-us/powershell/scripting/security/powershell-security-best-practices)

## Support

For issues with the Windows signing automation:

1. **Check this guide** for common solutions
2. **Review build logs** for specific error messages
3. **Open an issue** on the GitHub repository
4. **Contact the development team** for security-related concerns

---

**Note**: This guide is specific to BEAR AI Legal Assistant. Adapt the procedures and scripts as needed for other projects.