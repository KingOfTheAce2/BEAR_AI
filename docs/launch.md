# BEAR AI Launch Guide

## 🚀 Quick Start Guide

BEAR AI provides multiple ways to launch the application depending on your needs and environment. This guide covers all launch methods with clear instructions for both Windows PowerShell and bash environments.

## Installation & Launch Process

### Step 1: Install BEAR AI

#### 🪟 Windows (Recommended)
```powershell
# Option 1: One-click install (easiest)
# Double-click INSTALL.bat in the project directory

# Option 2: Manual install
# Navigate to project directory
cd path\to\BEAR_AI

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install BEAR AI in development mode
pip install -e .

# Or install with all features
pip install -e ".[all]"
```

#### 🐧 Linux/Mac
```bash
# Navigate to project directory
cd path/to/BEAR_AI

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install BEAR AI in development mode
pip install -e .

# Or install with all features
pip install -e ".[all]"
```

### Step 2: Launch BEAR AI

Once installed, you have multiple launch options:

## 🎯 Launch Methods

### Method 1: Console Scripts (Recommended)
After `pip install -e .`, these console scripts are available:

```bash
# Launch main GUI application
bear-ai-gui

# Alternative GUI launcher
bear-ai gui

# Interactive chat interface
bear-ai-chat

# PII scrubbing tool
bear-ai-scrub document.pdf

# Setup and configuration
bear-ai-setup
```

### Method 2: Python Module (Cross-platform)
```bash
# Launch GUI via module
python -m bear_ai.gui

# Launch main application
python -m bear_ai

# Launch chat interface
python -m bear_ai.chat
```

### Method 3: Direct Python Execution
```bash
# From project root directory
python src/bear_ai/gui/desktop_app.py

# Or legacy GUI files
python gui_launcher.py
python modern_gui.py
python simple_gui.py
```

### Method 4: Windows Batch Files (Windows Only)
```batch
# Use the installer-created shortcuts
"BEAR AI Interface Selector"    # Choose GUI type
"BEAR AI Modern"               # Modern dark theme
"BEAR AI Professional"         # Advanced PyQt6 interface
"BEAR AI Simple"              # Basic compatibility

# Or run batch files directly
launch_gui_selector.bat
launch_modern.bat
launch_professional.bat
launch_simple.bat
```

## 🔧 Troubleshooting Common Issues

### ImportError: No module named 'bear_ai'

**Problem**: Python can't find the bear_ai module

**Solutions**:
1. **Ensure proper installation**:
   ```bash
   pip install -e .
   # Verify installation
   pip show bear-ai
   ```

2. **Check virtual environment**:
   ```bash
   # Windows
   .\.venv\Scripts\Activate.ps1
   
   # Linux/Mac
   source .venv/bin/activate
   ```

3. **Verify PYTHONPATH**:
   ```bash
   # Add src directory to path
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
   ```

### ModuleNotFoundError: No module named 'bear_ai.gui'

**Problem**: GUI module not found or incorrectly structured

**Solutions**:
1. **Check module structure**:
   ```bash
   # Verify files exist
   ls src/bear_ai/gui/
   ls src/bear_ai/gui/__init__.py
   ```

2. **Reinstall with GUI dependencies**:
   ```bash
   pip install -e ".[gui]"
   ```

3. **Use alternative launch method**:
   ```bash
   # Try direct file execution
   python src/bear_ai/gui/desktop_app.py
   ```

### Console Scripts Not Found

**Problem**: `bear-ai-gui` command not recognized

**Solutions**:
1. **Reinstall package**:
   ```bash
   pip uninstall bear-ai
   pip install -e .
   ```

2. **Check PATH and scripts**:
   ```bash
   # Windows
   where bear-ai-gui
   
   # Linux/Mac  
   which bear-ai-gui
   ```

3. **Use full Python path**:
   ```bash
   python -m bear_ai.gui
   ```

### Permission Errors (Windows)

**Problem**: Access denied during installation or launch

**Solutions**:
1. **Run as Administrator**:
   - Right-click PowerShell → "Run as Administrator"
   - Run installation commands

2. **Use User Installation**:
   ```powershell
   pip install --user -e .
   ```

3. **Check Execution Policy**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Virtual Environment Issues

**Problem**: Commands work in one terminal but not another

**Solutions**:
1. **Always activate environment**:
   ```bash
   # Windows
   .\.venv\Scripts\Activate.ps1
   
   # Linux/Mac
   source .venv/bin/activate
   ```

2. **Verify active environment**:
   ```bash
   which python
   pip list | grep bear-ai
   ```

3. **Recreate environment if needed**:
   ```bash
   rm -rf .venv
   python -m venv .venv
   # Activate and reinstall
   ```

## 🌍 Cross-Platform Compatibility

### Windows
- ✅ PowerShell (recommended)
- ✅ Command Prompt
- ✅ Windows Terminal
- ✅ Git Bash
- ✅ WSL (Windows Subsystem for Linux)

### macOS
- ✅ Terminal.app
- ✅ iTerm2
- ✅ zsh
- ✅ bash

### Linux
- ✅ bash
- ✅ zsh
- ✅ fish
- ✅ Any POSIX shell

## ⚡ Performance Tips

### Fast Launch Methods (in order of speed)
1. `bear-ai-gui` (console script - fastest)
2. `python -m bear_ai.gui` (module launch)
3. `python src/bear_ai/gui/desktop_app.py` (direct file)

### Memory Optimization
```bash
# Install minimal dependencies for faster startup
pip install -e ".[inference]"  # Core AI features only

# Add features as needed
pip install -e ".[gui]"        # Add GUI support
pip install -e ".[all]"        # Full feature set
```

### Development Setup
```bash
# Development install with all tools
pip install -e ".[dev,all]"

# Fast development launch
bear-ai gui --dev-mode
```

## 📊 Verification Commands

Test your installation with these commands:

```bash
# Test basic import
python -c "import bear_ai; print('✅ bear_ai import successful')"

# Test GUI module
python -c "import bear_ai.gui; print('✅ GUI module available')"

# Test console scripts
bear-ai --help
bear-ai-gui --help

# Test module launch
python -m bear_ai --help
python -m bear_ai.gui --help

# Test version
python -c "import bear_ai; print(f'BEAR AI version: {bear_ai.__version__}')"
```

## 🆘 Getting Help

If you encounter issues not covered here:

1. **Check Installation**:
   ```bash
   pip show bear-ai
   pip list | grep bear
   ```

2. **Verify Environment**:
   ```bash
   python --version
   which python
   echo $PYTHONPATH
   ```

3. **Generate Debug Info**:
   ```bash
   bear-ai-setup --debug
   ```

4. **Common Fix for Most Issues**:
   ```bash
   # Clean reinstall
   pip uninstall bear-ai
   pip cache purge
   pip install -e .
   ```

5. **Report Issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)

## 🎯 Interface Selection Guide

### 🚀 Interface Selector (Default)
- **Launch**: `bear-ai-gui` or double-click "BEAR AI" desktop icon
- **Best for**: New users who want to choose their interface
- **Features**: GUI selection menu with previews

### 🎨 Modern GUI
- **Launch**: `bear-ai-gui --modern` or "BEAR AI Modern" shortcut
- **Best for**: Users who want a sleek, dark-themed interface
- **Features**: CustomTkinter styling, modern design

### 💼 Professional GUI  
- **Launch**: `bear-ai-gui --professional` or "BEAR AI Professional" shortcut
- **Best for**: Power users needing advanced document management
- **Features**: PyQt6 interface, advanced controls

### 📱 Simple GUI
- **Launch**: `bear-ai-gui --simple` or "BEAR AI Simple" shortcut  
- **Best for**: Maximum compatibility, older systems
- **Features**: Basic Tkinter, lightweight

---

**Need more help?** Check our [Troubleshooting Guide](troubleshooting.md) or [Installation Guide](INSTALLATION_IMPROVEMENTS.md).