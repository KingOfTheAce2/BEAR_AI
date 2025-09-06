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

REM Interface Selection Menu
echo.
echo 🚀 BEAR AI Interface Selection
echo.

:interface_menu
echo ===============================================================================
echo Choose your BEAR AI interface:
echo.
echo   1. 🎨 Modern GUI      - Enhanced dark theme with modern styling
echo   2. 💼 Professional    - Advanced interface with extra features  
echo   3. 📱 Simple GUI      - Basic interface for maximum compatibility
echo   4. ❓ Auto-detect     - Let BEAR AI choose the best interface
echo   5. ℹ️  Help           - Learn about the interfaces
echo   0. ❌ Exit
echo.
echo ===============================================================================

set /p INTERFACE_CHOICE="Enter your choice (0-5): "

if "%INTERFACE_CHOICE%"=="1" goto :launch_modern
if "%INTERFACE_CHOICE%"=="2" goto :launch_professional  
if "%INTERFACE_CHOICE%"=="3" goto :launch_simple
if "%INTERFACE_CHOICE%"=="4" goto :auto_detect
if "%INTERFACE_CHOICE%"=="5" goto :show_help
if "%INTERFACE_CHOICE%"=="0" goto :exit_clean

echo ❌ Invalid choice. Please select 0-5.
echo.
goto :interface_menu

:launch_modern
echo.
echo 🎨 Launching Modern Interface...
start "" "%CD%\launch_modern.bat"
goto :exit_clean

:launch_professional
echo.
echo 💼 Launching Professional Interface...
start "" "%CD%\launch_professional.bat"
goto :exit_clean

:launch_simple  
echo.
echo 📱 Launching Simple Interface...
start "" "%CD%\launch_simple.bat"
goto :exit_clean

:auto_detect
echo.
echo 🔍 Auto-detecting best interface...

REM Set Python path to virtual environment (if not already set above)
if not defined PYTHON_EXE (
    set PYTHON_EXE=.venv\Scripts\python.exe
)

REM Check if Python exists in venv
if not exist "%PYTHON_EXE%" (
    echo ❌ Error: Python not found in virtual environment
    echo Expected: %PYTHON_EXE%
    echo Please reinstall BEAR AI using INSTALL.bat
    pause
    exit /b 1
)

REM Check for CustomTkinter (Modern GUI)
"%PYTHON_EXE%" -c "import customtkinter" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    if exist "modern_gui.py" (
        echo ✅ Modern Interface available - launching...
        "%PYTHON_EXE%" modern_gui.py
        goto :check_exit_auto
    )
)

REM Check for PyQt6 (Professional GUI)  
"%PYTHON_EXE%" -c "import PyQt6" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    if exist "professional_gui.py" (
        echo ✅ Professional Interface available - launching...
        "%PYTHON_EXE%" professional_gui.py
        goto :check_exit_auto
    )
)

REM Fall back to Simple GUI
if exist "simple_gui.py" (
    echo ✅ Simple Interface available - launching...
    "%PYTHON_EXE%" simple_gui.py
    goto :check_exit_auto
) else (
    echo ❌ No GUI interface found!
    echo Please run INSTALL.bat to set up BEAR AI properly.
    pause
    exit /b 1
)

:check_exit_auto
if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ BEAR AI GUI closed successfully.
) else (
    echo.
    echo ⚠️  BEAR AI GUI exited with error code: !ERRORLEVEL!
)
goto :exit_clean

:show_help
echo.
echo ===============================================================================
echo 🎨 MODERN GUI
echo -------------------------------------------------------------------------------
echo • Dark theme with CustomTkinter styling
echo • Modern, clean interface design  
echo • Enhanced user experience
echo • Requires: CustomTkinter, Pillow
echo • Best for: Daily use, modern systems
echo.
echo 💼 PROFESSIONAL GUI  
echo -------------------------------------------------------------------------------
echo • Advanced PyQt6 interface
echo • Multiple views and advanced controls
echo • Professional styling and features
echo • Requires: PyQt6, qtawesome
echo • Best for: Power users, advanced features
echo.
echo 📱 SIMPLE GUI
echo -------------------------------------------------------------------------------  
echo • Basic Tkinter interface
echo • Maximum compatibility
echo • Lightweight and fast
echo • Requires: Only Python (built-in tkinter)
echo • Best for: Older systems, troubleshooting
echo.
echo 🔍 AUTO-DETECT
echo -------------------------------------------------------------------------------
echo • Automatically selects the best available interface
echo • Tries Modern first, then Professional, then Simple
echo • Good for first-time users
echo ===============================================================================
echo.
pause
goto :interface_menu

:exit_clean

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