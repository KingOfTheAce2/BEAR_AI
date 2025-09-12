#!/usr/bin/env python3
"""
BEAR AI Simple Installer Builder
Creates a Windows installer package for BEAR AI Legal Assistant without Unicode issues
"""

import os
import sys
import shutil
import zipfile
from pathlib import Path

def create_batch_installer():
    """Create a simple batch installer"""
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

REM Create installation directory
set INSTALL_DIR=%USERPROFILE%\\BEAR_AI
echo Installing to: %INSTALL_DIR%

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Extract files
echo Extracting BEAR AI files...
powershell -command "Expand-Archive -Path bear_ai_package.zip -DestinationPath '%INSTALL_DIR%' -Force"

REM Install dependencies
echo Installing Python dependencies...
cd /d "%INSTALL_DIR%"
python -m pip install --user -r requirements.txt

REM Create shortcuts
echo Creating shortcuts...
set DESKTOP=%USERPROFILE%\\Desktop
echo @echo off > "%DESKTOP%\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\\BEAR AI.bat"
echo python -m bear_ai %%* >> "%DESKTOP%\\BEAR AI.bat"

echo.
echo Installation completed successfully!
echo.
echo Run BEAR AI by:
echo 1. Double-clicking "BEAR AI" on Desktop
echo 2. Or: cd "%INSTALL_DIR%" && python -m bear_ai
echo.
pause
'''

def build_package():
    """Build the installer package"""
    base_dir = Path(__file__).parent.parent
    installer_dir = Path(__file__).parent
    
    print("BEAR AI Simple Installer Builder")
    print("=" * 40)
    print(f"Base directory: {base_dir}")
    
    # Check source directory
    src_dir = base_dir / "src"
    if not src_dir.exists():
        print(f"ERROR: Source directory not found: {src_dir}")
        return False
    
    try:
        # Create package zip
        print("Creating package archive...")
        package_zip = installer_dir / "bear_ai_package.zip"
        
        with zipfile.ZipFile(package_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add source files
            for file_path in src_dir.rglob("*.py"):
                arcname = file_path.relative_to(base_dir)
                zipf.write(file_path, arcname)
            
            # Add requirements
            req_file = base_dir / "requirements.txt"
            if req_file.exists():
                zipf.write(req_file, "requirements.txt")
            
            # Add package.json
            pkg_file = base_dir / "package.json"
            if pkg_file.exists():
                zipf.write(pkg_file, "package.json")
        
        print(f"Package created: {package_zip}")
        
        # Create batch installer
        print("Creating installer script...")
        installer_bat = installer_dir / "BEAR_AI_Windows_Installer.bat"
        
        with open(installer_bat, 'w', encoding='utf-8') as f:
            f.write(create_batch_installer())
        
        print(f"Installer created: {installer_bat}")
        
        # Create portable version
        print("Creating portable version...")
        portable_dir = installer_dir / "BEAR_AI_Portable"
        
        if portable_dir.exists():
            shutil.rmtree(portable_dir)
        
        # Extract to portable directory
        with zipfile.ZipFile(package_zip, 'r') as zipf:
            zipf.extractall(portable_dir)
        
        # Create run scripts
        run_script = portable_dir / "run_bear_ai.bat"
        with open(run_script, 'w') as f:
            f.write('@echo off\necho Starting BEAR AI...\nset PYTHONPATH=%CD%\\src;%PYTHONPATH%\npython -m bear_ai %*\npause\n')
        
        gui_script = portable_dir / "run_gui.bat"
        with open(gui_script, 'w') as f:
            f.write('@echo off\necho Starting BEAR AI GUI...\nstart http://localhost:3000\nnpm start\n')
        
        print(f"Portable version created: {portable_dir}")
        
        # Create README
        readme_file = installer_dir / "README.txt"
        with open(readme_file, 'w') as f:
            f.write("""BEAR AI Legal Assistant - Windows Installation

OPTION 1: Automated Installer
1. Run BEAR_AI_Windows_Installer.bat
2. Follow instructions

OPTION 2: Portable Version  
1. Use files in BEAR_AI_Portable folder
2. Run run_bear_ai.bat

Requirements:
- Python 3.8+
- Windows 10+

For help: python -m bear_ai --help
""")
        
        print(f"README created: {readme_file}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    """Main function"""
    success = build_package()
    
    if success:
        print("\nSUCCESS! Installer package created.")
        print("\nFiles created:")
        print("  - BEAR_AI_Windows_Installer.bat (main installer)")
        print("  - bear_ai_package.zip (package archive)")
        print("  - BEAR_AI_Portable/ (portable version)")
        print("  - README.txt (instructions)")
        print("\nDistribute the .bat and .zip files together.")
    else:
        print("\nBuild failed!")
    
    return success

if __name__ == "__main__":
    main()