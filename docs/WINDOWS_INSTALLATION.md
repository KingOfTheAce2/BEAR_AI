# Windows Installation Guide for BEAR AI

## 🚀 One-Click Installation (Recommended)

The easiest way to install BEAR AI on Windows is using the one-click installer:

### Quick Start
1. **Download BEAR AI**: Clone or download the repository
2. **Run Installer**: Double-click `INSTALL_BEAR_AI.bat`  
3. **Follow Prompts**: The installer handles everything automatically
4. **Launch**: Use the desktop shortcut or double-click `run.bat`

### What the Installer Does
- ✅ Detects your Python installation (or guides you to install it)
- ✅ Creates isolated virtual environment
- ✅ Installs all dependencies automatically
- ✅ Detects GPU and installs appropriate AI acceleration
- ✅ Creates desktop and Start Menu shortcuts
- ✅ Cleans up any previous installations
- ✅ Tests the installation to ensure everything works

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10 (1903 or later) or Windows 11
- **Python**: 3.9+ (Python 3.12 recommended for best performance)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 5GB free space
- **CPU**: x64 processor with AVX2 support

### Recommended for Best Experience
- **RAM**: 32GB+ (for large AI models)
- **GPU**: NVIDIA GPU with 8GB+ VRAM (automatic detection)
- **Storage**: SSD with 20GB+ free space
- **CPU**: Modern multi-core processor (8+ cores)

## 🛠️ Installation Methods

### Method 1: One-Click Installer (Easiest)
```batch
# Download BEAR AI, then:
INSTALL_BEAR_AI.bat
```

### Method 2: PowerShell Script (Advanced Users)
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process
.\scripts\install.ps1 -CreateShortcut
```

### Method 3: Manual Installation (Developers)
```batch
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install BEAR AI with AI capabilities
pip install -e ".[inference,hardware]"

# For GPU acceleration (NVIDIA only)
pip install -e ".[inference,hardware,gpu]"
```

## 🔧 Available Scripts in `/scripts` Folder

| Script | Purpose | Usage |
|--------|---------|--------|
| **`install.ps1`** | PowerShell installer with advanced options | `powershell .\scripts\install.ps1` |
| **`setup_conda.ps1`** | Conda-based installation (no compiler needed) | `powershell .\scripts\setup_conda.ps1` |
| **`create_shortcut.ps1`** | Create desktop shortcut only | `powershell .\scripts\create_shortcut.ps1` |
| **`run_gui.bat`** | Launch GUI interface | `.\scripts\run_gui.bat` |
| **`run_chat.bat`** | Launch chat interface | `.\scripts\run_chat.bat` |
| **`run_cli.bat`** | Launch command-line interface | `.\scripts\run_cli.bat` |
| **`run_scrub.bat`** | Launch PII scrubbing tool | `.\scripts\run_scrub.bat` |
| **`run_gui.vbs`** | Silent GUI launcher (no console window) | Double-click |
| **`build_exe.py`** | Build standalone executable | `python .\scripts\build_exe.py` |

## 🚀 Launching BEAR AI

After installation, you can start BEAR AI in several ways:

### 1. Desktop Shortcut (Easiest)
- Double-click the "BEAR AI" desktop icon

### 2. Main Launcher
```batch
run.bat
```

### 3. Start Menu
- Windows Key → "BEAR AI" → Click

### 4. Individual Components
```batch
scripts\run_gui.bat      # GUI Interface
scripts\run_chat.bat     # Chat Interface  
scripts\run_cli.bat      # Command Line
scripts\run_scrub.bat    # PII Scrubber
```

## 🔄 Updating BEAR AI

### Clean Update (Recommended)
1. Run `INSTALL_BEAR_AI.bat`
2. Choose "Fresh install" when prompted
3. This removes old version and installs latest

### Quick Update
```batch
.venv\Scripts\pip install -e . --upgrade
```

## 🗑️ Uninstalling BEAR AI

### Complete Removal
1. Double-click `UNINSTALL_BEAR_AI.bat`
2. Follow the prompts to remove all components
3. Optionally remove user data and models

### Manual Cleanup
```batch
# Remove virtual environment
rmdir /s .venv

# Remove shortcuts
del "%USERPROFILE%\Desktop\BEAR AI.lnk"

# Remove user data (optional)
rmdir /s "%USERPROFILE%\.bear_ai"
```

## 🐛 Troubleshooting Common Issues

### Python Not Found
**Error**: `Python 3.9+ not found`
**Solution**: 
1. Install Python from https://www.python.org/downloads/windows/
2. ✅ Check "Add Python to PATH" during installation
3. Restart Command Prompt and try again

### Installation Fails
**Error**: `Installation failed`
**Solutions**:
1. Run installer as Administrator
2. Check antivirus is not blocking installation
3. Ensure 5GB+ free disk space
4. Check internet connection

### GUI Won't Start  
**Error**: `GUI exited with error`
**Solutions**:
1. Ensure virtual environment exists: `.venv\Scripts\python.exe`
2. Reinstall: `INSTALL_BEAR_AI.bat` → "Fresh install"
3. Check system requirements (8GB+ RAM)

### GPU Not Detected
**Issue**: CPU-only installation despite having NVIDIA GPU
**Solutions**:
1. Install/update NVIDIA drivers
2. Run installer again (it auto-detects GPU)
3. Manual GPU install: `pip install -e ".[inference,gpu]"`

## 🔐 Security Considerations

### Windows Defender SmartScreen
- BEAR AI scripts may trigger SmartScreen warnings
- This is normal for new/unsigned scripts
- Click "More info" → "Run anyway" if prompted

### Antivirus Software
- Some antivirus programs may flag Python AI packages
- Add BEAR AI folder to antivirus exclusions if needed
- All BEAR AI code is open source and auditable

### User Account Control (UAC)
- Admin privileges are optional
- Running as standard user is recommended for personal use
- Admin required only for system-wide Start Menu shortcuts

## 📚 Advanced Installation Options

### Development Installation
```batch
# Clone repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Development install with all features
pip install -e ".[dev,inference,multimodal,rag,privacy,hardware]"

# Setup pre-commit hooks
pre-commit install
```

### Custom Python Environment
```batch
# Using specific Python version
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -e ".[inference]"
```

### Conda Installation (Alternative)
```batch
# Use conda for dependency management
scripts\setup_conda.ps1

# Or manually:
conda create -n bearai python=3.12
conda activate bearai
pip install -e .
```

## 💡 Tips for Best Performance

1. **Use Python 3.12**: Best compatibility with AI libraries
2. **Install on SSD**: Faster model loading
3. **Close other applications**: More RAM for AI models  
4. **GPU acceleration**: Dramatically faster inference
5. **Regular updates**: Get latest performance improvements

## 🆘 Getting Help

If you encounter issues:

1. **Documentation**: Check `docs\TROUBLESHOOTING.md`
2. **GitHub Issues**: https://github.com/KingOfTheAce2/BEAR_AI/issues
3. **Logs**: Check `bear_ai.log` for error details
4. **Clean Install**: Try `INSTALL_BEAR_AI.bat` with "Fresh install"

---

**BEAR AI** - Your Privacy-First Local AI Assistant 🐻✨