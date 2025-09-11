# BEAR AI Build and Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Build Environment Setup](#build-environment-setup)
3. [Development Build](#development-build)
4. [Production Build](#production-build)
5. [Platform-Specific Builds](#platform-specific-builds)
6. [Continuous Integration](#continuous-integration)
7. [Release Process](#release-process)
8. [Distribution](#distribution)

## Overview

BEAR AI uses a modern build system combining **Vite** for the React frontend and **Cargo** for the Rust backend, orchestrated through **Tauri**. This guide covers building and deploying BEAR AI across all supported platforms.

## Build Environment Setup

### Prerequisites

#### Required Tools

```bash
# Node.js (18+ recommended)
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher

# Rust (latest stable)
rustc --version  # Should be 1.70.0 or higher
cargo --version

# Platform-specific requirements
# See platform sections below
```

#### Installing Prerequisites

**Node.js Installation:**
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

**Rust Installation:**
```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add required targets for cross-compilation
rustup target add x86_64-pc-windows-msvc    # Windows
rustup target add x86_64-apple-darwin       # macOS Intel
rustup target add aarch64-apple-darwin      # macOS Apple Silicon
rustup target add x86_64-unknown-linux-gnu  # Linux
```

### Platform Dependencies

#### Windows (Build Machine)

```powershell
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Install Windows SDK
# Download from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

# Verify installation
cl.exe  # Should be available in PATH
```

#### macOS (Build Machine)

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install additional dependencies
brew install coreutils
```

#### Linux (Build Machine)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Fedora/RHEL
sudo dnf groupinstall "Development Tools"
sudo dnf install \
    openssl-devel \
    webkit2gtk3-devel \
    gtk3-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel
```

### Repository Setup

```bash
# Clone repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install frontend dependencies
npm install

# Verify Tauri CLI
npm run tauri --version
```

## Development Build

### Quick Development Setup

```bash
# Start development server
npm run tauri dev

# Alternative: Frontend only (for UI development)
npm run dev
```

### Development Configuration

**Environment Variables:**
```bash
# Create .env.local for development
cat > .env.local << EOF
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
REACT_APP_ENABLE_DEVTOOLS=true
REACT_APP_MOCK_API=false
EOF
```

**Tauri Configuration:**
```json
// src-tauri/tauri.conf.json (development overrides)
{
  "build": {
    "devPath": "http://localhost:1420",
    "beforeDevCommand": "npm run dev"
  },
  "tauri": {
    "bundle": {
      "active": false  // Disable bundling in dev
    }
  }
}
```

### Development Features

- **Hot Reload**: Automatic reload on file changes
- **Debug Mode**: Enhanced logging and error reporting
- **Source Maps**: Full debugging support
- **Fast Builds**: Optimized for development speed

## Production Build

### Frontend Build

```bash
# Build optimized React application
npm run build

# Output directory: dist/
# - Minified JavaScript/CSS
# - Optimized images and assets
# - Source maps (optional)
```

### Backend Build

```bash
# Build Rust backend
cd src-tauri
cargo build --release

# Output: target/release/bear-ai-legal-assistant
```

### Full Application Build

```bash
# Build complete application with Tauri
npm run tauri build

# Output locations:
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/appimage/
```

### Build Optimization

#### Production Configuration

```json
// vite.config.ts - Production optimizations
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@heroicons/react', 'lucide-react']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

```toml
# Cargo.toml - Rust optimizations
[profile.release]
lto = true              # Link-time optimization
codegen-units = 1       # Single codegen unit for better optimization
panic = "abort"         # Reduce binary size
strip = "symbols"       # Strip debug symbols
opt-level = "z"         # Optimize for size
```

#### Bundle Size Optimization

```bash
# Analyze bundle size
npm run analyze

# Expected bundle sizes:
# - Frontend: ~2-3MB (compressed)
# - Backend: ~15-25MB (depending on platform)
# - Total application: ~50-100MB (including models)
```

## Platform-Specific Builds

### Windows Build

#### Build Environment

```powershell
# Required tools verification
where cl    # Visual Studio compiler
where cargo # Rust toolchain
where node  # Node.js

# Set environment variables
$env:RUSTFLAGS = "-C target-cpu=native"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
```

#### Build Process

```powershell
# Clean previous builds
Remove-Item -Recurse -Force src-tauri/target -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Build for Windows
npm run tauri build -- --target x86_64-pc-windows-msvc

# Output files:
# - BEAR-AI-Setup.exe (NSIS installer)
# - BEAR-AI.msi (MSI installer) 
# - BEAR-AI.exe (Portable executable)
```

#### Windows-Specific Features

```json
// tauri.conf.json - Windows configuration
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "",
        "nsis": {
          "installerIcon": "icons/icon.ico",
          "installMode": "perMachine",
          "languages": ["English"],
          "displayLanguageSelector": false
        }
      }
    }
  }
}
```

### macOS Build

#### Build Environment

```bash
# Required tools verification
xcode-select -p  # Xcode command line tools
rustc --version  # Rust toolchain
node --version   # Node.js

# Set environment variables
export RUSTFLAGS="-C target-cpu=native"
export NODE_OPTIONS="--max-old-space-size=8192"
```

#### Universal Binary Build

```bash
# Add targets for universal binary
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build universal binary
npm run tauri build -- --target universal-apple-darwin

# Output files:
# - BEAR-AI.dmg (Disk image)
# - BEAR-AI.app (Application bundle)
```

#### Code Signing and Notarization

```bash
# Development signing (for testing)
npm run tauri build

# Production signing (requires Apple Developer account)
export APPLE_CERTIFICATE="Developer ID Application: Your Name"
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"

# Build with signing
npm run tauri build -- \
  --target universal-apple-darwin \
  --config '{"bundle":{"macOS":{"signingIdentity":"'$APPLE_CERTIFICATE'"}}}'

# Notarization (automated in CI)
xcrun notarytool submit BEAR-AI.dmg \
  --apple-id $APPLE_ID \
  --password $APPLE_PASSWORD \
  --team-id TEAM_ID \
  --wait
```

### Linux Build

#### Multi-Distribution Support

```bash
# Ubuntu/Debian build
npm run tauri build -- --target x86_64-unknown-linux-gnu

# Output files:
# - BEAR-AI.AppImage (Universal Linux)
# - bear-ai_1.0.0_amd64.deb (Debian package)
# - bear-ai-1.0.0-1.x86_64.rpm (RPM package)
```

#### AppImage Build

```bash
# Build AppImage with embedded libraries
npm run tauri build -- --config '{"bundle":{"appimage":{"bundleMediaFramework":true}}}'

# Verify AppImage
./src-tauri/target/release/bundle/appimage/BEAR-AI.AppImage --appimage-extract-and-run
```

#### Package-Specific Configuration

```json
// tauri.conf.json - Linux configuration
{
  "tauri": {
    "bundle": {
      "deb": {
        "depends": [
          "libwebkit2gtk-4.0-37",
          "libgtk-3-0",
          "libayatana-appindicator3-1"
        ],
        "section": "utils",
        "priority": "optional"
      }
    }
  }
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/build-and-deploy.yml
name: Build and Deploy BEAR AI

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always
  NODE_VERSION: '18'
  RUST_VERSION: 'stable'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
          npm ci
          
      - name: Run tests
        run: |
          npm run test:coverage
          npm run typecheck
          npm run lint
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    strategy:
      matrix:
        platform:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            
          - os: macos-latest
            target: universal-apple-darwin
            
    runs-on: ${{ matrix.platform.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
          targets: ${{ matrix.platform.target }}
          
      - name: Install Linux dependencies
        if: matrix.platform.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run tauri build -- --target ${{ matrix.platform.target }}
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: bear-ai-${{ matrix.platform.os }}
          path: |
            src-tauri/target/release/bundle/
            !src-tauri/target/release/bundle/**/*.dSYM/

  release:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
        
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            bear-ai-ubuntu-latest/**/*
            bear-ai-windows-latest/**/*
            bear-ai-macos-latest/**/*
          draft: false
          prerelease: contains(github.ref, 'alpha') || contains(github.ref, 'beta')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Quality Checks

```yaml
# Quality assurance jobs
quality:
  runs-on: ubuntu-latest
  steps:
    - name: Security audit
      run: |
        npm audit --audit-level high
        cargo audit
        
    - name: License check
      run: |
        npx license-checker --production --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'
        
    - name: Bundle size check
      run: |
        npm run build
        npm run analyze
        
    - name: Performance benchmark
      run: |
        npm run benchmark
```

## Release Process

### Version Management

```bash
# Update version numbers
npm version patch|minor|major

# Update Cargo.toml
sed -i 's/version = "1.0.0"/version = "1.0.1"/' src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i 's/"version": "1.0.0"/"version": "1.0.1"/' src-tauri/tauri.conf.json
```

### Pre-Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version numbers synchronized
- [ ] Security audit clean
- [ ] Performance benchmarks acceptable
- [ ] Cross-platform builds successful

### Release Automation

```bash
# Release script
#!/bin/bash
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Creating release $VERSION"

# Update versions
npm version $VERSION --no-git-tag-version
sed -i "s/version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

# Commit changes
git add .
git commit -m "chore: bump version to $VERSION"
git tag "v$VERSION"

# Push to trigger CI/CD
git push origin main
git push origin "v$VERSION"

echo "Release $VERSION created and pushed"
```

## Distribution

### Distribution Channels

#### GitHub Releases
- Primary distribution method
- Automatic uploads via CI/CD
- Version tracking and changelog
- Download statistics

#### Package Managers

**Windows:**
```powershell
# Chocolatey package
choco install bear-ai-legal-assistant

# winget package
winget install BEARAI.LegalAssistant
```

**macOS:**
```bash
# Homebrew cask
brew install --cask bear-ai-legal-assistant
```

**Linux:**
```bash
# Snap package
sudo snap install bear-ai-legal-assistant

# Flatpak
flatpak install flathub com.bearai.LegalAssistant

# AUR (Arch Linux)
yay -S bear-ai-legal-assistant
```

### Deployment Verification

```bash
# Automated deployment testing
#!/bin/bash

# Download and verify release
wget "https://github.com/KingOfTheAce2/BEAR_AI/releases/latest/download/BEAR-AI-Setup.exe"
sha256sum BEAR-AI-Setup.exe

# Install and test
./BEAR-AI-Setup.exe /S  # Silent install
bear-ai --version
bear-ai --health-check

# Cleanup
uninstall-bear-ai.exe /S
```

### Update Mechanism

```rust
// Auto-updater configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConfig {
    pub check_interval: u64,
    pub update_url: String,
    pub verify_signature: bool,
    pub auto_install: bool,
}

// Update check
async fn check_for_updates() -> Result<Option<UpdateInfo>> {
    let current_version = env!("CARGO_PKG_VERSION");
    let latest = fetch_latest_version().await?;
    
    if version_compare(&latest.version, current_version)? {
        Ok(Some(latest))
    } else {
        Ok(None)
    }
}
```

### Distribution Metrics

```typescript
// Analytics (privacy-preserving)
interface DistributionMetrics {
  downloads: {
    total: number;
    byPlatform: Record<string, number>;
    byVersion: Record<string, number>;
  };
  
  installations: {
    successful: number;
    failed: number;
    errors: Record<string, number>;
  };
  
  updates: {
    checkRate: number;
    installRate: number;
    errors: Record<string, number>;
  };
}
```

This comprehensive build and deployment guide ensures consistent, reliable releases across all supported platforms while maintaining high quality and security standards.