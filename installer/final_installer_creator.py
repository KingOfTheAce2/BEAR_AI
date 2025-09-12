#!/usr/bin/env python3
"""
BEAR AI Final Installer Creator
Creates a Windows installer that properly handles the Python module structure
"""

import os
import sys
import shutil
import zipfile
from pathlib import Path

def create_enhanced_batch_installer():
    """Create an enhanced batch installer with proper Python path handling"""
    return '''@echo off
echo ================================================
echo    BEAR AI Legal Assistant - Windows Installer
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM Create installation directory
set INSTALL_DIR=%USERPROFILE%\\BEAR_AI
echo Installing to: %INSTALL_DIR%

if exist "%INSTALL_DIR%" (
    echo Backing up existing installation...
    move "%INSTALL_DIR%" "%INSTALL_DIR%_backup_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%"
)

mkdir "%INSTALL_DIR%"

REM Extract files using PowerShell (more reliable than extract command)
echo Extracting BEAR AI files...
powershell -command "if (Test-Path 'bear_ai_package.zip') { Expand-Archive -Path 'bear_ai_package.zip' -DestinationPath '%INSTALL_DIR%' -Force; Write-Host 'Files extracted successfully' } else { Write-Host 'ERROR: bear_ai_package.zip not found'; exit 1 }"

REM Install Python dependencies
echo Installing Python dependencies...
cd /d "%INSTALL_DIR%"
python -m pip install --user -r requirements.txt --upgrade

REM Create launcher script with proper Python path
echo Creating launcher...
echo @echo off > bear_ai_launcher.bat
echo set PYTHONPATH=%%CD%%\\src;%%PYTHONPATH%% >> bear_ai_launcher.bat
echo cd /d "%%~dp0" >> bear_ai_launcher.bat
echo python -m bear_ai %%* >> bear_ai_launcher.bat

REM Create single unified desktop shortcut
echo Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\\Desktop
echo @echo off > "%DESKTOP%\\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%DESKTOP%\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\\BEAR AI.bat"
echo echo Choose interface: 1) Web GUI 2) Command Line >> "%DESKTOP%\\BEAR AI.bat"
echo set /p choice="Enter choice (1 or 2, default 1): " >> "%DESKTOP%\\BEAR AI.bat"
echo if "%%choice%%"=="2" goto cli >> "%DESKTOP%\\BEAR AI.bat"
echo echo Starting BEAR AI Web Interface... >> "%DESKTOP%\\BEAR AI.bat"
echo start http://localhost:3000 >> "%DESKTOP%\\BEAR AI.bat"
echo npm start >> "%DESKTOP%\\BEAR AI.bat"
echo goto end >> "%DESKTOP%\\BEAR AI.bat"
echo :cli >> "%DESKTOP%\\BEAR AI.bat"
echo call bear_ai_launcher.bat %%* >> "%DESKTOP%\\BEAR AI.bat"
echo :end >> "%DESKTOP%\\BEAR AI.bat"

REM Create single Start Menu shortcut
set START_MENU=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs
echo @echo off > "%START_MENU%\\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%START_MENU%\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\\BEAR AI.bat"
echo echo Choose interface: 1) Web GUI 2) Command Line >> "%START_MENU%\\BEAR AI.bat"
echo set /p choice="Enter choice (1 or 2, default 1): " >> "%START_MENU%\\BEAR AI.bat"
echo if "%%choice%%"=="2" goto cli >> "%START_MENU%\\BEAR AI.bat"
echo echo Starting BEAR AI Web Interface... >> "%START_MENU%\\BEAR AI.bat"
echo start http://localhost:3000 >> "%START_MENU%\\BEAR AI.bat"
echo npm start >> "%START_MENU%\\BEAR AI.bat"
echo goto end >> "%START_MENU%\\BEAR AI.bat"
echo :cli >> "%START_MENU%\\BEAR AI.bat"
echo call bear_ai_launcher.bat %%* >> "%START_MENU%\\BEAR AI.bat"
echo :end >> "%START_MENU%\\BEAR AI.bat"

REM Test installation
echo Testing installation...
call bear_ai_launcher.bat --help >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: BEAR AI test failed. Installation may be incomplete.
) else (
    echo Installation test passed!
)

echo.
echo ================================================
echo Installation completed successfully!
echo ================================================
echo.
echo You can now run BEAR AI using:
echo   - Desktop shortcut: "BEAR AI" (offers GUI/CLI choice)
echo   - Command line: cd "%INSTALL_DIR%" ^&^& bear_ai_launcher.bat
echo   - Web GUI: Desktop shortcut selects GUI by default
echo.
echo For help: bear_ai_launcher.bat --help
echo For model discovery: bear_ai_launcher.bat discover
echo.
pause
'''

def create_final_package():
    """Create the final installer package with all improvements"""
    base_dir = Path(__file__).parent.parent
    installer_dir = Path(__file__).parent
    
    print("BEAR AI Final Installer Creator")
    print("=" * 50)
    print(f"Base directory: {base_dir}")
    
    # Check source directory
    src_dir = base_dir / "src"
    if not src_dir.exists():
        print(f"ERROR: Source directory not found: {src_dir}")
        return False
    
    bear_ai_dir = src_dir / "bear_ai"
    if not bear_ai_dir.exists():
        print(f"ERROR: BEAR AI module not found: {bear_ai_dir}")
        return False
    
    try:
        # Create comprehensive package zip
        print("Creating comprehensive package archive...")
        package_zip = installer_dir / "bear_ai_package.zip"
        
        with zipfile.ZipFile(package_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add all source files with proper structure
            for file_path in src_dir.rglob("*"):
                if file_path.is_file() and file_path.suffix == ".py":
                    arcname = file_path.relative_to(base_dir)
                    zipf.write(file_path, arcname)
                    print(f"  Added: {arcname}")
            
            # Add configuration files
            for config_file in ["requirements.txt", "package.json"]:
                config_path = base_dir / config_file
                if config_path.exists():
                    zipf.write(config_path, config_file)
                    print(f"  Added: {config_file}")
            
            # Add examples if they exist
            examples_dir = base_dir / "examples"
            if examples_dir.exists():
                for file_path in examples_dir.rglob("*.py"):
                    arcname = file_path.relative_to(base_dir)
                    zipf.write(file_path, arcname)
                    print(f"  Added: {arcname}")
        
        print(f"Package created: {package_zip}")
        print(f"Package size: {package_zip.stat().st_size / (1024*1024):.2f} MB")
        
        # Create enhanced batch installer
        print("Creating enhanced installer script...")
        installer_bat = installer_dir / "BEAR_AI_Windows_Installer.bat"
        
        with open(installer_bat, 'w', encoding='utf-8') as f:
            f.write(create_enhanced_batch_installer())
        
        print(f"Installer created: {installer_bat}")
        
        # Create enhanced portable version
        print("Creating enhanced portable version...")
        portable_dir = installer_dir / "BEAR_AI_Portable"
        
        if portable_dir.exists():
            shutil.rmtree(portable_dir)
        
        # Extract to portable directory
        with zipfile.ZipFile(package_zip, 'r') as zipf:
            zipf.extractall(portable_dir)
        
        # Create enhanced run scripts for portable
        run_script = portable_dir / "run_bear_ai.bat"
        with open(run_script, 'w') as f:
            f.write('''@echo off
echo Starting BEAR AI Legal Assistant...
set PYTHONPATH=%CD%\\src;%PYTHONPATH%
cd /d "%~dp0"
python -m bear_ai %*
pause
''')
        
        # Single unified launcher for portable
        unified_script = portable_dir / "BEAR_AI.bat"
        with open(unified_script, 'w') as f:
            f.write('''@echo off
echo BEAR AI Legal Assistant - Portable Version
echo.
echo Choose interface:
echo 1) Web GUI (default)
echo 2) Command Line
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="2" goto cli
echo Starting BEAR AI Web Interface...
echo Opening browser at http://localhost:3000
cd /d "%~dp0"
start http://localhost:3000
npm start
goto end

:cli
echo Starting BEAR AI Command Line...
set PYTHONPATH=%CD%\\src;%PYTHONPATH%
cd /d "%~dp0"
python -m bear_ai %*
pause

:end
''')
        
        # Create installation test script
        test_script = portable_dir / "test_installation.bat"
        with open(test_script, 'w') as f:
            f.write('''@echo off
echo Testing BEAR AI installation...
set PYTHONPATH=%CD%\\src;%PYTHONPATH%
python -m bear_ai --help
if %errorlevel% neq 0 (
    echo ERROR: BEAR AI test failed
    pause
    exit /b 1
) else (
    echo SUCCESS: BEAR AI is working correctly!
    pause
)
''')
        
        print(f"Enhanced portable version created: {portable_dir}")
        
        # Create comprehensive README
        readme_file = installer_dir / "INSTALLATION_GUIDE.txt"
        with open(readme_file, 'w') as f:
            f.write('''BEAR AI Legal Assistant - Windows Installation Guide

============================================
SYSTEM REQUIREMENTS
============================================
- Windows 10 or later
- Python 3.8 or later (download from https://python.org)
- At least 4GB RAM (8GB recommended for AI models)
- Internet connection for downloading models

============================================
INSTALLATION OPTIONS
============================================

OPTION 1: Automated Installer (RECOMMENDED)
1. Ensure Python is installed and in PATH
2. Place BEAR_AI_Windows_Installer.bat and bear_ai_package.zip in same folder
3. Run BEAR_AI_Windows_Installer.bat as Administrator
4. Follow the installation prompts
5. Use desktop shortcuts to launch BEAR AI

OPTION 2: Portable Version
1. Extract BEAR_AI_Portable folder anywhere
2. Install Python dependencies: pip install -r requirements.txt
3. Run: BEAR_AI.bat (offers GUI/CLI choice)
4. Or run specific scripts: run_bear_ai.bat, test_installation.bat

OPTION 3: Manual Installation
1. Extract bear_ai_package.zip
2. Install dependencies: pip install -r requirements.txt  
3. Set PYTHONPATH to include src folder
4. Run: python -m bear_ai

============================================
USAGE
============================================

Command Line Interface:
  bear_ai_launcher.bat --help           # Show help
  bear_ai_launcher.bat discover         # Find compatible models
  bear_ai_launcher.bat serve            # Start API server
  bear_ai_launcher.bat chat             # Interactive chat

Web Interface:
  Run "BEAR AI GUI" shortcut or bear_ai_gui.bat
  Opens http://localhost:3000 in your browser

============================================  
FEATURES
============================================
- Privacy-first, local-only AI processing
- Legal document analysis and PII detection
- Smart model discovery and hardware optimization
- OpenAI-compatible API server
- Modern React web interface
- Enterprise-grade security and audit trails

============================================
TROUBLESHOOTING
============================================
- If "python" not found: Install Python from https://python.org
- If modules not found: Check PYTHONPATH includes src folder
- If GUI not working: Install Node.js from https://nodejs.org
- For permission errors: Run installer as Administrator

============================================
UNINSTALLATION  
============================================
1. Delete installation folder (default: %USERPROFILE%\\BEAR_AI)
2. Remove desktop shortcuts
3. Remove Start Menu entries
4. Optionally remove from PATH

============================================
SUPPORT
============================================
- Documentation: See included docs
- License: Proprietary (see LICENSE file)
- Issues: Report at GitHub repository

© 2024 BEAR AI Team. All rights reserved.
''')
        
        print(f"Installation guide created: {readme_file}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    success = create_final_package()
    
    if success:
        print("\n" + "=" * 60)
        print("SUCCESS! BEAR AI Windows Installer Package Created!")
        print("=" * 60)
        print("\nFiles created for distribution:")
        print("  ESSENTIAL FILES (distribute together):")
        print("    - BEAR_AI_Windows_Installer.bat")
        print("    - bear_ai_package.zip")
        print("    - INSTALLATION_GUIDE.txt")
        print("\n  OPTIONAL FILES:")
        print("    - BEAR_AI_Portable/ (standalone portable version)")
        print("\nINSTRUCTIONS FOR USERS:")
        print("  1. Download Python 3.8+ from https://python.org") 
        print("  2. Download the installer files")
        print("  3. Run BEAR_AI_Windows_Installer.bat")
        print("  4. Follow the installation prompts")
        print("\nThe installer creates desktop shortcuts and handles all setup!")
    else:
        print("\nBuild failed!")
    
    return success

if __name__ == "__main__":
    main()