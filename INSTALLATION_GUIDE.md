# BEAR AI Legal Assistant - Installation Guide

## 🚨 CRITICAL: Application Type

**BEAR AI is a DESKTOP APPLICATION** built with:
- **Frontend**: React 18.2 + TypeScript 4.9 + TailwindCSS
- **Backend**: Rust/Tauri 1.8 (Desktop Framework)
- **Platform**: Cross-platform desktop app (Windows, macOS, Linux)

## 🎯 Quick Start (Recommended for End Users)

### Option 1: Windows Installer (Easiest)

1. **Visit**: [GitHub Releases](https://github.com/KingOfTheAce2/BEAR_AI/releases)
2. **Download**: Latest `.exe` installer for Windows
3. **Install**: Double-click to install with desktop shortcut
4. **Launch**: Click desktop shortcut or find in Start Menu

**What you get:**
- Professional desktop application
- System tray integration
- Automatic updates
- Desktop shortcut and Start Menu entry

---

## 🛠️ Development Installation

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher  
- **Rust**: 1.70.0+ (for building Tauri app)
- **Visual Studio Build Tools** (Windows only)
- **Linux desktop libraries**: `pkg-config libgtk-3-dev libglib2.0-dev libwebkit2gtk-4.0-dev`
- **Git**: For cloning repository

### Step-by-Step Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# 2. Install Node.js dependencies
npm install

# 3. Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 4. Install Tauri CLI
npm install -g @tauri-apps/cli

# 5. Start development
npm start        # React dev server (localhost:3000)
tauri dev        # Desktop app (development mode)
```

### Development Commands

```bash
# Frontend Development
npm start                 # Start React dev server
npm run build            # Build React for production  
npm run test             # Run Jest tests
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code quality

# Desktop App Development
tauri dev                # Launch desktop app (development)
npm run tauri:build       # Build desktop app + installer with dependency checks
tauri info               # Show Tauri environment info

# Full Stack Development
npm run dev:full         # Start both React + API servers
```

---

## 📦 Build from Source

### For Advanced Users

```bash
# Install dependencies
npm install

# Build React application
npm run build

# Build Tauri desktop app + Windows installer
npm run tauri:build
```

**Output:**
- Desktop application executable
- Windows installer (`.exe`)
- Application bundles for distribution

---

## 🔧 MCP/Claude Code Integration

### Development Server Integration

BEAR AI supports integration with Claude Code and MCP (Model Context Protocol):

- **Development Server**: `npm start` runs on `http://localhost:3000`
- **MCP Connection**: Claude Code connects to localhost:3000 for development collaboration
- **Desktop App**: Production app runs natively (no localhost needed)
- **Hybrid Architecture**: Web-based development with native deployment

### Usage for Claude Code/MCP

```bash
# 1. Start development server (for MCP integration)
npm start

# 2. In another terminal, start desktop app (for testing)
tauri dev

# 3. Claude Code can now connect to localhost:3000 for development
```

---

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Display**: 1024x768 minimum resolution

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, Linux (Ubuntu 20.04+)
- **RAM**: 8GB or higher
- **Storage**: 4GB free space
- **Display**: 1920x1080 or higher

### For Development
- **Node.js**: 18.0.0+
- **Rust**: 1.70.0+
- **Visual Studio Build Tools** (Windows)
- **Xcode Command Line Tools** (macOS)
- **build-essential** (Linux)

---

## 🐛 Troubleshooting

### Common Installation Issues

#### Windows Issues
| Issue | Solution |
|-------|----------|
| Installer won't run | Right-click → "Run as administrator" |
| Antivirus blocks installer | Add BEAR_AI.exe to antivirus exceptions |
| Missing Visual C++ libraries | Install Visual Studio Build Tools |
| Permission errors | Ensure user has write access to Program Files |

#### Linux Issues
| Issue | Solution |
|-------|----------|
| `glib-2.0` or `gobject-2.0` missing during build | Install WebKit dependencies: `sudo apt-get install pkg-config libgtk-3-dev libglib2.0-dev libwebkit2gtk-4.0-dev` |
| `npm run tauri:build` skips desktop build | The new build wrapper falls back to a headless Rust build when dependencies are missing. Install the packages above or set `FORCE_TAURI_BUILD=1` after installing them to force a full desktop build. |
| WebView crashes on startup | Ensure GPU drivers are up to date and WebKit2GTK packages are installed. |

#### Development Issues
| Issue | Solution |
|-------|----------|
| `npm install` fails | Clear npm cache: `npm cache clean --force` |
| Rust not found | Install Rust: https://rustup.rs/ |
| Tauri build fails | Run `npm run typecheck` to fix TypeScript errors |
| Port 3000 in use | Kill process or use different port |

#### Runtime Issues
| Issue | Solution |
|-------|----------|
| App won't start | Check Windows Event Viewer for errors |
| Features not working | Restart app or check system tray |
| Performance issues | Close other applications, check RAM usage |
| Updates failing | Check internet connection, restart app |

### Getting Help

1. **Check Documentation**: Review README.md and architecture docs
2. **Search Issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
3. **Provide Details**: Include system specs, error messages, reproduction steps
4. **Community**: [GitHub Discussions](https://github.com/KingOfTheAce2/BEAR_AI/discussions)

---

## 🔐 Security Notes

### Installation Security
- **Signed Installer**: Windows executable is digitally signed
- **Verified Sources**: Only download from official GitHub Releases
- **Antivirus**: Some antivirus may flag new executables (false positive)
- **Permissions**: App requests minimal system permissions

### Runtime Security
- **Sandboxed Operations**: Tauri security model limits system access
- **Local Processing**: No data transmitted to external servers
- **Encrypted Storage**: Local database uses encryption
- **Auto-Updates**: Cryptographically signed and verified

---

## 🚀 What's Installed

### End User Installation
- **Desktop Application**: Native BEAR AI desktop app
- **Desktop Shortcut**: Quick access from desktop
- **Start Menu Entry**: Launch from Windows Start Menu
- **System Tray**: Background operation capability
- **Auto-Updater**: Built-in update system

### Development Installation
- **Source Code**: Complete React + Tauri source code
- **Dependencies**: Node.js and Rust dependencies
- **Build Tools**: Complete toolchain for development
- **Hot Reload**: Development server with live reload
- **Testing Suite**: Jest and Playwright test frameworks

---

## 📱 Platform Support

### Windows
- ✅ **Windows 10**: Full support
- ✅ **Windows 11**: Optimal experience
- ✅ **Server 2019/2022**: Basic support
- ❌ **Windows 7/8**: Not supported

### macOS  
- ✅ **macOS 10.15+**: Full support
- ✅ **Intel & Apple Silicon**: Native support
- ✅ **ARM64 & x64**: Universal binaries

### Linux
- ✅ **Ubuntu 18.04+**: Full support  
- ✅ **Debian 10+**: Full support
- ✅ **CentOS 8+**: Basic support
- ✅ **Arch Linux**: Community support

---

**Ready to get started?** Choose your installation method above and experience professional legal AI assistance today!

*For technical support, bug reports, or feature requests, visit our [GitHub repository](https://github.com/KingOfTheAce2/BEAR_AI).*
