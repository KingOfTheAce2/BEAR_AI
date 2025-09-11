# BEAR AI Installation Guide

Complete installation instructions for all platforms and deployment scenarios.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Platform-Specific Installation](#platform-specific-installation)
3. [Development Installation](#development-installation)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10 (1903+), macOS 10.15+, Linux (Ubuntu 18.04+) |
| **Processor** | x64 processor with AVX2 support |
| **Memory** | 8 GB RAM |
| **Storage** | 10 GB free space |
| **Graphics** | DirectX 11 compatible |
| **Network** | Internet connection for initial setup |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| **Processor** | Intel i7/AMD Ryzen 7 or better (8+ cores) |
| **Memory** | 32 GB RAM |
| **Storage** | SSD with 50+ GB free space |
| **Graphics** | NVIDIA GPU with 8+ GB VRAM |
| **Network** | Broadband connection for model downloads |

### GPU Acceleration Support

#### NVIDIA GPUs (CUDA)
- **Minimum**: GTX 1060 6GB / RTX 2060
- **Recommended**: RTX 3070 / RTX 4060 or better
- **Professional**: RTX 4080 / RTX 4090 for largest models

#### AMD GPUs (ROCm)
- **Minimum**: RX 6600 XT
- **Recommended**: RX 7700 XT or better
- **Note**: ROCm support limited to Linux

#### Apple Silicon (Metal)
- **Supported**: M1, M1 Pro, M1 Max, M2, M2 Pro, M2 Max
- **Memory**: Unified memory benefits large models

## Platform-Specific Installation

### Windows Installation

#### Option 1: Installer Package (Recommended)

1. **Download the Installer**
   ```
   Visit: https://github.com/KingOfTheAce2/BEAR_AI/releases
   Download: BEAR-AI-Setup-x64.exe
   ```

2. **Run Installation**
   ```
   1. Right-click installer → "Run as Administrator"
   2. Follow setup wizard
   3. Choose installation directory (default: C:\Program Files\BEAR AI)
   4. Select components:
      ☑ Desktop shortcut
      ☑ Start Menu entry
      ☑ File associations
      ☑ Visual C++ Redistributables
   5. Click "Install"
   ```

3. **Post-Installation**
   ```
   1. Launch from Start Menu or Desktop
   2. Complete initial setup wizard
   3. Download recommended models
   ```

#### Option 2: Portable Version

1. **Download Portable**
   ```
   Download: BEAR-AI-Portable-x64.zip
   Extract to desired location
   ```

2. **Run Portable**
   ```
   1. Extract archive
   2. Run BEAR-AI.exe from extracted folder
   3. All data stored in application directory
   ```

#### Option 3: Windows Package Manager

```powershell
# Using winget (Windows 10 1809+)
winget install BEARAI.LegalAssistant

# Using Chocolatey
choco install bear-ai-legal-assistant

# Using Scoop
scoop bucket add bear-ai https://github.com/KingOfTheAce2/bear-ai-bucket
scoop install bear-ai
```

### macOS Installation

#### Option 1: DMG Installer (Recommended)

1. **Download DMG**
   ```
   Download: BEAR-AI-macOS.dmg
   ```

2. **Install Application**
   ```
   1. Mount the DMG file
   2. Drag BEAR AI to Applications folder
   3. Eject DMG when complete
   ```

3. **First Launch**
   ```
   1. Open Applications folder
   2. Right-click BEAR AI → Open (first time only)
   3. Click "Open" in security dialog
   4. Grant necessary permissions
   ```

#### Option 2: Homebrew

```bash
# Add tap
brew tap KingOfTheAce2/bear-ai

# Install BEAR AI
brew install --cask bear-ai-legal-assistant

# Launch
open -a "BEAR AI Legal Assistant"
```

#### Security Permissions

BEAR AI requires certain permissions on macOS:

```bash
# File system access (for document processing)
System Preferences → Security & Privacy → Privacy → Files and Folders

# Microphone access (for audio analysis)
System Preferences → Security & Privacy → Privacy → Microphone

# Camera access (for document scanning)
System Preferences → Security & Privacy → Privacy → Camera
```

### Linux Installation

#### Option 1: AppImage (Universal)

```bash
# Download and make executable
wget https://github.com/KingOfTheAce2/BEAR_AI/releases/latest/download/BEAR-AI-x86_64.AppImage
chmod +x BEAR-AI-x86_64.AppImage

# Run application
./BEAR-AI-x86_64.AppImage

# Optional: Install to system
sudo mv BEAR-AI-x86_64.AppImage /usr/local/bin/bear-ai
```

#### Option 2: Debian/Ubuntu Package

```bash
# Download DEB package
wget https://github.com/KingOfTheAce2/BEAR_AI/releases/latest/download/bear-ai_1.0.0_amd64.deb

# Install package
sudo dpkg -i bear-ai_1.0.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch
bear-ai
```

#### Option 3: RPM Package (Fedora/RHEL)

```bash
# Download RPM package
wget https://github.com/KingOfTheAce2/BEAR_AI/releases/latest/download/bear-ai-1.0.0-1.x86_64.rpm

# Install package
sudo rpm -i bear-ai-1.0.0-1.x86_64.rpm

# Or using DNF
sudo dnf install bear-ai-1.0.0-1.x86_64.rpm

# Launch
bear-ai
```

#### Option 4: Snap Package

```bash
# Install from Snap Store
sudo snap install bear-ai-legal-assistant

# Grant necessary permissions
sudo snap connect bear-ai-legal-assistant:home
sudo snap connect bear-ai-legal-assistant:removable-media

# Launch
bear-ai-legal-assistant
```

#### Option 5: Flatpak

```bash
# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install BEAR AI
flatpak install flathub com.bearai.LegalAssistant

# Launch
flatpak run com.bearai.LegalAssistant
```

## Development Installation

### Prerequisites

```bash
# Node.js (16+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Platform-specific dependencies
# Ubuntu/Debian:
sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora:
sudo dnf install webkit2gtk3-devel openssl-devel curl wget libappindicator-gtk3-devel librsvg2-devel
sudo dnf group install "C Development Tools and Libraries"

# macOS:
xcode-select --install
```

### Clone and Build

```bash
# Clone repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install dependencies
npm install

# Build for development
npm run tauri dev

# Build for production
npm run tauri build
```

### Environment Configuration

Create `.env.local` for development:

```env
# Development configuration
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_LOG_LEVEL=debug

# Model configuration
REACT_APP_DEFAULT_MODEL=llama-7b-chat
REACT_APP_MODEL_CACHE_DIR=./models

# Memory management
REACT_APP_MAX_MEMORY_MB=8192
REACT_APP_MEMORY_THRESHOLD=0.8

# Security
REACT_APP_ENABLE_PII_SCRUBBING=true
REACT_APP_AUDIT_LOGGING=true
```

## Configuration

### Initial Setup Wizard

On first launch, BEAR AI will guide you through initial configuration:

#### 1. Installation Type
```
○ Standard Installation
  - Default settings for most users
  - Automatic model selection
  - Basic privacy settings

○ Advanced Installation  
  - Custom configuration options
  - Manual model selection
  - Advanced privacy controls

○ Enterprise Installation
  - Corporate security settings
  - Centralized management
  - Audit compliance features
```

#### 2. Model Selection

```
Hardware Profile: Desktop (16GB RAM, GTX 3070)
Recommended Models:
  ☑ Llama-7B-Chat (General purpose)
  ☑ CodeLlama-7B (Code analysis)
  ○ Llama-13B-Chat (Higher accuracy)
  ○ Mixtral-8x7B (Multilingual)

Storage Required: ~25GB
Download Time: ~45 minutes
```

#### 3. Privacy Configuration

```
PII Detection:
  ☑ Automatic PII detection
  ☑ Real-time scrubbing
  ☑ PII pattern updates

Audit Logging:
  ☑ User actions
  ☑ Document access
  ☑ Analysis results
  ○ Debug information

Data Storage:
  ☑ Local storage only
  ○ Encrypted storage
  ○ Secure deletion
```

### Advanced Configuration

#### Configuration File Location

| Platform | Configuration Path |
|----------|-------------------|
| **Windows** | `%APPDATA%\BEAR AI\config.json` |
| **macOS** | `~/Library/Application Support/BEAR AI/config.json` |
| **Linux** | `~/.config/bear-ai/config.json` |

#### Sample Configuration

```json
{
  "version": "2.0.0",
  "user": {
    "profile": {
      "name": "Sarah Johnson",
      "role": "attorney",
      "firm": "Johnson & Associates"
    },
    "preferences": {
      "theme": "professional-dark",
      "language": "en-US",
      "dateFormat": "MM/DD/YYYY"
    }
  },
  "models": {
    "defaultModel": "llama-7b-chat",
    "cacheDirectory": "./models",
    "maxCacheSize": "50GB",
    "autoUpdate": true,
    "gpuAcceleration": true
  },
  "memory": {
    "maxUsage": "80%",
    "optimizationInterval": 300,
    "garbageCollectionMode": "automatic"
  },
  "security": {
    "piiDetection": {
      "enabled": true,
      "confidence": 0.8,
      "patterns": ["ssn", "credit_card", "phone", "email"]
    },
    "auditLogging": {
      "enabled": true,
      "level": "info",
      "retention": "90d"
    },
    "encryption": {
      "enabled": true,
      "algorithm": "AES-256-GCM"
    }
  },
  "performance": {
    "streamingEnabled": true,
    "batchProcessing": true,
    "memoryOptimization": true,
    "backgroundProcessing": true
  }
}
```

### Environment Variables

```bash
# Model configuration
BEAR_AI_MODEL_PATH=/path/to/models
BEAR_AI_MODEL_CACHE_SIZE=50GB
BEAR_AI_DEFAULT_MODEL=llama-7b-chat

# Memory management
BEAR_AI_MAX_MEMORY=16GB
BEAR_AI_MEMORY_THRESHOLD=0.8
BEAR_AI_GC_INTERVAL=300

# Security
BEAR_AI_ENABLE_ENCRYPTION=true
BEAR_AI_AUDIT_LEVEL=info
BEAR_AI_PII_DETECTION=true

# Performance
BEAR_AI_GPU_ACCELERATION=true
BEAR_AI_STREAMING=true
BEAR_AI_THREADS=auto
```

## Verification

### Installation Verification

```bash
# Check installation
bear-ai --version
# Expected: BEAR AI Legal Assistant v2.0.0

# Test basic functionality
bear-ai --test
# Expected: All systems operational

# Check GPU acceleration
bear-ai --gpu-info
# Expected: GPU information if available
```

### System Health Check

```bash
# Run comprehensive health check
bear-ai --health-check

# Expected output:
✓ Installation: OK
✓ Dependencies: OK  
✓ Models: 2 available
✓ Memory: 16GB available
✓ GPU: NVIDIA RTX 3070 detected
✓ Storage: 45GB free
✓ Network: Connected
```

### Performance Benchmark

```bash
# Run performance benchmark
bear-ai --benchmark

# Expected output:
Benchmarking BEAR AI Performance...
✓ Model Loading: 2.3s
✓ Document Processing: 450ms per page
✓ Memory Usage: 2.1GB peak
✓ GPU Utilization: 85% max
Overall Score: 8.7/10
```

## Troubleshooting

### Common Installation Issues

#### Windows Installation Problems

**Issue**: "Windows protected your PC" SmartScreen warning
```
Solution:
1. Click "More info"
2. Click "Run anyway"
3. Or disable SmartScreen temporarily
```

**Issue**: Missing Visual C++ Redistributables
```
Solution:
1. Download from Microsoft:
   https://aka.ms/vs/17/release/vc_redist.x64.exe
2. Install redistributables
3. Restart installation
```

**Issue**: Antivirus blocking installation
```
Solution:
1. Temporarily disable real-time protection
2. Add BEAR AI to antivirus exclusions
3. Re-enable protection after installation
```

#### macOS Installation Problems

**Issue**: "BEAR AI cannot be opened because it is from an unidentified developer"
```
Solution:
1. Right-click application
2. Select "Open" from context menu
3. Click "Open" in security dialog
```

**Issue**: Permission denied errors
```
Solution:
1. Open System Preferences → Security & Privacy
2. Grant necessary permissions under Privacy tab
3. Restart application
```

#### Linux Installation Problems

**Issue**: Missing dependencies
```
Solution - Ubuntu/Debian:
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.0-37 libgtk-3-0 libayatana-appindicator3-1

Solution - Fedora:
sudo dnf install webkit2gtk3 gtk3 libappindicator-gtk3
```

**Issue**: AppImage won't run
```
Solution:
1. Install FUSE: sudo apt-get install fuse
2. Make executable: chmod +x BEAR-AI.AppImage
3. Run with: ./BEAR-AI.AppImage --appimage-extract-and-run
```

### Post-Installation Issues

#### Model Download Problems

**Issue**: Model download fails
```
Diagnosis:
1. Check internet connection
2. Verify available disk space
3. Check firewall settings

Solution:
1. Use manual model download
2. Place models in correct directory
3. Restart application
```

**Issue**: Out of memory during model loading
```
Solution:
1. Close other applications
2. Select smaller model
3. Increase virtual memory
4. Consider RAM upgrade
```

#### Performance Issues

**Issue**: Slow document processing
```
Diagnosis:
1. Check memory usage
2. Verify GPU utilization
3. Monitor CPU usage

Solution:
1. Enable GPU acceleration
2. Increase memory allocation
3. Use smaller models for testing
4. Process documents in batches
```

### Getting Help

#### Log File Locations

| Platform | Log Path |
|----------|----------|
| **Windows** | `%APPDATA%\BEAR AI\logs\` |
| **macOS** | `~/Library/Logs/BEAR AI/` |
| **Linux** | `~/.local/share/bear-ai/logs/` |

#### Support Channels

1. **GitHub Issues**: Technical problems and bugs
2. **Documentation**: Comprehensive guides and references
3. **Community**: User discussions and tips
4. **Email Support**: Enterprise customers

#### Diagnostic Information

When reporting issues, include:

```bash
# Generate diagnostic report
bear-ai --diagnostic

# System information
bear-ai --system-info

# Log files (sanitized)
bear-ai --export-logs --anonymize
```

For additional help, see:
- [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING_GUIDE.md)
- [User Guide](../user/USER_GUIDE.md)
- [Developer Guide](../developer/DEVELOPER_GUIDE.md)