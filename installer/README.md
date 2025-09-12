# BEAR AI Legal Assistant - Bulletproof Windows Installer

## 🚀 Quick Start

**For end users (recommended):**
1. Download and run `install-bulletproof.bat`
2. Follow the on-screen instructions
3. Launch using the desktop shortcut

## 🎯 Features

### ✅ What Makes This Bulletproof
- **No build dependencies** - No CMake, Visual Studio, or C++ compiler required
- **Wheels-only packages** - No compilation during installation
- **Clean dependency list** - Removed all problematic packages (llama-cpp-python, etc.)
- **Comprehensive error handling** - Clear error messages and troubleshooting
- **Works on vanilla Windows** - Tested on clean Windows 10/11 systems
- **Auto-validation** - 10-point installation verification
- **Desktop integration** - Shortcuts, Start Menu entries
- **Complete uninstaller** - Clean removal when needed

### 🛡️ Removed Problematic Dependencies
- ❌ `llama-cpp-python` (requires C++ build tools)
- ❌ `torch` (too large, complex installation)
- ❌ `opencv-python` (build dependencies)
- ❌ `spacy` models (large downloads)
- ❌ Any packages requiring compilation

### ✅ Clean Dependencies Only
- ✅ `pydantic` - Data validation
- ✅ `fastapi` - Web API framework  
- ✅ `uvicorn` - ASGI server
- ✅ `customtkinter` - Modern GUI
- ✅ `rich` - Terminal formatting
- ✅ `pypdf` - PDF processing
- ✅ `python-docx` - Word document handling
- ✅ `Pillow` - Image processing
- ✅ `psutil` - System monitoring

## 📁 Files

### Core Installer
- `install-bulletproof.bat` - Main installer (run this)
- `requirements-clean.txt` - Clean Python dependencies
- `bear_ai_launcher.py` - Production launcher script
- `uninstall.bat` - Complete uninstaller

### Generated During Install
- `Launch_BEAR_AI.bat` - Application launcher
- `config/bear_ai_config.json` - Application configuration
- Desktop shortcut: "BEAR AI Legal Assistant"
- Start Menu entry

## 🔧 Installation Process

### Step 1: System Requirements Check
- Python 3.9+ availability
- pip package manager
- Internet connectivity
- PowerShell availability

### Step 2: Download and Setup
- Downloads BEAR AI from GitHub
- Extracts to `%USERPROFILE%\BEAR_AI`
- Organizes file structure

### Step 3: Python Dependencies
- Creates virtual environment (recommended)
- Installs wheel-only packages
- Verifies core dependencies

### Step 4: Application Setup
- Creates directories (logs, temp, config, models)
- Generates configuration file
- Sets up production environment

### Step 5: Desktop Integration  
- Creates launcher scripts
- Desktop shortcut
- Start Menu entry

### Step 6: Validation
- Runs 10 validation tests
- Provides installation score
- Generates detailed logs

## 🚀 Usage

### After Installation

**Launch Methods:**
1. **Desktop shortcut** - Double-click "BEAR AI Legal Assistant"
2. **Start Menu** - Search for "BEAR AI"
3. **Direct launcher** - Run `Launch_BEAR_AI.bat`

**Available Interfaces:**
- **Desktop GUI** - User-friendly interface
- **Web Interface** - Modern browser-based UI
- **API Server** - For developers
- **Terminal Chat** - Command-line interface

### Command Line Options

```bash
# Launch GUI (default)
python installer/bear_ai_launcher.py

# Start web interface
python installer/bear_ai_launcher.py web

# Start API server
python installer/bear_ai_launcher.py api

# Terminal chat
python installer/bear_ai_launcher.py chat
```

## 🛠️ Troubleshooting

### Common Issues

**Python not found:**
- Install Python 3.9+ from https://python.org
- Ensure "Add Python to PATH" is checked during installation

**Dependencies fail to install:**
- Check internet connection
- Run installer as Administrator
- Clear pip cache: `python -m pip cache purge`

**Permission errors:**
- Run installer as Administrator
- Check antivirus software is not blocking

**Desktop shortcut doesn't work:**
- Run `Launch_BEAR_AI.bat` directly from installation folder
- Check paths in shortcut properties

### Error Logs
All installation steps are logged to:
- `%TEMP%\bear_ai_install.log` (installation)
- `%TEMP%\bear_ai_uninstall.log` (uninstallation)

### Manual Installation
If installer fails, you can install manually:

```bash
# 1. Install Python 3.9+
# 2. Download BEAR AI source
git clone https://github.com/KingOfTheAce2/BEAR_AI.git

# 3. Install clean dependencies
cd BEAR_AI
pip install -r installer/requirements-clean.txt

# 4. Launch
python installer/bear_ai_launcher.py
```

## 🗑️ Uninstallation

Run `installer/uninstall.bat` to completely remove:
- Installation directory
- Desktop and Start Menu shortcuts  
- Temporary files
- Running processes

## 🔒 Privacy & Security

- **Local-only processing** - No data sent to external servers
- **No telemetry** - No usage tracking or analytics
- **Open source** - All code is auditable
- **Clean installation** - No registry modifications or system changes

## 📋 System Requirements

### Minimum Requirements
- Windows 10 or Windows 11
- Python 3.9 or newer
- 2GB RAM
- 1GB disk space
- Internet connection (for installation only)

### Recommended
- Windows 11
- Python 3.11+
- 8GB RAM
- 5GB disk space (for models)
- SSD storage

## 🐛 Known Limitations

### Features Not Available in Clean Install
- **Local LLM inference** - Requires llama-cpp-python (complex build)
- **Advanced ML features** - Requires torch (large dependency)
- **Computer vision** - Requires opencv-python (build deps)
- **Advanced NLP** - Requires spacy models (large downloads)

### Workarounds
- Use **API mode** to connect to external LLM services
- **Web interface** provides full functionality through browser
- **Plugin system** allows adding features as needed

## 📞 Support

### Documentation
- Installation logs: `%TEMP%\bear_ai_install.log`
- User guide: `README.md`
- Configuration: `config/bear_ai_config.json`

### Getting Help
- **GitHub Issues**: https://github.com/KingOfTheAce2/BEAR_AI/issues
- **Include installation log** when reporting issues
- **Specify Windows version** and Python version

### Reporting Bugs
When reporting installation issues, please include:
1. Windows version (Windows 10/11)
2. Python version
3. Installation log file
4. Error messages
5. Steps to reproduce

## 🔄 Updates

### Updating BEAR AI
Currently manual process:
1. Run `uninstall.bat` to remove current installation
2. Run `install-bulletproof.bat` to install latest version

### Future Improvements
- Auto-updater functionality
- Incremental updates
- Background updates

---

**BEAR AI Legal Assistant** - Privacy-First, Local-Only Legal AI
🐻⚖️ Built for professionals who value privacy and security.