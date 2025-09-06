# BEAR AI 🐻

**B**ridge for **E**xpertise, **A**udit and **R**esearch

> Privacy-First, Local-Only AI Assistant for Legal Professionals and Privacy Advocates

[![License: Proprietary](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)
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

### 🚀 Quick Install (All Platforms)
```bash
# 1. Clone or download BEAR AI
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# 2. Create virtual environment (recommended)
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/Mac:
source .venv/bin/activate

# 4. Install BEAR AI
pip install -e .

# 5. Launch GUI
bear-ai-gui
```

### 🪟 Windows One-Click Install (Alternative)
```batch
# 1. Download/clone BEAR AI
# 2. Double-click to install:
INSTALL.bat
```
**Enhanced Features:**
- ✅ **Multiple GUI Options**: Modern, Professional, Simple, and Interface Selector
- ✅ Automatic Python detection and virtual environment setup
- ✅ Smart dependency management with fallback handling
- ✅ GPU acceleration auto-setup with hardware detection
- ✅ Desktop shortcuts created for all interfaces
- ✅ Start Menu integration with professional presentation
- ✅ Cleans old installations completely
- ✅ Complete system integration with error recovery

### 🎯 Feature-Specific Installation
```bash
# Core installation (minimal)
pip install -e .

# With AI inference capabilities
pip install -e ".[inference]"

# With GUI interface
pip install -e ".[gui]"

# With all features
pip install -e ".[all]"

# Development mode (includes testing tools)
pip install -e ".[dev,all]"
```

## 🚀 Quick Start

### ⚡ Launch Methods (After Installation)

#### Method 1: Console Scripts (Recommended)
```bash
bear-ai-gui         # Launch main GUI
bear-ai chat        # Interactive chat
bear-ai-scrub       # PII scrubbing tool
bear-ai-setup       # Configuration
```

#### Method 2: Python Module
```bash
python -m bear_ai.gui    # Launch GUI
python -m bear_ai        # Main application
```

#### Method 3: Legacy GUI Files (Still Supported)
```bash
python gui_launcher.py   # Interface selector
python modern_gui.py     # Modern interface
python simple_gui.py     # Simple interface
```

### 🎨 Interface Options Available
- **🚀 Interface Selector**: Choose your preferred interface (main launcher)
- **🎨 Modern GUI**: Professional dark theme with CustomTkinter styling
- **💼 Professional GUI**: Advanced PyQt6 interface with document management
- **📱 Simple GUI**: Basic Tkinter interface for maximum compatibility

### 📋 Verification Commands
Test your installation:
```bash
# Test basic functionality
python -c "import bear_ai; print('✅ Installation successful')"

# Test GUI module
python -c "import bear_ai.gui; print('✅ GUI available')"

# Test console scripts
bear-ai-gui --help

# Run verification script
python scripts/verify_launch_simple.py
```

### 🆘 Quick Troubleshooting
If you encounter issues:

1. **Ensure virtual environment is activated**:
   ```bash
   # Windows
   .\.venv\Scripts\Activate.ps1
   # Linux/Mac  
   source .venv/bin/activate
   ```

2. **Reinstall package**:
   ```bash
   pip uninstall bear-ai
   pip install -e .
   ```

3. **Use module execution as fallback**:
   ```bash
   python -m bear_ai.gui
   ```

📚 **Detailed Guides:**
- [📘 Launch Guide](docs/launch.md) - Complete launch documentation
- [📗 Migration Guide](docs/migration-guide.md) - Migrating from old methods
- [📙 Installation Guide](docs/INSTALLATION_IMPROVEMENTS.md) - Enhanced installation

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

### 📋 New Professional Documentation (v2.0)
- [**🎨 UI Improvements Guide**](docs/UI_IMPROVEMENTS.md) - Complete overview of all interface enhancements
- [**🛠️ Installation Improvements**](docs/INSTALLATION_IMPROVEMENTS.md) - Enhanced installation process and features  
- [**🎯 Interface Selection Guide**](docs/INTERFACE_SELECTION_GUIDE.md) - Choose the best interface for your needs
- [**🤖 Model Management Guide**](docs/MODEL_MANAGEMENT_GUIDE.md) - AI model selection and hardware optimization
- [**🆘 Enhanced Troubleshooting**](docs/TROUBLESHOOTING.md) - Solutions for new interface and installation issues
- [**📝 Changelog**](CHANGELOG.md) - Complete record of v2.0 improvements

### 📚 Existing Documentation  
- [Installation Guide](docs/INSTALLATION.md)
- [User Manual](docs/USER_GUIDE.md)
- [PII Setup Guide](docs/PII_SETUP_GUIDE.md)
- [Hardware Guide](docs/HARDWARE_GUIDE.md)
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

This project is licensed under a proprietary license; see the [LICENSE](LICENSE) file for details.

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