# BEAR AI Installation Guide

This comprehensive guide covers installation procedures for different user types, from complete beginners to advanced developers. Choose the method that best fits your technical comfort level.

---

## 🎯 Choose Your Installation Method

| User Type | Recommended Method | Time Required | Technical Skills Needed |
|-----------|-------------------|---------------|------------------------|
| **Complete Beginner** | [One-Click Installer](#-option-1-one-click-installer-recommended) | 5-10 minutes | None |
| **Casual User** | [Portable Version](#-option-2-portable-version) | 2-5 minutes | Basic file management |
| **Technical User** | [Python Package](#-option-3-python-package-installation) | 3-8 minutes | Python familiarity |
| **Developer** | [Development Setup](#-option-4-development-installation) | 10-15 minutes | Git, Python, virtual environments |
| **Enterprise** | [Offline Installation](#-option-5-offline-enterprise-installation) | 15-30 minutes | System administration |

---

## 🚀 Option 1: One-Click Installer (Recommended)

**Perfect for**: Non-technical users, first-time installation, quick setup

### Windows Installation

1. **Download BEAR AI**:
   - Visit: https://github.com/KingOfTheAce2/BEAR_AI
   - Click "Code" → "Download ZIP"
   - Extract to a folder (e.g., `C:\BEAR_AI`)

2. **Run the Installer**:
   ```batch
   # Double-click this file:
   scripts\setup_gui.bat
   ```
   
   **What happens during installation:**
   - ✅ Checks for Python (installs if missing)
   - ✅ Creates isolated environment
   - ✅ Downloads all dependencies
   - ✅ Sets up GPU acceleration (if available)
   - ✅ Creates desktop shortcut
   - ✅ Opens BEAR AI when complete

3. **First Run**:
   - GUI opens automatically after setup
   - Enter a model: `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
   - Click "Assess & List" to see compatible files
   - Select and download a model
   - Start chatting!

### macOS Installation

1. **Install Prerequisites**:
   ```bash
   # Install Homebrew (if not already installed)
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Python
   brew install python@3.11
   ```

2. **Download and Setup**:
   ```bash
   # Download BEAR AI
   git clone https://github.com/KingOfTheAce2/BEAR_AI.git
   cd BEAR_AI
   
   # Run installer
   bash scripts/setup_gui.sh
   ```

### Linux Installation

1. **Install Prerequisites**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3.11 python3.11-venv python3.11-tk git
   
   # CentOS/RHEL
   sudo yum install python3.11 python3.11-venv python3.11-tkinter git
   
   # Arch Linux
   sudo pacman -S python python-tk git
   ```

2. **Download and Setup**:
   ```bash
   git clone https://github.com/KingOfTheAce2/BEAR_AI.git
   cd BEAR_AI
   bash scripts/setup_gui.sh
   ```

---

## 📦 Option 2: Portable Version

**Perfect for**: Locked-down systems, no installation permissions, temporary use

### Download Portable Executable

1. **Get the Latest Release**:
   - Visit: https://github.com/KingOfTheAce2/BEAR_AI/releases
   - Download: `BEAR_AI_Portable_v1.0.0.zip`
   - Extract to any folder

2. **Run BEAR AI**:
   ```cmd
   # Double-click:
   BEAR_AI.exe
   ```

3. **No Installation Required**:
   - ✅ Runs from any folder
   - ✅ No registry changes
   - ✅ No admin rights needed
   - ✅ Fully contained

### Build Your Own Portable Version

If you need a custom portable build:

```powershell
# Clone repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install build tools
pip install pyinstaller

# Build portable executable
python scripts/build_exe.py

# Find your executable in:
# dist/BEAR_AI.exe
```

---

## 🐍 Option 3: Python Package Installation

**Perfect for**: Python users, command-line preference, custom setups

### Prerequisites

- **Python 3.8+** (Python 3.11 recommended)
- **pip** package manager
- **Git** (for latest features)

### Quick Installation

```powershell
# Clone repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Install with all features
pip install -e .[inference]

# Launch GUI
python -m bear_ai.gui
```

### Custom Installation Options

```powershell
# Basic installation (minimal dependencies)
pip install -e .

# With inference engine
pip install -e .[inference]

# With hardware acceleration
pip install -e .[inference,hw]

# Development installation
pip install -e .[dev]

# Complete installation (everything)
pip install -e .[all]
```

### Virtual Environment Setup

**Recommended for Python users:**

```powershell
# Create isolated environment
python -m venv bear_env

# Activate environment
# Windows:
bear_env\Scripts\activate
# macOS/Linux:
source bear_env/bin/activate

# Install BEAR AI
pip install -e .[inference]

# Verify installation
python -c "import bear_ai; print('Installation successful!')"
```

---

## 👨‍💻 Option 4: Development Installation

**Perfect for**: Contributors, customization, advanced features

### Full Development Setup

```bash
# Clone with development branch
git clone -b develop https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Create development environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install development dependencies
pip install -e .[dev]

# Install pre-commit hooks
pre-commit install

# Verify setup
pytest -v
python -m bear_ai --version
```

### Development Tools Included

- **Testing**: pytest, coverage
- **Code Quality**: black, flake8, mypy
- **Pre-commit Hooks**: Automatic code formatting
- **Documentation**: Sphinx for docs building
- **Packaging**: Build tools for releases

### Building Documentation

```bash
# Generate documentation
cd docs
make html  # Linux/macOS
make.bat html  # Windows

# View documentation
open _build/html/index.html  # macOS
xdg-open _build/html/index.html  # Linux
start _build\html\index.html  # Windows
```

---

## 🏢 Option 5: Offline/Enterprise Installation

**Perfect for**: Corporate environments, air-gapped systems, compliance requirements

### Offline Package Preparation

**On a connected system:**

```powershell
# Download all dependencies
pip download -r requirements.txt -d offline_packages/
pip download -e .[inference] -d offline_packages/

# Create offline installer package
tar -czf bear_ai_offline.tar.gz BEAR_AI/ offline_packages/
```

### Offline Installation

**On the target system:**

```powershell
# Extract package
tar -xzf bear_ai_offline.tar.gz
cd BEAR_AI

# Install from local packages
pip install --no-index --find-links ../offline_packages/ -e .[inference]

# Verify installation
python -m bear_ai --version
```

### Docker Installation

For containerized deployments:

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install -e .[inference]
EXPOSE 8080

CMD ["python", "-m", "bear_ai.server"]
```

```bash
# Build and run
docker build -t bear_ai .
docker run -p 8080:8080 bear_ai
```

### Enterprise Configuration

```yaml
# config/enterprise.yaml
installation:
  offline_mode: true
  proxy:
    http: "http://proxy.company.com:8080"
    https: "http://proxy.company.com:8080"
  
security:
  audit_logging: true
  pii_scrubbing: mandatory
  access_control: rbac
  
performance:
  max_concurrent_users: 100
  model_cache_size: "10GB"
  gpu_allocation: "shared"
```

---

## 🔧 Hardware Optimization

### GPU Acceleration Setup

#### NVIDIA GPUs

```powershell
# Check CUDA availability
nvidia-smi

# Install CUDA-optimized version
pip uninstall llama-cpp-python
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu118

# Verify GPU support
python -c "import llama_cpp; print('GPU support:', llama_cpp.llama_supports_gpu_offload())"
```

#### AMD GPUs (Experimental)

```powershell
# Install ROCm version (Linux only)
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/rocm

# Note: AMD support is experimental; CPU mode is recommended for reliability
```

### Memory Optimization

```powershell
# Low-memory systems (8GB RAM)
export BEAR_AI_LOW_MEMORY=1
python -m bear_ai.gui --low-memory

# High-memory systems (32GB+ RAM)
export BEAR_AI_HIGH_MEMORY=1
python -m bear_ai.gui --enable-large-models
```

---

## 📱 Cross-Platform Considerations

### Windows-Specific

- **Windows Defender**: May flag executables; add exclusion
- **PowerShell Execution Policy**: May need `Set-ExecutionPolicy RemoteSigned`
- **Visual C++ Redistributable**: Required for some dependencies

### macOS-Specific

- **Xcode Command Line Tools**: `xcode-select --install`
- **Homebrew**: Recommended for Python installation
- **Apple Silicon**: Use native ARM64 builds when available

### Linux-Specific

- **System Dependencies**: Install dev headers for compilation
- **AppArmor/SELinux**: May need policy adjustments
- **Desktop Environment**: Ensure GUI support is installed

---

## 🔍 Installation Verification

### Quick Health Check

```powershell
# Comprehensive system check
python -m bear_ai --health-check
```

**This checks:**
- ✅ Python version compatibility
- ✅ Required dependencies installed
- ✅ GPU detection and CUDA availability
- ✅ Model directory structure
- ✅ Network connectivity
- ✅ File permissions
- ✅ Memory and disk space

### Manual Verification Steps

```powershell
# 1. Check core installation
python -c "import bear_ai; print('Core:', bear_ai.__version__)"

# 2. Test model download
python -m bear_ai microsoft/DialoGPT-small --list

# 3. Verify GUI
python -m bear_ai.gui --test-mode

# 4. Test inference
bear-chat --model path/to/model.gguf --prompt "Hello" --n-predict 10

# 5. Check PII scrubbing
bear-scrub --test "John Doe's email is john@example.com"
```

---

## 🆘 Common Installation Issues

### Issue: "Python not found"

**Solution:**
```powershell
# Use the automated installer - it handles Python
scripts\setup_gui.bat

# Or install Python manually from python.org
# Ensure "Add Python to PATH" is checked
```

### Issue: "Permission denied"

**Solutions:**
```powershell
# Option 1: Run as Administrator
# Right-click PowerShell → "Run as administrator"

# Option 2: Use user installation
pip install --user -e .[inference]

# Option 3: Use virtual environment
python -m venv bear_env
bear_env\Scripts\activate
pip install -e .[inference]
```

### Issue: "CUDA not available"

**Solutions:**
```powershell
# 1. Install NVIDIA drivers from nvidia.com
# 2. Install CUDA toolkit
# 3. Install CUDA-enabled llama-cpp-python

pip uninstall llama-cpp-python
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu118

# 4. Verify with:
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
```

### Issue: "Out of memory"

**Solutions:**
- Use smaller models (7B instead of 13B)
- Close other applications
- Use Q4_0 quantization instead of higher precision
- Enable model offloading to GPU

### Issue: "Network timeout"

**Solutions:**
- Check internet connection
- Configure proxy settings if behind corporate firewall
- Use resume flag for interrupted downloads
- Download models manually from Hugging Face

---

## 📦 Dependency Management

### Core Dependencies

| Package | Purpose | Optional |
|---------|---------|----------|
| `llama-cpp-python` | Inference engine | Required |
| `huggingface-hub` | Model downloads | Required |
| `tkinter` | GUI framework | GUI only |
| `presidio-analyzer` | PII detection | Privacy features |
| `spacy` | NLP processing | Privacy features |
| `pypdf` | PDF processing | Document support |
| `python-docx` | DOCX processing | Document support |

### Version Requirements

- **Python**: 3.8 - 3.11 (3.11 recommended)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB minimum, 100GB recommended
- **OS**: Windows 10+, macOS 10.15+, Linux (most distributions)

---

## 🔄 Updates and Maintenance

### Updating BEAR AI

```powershell
# Update to latest version
cd BEAR_AI
git pull origin main
pip install -e .[inference] --upgrade

# Update dependencies
pip install --upgrade -r requirements.txt

# Clear model cache if needed
python -m bear_ai --clear-cache
```

### Automatic Updates

```powershell
# Enable automatic updates (enterprise)
python -m bear_ai --enable-auto-update

# Check for updates
python -m bear_ai --check-updates

# Update models
python -m bear_ai --update-models
```

---

## 🎉 Next Steps After Installation

1. **Download Your First Model**:
   ```powershell
   python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF model.q4_0.gguf
   ```

2. **Launch the GUI**:
   ```powershell
   python -m bear_ai.gui
   ```

3. **Create Desktop Shortcut**:
   ```powershell
   scripts\create_shortcut.bat
   ```

4. **Read the Documentation**:
   - [Model Selection Guide](INSTALLATION_MODEL_SELECTION.md)
   - [Troubleshooting Guide](TROUBLESHOOTING.md)
   - [User Manual](../README.md)

5. **Join the Community**:
   - GitHub Discussions for questions
   - Report bugs via GitHub Issues
   - Contribute improvements via Pull Requests

---

**🎯 Ready to get started?** Your BEAR AI installation is complete! Launch the GUI and start exploring privacy-first AI.

*For technical support or questions, visit our [GitHub repository](https://github.com/KingOfTheAce2/BEAR_AI) or check the [Troubleshooting Guide](TROUBLESHOOTING.md).*