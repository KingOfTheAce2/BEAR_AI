@echo off
REM ============================================================================
REM BEAR AI - Simple GUI Launcher
REM Privacy-First Local AI with Basic Tkinter Interface (Maximum Compatibility)
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ===============================================================================
echo 📱 BEAR AI - Simple Interface
echo Privacy-First Local AI with Maximum Compatibility
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
    goto :launch_simple
) else if exist ".venv312\Scripts\python.exe" (
    echo ✅ Using existing Python environment (.venv312)
    set PYTHON_EXE=.venv312\Scripts\python.exe
    goto :launch_simple
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

:launch_simple
REM Check if Python exists in venv
if not exist "%PYTHON_EXE%" (
    echo ❌ Error: Python not found in virtual environment
    echo Expected: %PYTHON_EXE%
    echo Please reinstall BEAR AI using INSTALL.bat
    pause
    exit /b 1
)

REM Check if simple_gui.py exists
if not exist "simple_gui.py" (
    echo ❌ Error: Simple GUI file not found
    echo Expected: simple_gui.py
    echo.
    echo 💡 Available alternatives:
    if exist "modern_gui.py" (
        echo    - Modern GUI: launch_modern.bat
    )
    echo    - Interface Selector: run.bat
    pause
    exit /b 1
)

REM Check basic Tkinter availability (should always be available with Python)
echo 🔍 Checking basic GUI dependencies...
"%PYTHON_EXE%" -c "import tkinter" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo ❌ Tkinter not found - this is unusual for a standard Python installation
    echo.
    echo 💡 Possible solutions:
    echo    1. Reinstall Python with tkinter support
    echo    2. Run: INSTALL.bat (complete reinstall)
    pause
    exit /b 1
)

echo ✅ Basic GUI dependencies ready

REM Launch the Simple GUI
echo.
echo 🚀 Launching BEAR AI Simple Interface...
echo    Features: Maximum compatibility, basic functionality, lightweight
echo.

"%PYTHON_EXE%" simple_gui.py

REM Check exit code
if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ BEAR AI Simple GUI closed successfully.
) else (
    echo.
    echo ⚠️  BEAR AI Simple GUI exited with error code: !ERRORLEVEL!
    echo.
    echo 💡 Troubleshooting tips:
    echo    - Check that models are properly installed
    echo    - Verify sufficient memory is available
    echo    - Run INSTALL.bat to fix dependencies
    echo    - Try the Interface Selector: run.bat
    echo.
    pause
)

echo.
echo 🛡️  Remember: All your data stays on your device with BEAR AI!
echo 📚 Documentation: README.md ^| RELEASE_NOTES.md ^| docs\
echo.

endlocal