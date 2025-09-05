@echo off
REM ============================================================================
REM BEAR AI - Privacy-First Local AI Assistant
REM Unified GUI Launcher
REM ============================================================================

setlocal enabledelayedexpansion

REM Check if we're in the correct directory (should contain bear_ai source)
if not exist "src\bear_ai" (
    echo.
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
    goto :launch_gui
) else if exist ".venv312\Scripts\python.exe" (
    echo ✅ Using existing Python environment (.venv312)
    set PYTHON_EXE=.venv312\Scripts\python.exe
    goto :launch_gui
) else (
    echo.
    echo ❌ No virtual environment found!
    echo.
    echo 💡 Quick Fix Options:
    echo    1. Double-click: FIX_AND_RUN_BEAR_AI.bat (recommended)
    echo    2. Run: CLEAN_INSTALL_BEAR_AI.bat (complete fresh install)
    echo    3. Run: INSTALL_BEAR_AI.bat (original installer)
    echo.
    echo 🔧 The FIX_AND_RUN_BEAR_AI.bat will automatically:
    echo    • Create missing virtual environment
    echo    • Install required packages
    echo    • Launch the modern GUI
    echo.
    pause
    exit /b 1
)

REM Launch BEAR AI GUI
echo.
echo 🚀 Launching BEAR AI GUI...
echo.

:launch_gui
REM Set Python path to virtual environment (if not already set above)
if not defined PYTHON_EXE (
    set PYTHON_EXE=.venv\Scripts\python.exe
)

REM Check if Python exists in venv
if not exist "%PYTHON_EXE%" (
    echo ❌ Error: Python not found in virtual environment
    echo Expected: %PYTHON_EXE%
    echo Please reinstall BEAR AI using scripts\install.ps1
    pause
    exit /b 1
)

REM Launch the GUI
echo Starting BEAR AI Privacy-First Local Assistant...
"%PYTHON_EXE%" modern_gui.py

REM Check exit code
if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ BEAR AI GUI closed successfully.
) else (
    echo.
    echo ⚠️  BEAR AI GUI exited with error code: !ERRORLEVEL!
    echo.
    echo 💡 Troubleshooting tips:
    echo    - Check that models are properly installed
    echo    - Verify sufficient memory is available
    echo    - See docs\TROUBLESHOOTING.md for common solutions
    echo.
    pause
)

echo.
echo 🛡️  Remember: All your data stays on your device with BEAR AI!
echo 📚 Documentation: README.md ^| RELEASE_NOTES.md ^| docs\
echo.

endlocal