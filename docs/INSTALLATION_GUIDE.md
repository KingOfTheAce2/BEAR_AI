# BEAR AI Installation Guide

> **100% Offline**: BEAR AI operates completely offline with LanceDB vector storage. Zero network dependencies after installation.

## Quick Navigation
- [Non-Technical Users](#non-technical-users-easiest) ⭐ **Start Here**
- [Technical Users](#technical-users-standard)
- [Developers](#developers-advanced)
- [Portable/Offline](#portable-offline-installation)
- [Troubleshooting](#installation-troubleshooting)

---

## Non-Technical Users (Easiest)

### Option 1: Double-Click Installer (Recommended)
1. **Download BEAR AI** from GitHub releases
2. **Extract** the ZIP file to your Desktop or Documents folder
3. **Double-click** `scripts\setup_gui.bat`
4. **Wait** for installation (2-5 minutes, downloads ~500MB)
5. **Done!** The GUI will open automatically

### Option 2: Portable Executable
1. **Download** `bear_ai.exe` from GitHub releases  
2. **Double-click** to run immediately
3. **No installation needed**

> **Note**: Windows Defender might show a warning (safe to ignore - click "More info" → "Run anyway")

### First Time Setup
1. **Open the GUI** (should launch after installation)
2. **Get a model**:
   - Browse to local model files or use built-in model downloader
   - Select from pre-configured offline models
   - Select a model file (look for `q4_0` for good balance)
   - Click **"Download selected"**
3. **Start chatting**:
   - Click **"Browse"** and select your downloaded `.gguf` file
   - Type your question and click **"Start Chat"**

### What Gets Installed
- Python virtual environment (isolated from your system)
- BEAR AI application and required libraries
- Desktop shortcut for easy access
- Command line tools (optional)

---

## Technical Users (Standard)

### Prerequisites
- **Windows 10/11** (primary support)
- **8GB RAM** minimum, 16GB+ recommended
- **5GB disk space** for installation
- **Python 3.9+** (will be installed if missing)

### Quick Install
```powershell
# Clone or download BEAR AI
git clone https://github.com/YourOrg/BEAR_AI.git
cd BEAR_AI

# Run PowerShell installer
scripts\install.ps1

# Optional: Install with GPU support (if you have NVIDIA GPU)
scripts\install.ps1 -HW

# Optional: Install development tools
scripts\install.ps1 -Dev
```

### Manual Installation
```powershell
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install BEAR AI
pip install -e .[inference]

# Optional: Install hardware detection
pip install -e .[hw]

# Optional: Install development tools
pip install -e .[dev]
```

### GPU Acceleration Setup
```powershell
# Uninstall CPU-only version
pip uninstall llama-cpp-python

# Install CUDA version (requires NVIDIA GPU + CUDA toolkit)
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
```

### Verification
```powershell
# Test installation
python -m bear_ai --version

# Test model download
python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF --list

# Test GUI
python -m bear_ai.gui
```

---

## Developers (Advanced)

### Development Setup
```bash
# Clone repository
git clone https://github.com/YourOrg/BEAR_AI.git
cd BEAR_AI

# Create development environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Install in editable mode with all extras
pip install -e .[dev,hw,inference]

# Install pre-commit hooks
pre-commit install

# Run tests
pytest -v

# Run linting
black .
isort .
flake8 .
```

### Building Executables
```powershell
# Install PyInstaller
pip install pyinstaller

# Build main executable
pyinstaller packaging/pyinstaller/bear-ai.spec

# Build chat utility
pyinstaller packaging/pyinstaller/bear-chat.spec

# Build PII scrubber
pyinstaller packaging/pyinstaller/bear-scrub.spec

# Executables will be in dist/ folder
```

### Development Tools
```powershell
# Code formatting
black src/ tests/
isort src/ tests/

# Type checking
mypy src/

# Security scanning
bandit -r src/

# Test coverage
pytest --cov=src/bear_ai --cov-report=html
```

### Project Structure
```
BEAR_AI/
├── src/bear_ai/          # Main application code
├── tests/                # Test suite
├── docs/                 # Documentation
├── scripts/              # Installation and utility scripts
├── packaging/            # Build configurations
├── pii/                  # PII handling modules
└── pyproject.toml        # Project configuration
```

---

## Portable/Offline Installation

### For Air-Gapped Systems
1. **Download** offline installer package
2. **Transfer** to target system via USB
3. **Run** `offline_install.bat`
4. **No internet required** after initial download

### Corporate/Restricted Environments
```powershell
# Install from local wheel files
pip install bear_ai-0.1.0-py3-none-any.whl --no-deps --no-index

# Use pre-downloaded models
python -m bear_ai --local-model path\to\model.gguf
```

### Docker Container (Advanced)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install -e .[inference]

EXPOSE 8000
CMD ["python", "-m", "bear_ai.gui", "--host", "0.0.0.0"]
```

---

## Installation Troubleshooting

### Common Issues

#### "Python not found" or "pip not found"
**Solution**: Install Python 3.9+ from python.org
```powershell
# Check Python version
python --version

# Should show Python 3.9.0 or higher
```

#### "Permission denied" or "Access is denied"
**Solutions**:
1. **Run as Administrator**: Right-click PowerShell → "Run as administrator"
2. **Execution Policy**: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. **Antivirus**: Temporarily disable real-time protection

#### GUI Won't Start
**Solutions**:
```powershell
# Check if tkinter is available
python -c "import tkinter; print('Tkinter OK')"

# If fails, install tkinter
# On Windows: Reinstall Python with "tcl/tk" option checked
# On Linux: sudo apt-get install python3-tk
```

#### "CUDA not found" or GPU Not Working
**Solutions**:
1. **Verify NVIDIA GPU**: `nvidia-smi`
2. **Install CUDA Toolkit**: Download from NVIDIA website
3. **Reinstall GPU version**:
   ```powershell
   pip uninstall llama-cpp-python
   pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
   ```

#### Models Won't Download
**Solutions**:
1. **Check internet connection**
2. **Verify Hugging Face access**: `huggingface-cli whoami`
3. **Use VPN** if corporate firewall blocks access
4. **Manual download**: Download from huggingface.co and place in `models/` folder

#### Out of Memory Errors
**Solutions**:
1. **Use smaller models**: Try `q4_0` quantized versions
2. **Close other applications**
3. **Increase virtual memory**: Windows Settings → System → Advanced → Performance → Virtual memory
4. **Use CPU-only mode** if GPU memory is insufficient

### Platform-Specific Issues

#### Windows 11 ARM (Surface/Apple Silicon via Parallels)
```powershell
# Use CPU-only installation
pip install -e . --no-deps
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
```

#### Windows Subsystem for Linux (WSL)
```bash
# Install GUI dependencies
sudo apt-get install python3-tk

# For GPU support in WSL2
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
```

### Getting Help

#### Self-Diagnosis
```powershell
# Run system check
python -m bear_ai --diagnose

# Check hardware compatibility
python -m bear_ai --suggest

# Verbose logging
python -m bear_ai.gui --verbose
```

#### Log Files
- **Installation logs**: `scripts\install.log`
- **Application logs**: `%USERPROFILE%\.bear_ai\logs\bear_ai.log`
- **Error logs**: `%USERPROFILE%\.bear_ai\logs\error.log`

#### Community Support
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Community Q&A and tips
- **Documentation**: Check `/docs` folder for detailed guides

#### Emergency Recovery
```powershell
# Complete reset
rmdir /s .venv
rmdir /s %USERPROFILE%\.bear_ai
scripts\install.ps1

# Fresh install
git pull origin main
scripts\install.ps1 -Force
```

---

## System Requirements

### Minimum Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 | Windows 11 |
| **RAM** | 8GB | 16GB+ |
| **Storage** | 5GB free | 50GB+ (for models) |
| **CPU** | Dual-core 2GHz | Quad-core 3GHz+ |
| **GPU** | None (CPU mode) | NVIDIA GTX 1060+ |

### Model-Specific Requirements
| Model Size | RAM Needed | VRAM Needed | Performance |
|------------|------------|-------------|-------------|
| **7B (q4_0)** | 6GB | 4GB | Fast |
| **13B (q4_0)** | 10GB | 8GB | Good |
| **30B (q4_0)** | 20GB | 16GB | Slow |
| **70B (q4_0)** | 40GB | 32GB | Very Slow |

### Performance Optimization
- **SSD Storage**: 3x faster model loading
- **More RAM**: Handle larger documents and context
- **NVIDIA GPU**: 10-50x faster inference
- **Fast CPU**: Better for CPU-only inference

---

*Need help? Check our [Troubleshooting Guide](TROUBLESHOOTING.md) or [Hardware Guide](HARDWARE_GUIDE.md)!*