# BEAR AI 🐻

**B**ridge for **E**xpertise, **A**udit and **R**esearch

> Privacy-First, Local-Only AI Assistant for Legal Professionals and Privacy Advocates

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/KingOfTheAce2/BEAR_AI)

## 🚀 Key Features

### 🔒 Privacy-First Design
- **Zero Network Calls**: Operates completely offline
- **No Telemetry**: Your data stays on your device
- **GDPR Compliant**: Built for privacy regulations
- **Audit Trail**: Complete logging for compliance

### 🛡️ Professional Security
- **PII Detection & Scrubbing**: Automatically identify and remove sensitive information
- **Document Security**: Secure processing of legal documents
- **Multi-format Support**: PDF, DOCX, TXT, and more
- **Encryption Ready**: Secure storage options

### ⚡ Intelligent Performance
- **Hardware Adaptive**: Automatic model recommendations based on your system
- **Memory Optimized**: Efficient resource usage
- **GPU Acceleration**: NVIDIA GPU support when available
- **Model Flexibility**: Support for any GGUF model

### 🎯 Built for Professionals
- **Legal Document Analysis**: Specialized for legal workflows
- **Multi-modal Support**: Text, images, audio processing
- **RAG Integration**: Document retrieval and analysis
- **Batch Processing**: Handle multiple documents efficiently

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

### 🪟 Windows One-Click Install (Recommended)
```batch
# 1. Download/clone BEAR AI
# 2. Double-click to install:
INSTALL_BEAR_AI.bat
```
**Features:**
- ✅ Automatic Python detection
- ✅ GPU acceleration auto-setup
- ✅ Desktop shortcuts created  
- ✅ Cleans old installations
- ✅ Complete system integration

[📚 **Detailed Windows Guide**](docs/WINDOWS_INSTALLATION.md)

### 🐧 Linux/Mac Installation
```bash
# Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install with AI capabilities
pip install -e ".[inference]"

# Or install with all features
pip install -e ".[all]"
```

### 🎯 Feature-Specific Installation
```bash
# For AI inference (required)
pip install -e ".[inference]"

# For multi-modal support (images, audio)
pip install -e ".[multimodal]"

# For PII detection and privacy
pip install -e ".[privacy]"

# For RAG and document analysis
pip install -e ".[rag]"

# For GUI interface
pip install -e ".[gui]"

# For hardware optimization
pip install -e ".[hardware]"

# Everything (except development tools)
pip install -e ".[all]"
```

## 🚀 Quick Start

### 🪟 Windows Users
1. **Install**: Double-click `INSTALL_BEAR_AI.bat`
2. **Launch**: Double-click "BEAR AI" desktop icon
3. **Ready**: Start using your privacy-first AI!

### 🐧 Linux/Mac Users
```bash
# 1. Install BEAR AI
pip install -e ".[inference]"

# 2. Initialize setup
bear-setup

# 3. Launch GUI
bear-gui
```

### 📱 All Platforms - Available Commands
```bash
bear-gui            # Launch GUI interface
bear-chat           # Start chat interface
bear-scrub file.pdf # Scrub PII from documents
bear-serve          # Start API server (optional)
bear-setup          # Initial configuration
```

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

- [Installation Guide](docs/INSTALLATION.md)
- [User Manual](docs/USER_GUIDE.md)
- [PII Setup Guide](docs/PII_SETUP_GUIDE.md)
- [Hardware Guide](docs/HARDWARE_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [API Documentation](docs/API.md)

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
- [ ] Team collaboration features
- [ ] Advanced audit and compliance
- [ ] Integration APIs
- [ ] Cloud-hybrid options

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

BEAR AI builds upon the work of the open-source AI community:

- [llama.cpp](https://github.com/ggerganov/llama.cpp) for efficient inference
- [Hugging Face](https://huggingface.co/) for model ecosystem
- [Presidio](https://github.com/microsoft/presidio) for PII detection
- [ChromaDB](https://github.com/chroma-core/chroma) for vector storage

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/KingOfTheAce2/BEAR_AI/discussions)
- **Documentation**: [docs/](docs/)

---

**BEAR AI** - Privacy-First AI for Professionals 🐻✨