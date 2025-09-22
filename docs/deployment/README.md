# BEAR AI Legal Assistant - Deployment Guide

## 🚀 Unified Build and Deployment Pipeline

This guide covers the complete deployment pipeline for BEAR AI Legal Assistant, featuring a unified Tauri-based desktop application with comprehensive Windows support.

## 📋 Overview

### Build Architecture
- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri (Rust backend)
- **Bundling**: Single executable with embedded web assets
- **Distribution**: Native Windows installer + Portable version

### Key Features
- ✅ Single unified build process
- ✅ Native Windows application with system tray
- ✅ Automated CI/CD pipeline
- ✅ Multiple installer formats (MSI, NSIS, Portable)
- ✅ Comprehensive installation testing
- ✅ Version management and release automation

## 🛠️ Development Setup

### Prerequisites
- **Node.js** 18+ with npm
- **Rust** (latest stable)
- **Windows 10/11** (for Windows builds)
- **Git** for version control

### Initial Setup
```bash
# Clone and setup
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install dependencies
npm ci

# Install Tauri CLI globally (optional)
npm install -g @tauri-apps/cli

# Start development server
npm run desktop:dev
```

## 🏗️ Build Commands

### Development
```bash
# Start web development server
npm run start

# Start desktop development (with hot reload)
npm run desktop:dev

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Production Builds
```bash
# Build web application only
npm run build

# Build desktop application
npm run desktop:build

# Build Windows installer with all features
npm run installer:create

# Test installation process
npm run installer:test
```

### CI/CD Pipeline
```bash
# Complete CI build (lint, test, typecheck, build)
npm run ci:build

# Complete desktop CI (includes installer creation)
npm run ci:desktop
```

## 📦 Distribution Formats

### 1. MSI Installer (Tauri Native)
- **File**: Generated in `src-tauri/target/release/bundle/msi/`
- **Features**: Standard Windows installer
- **Use Case**: Enterprise/corporate deployment

### 2. NSIS Installer (Custom)
- **File**: `build/BEAR_AI_Setup_vX.X.X.exe`
- **Features**: Custom branding, components selection, silent install
- **Use Case**: General distribution

### 3. Portable Version
- **File**: `build/BEAR_AI_Portable_vX.X.X.zip`
- **Features**: No installation required, self-contained
- **Use Case**: Testing, temporary usage, restricted environments

## 🔧 Build Scripts

### Windows Installer Builder
**Location**: `scripts/build-windows-installer.ps1`

```powershell
# Basic build
.\scripts\build-windows-installer.ps1

# Advanced build with signing and portable
.\scripts\build-windows-installer.ps1 -Version "1.2.0" -Sign -CreatePortable -RunTests
```

**Parameters**:
- `-Version`: Specify version number
- `-Sign`: Enable code signing (requires certificate)
- `-CreatePortable`: Generate portable version
- `-RunTests`: Run installation tests
- `-CertificatePath`: Path to signing certificate
- `-CertificatePassword`: Certificate password

### Installation Legal Quality Analyst
**Location**: `scripts/test-installation.ps1`

```powershell
# Test specific installer
.\scripts\test-installation.ps1 -InstallerPath "build/BEAR_AI_Setup_v1.0.0.exe" -TestSilentInstall -GenerateReport

# Test all features
.\scripts\test-installation.ps1 -TestSilentInstall -TestPortableVersion -TestUninstall -GenerateReport
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Main Build Pipeline (`.github/workflows/build-and-deploy.yml`)
- **Triggers**: Push to main/develop, tags, PRs
- **Jobs**:
  - Code quality (lint, typecheck, test)
  - Multi-platform builds (Windows, macOS, Linux)
  - Web deployment to GitHub Pages
  - Release creation for tags

#### 2. Windows Installer (`.github/workflows/windows-installer.yml`)
- **Triggers**: Version tags, manual dispatch
- **Features**:
  - Complete Windows installer creation
  - Code signing (if configured)
  - Portable version generation
  - Installation testing
  - Artifact upload

### Secrets Configuration
Required GitHub secrets:
```
TAURI_PRIVATE_KEY          # Tauri update signing key
TAURI_KEY_PASSWORD         # Key password
WINDOWS_CERTIFICATE        # Code signing certificate (base64)
WINDOWS_CERTIFICATE_PASSWORD # Certificate password
CODECOV_TOKEN             # Coverage reporting
```

## 📊 Testing Strategy

### Test Types
1. **Unit Tests**: Component and utility testing
2. **Integration Tests**: API and service integration
3. **Installation Tests**: Installer validation
4. **UI Tests**: User interface validation

### Test Commands
```bash
# Run all tests
npm run test

# Coverage report
npm run test:coverage

# Installation testing
npm run installer:test
```

### Test Coverage Targets
- **Minimum**: 70% across all metrics
- **Target**: 85% line coverage
- **Critical paths**: 100% coverage required

## 🔐 Security Considerations

### Code Signing
```powershell
# Sign installer (automated in CI)
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com installer.exe
```

### Security Features
- **CSP**: Content Security Policy configured
- **File System**: Scoped access to user directories
- **Network**: HTTPS-only external requests
- **Updates**: Signed update verification

## 🚀 Release Process

### Automated Release
```bash
# Patch release (1.0.0 → 1.0.1)
npm run release:patch

# Minor release (1.0.0 → 1.1.0)
npm run release:minor

# Major release (1.0.0 → 2.0.0)
npm run release:major
```

### Manual Release
1. Update version in `package.json`
2. Update `src-tauri/tauri.conf.json`
3. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tags: `git push --tags`
5. GitHub Actions will handle the rest

### Release Checklist
- [ ] Version bumped in all config files
- [ ] Changelog updated
- [ ] Tests passing
- [ ] Build artifacts generated
- [ ] Installation tested on clean system
- [ ] Release notes prepared

## 📈 Performance Optimization

### Build Optimization
- **Vite**: Fast builds with HMR
- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Dynamic imports for routes
- **Asset Optimization**: Image and font optimization

### Runtime Optimization
- **Tauri**: Lightweight Rust backend
- **Memory Management**: Efficient resource usage
- **Startup Time**: Optimized initialization
- **Bundle Size**: Minimized through bundling

## 🐛 Troubleshooting

### Common Build Issues

#### 1. Rust/Tauri Build Failures
```bash
# Clean Rust cache
cargo clean

# Update Rust toolchain
rustup update stable

# Reinstall Tauri CLI
npm uninstall -g @tauri-apps/cli
npm install -g @tauri-apps/cli@latest
```

#### 2. Node.js/NPM Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

#### 3. Windows Build Issues
```powershell
# Ensure Windows SDK is installed
winget install Microsoft.WindowsSDK

# Update Visual Studio Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
```

### Installation Issues

#### Silent Installation Fails
- Run as Administrator
- Check Windows Defender/antivirus
- Verify disk space availability
- Review installer logs

#### Application Won't Start
- Check system requirements
- Verify all dependencies installed
- Review Windows Event Viewer
- Try portable version

## 📚 Additional Resources

### Documentation
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

### Support
- **GitHub Issues**: https://github.com/KingOfTheAce2/BEAR_AI/issues
- **Discussions**: https://github.com/KingOfTheAce2/BEAR_AI/discussions

### Contributing
See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

## 🎯 Quick Start Checklist

For new developers:

1. **Setup Environment**
   - [ ] Install Node.js 18+
   - [ ] Install Rust
   - [ ] Clone repository
   - [ ] Run `npm ci`

2. **Development**
   - [ ] Start with `npm run desktop:dev`
   - [ ] Make changes
   - [ ] Run tests with `npm run test`

3. **Building**
   - [ ] Build with `npm run desktop:build`
   - [ ] Create installer with `npm run installer:create`
   - [ ] Test with `npm run installer:test`

4. **Deployment**
   - [ ] Create version tag
   - [ ] Push to GitHub
   - [ ] Monitor CI/CD pipeline
   - [ ] Download release artifacts

**Result**: A professional, single-executable desktop application with comprehensive Windows support and automated deployment pipeline.

---

*This deployment guide ensures a reliable, efficient build and deployment process for BEAR AI Legal Assistant, resolving previous Windows installation issues while maintaining development efficiency.*