# BEAR AI Launch System Migration Guide

## Overview

BEAR AI now uses a standardized, cross-platform launch system that provides consistent and reliable access to all BEAR AI components across Windows, macOS, and Linux.

## New Launch Methods

### 1. Console Scripts (Recommended)
After running `pip install -e .`, you can use these console commands from anywhere:
```bash
bear-gui         # Launch GUI
bear-chat        # Launch chat interface  
bear-scrub       # Launch PII scrubber
bear-ai          # Main CLI interface
bear-serve       # Start API server
```

### 2. Python Module Execution
```bash
python -m bear_ai.gui      # Launch GUI
python -m bear_ai.chat     # Launch chat
python -m bear_ai.scrub    # Launch scrubber
python -m bear_ai          # Main CLI
```

### 3. Cross-Platform Launchers

#### Windows PowerShell
```powershell
# From tools/win/ directory:
.\bear-ai-gui.ps1     # Launch GUI
.\bear-ai-chat.ps1    # Launch chat
.\bear-ai-scrub.ps1   # Launch scrubber

# With options:
.\bear-ai-gui.ps1 -Debug -VenvPath C:\venv
.\bear-ai-chat.ps1 -Model "llama-2-7b"
.\bear-ai-scrub.ps1 -InputFile input.txt -OutputFile output.txt
```

#### Unix Shell Scripts
```bash
# From tools/unix/ directory:
./bear-ai-gui.sh      # Launch GUI
./bear-ai-chat.sh     # Launch chat
./bear-ai-scrub.sh    # Launch scrubber

# With options:
./bear-ai-gui.sh --debug --venv ~/venv
./bear-ai-chat.sh --model "llama-2-7b"  
./bear-ai-scrub.sh --input input.txt --output output.txt
```

## Deprecated Launch Methods

The following scripts are **DEPRECATED** and should be replaced:

### Deprecated Windows Batch Files
- ❌ `launch_gui_selector.bat` → ✅ `bear-gui` or `tools/win/bear-ai-gui.ps1`
- ❌ `launch_simple.bat` → ✅ `bear-gui` or `python -m bear_ai.gui`
- ❌ `launch_modern.bat` → ✅ `bear-gui`
- ❌ `launch_professional.bat` → ✅ `bear-gui`
- ❌ `run.bat` → ✅ `bear-ai` or `python -m bear_ai`

### Deprecated Python Scripts  
- ❌ `gui_launcher.py` → ✅ `bear-gui` or `python -m bear_ai.gui`
- ❌ `simple_gui.py` → ✅ `bear-gui`
- ❌ `modern_gui.py` → ✅ `bear-gui`
- ❌ Direct script execution → ✅ Console scripts or module execution

## Migration Steps

### For Users

1. **Install BEAR AI properly**:
   ```bash
   cd /path/to/BEAR_AI
   pip install -e .
   ```

2. **Test console scripts**:
   ```bash
   bear-gui --help
   bear-chat --help
   bear-scrub --help
   ```

3. **Update shortcuts and scripts** to use new launch methods

4. **Remove old shortcuts** that point to deprecated batch files

### For Developers

1. **Update documentation** to reference new launch methods
2. **Update CI/CD scripts** to use console scripts
3. **Remove dependencies** on specific batch files or direct script execution
4. **Test cross-platform compatibility** using the new launchers

## Launcher Features

### Automatic Environment Detection
- ✅ Auto-detects Python virtual environments (venv, .venv, env, bear-ai-env)
- ✅ Activates appropriate environment automatically
- ✅ Falls back gracefully to system Python
- ✅ Works from any working directory

### Smart Dependency Management
- ✅ Checks for BEAR AI installation
- ✅ Attempts automatic installation if missing
- ✅ Installs appropriate optional dependencies per component
- ✅ Clear error messages with troubleshooting steps

### Robust Error Handling
- ✅ Python version validation (requires 3.9+)
- ✅ Dependency verification
- ✅ Clear error messages and troubleshooting guidance
- ✅ Graceful fallbacks between launch methods

### Cross-Platform Consistency
- ✅ Identical functionality across Windows, macOS, Linux
- ✅ Platform-appropriate implementation (PowerShell vs bash)
- ✅ Consistent command-line arguments and behavior
- ✅ Path handling works regardless of execution directory

## Troubleshooting

### Console Scripts Not Found
```bash
# Solution 1: Reinstall in development mode
pip install -e .

# Solution 2: Check Python PATH
python -m bear_ai.gui

# Solution 3: Use absolute path to launcher scripts
/path/to/BEAR_AI/tools/win/bear-ai-gui.ps1
```

### Virtual Environment Issues
```bash
# Solution 1: Specify venv path explicitly  
./bear-ai-gui.sh --venv /path/to/venv

# Solution 2: Activate manually first
source /path/to/venv/bin/activate
bear-gui
```

### Missing Dependencies
```bash
# Install all features
pip install -e ".[all]"

# Install specific features
pip install -e ".[gui]"        # For GUI
pip install -e ".[privacy]"    # For scrubber
pip install -e ".[inference]"  # For chat
```

### Permission Issues (Unix)
```bash
# Make scripts executable
chmod +x tools/unix/*.sh

# Run with bash explicitly
bash tools/unix/bear-ai-gui.sh
```

## Testing Your Migration

### Test All Launch Methods
```bash
# Console scripts
bear-gui --help
bear-chat --help  
bear-scrub --help

# Module execution
python -m bear_ai.gui --help
python -m bear_ai.chat --help
python -m bear_ai.scrub --help

# Platform launchers
./tools/unix/bear-ai-gui.sh --help      # Unix
./tools/win/bear-ai-gui.ps1 -Help       # Windows
```

### Test From Different Directories
```bash
cd /tmp
bear-gui                    # Should work from anywhere

cd /path/to/BEAR_AI/tools/win
.\bear-ai-gui.ps1          # Should work from tools directory

cd /path/to/BEAR_AI/src
python -m bear_ai.gui      # Should work from src directory
```

### Test Virtual Environment Detection
```bash
# Create test environment
python -m venv test-env

# Launchers should auto-detect and activate
./tools/unix/bear-ai-gui.sh --debug
```

## Benefits of New System

- 🚀 **Faster startup**: Direct Python execution, no batch file overhead
- 🔧 **Better error handling**: Clear messages and automatic troubleshooting
- 🌐 **Cross-platform**: Same functionality on Windows, macOS, Linux  
- 📦 **Proper packaging**: Uses standard Python packaging conventions
- 🔄 **Auto-detection**: Finds and activates virtual environments automatically
- 🛠️ **Self-healing**: Attempts dependency installation if missing
- 📍 **Location independent**: Works from any directory
- 🎯 **Consistent**: Identical behavior across all platforms

## Support

If you encounter issues during migration:

1. Check this guide for troubleshooting steps
2. Test console scripts: `bear-gui --help`
3. Try module execution: `python -m bear_ai.gui`
4. Use debug mode: `./bear-ai-gui.sh --debug`
5. Create an issue with debug output if problems persist

---

*This migration guide ensures a smooth transition to the new standardized launch system while maintaining backward compatibility during the transition period.*