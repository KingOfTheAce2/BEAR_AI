# Migration Guide: New Launch System

This guide helps existing BEAR AI users migrate from old launch methods to the new standardized system.

## 🔄 What Changed?

### Old System (Deprecated)
- Multiple standalone GUI files in root directory
- Manual Python execution of individual files  
- Batch files for Windows-specific launching
- Inconsistent entry points

### New System (Current)
- Standardized package installation with `pip install -e .`
- Console scripts for cross-platform launching
- Module-based execution (`python -m bear_ai.gui`)
- Consistent entry points across platforms

## 📊 Migration Mapping

### Launch Method Changes

| **Old Method** | **New Method** | **Status** |
|----------------|----------------|------------|
| `python gui_launcher.py` | `bear-ai-gui` or `python -m bear_ai.gui` | ✅ Recommended |
| `python modern_gui.py` | `bear-ai-gui --modern` | ✅ Available |
| `python simple_gui.py` | `bear-ai-gui --simple` | ✅ Available |
| `python professional_gui.py` | `bear-ai-gui --professional` | ✅ Available |
| `launch_gui_selector.bat` | `bear-ai-gui` | ✅ Cross-platform |
| `launch_modern.bat` | `bear-ai-gui --modern` | ✅ Cross-platform |
| Direct file execution | Console scripts | ✅ Preferred |

### Console Commands

| **Old** | **New** | **Benefits** |
|---------|---------|--------------|
| `python bear_ai/chat.py` | `bear-ai-chat` | Cleaner, cross-platform |
| `python bear_ai/scrub.py` | `bear-ai-scrub` | Standard CLI interface |
| Manual setup | `bear-ai-setup` | Automated configuration |
| Various GUI methods | `bear-ai-gui` | Single entry point |

## 🚀 Step-by-Step Migration

### Step 1: Install New System
```bash
# Navigate to BEAR AI directory
cd /path/to/BEAR_AI

# Install in development mode (recommended for users)
pip install -e .

# Or install with all features
pip install -e ".[all]"

# Verify installation
bear-ai --help
```

### Step 2: Test New Launch Methods
```bash
# Test GUI launcher (replaces all old GUI methods)
bear-ai-gui

# Test module execution
python -m bear_ai.gui

# Test other console scripts
bear-ai-chat --help
bear-ai-scrub --help
bear-ai-setup --help
```

### Step 3: Update Your Workflows

#### For Developers
```bash
# Old way
python gui_launcher.py
python src/bear_ai/chat.py

# New way  
bear-ai-gui
bear-ai-chat
```

#### For Scripts and Automation
```bash
# Old way
cd /path/to/bear_ai
python gui_launcher.py --headless

# New way
bear-ai-gui --headless  # Works from any directory
```

#### For Desktop Shortcuts
```bash
# Old way (Windows)
Target: C:\Python\python.exe C:\BEAR_AI\gui_launcher.py

# New way (Windows)
Target: C:\BEAR_AI\.venv\Scripts\bear-ai-gui.exe
# or
Target: C:\Python\python.exe -m bear_ai.gui
```

## 📂 File Structure Changes

### Deprecated Files (Still Work, but Not Recommended)
These files remain for backward compatibility but should be replaced:

- `gui_launcher.py` → Use `bear-ai-gui`
- `modern_gui.py` → Use `bear-ai-gui --modern`
- `simple_gui.py` → Use `bear-ai-gui --simple`
- `launch_*.bat` → Use console scripts
- Direct execution of files in src/

### New Structure (Recommended)
```
BEAR_AI/
├── src/bear_ai/           # Main package
│   ├── __main__.py        # Main entry point
│   ├── gui/               # GUI modules
│   │   ├── __init__.py   # GUI package init
│   │   └── desktop_app.py # Main desktop app
│   └── ...
├── scripts/               # Utility scripts
│   └── verify_package.py  # Package verification
└── docs/                  # Documentation
    ├── launch.md          # Launch guide
    └── migration-guide.md # This file
```

## 🔧 Troubleshooting Migration Issues

### Common Problems and Solutions

#### Problem: "bear-ai-gui not found"
```bash
# Solution 1: Reinstall package
pip uninstall bear-ai
pip install -e .

# Solution 2: Check installation
pip show bear-ai
pip list --editable

# Solution 3: Use module method
python -m bear_ai.gui
```

#### Problem: "ImportError: No module named 'bear_ai'"
```bash
# Solution 1: Ensure virtual environment is active
source .venv/bin/activate  # Linux/Mac
.\.venv\Scripts\Activate.ps1  # Windows PowerShell

# Solution 2: Reinstall in development mode
pip install -e .

# Solution 3: Add to Python path (temporary fix)
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
```

#### Problem: "Old GUI files still launching"
This is OK! Old files still work for backward compatibility, but we recommend switching to new methods:

```bash
# Instead of: python gui_launcher.py
# Use: bear-ai-gui

# Instead of: python modern_gui.py  
# Use: bear-ai-gui --modern
```

#### Problem: "Windows batch files not working"
The new console scripts work better across platforms:

```bash
# Instead of: launch_gui_selector.bat
# Use: bear-ai-gui

# Instead of: launch_modern.bat
# Use: bear-ai-gui --modern
```

## ✅ Verification Checklist

After migration, verify everything works:

- [ ] `pip show bear-ai` shows package info
- [ ] `bear-ai --help` displays help
- [ ] `bear-ai-gui` launches GUI
- [ ] `python -m bear_ai.gui` launches GUI
- [ ] `bear-ai-chat` starts chat interface
- [ ] `bear-ai-scrub --help` shows scrub options
- [ ] Old files still work (optional verification)

## 🎯 Benefits of New System

### ✅ Advantages
- **Cross-platform**: Same commands work on Windows, Mac, Linux
- **Cleaner**: Single `bear-ai-gui` instead of multiple files
- **Standard**: Follows Python packaging best practices
- **Maintainable**: Easier to update and distribute
- **Professional**: Standard console script interface
- **Flexible**: Module execution as fallback option

### 🔄 Backward Compatibility
- Old files still work (gui_launcher.py, etc.)
- Existing shortcuts continue functioning
- Gradual migration possible
- No immediate breaking changes

## 📚 Additional Resources

- [Launch Guide](launch.md) - Complete launch documentation
- [Installation Guide](INSTALLATION_IMPROVEMENTS.md) - Enhanced installation process
- [Troubleshooting Guide](troubleshooting.md) - Common issues and fixes
- [UI Guide](UI_IMPROVEMENTS.md) - Interface selection help

## 🆘 Need Help?

If you encounter issues during migration:

1. **Run verification script**:
   ```bash
   python scripts/verify_package.py
   ```

2. **Check our troubleshooting guide**:
   ```bash
   bear-ai-setup --diagnose
   ```

3. **Report issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)

4. **Clean reinstall** (if all else fails):
   ```bash
   pip uninstall bear-ai
   pip cache purge
   rm -rf .venv
   python -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

---

**Migration Timeline**: The old system remains supported for backward compatibility, but we recommend switching to the new system for better cross-platform support and future features.