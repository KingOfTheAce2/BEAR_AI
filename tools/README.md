# BEAR AI Launch Tools

This directory contains the standardized, cross-platform launch system for BEAR AI.

## Quick Start

### 1. Install BEAR AI (Required for console scripts)
```bash
cd /path/to/BEAR_AI
pip install -e .
```

### 2. Launch BEAR AI Components

#### Recommended: Console Scripts (after installation)
```bash
bear-gui          # Launch GUI interface
bear-chat         # Launch chat interface
bear-scrub        # Launch PII scrubber
bear-ai           # Main CLI interface
```

#### Alternative: Module Execution (works without installation)
```bash
python -m bear_ai.gui      # Launch GUI
python -m bear_ai.chat     # Launch chat
python -m bear_ai.scrub    # Launch scrubber
python -m bear_ai          # Main CLI
```

#### Platform-Specific Launchers (robust, auto-configuring)

**Windows PowerShell:**
```powershell
.\tools\win\bear-ai-gui.ps1      # Launch GUI
.\tools\win\bear-ai-chat.ps1     # Launch chat  
.\tools\win\bear-ai-scrub.ps1    # Launch scrubber
```

**Unix/Linux/macOS:**
```bash
./tools/unix/bear-ai-gui.sh      # Launch GUI
./tools/unix/bear-ai-chat.sh     # Launch chat
./tools/unix/bear-ai-scrub.sh    # Launch scrubber
```

## Directory Structure

```
tools/
├── win/                          # Windows PowerShell launchers
│   ├── bear-ai-gui.ps1          # GUI launcher
│   ├── bear-ai-chat.ps1         # Chat launcher
│   └── bear-ai-scrub.ps1        # PII scrubber launcher
├── unix/                        # Unix shell launchers
│   ├── bear-ai-gui.sh           # GUI launcher (executable)
│   ├── bear-ai-chat.sh          # Chat launcher (executable)
│   └── bear-ai-scrub.sh         # PII scrubber launcher (executable)
├── LAUNCHER_MIGRATION_GUIDE.md  # Migration from old scripts
├── DEPRECATION_NOTICE.md        # Information about deprecated scripts
├── test_launch_system.py        # Comprehensive test suite
└── README.md                    # This file
```

## Features

### 🔧 **Auto-Configuration**
- **Virtual Environment Detection**: Automatically finds and activates Python virtual environments
- **Dependency Management**: Installs missing dependencies when needed
- **Python Version Check**: Validates Python 3.9+ requirement
- **Smart Fallbacks**: Multiple launch methods with graceful degradation

### 🌍 **Cross-Platform Support**
- **Windows**: PowerShell scripts with proper error handling
- **Unix/Linux/macOS**: Bash scripts with POSIX compliance
- **Consistent Interface**: Same functionality across all platforms

### 📂 **Directory Independence**
- **Works Everywhere**: Launch from any directory
- **Path Agnostic**: No dependency on current working directory
- **Repository Aware**: Auto-detects repository root

### 🛠️ **Robust Error Handling**
- **Clear Messages**: Informative error messages with troubleshooting steps
- **Automatic Recovery**: Attempts to fix common issues automatically
- **Debug Mode**: Verbose output for troubleshooting

## Launcher Options

### Windows PowerShell Launchers

#### bear-ai-gui.ps1
```powershell
.\bear-ai-gui.ps1 [OPTIONS]

Options:
  -Debug         Enable debug output
  -Help          Show help message
  -VenvPath      Path to virtual environment
```

#### bear-ai-chat.ps1
```powershell
.\bear-ai-chat.ps1 [OPTIONS]

Options:
  -Debug         Enable debug output
  -Help          Show help message
  -VenvPath      Path to virtual environment
  -Model         Model to use for chat
```

#### bear-ai-scrub.ps1
```powershell
.\bear-ai-scrub.ps1 [OPTIONS]

Options:
  -Debug         Enable debug output
  -Help          Show help message
  -VenvPath      Path to virtual environment
  -InputFile     Input file to scrub
  -OutputFile    Output file for results
```

### Unix Shell Launchers

#### bear-ai-gui.sh
```bash
./bear-ai-gui.sh [OPTIONS]

Options:
  -d, --debug         Enable debug output
  -h, --help          Show help message
  -v, --venv PATH     Path to virtual environment
```

#### bear-ai-chat.sh
```bash
./bear-ai-chat.sh [OPTIONS]

Options:
  -d, --debug         Enable debug output
  -h, --help          Show help message
  -v, --venv PATH     Path to virtual environment
  -m, --model MODEL   Model to use for chat
```

#### bear-ai-scrub.sh
```bash
./bear-ai-scrub.sh [OPTIONS]

Options:
  -d, --debug         Enable debug output
  -h, --help          Show help message
  -v, --venv PATH     Path to virtual environment
  -i, --input FILE    Input file to scrub
  -o, --output FILE   Output file for results
```

## Testing

### Run Test Suite
```bash
# Basic test
python tools/test_launch_system.py

# Verbose output
python tools/test_launch_system.py --verbose

# Test installation scenarios
python tools/test_launch_system.py --test-install
```

### Manual Testing
```bash
# Test all launch methods
bear-gui --help                    # Console script
python -m bear_ai.gui --help       # Module execution
./tools/win/bear-ai-gui.ps1 -Help  # PowerShell (Windows)
./tools/unix/bear-ai-gui.sh --help # Shell (Unix)
```

### Test from Different Directories
```bash
cd /tmp
python -m bear_ai.gui --help       # Should work from anywhere
```

## Troubleshooting

### Console Scripts Not Found
```bash
# Solution 1: Install in development mode
pip install -e .

# Solution 2: Add to PATH (Windows)
# Add C:\Users\[USER]\AppData\Roaming\Python\Python3X\Scripts to PATH

# Solution 3: Use module execution instead
python -m bear_ai.gui
```

### Permission Denied (Unix)
```bash
# Make scripts executable
chmod +x tools/unix/*.sh

# Or run with bash explicitly
bash tools/unix/bear-ai-gui.sh
```

### Virtual Environment Not Detected
```bash
# Specify venv path explicitly
./tools/unix/bear-ai-gui.sh --venv /path/to/venv

# Or activate manually first
source /path/to/venv/bin/activate
python -m bear_ai.gui
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

## Migration from Old Scripts

If you're upgrading from older versions of BEAR AI, please see:
- [LAUNCHER_MIGRATION_GUIDE.md](LAUNCHER_MIGRATION_GUIDE.md) - Complete migration guide
- [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md) - Information about deprecated scripts

### Quick Migration
```bash
# OLD (❌ DEPRECATED)
launch_gui_selector.bat
python gui_launcher.py

# NEW (✅ RECOMMENDED)  
bear-gui                        # Console script
python -m bear_ai.gui          # Module execution
.\tools\win\bear-ai-gui.ps1    # PowerShell launcher
```

## Development

### Adding New Launchers
1. Create launcher scripts in appropriate platform directory
2. Follow existing naming convention: `bear-ai-[component].[ext]`
3. Implement consistent command-line interface
4. Add tests to `test_launch_system.py`
5. Update documentation

### Code Style
- **PowerShell**: Follow PowerShell best practices, use proper error handling
- **Bash**: POSIX compliant, use `set -euo pipefail`
- **Python**: Follow PEP 8, use type hints where appropriate

## Support

For issues with the launch system:
1. Check troubleshooting section above
2. Run test suite: `python tools/test_launch_system.py --verbose`
3. Try debug mode: `./bear-ai-gui.sh --debug`
4. Create issue with debug output if problems persist

---

**The BEAR AI launch system provides a unified, robust way to start BEAR AI components across all platforms. 🐻**