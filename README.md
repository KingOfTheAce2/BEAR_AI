# BEAR AI Legal Assistant 🐻⚖️

**B**ridge for **E**xpertise, **A**udit and **R**esearch - **Version 2.0.0**

> 🚀 **Professional AI-powered desktop application** for legal document analysis and assistance with advanced React/Tauri hybrid architecture

[![Build Status](https://github.com/KingOfTheAce2/BEAR_AI/workflows/Build%20and%20Deploy%20BEAR%20AI/badge.svg)](https://github.com/KingOfTheAce2/BEAR_AI/actions)
[![Windows Installer](https://github.com/KingOfTheAce2/BEAR_AI/workflows/Windows%20Installer/badge.svg)](https://github.com/KingOfTheAce2/BEAR_AI/actions)
[![License: PROPRIETARY](https://img.shields.io/badge/License-PROPRIETARY-red.svg)](LICENSE)
[![Desktop App](https://img.shields.io/badge/Desktop-Tauri-blue.svg)](https://tauri.app/)
[![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/KingOfTheAce2/BEAR_AI)

**BEAR AI Legal Assistant** combines cutting-edge artificial intelligence with professional legal workflows in a modern desktop application. Built with **Tauri** for native performance and **React with TypeScript** for a beautiful, responsive interface, it provides secure, offline-capable legal document analysis with advanced memory management, streaming capabilities, and comprehensive plugin architecture.

## 🚀 Key Features

### 🔒 Privacy-First Design
- **100% Offline Operation**: Zero network dependencies, complete air-gap capability
- **No Telemetry**: Your data never leaves your device
- **GDPR Compliant**: Built for privacy regulations from the ground up
- **Complete Audit Trail**: Full logging for compliance requirements
- **Enterprise Security**: Role-based access with multi-factor authentication

### 🛡️ Professional Security
- **PII Detection & Scrubbing**: Automatically identify and remove sensitive information
- **Document Security**: Secure processing with version control
- **Multi-format Support**: PDF, DOCX, TXT, legal templates, and more
- **Encryption Ready**: AES-256 secure storage and transmission
- **Secure Sandboxing**: Tauri-based security model

### ⚡ Intelligent Performance
- **Hardware Adaptive**: Automatic model recommendations based on your system capabilities
- **Memory Optimized**: Advanced memory monitoring with LanceDB vector storage
- **GPU Acceleration**: Full NVIDIA GPU support with CPU fallback options
- **Model Flexibility**: Support for any GGUF model with hot-swapping and local storage
- **Streaming Processing**: Real-time inference with offline-first graceful degradation

### 🎯 Built for Professionals
- **Legal Document Analysis**: Specialized AI for legal workflows with offline processing
- **Multi-modal Support**: Text, images, audio, and document processing without external APIs
- **Local RAG Integration**: Advanced document retrieval and analysis using LanceDB
- **Batch Processing**: Handle multiple documents with progress tracking and local storage
- **Apple-Grade Interface**: Modern React-based UI with native desktop integration

### 🏗️ Modern Architecture
- **React + TypeScript**: Type-safe frontend with modern UI components
- **Tauri Backend**: Rust-powered native desktop integration
- **Plugin System**: Extensible architecture for custom functionality
- **Memory Safety**: Rust-based memory management with monitoring
- **Cross-Platform**: Windows, macOS, and Linux support

## 🏗️ Architecture

BEAR AI is built with a modular, extensible architecture:

```
src/bear_ai/
├── __main__.py          # Main entry point
├── chat.py             # Interactive chat interface  
├── gui.py              # Tkinter-based GUI
├── scrub.py            # PII detection and scrubbing
├── inference.py        # AI model inference engine
├── download.py         # Model download and management
├── security.py         # Security and privacy features
├── rag.py              # Retrieval-Augmented Generation
├── hardware_profiles.py # Hardware optimization
└── plugins/            # Extensible plugin system
```

## 📦 Installation

### 🚀 One-Command Install (Simple & Fast)

**The easiest way to install BEAR AI:**

```bash
# Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Run the unified installer
npm run setup
```

**✨ What it does automatically:**
- ✅ Installs all dependencies intelligently  
- ✅ Sets up cross-platform environment
- ✅ Creates shortcuts and launchers
- ✅ Verifies everything works perfectly
- ✅ Shows beautiful progress indicators
- ✅ Handles errors gracefully with recovery
- ✅ Works on Windows, macOS, and Linux

### 🎛️ Alternative Installation Methods

**For different use cases:**

```bash
# Standard installation
npm run install:bear-ai

# Verbose output (see what's happening)
npm run install:bear-ai:verbose

# Development installation (includes dev tools)
npm run install:bear-ai:dev
```

## 🚀 Quick Start

### ⚡ Instant Launch (After One-Command Install)

**It's this simple:**

```bash
# 1. Navigate to BEAR AI (if not already there)
cd BEAR_AI

# 2. Start the application  
npm start

# 3. Open in browser (automatic)
# http://localhost:3000
```

**Or use the shortcuts created for you:**
- **Windows**: Desktop shortcut or Start Menu → "BEAR AI Legal Assistant"
- **macOS**: Applications folder → "BEAR AI Legal Assistant"  
- **Linux**: Applications menu → "BEAR AI Legal Assistant"

### 🎛️ Alternative Launch Methods

```bash
# Development mode with live reload
npm run dev

# Full stack (frontend + API)
npm run dev:full

# Production build and serve
npm run build && npm run preview

# Direct script execution
./start-bear-ai.sh    # Unix
start-bear-ai.bat     # Windows
```

### ✅ Verify Installation

**Quick health check:**
```bash
# Check if everything is working
npm test

# Verify TypeScript compilation
npm run typecheck

# Check build process
npm run build
```

**Expected output:**
```
✅ Package structure valid
✅ Dependencies installed  
✅ TypeScript compilation successful
✅ Build process completed
✅ BEAR AI is ready to use!
```

### 🆘 Quick Troubleshooting

**If something goes wrong:**

1. **Re-run the installer:**
   ```bash
   npm run install:bear-ai:verbose
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 16.0.0+
   npm --version   # Should be 8.0.0+
   ```

3. **Clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Need more help?** Check the installation report: `installation-report.txt`

## 💻 Usage Examples

### Interactive Chat
```python
from bear_ai import BearChat

# Initialize chat with privacy settings
chat = BearChat(
    model_path="models/llama-2-7b-chat.gguf",
    privacy_mode=True,
    pii_scrubbing=True
)

# Start conversation
response = chat.ask("Analyze this contract for key terms")
```

### Document Analysis
```python
from bear_ai import DocumentAnalyzer

# Analyze legal document
analyzer = DocumentAnalyzer()
result = analyzer.analyze_document(
    "contract.pdf",
    analysis_type="legal_terms",
    scrub_pii=True
)
```

### PII Scrubbing
```python
from bear_ai import PIIScrubber

# Scrub sensitive information
scrubber = PIIScrubber()
cleaned_text = scrubber.scrub_text(
    "John Doe's SSN is 123-45-6789",
    preserve_structure=True
)
```

## 🔧 Configuration

### Hardware Profiles
BEAR AI automatically detects your hardware and recommends optimal settings:

- **Laptop/Low-end**: 1-3B parameter models
- **Desktop/Mid-range**: 7-13B parameter models  
- **Workstation/High-end**: 30B+ parameter models
- **GPU Acceleration**: Automatic CUDA detection and optimization

### Privacy Settings
Configure privacy and security settings:

```python
# Configuration in ~/.bear_ai/config.yaml
privacy:
  pii_detection: true
  audit_logging: true
  secure_deletion: true
  encryption: true

performance:
  auto_model_selection: true
  gpu_acceleration: true
  memory_limit: "8GB"
```

## 📚 Documentation

### 📋 Professional Documentation (v2.0)
- [**🎨 UI Improvements Guide**](docs/UI_IMPROVEMENTS.md) - Complete overview of all interface enhancements
- [**🎯 Interface Selection Guide**](docs/INTERFACE_SELECTION_GUIDE.md) - Choose the best interface for your needs
- [**🤖 Model Management Guide**](docs/MODEL_MANAGEMENT_GUIDE.md) - AI model selection and hardware optimization
- [**🆘 Enhanced Troubleshooting**](docs/TROUBLESHOOTING.md) - Solutions for interface and system issues
- [**📝 Changelog**](CHANGELOG.md) - Complete record of v2.0 improvements

### 📚 Core Documentation  
- [Installation Guide](docs/INSTALLATION.md) - Complete setup instructions
- [User Manual](docs/USER_GUIDE.md) - How to use BEAR AI
- [PII Setup Guide](docs/PII_SETUP_GUIDE.md) - Privacy and security settings
- [Hardware Guide](docs/HARDWARE_GUIDE.md) - Hardware optimization
- [API Documentation](docs/API.md) - Developer reference

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone and setup development environment
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install in development mode with all features
pip install -e ".[dev,all]"

# Run tests
pytest tests/

# Format code
black src/
isort src/
```

## 🛡️ Security & Privacy

BEAR AI is designed with security and privacy as core principles:

- **Local Processing**: No data sent to external servers
- **Audit Trails**: Complete logging for compliance requirements
- **PII Protection**: Automatic detection and scrubbing of sensitive information
- **Secure Storage**: Encrypted local storage options
- **Regular Security Audits**: Ongoing security assessments

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Python**: 3.9+
- **RAM**: 8GB (16GB recommended)
- **Storage**: 10GB free space
- **CPU**: x64 processor with AVX2 support

### Recommended
- **RAM**: 32GB+ for large models
- **GPU**: NVIDIA GPU with 8GB+ VRAM for acceleration
- **Storage**: SSD with 50GB+ free space
- **CPU**: Modern multi-core processor (8+ cores)

## 🗺️ Roadmap

### Phase 1 (Current) - Core Features ✅
- [x] Basic AI inference engine
- [x] PII detection and scrubbing
- [x] GUI interface
- [x] Hardware optimization

### Phase 2 - Advanced Features 🚧
- [ ] Advanced RAG implementation
- [ ] Multi-modal document analysis
- [ ] Plugin ecosystem
- [ ] Advanced security features

### Phase 3 - Enterprise Features 📋
- [ ] Team collaboration features (offline-first)
- [ ] Advanced audit and compliance
- [ ] Local network integration APIs
- [ ] Enterprise deployment options

## 📜 License

This project is licensed under a proprietary license; see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

BEAR AI builds upon the work of the open-source AI community:

- [llama.cpp](https://github.com/ggerganov/llama.cpp) for efficient inference
- [Hugging Face](https://huggingface.co/) for model ecosystem
- [Presidio](https://github.com/microsoft/presidio) for PII detection
- [LanceDB](https://github.com/lancedb/lancedb) for offline vector storage and retrieval

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/KingOfTheAce2/BEAR_AI/discussions)
- **Documentation**: [docs/](docs/)

---

**BEAR AI** - Privacy-First AI for Professionals 🐻✨