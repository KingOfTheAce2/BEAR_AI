# 🚨 DEPRECATION NOTICE - Legacy Launch Scripts

## Overview

The following launch scripts are **DEPRECATED** and will be removed in a future version of BEAR AI. Please migrate to the new standardized launch system.

## Deprecated Scripts

### Windows Batch Files (❌ DEPRECATED)
- `launch_gui_selector.bat`
- `launch_simple.bat`
- `launch_modern.bat`
- `launch_professional.bat`
- `run.bat`
- `CREATE_SHORTCUT.bat`

### Legacy Python Scripts (❌ DEPRECATED)
- `gui_launcher.py`
- `simple_gui.py`
- `modern_gui.py`
- Direct execution of scripts in `src/bear_ai/`

### Legacy Shell Scripts (❌ DEPRECATED)
- Any custom shell scripts that directly execute Python files
- Scripts that rely on hardcoded paths to the repository root

## Migration Paths

### Replace Batch Files
```bash
# OLD (❌ DEPRECATED)
launch_gui_selector.bat
launch_simple.bat

# NEW (✅ RECOMMENDED)
bear-gui                              # Console script (preferred)
python -m bear_ai.gui                 # Module execution
tools\win\bear-ai-gui.ps1            # PowerShell launcher
```

### Replace Python Scripts
```bash
# OLD (❌ DEPRECATED)
python gui_launcher.py
python simple_gui.py
python modern_gui.py

# NEW (✅ RECOMMENDED)
bear-gui                              # Console script (preferred)
python -m bear_ai.gui                 # Module execution
```

### Replace Direct Script Execution
```bash
# OLD (❌ DEPRECATED)
python src/bear_ai/gui.py
python src/bear_ai/chat.py
python src/bear_ai/scrub.py

# NEW (✅ RECOMMENDED)
bear-gui                              # Console script
bear-chat                             # Console script
bear-scrub                            # Console script
```

## Why These Scripts Are Deprecated

### Technical Issues
- ❌ **Path Dependencies**: Require execution from specific directories
- ❌ **No Virtual Environment Detection**: Don't handle Python environments properly
- ❌ **Platform Specific**: Windows batch files don't work on Unix systems
- ❌ **Poor Error Handling**: Limited or no error reporting
- ❌ **Maintenance Burden**: Each script needs individual updates

### User Experience Issues
- ❌ **Inconsistent Behavior**: Different scripts behave differently
- ❌ **Complex Setup**: Require users to understand file structure
- ❌ **No Dependency Management**: Don't check or install required packages
- ❌ **Unclear Error Messages**: Difficult to troubleshoot when things go wrong

## Benefits of New System

### For Users
- ✅ **Simple Commands**: `bear-gui`, `bear-chat`, `bear-scrub`
- ✅ **Works Everywhere**: Same command works from any directory
- ✅ **Auto-Detection**: Finds virtual environments automatically
- ✅ **Better Errors**: Clear error messages with troubleshooting steps
- ✅ **Cross-Platform**: Same functionality on Windows, macOS, Linux

### For Developers
- ✅ **Standard Python Packaging**: Uses proper setuptools entry points
- ✅ **Maintainable**: Single codebase for all platforms
- ✅ **Testable**: Easier to write automated tests
- ✅ **Extensible**: Easy to add new features and options

## Migration Timeline

### Immediate (Now)
- ⚠️ **Deprecation Warning**: All legacy scripts show deprecation warnings
- ✅ **New System Available**: Console scripts and launchers are ready to use
- 📖 **Documentation Updated**: All guides reference new launch methods

### Next Release (v0.2.0)
- ⚠️ **Final Warning**: Legacy scripts show final deprecation warnings
- 🔧 **Migration Tools**: Automated migration helpers available
- 📋 **Migration Guide**: Comprehensive migration documentation

### Future Release (v0.3.0)
- ❌ **Removal**: Legacy scripts will be removed from repository
- 🧹 **Cleanup**: Old scripts moved to archive or deleted entirely

## How to Migrate

### Step 1: Install BEAR AI Properly
```bash
cd /path/to/BEAR_AI
pip install -e .
```

### Step 2: Test Console Scripts
```bash
bear-gui --help
bear-chat --help
bear-scrub --help
```

### Step 3: Update Your Shortcuts
- Replace desktop shortcuts pointing to batch files
- Update scripts and automation that use old commands
- Test new commands work in your environment

### Step 4: Remove Old References
- Delete bookmarks or saved commands using old scripts
- Update documentation that references deprecated scripts
- Inform team members about the changes

## Getting Help

### If Console Scripts Don't Work
```bash
# Try module execution instead
python -m bear_ai.gui
python -m bear_ai.chat
python -m bear_ai.scrub

# Or use platform launchers
# Windows:
tools\win\bear-ai-gui.ps1

# Unix:
tools/unix/bear-ai-gui.sh
```

### If You Have Issues
1. Check the [Migration Guide](LAUNCHER_MIGRATION_GUIDE.md)
2. Run with debug mode: `bear-gui --debug` or `./bear-ai-gui.sh --debug`
3. Try reinstalling: `pip install -e .`
4. Create an issue with debug output

### Need to Keep Old Scripts Temporarily?
The deprecated scripts will continue working during the transition period, but:
- They may show deprecation warnings
- They won't receive bug fixes or improvements
- They will be removed in a future version
- We strongly recommend migrating as soon as possible

---

**Thank you for helping us improve BEAR AI by migrating to the new launch system! 🐻**