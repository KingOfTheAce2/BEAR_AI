@echo off
REM ============================================================================
REM BEAR AI - Modern GUI Launcher
REM Privacy-First Local AI with Modern CustomTkinter Interface
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ===============================================================================
echo 🎨 BEAR AI - Modern Interface
echo Privacy-First Local AI with Modern Dark Theme
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
    goto :launch_modern
) else if exist ".venv312\Scripts\python.exe" (
    echo ✅ Using existing Python environment (.venv312)
    set PYTHON_EXE=.venv312\Scripts\python.exe
    goto :launch_modern
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

:launch_modern
REM Check if Python exists in venv
if not exist "%PYTHON_EXE%" (
    echo ❌ Error: Python not found in virtual environment
    echo Expected: %PYTHON_EXE%
    echo Please reinstall BEAR AI using INSTALL.bat
    pause
    exit /b 1
)

REM Check if modern_gui.py exists
if not exist "modern_gui.py" (
    echo ❌ Error: Modern GUI file not found
    echo Expected: modern_gui.py
    echo.
    echo 💡 Available alternatives:
    if exist "simple_gui.py" (
        echo    - Simple GUI: launch_simple.bat
    )
    echo    - Interface Selector: run.bat
    pause
    exit /b 1
)

REM Check CustomTkinter availability
echo 🔍 Checking modern GUI dependencies...
"%PYTHON_EXE%" -c "import customtkinter" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo ⚠️  CustomTkinter not found - installing now...
    "%PYTHON_EXE%" -m pip install customtkinter pillow --quiet
    if !ERRORLEVEL! neq 0 (
        echo ❌ Failed to install CustomTkinter
        echo.
        echo 💡 Fallback options:
        echo    1. Run: INSTALL.bat (complete reinstall)
        echo    2. Use: launch_simple.bat (basic interface)
        pause
        exit /b 1
    )
    echo ✅ CustomTkinter installed successfully
)

REM Launch the Modern GUI
echo.
echo 🚀 Launching BEAR AI Modern Interface...
echo    Features: Dark theme, modern styling, enhanced UX
echo.

"%PYTHON_EXE%" modern_gui.py

REM Check exit code
if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ BEAR AI Modern GUI closed successfully.
) else (
    echo.
    echo ⚠️  BEAR AI Modern GUI exited with error code: !ERRORLEVEL!
    echo.
    echo 💡 Troubleshooting tips:
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