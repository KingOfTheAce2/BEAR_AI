# Production Deployment Guide

## Overview

This guide covers the complete production deployment infrastructure for BEAR AI Legal Assistant, including automated builds, code signing, distribution, and update management.

## Architecture

### GitHub Actions Workflows

1. **Release Pipeline** (`.github/workflows/release.yml`)
   - Cross-platform builds (Windows, macOS, Linux)
   - Automated testing and security scans
   - Code signing for all platforms
   - Release artifact generation

2. **Security Scanning** (`.github/workflows/security.yml`)
   - Dependency vulnerability scanning
   - CodeQL analysis
   - Supply chain security checks
   - SBOM generation

3. **Distribution Management** (`.github/workflows/distribution.yml`)
   - GitHub Releases distribution
   - Direct download infrastructure
   - App store preparation
   - Staged rollouts

4. **Update System Monitoring** (`.github/workflows/update-checker.yml`)
   - Auto-updater health checks
   - Download metrics monitoring
   - Release frequency analysis

5. **Emergency Rollback** (`.github/workflows/rollback.yml`)
   - Emergency rollback procedures
   - Incident management
   - Rollback monitoring

## Code Signing

### Requirements

#### Windows
- **Certificate**: Authenticode code signing certificate
- **Tools**: SignTool (Windows SDK)
- **Environment Variables**:
  - `WINDOWS_CERTIFICATE`: Base64-encoded P12 certificate
  - `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

#### macOS
- **Certificate**: Developer ID Application certificate
- **Tools**: Xcode command line tools
- **Environment Variables**:
  - `APPLE_CERTIFICATE`: Base64-encoded P12 certificate
  - `APPLE_CERTIFICATE_PASSWORD`: Certificate password
  - `APPLE_SIGNING_IDENTITY`: Signing identity
  - `APPLE_ID`: Apple ID for notarization
  - `APPLE_PASSWORD`: App-specific password
  - `APPLE_TEAM_ID`: Apple Team ID

#### Linux
- **Key**: GPG signing key
- **Tools**: GPG
- **Environment Variables**:
  - `GPG_SIGNING_KEY`: Base64-encoded private key
  - `GPG_PASSPHRASE`: Key passphrase

### Setup Instructions

1. **Install Certificates**:
   ```bash
   node scripts/setup-certificates.js setup --verbose
   ```

2. **Validate Setup**:
   ```bash
   node scripts/setup-certificates.js validate
   ```

3. **Generate Development Certificates** (for testing):
   ```bash
   node scripts/setup-certificates.js dev
   ```

## Auto-Updater Configuration

### Tauri Configuration

The auto-updater is configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/KingOfTheAce2/BEAR_AI/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEZGMDY4MzJEMkJEQkY5NEI="
    }
  }
}
```

### Update Manifest

The update manifest (`updater/latest.json`) contains:
- Version information
- Download URLs for each platform
- Digital signatures
- Release notes

### Update Flow

1. Application checks for updates on startup
2. Downloads manifest from GitHub releases
3. Compares versions and prompts user
4. Downloads and installs update if available
5. Verifies digital signature before installation

## Release Process

### 1. Prepare Release

1. **Update Version Numbers**:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

2. **Update Release Notes**:
   - Document new features
   - List bug fixes
   - Note breaking changes

3. **Run Tests**:
   ```bash
   npm run test:ci
   npm run test:e2e
   ```

### 2. Create Release

1. **Tag Release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions Automatically**:
   - Builds for all platforms
   - Signs applications
   - Creates GitHub release
   - Uploads artifacts
   - Generates update manifest

### 3. Verify Release

1. **Check Build Status**: Monitor GitHub Actions
2. **Verify Downloads**: Test download links
3. **Validate Signatures**: Confirm code signing
4. **Test Auto-Update**: Verify update flow

### 4. Distribution

The distribution workflow automatically:
- Updates GitHub releases
- Configures direct download links
- Prepares app store submissions
- Implements staged rollouts

## Staged Rollouts

### Configuration

Rollouts are configured in stages:

1. **Canary** (5% of users, 24 hours)
   - Internal users and beta testers
   - Limited geographical regions

2. **Beta** (25% of users, 72 hours)
   - Expanded user base
   - Additional regions

3. **Production** (100% of users)
   - Full rollout
   - All users and regions

### Monitoring

The system monitors:
- Error rates
- Crash reports
- User feedback
- Download success rates

### Rollback Triggers

Automatic rollback occurs if:
- Error rate > 5%
- Crash rate > 1%
- User complaints > 10

## Emergency Procedures

### Emergency Rollback

1. **Trigger Rollback**:
   - Use GitHub Actions workflow dispatch
   - Specify target version and reason
   - Choose rollback scope

2. **Automatic Actions**:
   - Updates auto-updater manifest
   - Marks problematic release
   - Notifies stakeholders
   - Monitors rollback progress

3. **Manual Steps**:
   - Investigate root cause
   - Implement fixes
   - Plan re-release

### Incident Response

1. **Detection**: Automated monitoring alerts
2. **Assessment**: Evaluate impact and severity
3. **Response**: Execute rollback if necessary
4. **Communication**: Notify users and stakeholders
5. **Resolution**: Fix issues and re-release
6. **Post-Mortem**: Document lessons learned

## Monitoring and Analytics

### Key Metrics

- **Download Counts**: Track adoption rates
- **Update Success Rate**: Monitor auto-updater
- **Error Rates**: Application stability
- **User Feedback**: Support tickets and reviews

### Health Checks

The system performs regular health checks:
- Update manifest validation
- Download URL testing
- Signature verification
- Platform compatibility

### Reporting

Automated reports include:
- Release statistics
- Download analytics
- Error summaries
- Performance metrics

## Security Considerations

### Code Signing

- All releases are digitally signed
- Certificates are stored securely
- Signature verification is mandatory

### Update Security

- Update manifest is signed
- Downloads are verified
- HTTPS is enforced
- Rollback capability exists

### Supply Chain Security

- Dependency scanning
- Vulnerability assessments
- License compliance
- SBOM generation

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check certificate validity
   - Verify environment variables
   - Review build logs

2. **Signing Issues**:
   - Validate certificate installation
   - Check password/passphrase
   - Verify signing tools

3. **Update Problems**:
   - Test manifest accessibility
   - Verify URL validity
   - Check signature verification

### Debug Commands

```bash
# Validate certificates
node scripts/setup-certificates.js validate

# Test signing
node scripts/sign-app.js path/to/app --verbose

# Build release locally
./scripts/build-release.sh --verbose --skip-signing

# Check update manifest
curl -s https://github.com/KingOfTheAce2/BEAR_AI/releases/latest/download/latest.json | jq .
```

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Create an issue in the repository
4. Contact the development team

---

**Last Updated**: 2025-01-01
**Version**: 1.0.0