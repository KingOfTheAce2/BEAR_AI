# BEAR AI Legal Assistant 🐻⚖️

**B**ridge for **E**xpertise, **A**udit and **R**esearch - **Version 2.0.0**

> 🚀 **Professional AI-powered desktop application** for legal document analysis and assistance built with React/TypeScript and Rust/Tauri

[![Build Status](https://github.com/KingOfTheAce2/BEAR_AI/workflows/Build%20BEAR%20AI%20Desktop%20App/badge.svg)](https://github.com/KingOfTheAce2/BEAR_AI/actions)
[![Desktop App](https://img.shields.io/badge/Desktop-Tauri-blue.svg)](https://tauri.app/)
[![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/KingOfTheAce2/BEAR_AI)
[![License: PROPRIETARY](https://img.shields.io/badge/License-PROPRIETARY-red.svg)](LICENSE)

**BEAR AI Legal Assistant** is a modern desktop application that combines cutting-edge artificial intelligence with professional legal workflows. Built with **Tauri** for native performance and security, and **React with TypeScript** for a beautiful, responsive interface.

## 🏗️ Architecture

BEAR AI is a **desktop application** with a hybrid architecture:

```
BEAR_AI/
├── src/                     # React TypeScript frontend
│   ├── components/          # UI components
│   ├── pages/              # Application pages  
│   └── styles/             # CSS and styling
├── src-tauri/              # Rust/Tauri backend
│   ├── src/main.rs         # Main Rust entry point
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Desktop app configuration
├── dist/                   # Built frontend assets
├── package.json            # Node.js dependencies & scripts
└── scripts/                # Installation & build scripts
```

### 🖥️ Desktop Application Features
- **Native Desktop Integration**: System tray, auto-updater, file system access
- **Cross-Platform**: Windows, macOS, and Linux support
- **Professional UI**: Modern React-based interface with native look and feel
- **Secure by Design**: Tauri's security model with sandboxed operations
- **Offline Capable**: Full functionality without internet connection

## 📦 Installation

### 🎯 Option 1: Download Windows Installer (Recommended)

**The easiest way to get BEAR AI:**

1. **Visit**: [GitHub Releases](https://github.com/KingOfTheAce2/BEAR_AI/releases)
2. **Download**: Latest `.exe` installer for Windows
3. **Install**: Double-click to install with desktop shortcut
4. **Launch**: Click desktop shortcut or find in Start Menu

### 🛠️ Option 2: Build from Source

**For developers or advanced users:**

```bash
# 1. Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# 2. Install Node.js dependencies
npm install

# 3. Install Rust and Tauri CLI (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm install -g @tauri-apps/cli

# 4. Build and run the desktop app
npm run build
tauri build
```

### 📋 System Requirements

**Minimum:**
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Node.js**: 16.0.0+
- **RAM**: 4GB (8GB recommended)
- **Storage**: 2GB free space

**For Development:**
- **Rust**: Latest stable toolchain
- **Visual Studio Build Tools** (Windows only)

## 🚀 Usage

### 🖥️ Desktop Application

**After installation:**
1. **Launch** BEAR AI from desktop shortcut or applications menu
2. **Interface** opens as native desktop application
3. **System Tray** integration for background operation
4. **No browser required** - fully native experience

### 🌐 Development Mode

**For developers working on the code:**

```bash
# Start React development server + Tauri desktop app
npm run dev:full

# Or separately:
npm start        # React dev server (http://localhost:3000)
tauri dev        # Tauri desktop app with dev server
```

### 🔧 MCP Integration & Claude Code Support

**BEAR AI integrates with Claude Code and MCP (Model Context Protocol):**

- **Localhost Usage**: The React development server (`npm start`) runs on `http://localhost:3000` for development and MCP integration
- **MCP Connection**: Claude Code can connect to the development server for real-time collaboration
- **Desktop App**: The production desktop app runs natively without needing localhost
- **Hybrid Architecture**: Best of both worlds - native performance with web-based development flexibility

**For Claude Code/MCP workflows:**
```bash
# 1. Start development server (for MCP)
npm start

# 2. In another terminal, start desktop app (for testing)
tauri dev

# 3. Claude Code can now connect to localhost:3000 for development
```

## 🔧 Configuration

### 📁 Application Data

**BEAR AI stores configuration and data in:**
- **Windows**: `%APPDATA%\BEAR AI Legal Assistant\`
- **macOS**: `~/Library/Application Support/BEAR AI Legal Assistant/`
- **Linux**: `~/.config/BEAR AI Legal Assistant/`

### ⚙️ Desktop App Settings

**Configuration via:**
- **Settings Panel**: In-app settings interface
- **System Tray**: Right-click for quick options
- **Config Files**: JSON configuration in app data folder

## 🛠️ Development

### 🔧 Available Scripts

```bash
# Frontend Development
npm start                 # Start React dev server
npm run build            # Build React for production
npm run test             # Run Jest tests
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code quality

# Desktop App Development  
tauri dev                # Launch desktop app (development)
tauri build              # Build desktop app + installer
tauri info               # Show Tauri environment info

# Full Stack Development
npm run dev:full         # Start both React + API servers
npm run install:bear-ai  # Run installation script
```

### 🧪 Testing

```bash
# Unit Tests
npm run test:unit

# Integration Tests  
npm run test:integration

# End-to-End Tests
npm run test:e2e

# All Tests
npm test
```

## 🔒 Security & Privacy

**Built with security as a core principle:**

- **Native Security**: Tauri's Rust-based security model
- **Sandboxed Operations**: Limited system access by design
- **No Telemetry**: Your data stays on your device
- **Local Processing**: No external API dependencies
- **Secure Updates**: Cryptographically signed auto-updates

## 📚 Documentation

### 📋 Current Documentation
- [**🏗️ Architecture Guide**](README_ARCHITECTURE.md) - Technical architecture overview
- [**📝 Changelog**](CHANGELOG.md) - Version history and changes
- [**🤝 Contributing**](CONTRIBUTING.md) - Development contribution guide
- [**📋 Release Notes**](RELEASE_NOTES.md) - Latest release information

### 📖 Additional Resources
- [Tauri Documentation](https://tauri.app/) - Desktop app framework
- [React Documentation](https://react.dev/) - Frontend framework
- [TypeScript Documentation](https://www.typescriptlang.org/) - Type system

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### 🛠️ Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/BEAR_AI.git
cd BEAR_AI

# 2. Install dependencies
npm install

# 3. Install Rust toolchain (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 4. Start development environment
npm run dev:full

# 5. Make changes and test
npm test
npm run typecheck
npm run lint

# 6. Build to verify
npm run build
tauri build
```

## 🗺️ Roadmap

### ✅ Phase 1 - Core Desktop App (Current)
- [x] React/TypeScript frontend
- [x] Tauri/Rust backend  
- [x] Windows installer via GitHub Actions
- [x] System tray integration
- [x] Auto-updater support

### 🚧 Phase 2 - Enhanced Features
- [ ] Advanced legal document analysis
- [ ] Local AI model integration
- [ ] Plugin system architecture
- [ ] Enhanced MCP integration

### 📋 Phase 3 - Professional Features
- [ ] Multi-user support (local network)
- [ ] Advanced security features
- [ ] Enterprise deployment options
- [ ] Professional workflow integration

## 📜 License

This project is licensed under a proprietary license. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

BEAR AI builds upon excellent open-source technologies:

- [**Tauri**](https://tauri.app/) - Secure, fast desktop app framework
- [**React**](https://react.dev/) - Modern UI library
- [**TypeScript**](https://www.typescriptlang.org/) - Type-safe JavaScript
- [**Rust**](https://www.rust-lang.org/) - Systems programming language

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/KingOfTheAce2/BEAR_AI/discussions)
- **Actions**: [Build Status](https://github.com/KingOfTheAce2/BEAR_AI/actions)

---

**BEAR AI Legal Assistant** - Professional Desktop Application for Legal Professionals 🐻⚖️💻