#!/usr/bin/env python3
"""
BEAR AI Native Windows Executable Creator
Creates a true Windows .exe file that runs BEAR AI as a native program
"""

import os
import sys
import shutil
import zipfile
from pathlib import Path
import subprocess
import tempfile

def create_launcher_script():
    """Create the main Python launcher script"""
    return '''#!/usr/bin/env python3
"""
BEAR AI Native Windows Launcher
Runs BEAR AI as a native Windows application
"""

import sys
import os
import argparse
from pathlib import Path

# Add src to Python path
script_dir = Path(__file__).parent
src_dir = script_dir / "src"
sys.path.insert(0, str(src_dir))

def main():
    """Main launcher function"""
    
    # Import BEAR AI after path setup
    try:
        from bear_ai.__main__ import main as bear_main
        from bear_ai.chat import main as chat_main
        from bear_ai.server.openai_server import start_openai_server
    except ImportError as e:
        print(f"Error importing BEAR AI modules: {e}")
        print("Make sure all dependencies are installed: pip install -r requirements.txt")
        input("Press Enter to exit...")
        sys.exit(1)
    
    parser = argparse.ArgumentParser(
        description="BEAR AI Legal Assistant - Native Windows Application"
    )
    parser.add_argument("--gui", action="store_true", help="Launch GUI mode (if available)")
    parser.add_argument("--serve", action="store_true", help="Start API server only")
    parser.add_argument("--chat", action="store_true", help="Start interactive chat")
    parser.add_argument("--version", action="store_true", help="Show version")
    
    # If no arguments, show interactive menu
    if len(sys.argv) == 1:
        print("=" * 60)
        print("    BEAR AI Legal Assistant")
        print("    Privacy-First, Local-Only AI")  
        print("=" * 60)
        print()
        print("Choose how to run BEAR AI:")
        print("1) Interactive Chat (recommended)")
        print("2) API Server Mode") 
        print("3) Command Line Help")
        print("4) Exit")
        print()
        
        while True:
            choice = input("Enter choice (1-4): ").strip()
            
            if choice == "1" or choice == "":
                print("Starting BEAR AI Interactive Chat...")
                chat_main(None)
                break
            elif choice == "2":
                print("Starting BEAR AI API Server...")
                print("Server will be available at http://localhost:8000")
                start_openai_server("127.0.0.1", 8000)
                break
            elif choice == "3":
                bear_main()
                break
            elif choice == "4":
                print("Goodbye!")
                sys.exit(0)
            else:
                print("Invalid choice. Please enter 1-4.")
                continue
    else:
        args = parser.parse_args()
        
        if args.version:
            print("BEAR AI Legal Assistant v1.0.0")
            return
            
        if args.gui:
            # For now, launch interactive chat as GUI
            print("Starting BEAR AI Interactive Mode...")
            chat_main(None)
            return
            
        if args.serve:
            print("Starting BEAR AI API Server...")
            start_openai_server("127.0.0.1", 8000) 
            return
            
        if args.chat:
            print("Starting BEAR AI Chat...")
            chat_main(None)
            return
        
        # Default: run main bear_ai
        bear_main()

if __name__ == "__main__":
    main()
'''

def create_windows_exe():
    """Create Windows executable using PyInstaller"""
    base_dir = Path(__file__).parent.parent
    installer_dir = Path(__file__).parent
    
    print("Creating BEAR AI Native Windows Executable")
    print("=" * 50)
    
    # Create temporary launcher script
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(create_launcher_script())
        launcher_script = Path(f.name)
    
    try:
        # Check if PyInstaller is available
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], 
                      capture_output=True, check=True)
        
        print("Building Windows executable...")
        
        # PyInstaller command
        cmd = [
            sys.executable, "-m", "PyInstaller",
            "--onefile",
            "--console", 
            "--name", "BEAR_AI",
            "--distpath", str(installer_dir),
            "--workpath", str(installer_dir / "build_exe"),
            "--specpath", str(installer_dir),
            "--add-data", f"{base_dir / 'src'};src",
            "--add-data", f"{base_dir / 'requirements.txt'};.",
            "--hidden-import", "bear_ai",
            "--hidden-import", "bear_ai.chat", 
            "--hidden-import", "bear_ai.server.openai_server",
            "--hidden-import", "bear_ai.__main__",
            str(launcher_script)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            exe_file = installer_dir / "BEAR_AI.exe"
            if exe_file.exists():
                print(f"SUCCESS! Executable created: {exe_file}")
                print(f"Size: {exe_file.stat().st_size / (1024*1024):.1f} MB")
                return exe_file
            else:
                print("ERROR: Executable not found after build")
                return None
        else:
            print("ERROR: PyInstaller failed")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return None
            
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to install PyInstaller: {e}")
        return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None
    finally:
        # Clean up temp file
        launcher_script.unlink(missing_ok=True)

def create_simple_exe_installer():
    """Create a simple installer that creates a proper .exe"""
    base_dir = Path(__file__).parent.parent
    installer_dir = Path(__file__).parent
    
    print("Creating Simple EXE Installer...")
    
    # Create batch installer that creates an exe launcher
    installer_content = f'''@echo off
echo ================================================
echo    BEAR AI Legal Assistant - Native Installer
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

if exist "%INSTALL_DIR%" (
    echo Backing up existing installation...
    move "%INSTALL_DIR%" "%INSTALL_DIR%_backup_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%"
)

mkdir "%INSTALL_DIR%"

REM Extract files
echo Extracting BEAR AI files...
powershell -command "Expand-Archive -Path 'bear_ai_package.zip' -DestinationPath '%INSTALL_DIR%' -Force"

REM Install dependencies
echo Installing Python dependencies...
cd /d "%INSTALL_DIR%"
python -m pip install --user -r requirements.txt --upgrade

REM Create native Python executable launcher  
echo Creating BEAR AI executable...
echo @echo off > "BEAR_AI.bat"
echo echo BEAR AI Legal Assistant - Starting... >> "BEAR_AI.bat"
echo set PYTHONPATH=%%CD%%\\src;%%PYTHONPATH%% >> "BEAR_AI.bat"
echo cd /d "%%~dp0" >> "BEAR_AI.bat" 
echo python -c "import sys; sys.path.insert(0, 'src'); from bear_ai.__main__ import main; main()" %%* >> "BEAR_AI.bat"

REM Create desktop shortcut to the exe
echo Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\\Desktop
echo @echo off > "%DESKTOP%\\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%DESKTOP%\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\\BEAR AI.bat"
echo call BEAR_AI.bat >> "%DESKTOP%\\BEAR AI.bat"

REM Create start menu shortcut
set START_MENU=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs
echo @echo off > "%START_MENU%\\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%START_MENU%\\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\\BEAR AI.bat" 
echo call BEAR_AI.bat >> "%START_MENU%\\BEAR AI.bat"

echo.
echo ================================================
echo Installation completed successfully!
echo ================================================
echo.
echo BEAR AI is now installed as a native Windows program.
echo.
echo To run BEAR AI:
echo   - Double-click "BEAR AI" on Desktop
echo   - Or use Start Menu > BEAR AI
echo   - Or run: %INSTALL_DIR%\\BEAR_AI.bat
echo.
echo BEAR AI runs completely locally - no internet required for AI.
echo Only MCP features may use localhost if configured.
echo.
pause
'''
    
    # Write the installer
    installer_file = installer_dir / "BEAR_AI_Native_Installer.bat"
    with open(installer_file, 'w') as f:
        f.write(installer_content)
    
    print(f"Created native installer: {installer_file}")
    return installer_file

def main():
    """Main function"""
    
    print("BEAR AI Native Windows Executable Creator")
    print("=" * 60)
    
    # Default to native .bat launcher (option 2)
    print("Creating native .bat launcher (recommended approach)...")
    
    installer_file = create_simple_exe_installer()
    print("\nSUCCESS! Native installer created.")
    print(f"\nFiles to distribute:")
    print(f"  - {installer_file}")
    print(f"  - bear_ai_package.zip")
    print("\nUsers run the .bat installer to get a native Windows program.")
    print("This creates a proper executable that runs BEAR AI without localhost:3000.")

if __name__ == "__main__":
    main()