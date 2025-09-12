#!/usr/bin/env python3
"""
BEAR AI Installer Builder
Creates a Windows executable installer for BEAR AI Legal Assistant
"""

import os
import sys
import subprocess
import shutil
import tempfile
from pathlib import Path
import zipfile
import json

def create_installer_script():
    """Create a comprehensive installer script"""
    installer_script = '''
@echo off
setlocal enabledelayedexpansion

echo ================================================
echo    BEAR AI Legal Assistant - Windows Installer
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or later from https://python.org
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM Create installation directory
set INSTALL_DIR=%USERPROFILE%\\BEAR_AI
echo Installing to: %INSTALL_DIR%

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Extract files
echo Extracting BEAR AI files...
python -c "
import zipfile
import os
with zipfile.ZipFile('bear_ai_package.zip', 'r') as zip_ref:
    zip_ref.extractall('%INSTALL_DIR%')
print('Files extracted successfully')
"

REM Install dependencies
echo Installing Python dependencies...
cd /d "%INSTALL_DIR%"
python -m pip install --user -r requirements.txt

REM Create desktop shortcut
echo Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\\Desktop
echo @echo off > "%DESKTOP%\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\\BEAR AI.bat"
echo python -m bear_ai %%* >> "%DESKTOP%\\BEAR AI.bat"

REM Create Start Menu shortcut
set START_MENU=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs
if not exist "%START_MENU%\\BEAR AI" mkdir "%START_MENU%\\BEAR AI"
echo @echo off > "%START_MENU%\\BEAR AI\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\\BEAR AI\\BEAR AI.bat"
echo python -m bear_ai %%* >> "%START_MENU%\\BEAR AI\\BEAR AI.bat"

echo @echo off > "%START_MENU%\\BEAR AI\\BEAR AI GUI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\\BEAR AI\\BEAR AI GUI.bat"
echo start http://localhost:3000 >> "%START_MENU%\\BEAR AI\\BEAR AI GUI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\\BEAR AI\\BEAR AI GUI.bat"
echo npm start >> "%START_MENU%\\BEAR AI\\BEAR AI GUI.bat"

REM Add to PATH (optional)
echo.
echo Would you like to add BEAR AI to your system PATH? (y/n)
set /p ADD_PATH="This will allow you to run 'bear-ai' from anywhere: "
if /i "%ADD_PATH%"=="y" (
    setx PATH "%PATH%;%INSTALL_DIR%" >nul 2>&1
    echo Added to PATH. Restart your command prompt to use 'bear-ai' command.
)

echo.
echo ================================================
echo Installation completed successfully!
echo ================================================
echo.
echo You can now run BEAR AI in the following ways:
echo 1. Double-click "BEAR AI" on your Desktop
echo 2. Use Start Menu ^> BEAR AI ^> BEAR AI
echo 3. Open Command Prompt and type: cd "%INSTALL_DIR%" ^&^& python -m bear_ai
echo 4. For GUI: Double-click "BEAR AI GUI" shortcut
echo.
echo For help, run: python -m bear_ai --help
echo.
pause
'''
    return installer_script

def build_executable():
    """Build the BEAR AI executable using PyInstaller"""
    base_dir = Path(__file__).parent.parent
    installer_dir = Path(__file__).parent
    src_dir = base_dir / "src"
    
    print("Building BEAR AI Windows Installer...")
    print(f"Base directory: {base_dir}")
    print(f"Source directory: {src_dir}")
    
    # Check if bear_ai module exists
    bear_ai_main = src_dir / "bear_ai" / "__main__.py"
    if not bear_ai_main.exists():
        print(f"ERROR: Could not find {bear_ai_main}")
        return False
    
    # Create temporary directory for build
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy source files
        print("Copying source files...")
        shutil.copytree(src_dir, temp_path / "src")
        shutil.copy2(base_dir / "requirements.txt", temp_path)
        shutil.copy2(base_dir / "package.json", temp_path)
        
        # Copy config files if they exist
        config_dir = base_dir / "config"
        if config_dir.exists():
            shutil.copytree(config_dir, temp_path / "config")
        
        # Create package zip
        print("Creating package archive...")
        package_zip = installer_dir / "bear_ai_package.zip"
        with zipfile.ZipFile(package_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add source files
            for root, dirs, files in os.walk(temp_path):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(temp_path)
                    zipf.write(file_path, arcname)
        
        print(f"Package created: {package_zip}")
        
        # Create installer batch file
        print("Creating installer script...")
        installer_bat = installer_dir / "BEAR_AI_Windows_Installer.bat"
        with open(installer_bat, 'w') as f:
            f.write(create_installer_script())
        
        print(f"Installer created: {installer_bat}")
        
        # Create portable version
        print("Creating portable version...")
        portable_dir = installer_dir / "BEAR_AI_Portable"
        if portable_dir.exists():
            shutil.rmtree(portable_dir)
        
        shutil.copytree(temp_path, portable_dir)
        
        # Create run script for portable version
        run_script = portable_dir / "run_bear_ai.bat"
        with open(run_script, 'w') as f:
            f.write('''@echo off
echo Starting BEAR AI Legal Assistant...
python -m bear_ai %*
''')
        
        # Create GUI launcher for portable version
        gui_script = portable_dir / "run_bear_ai_gui.bat"
        with open(gui_script, 'w') as f:
            f.write('''@echo off
echo Starting BEAR AI Web Interface...
echo Opening browser at http://localhost:3000
start http://localhost:3000
npm start
''')
        
        print(f"Portable version created: {portable_dir}")
        
        return True

def create_readme():
    """Create a README file for the installer"""
    readme_content = '''# BEAR AI Legal Assistant - Windows Installation

## Installation Options

### Option 1: Automated Installer (Recommended)
1. Run `BEAR_AI_Windows_Installer.bat` as Administrator
2. Follow the on-screen instructions
3. The installer will:
   - Check Python installation
   - Install BEAR AI and dependencies
   - Create desktop and start menu shortcuts
   - Optionally add to system PATH

### Option 2: Portable Version
1. Extract the `BEAR_AI_Portable` folder to your desired location
2. Open Command Prompt in that folder
3. Install dependencies: `pip install -r requirements.txt`
4. Run BEAR AI: `python -m bear_ai`
5. For GUI: Run `run_bear_ai_gui.bat`

### Option 3: Manual Installation
1. Extract `bear_ai_package.zip` to a folder
2. Install Python dependencies: `pip install -r requirements.txt`
3. Run: `python -m bear_ai`

## Requirements
- Python 3.8 or later
- Windows 10 or later
- At least 4GB RAM (8GB recommended for AI models)
- Internet connection for downloading models

## Usage

### Command Line Interface
```bash
# Get help
python -m bear_ai --help

# Discover compatible models
python -m bear_ai discover

# Start API server
python -m bear_ai serve

# Interactive chat
python -m bear_ai chat

# Download specific model
python -m bear_ai download microsoft/DialoGPT-medium
```

### Web Interface
1. Run the GUI launcher or execute: `npm start`
2. Open browser to http://localhost:3000
3. Use the React-based web interface

## Features
- 🤖 Privacy-first, local-only AI processing
- ⚖️ Legal document analysis and PII detection
- 🔍 Smart model discovery and hardware optimization
- 🌐 OpenAI-compatible API server
- 📱 Modern React web interface
- 🛡️ Enterprise-grade security and audit trails

## Support
- Documentation: See included docs folder
- Issues: Report at GitHub repository
- License: Proprietary (see LICENSE file)

## Uninstallation
To uninstall BEAR AI:
1. Delete the installation folder (default: %USERPROFILE%\\BEAR_AI)
2. Remove desktop shortcuts
3. Remove Start Menu entries
4. Optionally remove from PATH in system environment variables

---
© 2024 BEAR AI Team. All rights reserved.
'''
    
    installer_dir = Path(__file__).parent
    readme_file = installer_dir / "INSTALLATION_README.txt"
    with open(readme_file, 'w') as f:
        f.write(readme_content)
    
    print(f"Installation guide created: {readme_file}")

def main():
    """Main installer build function"""
    print("BEAR AI Windows Installer Builder")
    print("=" * 50)
    
    # Check if we're in the right directory
    base_dir = Path(__file__).parent.parent
    if not (base_dir / "src" / "bear_ai").exists():
        print("ERROR: Could not find bear_ai source directory")
        print(f"   Expected: {base_dir / 'src' / 'bear_ai'}")
        return False
    
    try:
        # Build the installer
        if build_executable():
            create_readme()
            
            print("\nSUCCESS! BEAR AI Windows Installer created successfully!")
            print("\nCreated files:")
            print(f"   - BEAR_AI_Windows_Installer.bat - Main installer")
            print(f"   - bear_ai_package.zip - Package archive")
            print(f"   - BEAR_AI_Portable/ - Portable version")
            print(f"   - INSTALLATION_README.txt - Installation guide")
            print("\nTo distribute:")
            print("   1. Share the BEAR_AI_Windows_Installer.bat file")
            print("   2. Include bear_ai_package.zip in the same folder")
            print("   3. Provide INSTALLATION_README.txt for users")
            
            return True
        else:
            print("Build failed!")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    success = main()
    input(f"\nPress Enter to exit... {'(Success)' if success else '(Failed)'}")
    sys.exit(0 if success else 1)