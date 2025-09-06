@echo off
REM ============================================================================
REM BEAR AI - Professional GUI Launcher
REM Privacy-First Local AI with Advanced PyQt6 Interface
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ===============================================================================
echo 💼 BEAR AI - Professional Interface
echo Privacy-First Local AI with Advanced Features
echo ===============================================================================
echo.

REM Check if we're in the correct directory
if not exist "src\bear_ai" (
    echo ❌ Error: This script must be run from the BEAR AI root directory
    echo    Expected to find: src\bear_ai\
    echo    Current directory: %CD%
    echo.
    echo 💡 Tip: Navigate to the BEAR AI folder and try again
    pause
    exit /b 1
)

REM Check if virtual environment exists
echo 🔍 Checking for virtual environments...

if exist ".venv\Scripts\python.exe" (
    echo ✅ Found BEAR AI installation (.venv)
    set PYTHON_EXE=.venv\Scripts\python.exe
    goto :check_professional
) else if exist ".venv312\Scripts\python.exe" (
    echo ✅ Using existing Python environment (.venv312)
    set PYTHON_EXE=.venv312\Scripts\python.exe
    goto :check_professional
) else (
    echo.
    echo ❌ No virtual environment found!
    echo.
    echo 💡 Quick Fix Options:
    echo    1. Run: INSTALL.bat (recommended - installs all dependencies)
    echo    2. Double-click: run.bat (will guide you through setup)
    echo.
    pause
    exit /b 1
)

:check_professional
REM Check if Python exists in venv
if not exist "%PYTHON_EXE%" (
    echo ❌ Error: Python not found in virtual environment
    echo Expected: %PYTHON_EXE%
    echo Please reinstall BEAR AI using INSTALL.bat
    pause
    exit /b 1
)

REM Check PyQt6 availability
echo 🔍 Checking professional GUI dependencies...
"%PYTHON_EXE%" -c "import PyQt6" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo ⚠️  PyQt6 not found - installing now...
    "%PYTHON_EXE%" -m pip install PyQt6 qtawesome --quiet
    if !ERRORLEVEL! neq 0 (
        echo ❌ Failed to install PyQt6
        echo.
        echo 💡 Fallback options:
        echo    1. Run: INSTALL.bat (complete reinstall)
        echo    2. Use: launch_modern.bat (CustomTkinter interface)
        echo    3. Use: launch_simple.bat (basic interface)
        pause
        exit /b 1
    )
    echo ✅ PyQt6 installed successfully
)

REM Check if professional_gui.py exists, if not create a launcher
if not exist "professional_gui.py" (
    echo 📝 Creating professional GUI wrapper...
    call :create_professional_gui
)

REM Launch the Professional GUI
echo.
echo 🚀 Launching BEAR AI Professional Interface...
echo    Features: Advanced controls, multiple views, professional styling
echo.

"%PYTHON_EXE%" professional_gui.py

REM Check exit code
if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ BEAR AI Professional GUI closed successfully.
) else (
    echo.
    echo ⚠️  BEAR AI Professional GUI exited with error code: !ERRORLEVEL!
    echo.
    echo 💡 Troubleshooting tips:
    echo    - Try the Modern interface: launch_modern.bat
    echo    - Try the Simple interface: launch_simple.bat
    echo    - Check that models are properly installed
    echo    - Verify sufficient memory is available
    echo    - Run INSTALL.bat to fix dependencies
    echo.
    pause
)

echo.
echo 🛡️  Remember: All your data stays on your device with BEAR AI!
echo 📚 Documentation: README.md ^| RELEASE_NOTES.md ^| docs\
echo.

endlocal
exit /b 0

:create_professional_gui
echo Creating professional GUI wrapper...
(
echo import sys
echo import os
echo.
echo # Add src to path for imports
echo sys.path.insert(0, os.path.join(os.path.dirname(__file__^), 'src'^)^)
echo.
echo try:
echo     # Try to import and run modern_gui with professional styling
echo     from modern_gui import main as modern_main
echo     
echo     # Set professional theme
echo     os.environ['BEAR_AI_THEME'] = 'professional'
echo     os.environ['BEAR_AI_INTERFACE'] = 'professional'
echo     
echo     if __name__ == '__main__':
echo         print("🚀 Starting BEAR AI Professional Interface..."^)
echo         modern_main(^)
echo         
echo except ImportError:
echo     # Fallback to simple GUI
echo     try:
echo         from simple_gui import main as simple_main
echo         print("⚠️  Professional interface not available, using enhanced simple interface"^)
echo         
echo         if __name__ == '__main__':
echo             simple_main(^)
echo     except ImportError:
echo         print("❌ Error: No GUI interface found"^)
echo         print("💡 Please run INSTALL.bat to set up BEAR AI properly"^)
echo         input("Press Enter to exit..."^)
echo         sys.exit(1^)
echo.
echo except Exception as e:
echo     print(f"❌ Error launching professional interface: {e}"^)
echo     print("💡 Try running one of the other interfaces:"^)
echo     print("   - launch_modern.bat"^)
echo     print("   - launch_simple.bat"^)
echo     input("Press Enter to exit..."^)
echo     sys.exit(1^)
) > professional_gui.py

echo ✅ Professional GUI wrapper created
goto :eof