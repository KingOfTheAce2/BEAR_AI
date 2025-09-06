@echo off
REM ============================================================================
REM BEAR AI - GUI Launcher (Visual Interface Selector)
REM Privacy-First Local AI with Visual Interface Selection
REM ============================================================================

setlocal enabledelayedexpansion

REM Check if we're in the correct directory
if not exist "src\bear_ai" (
    echo ❌ Error: This script must be run from the BEAR AI root directory
    echo    Expected to find: src\bear_ai\
    echo    Current directory: %CD%
    pause
    exit /b 1
)

REM Check if virtual environment exists
if exist ".venv\Scripts\python.exe" (
    set PYTHON_EXE=.venv\Scripts\python.exe
) else if exist ".venv312\Scripts\python.exe" (
    set PYTHON_EXE=.venv312\Scripts\python.exe
) else (
    echo ❌ No virtual environment found!
    echo Please run INSTALL.bat first to set up BEAR AI.
    pause
    exit /b 1
)

REM Launch the GUI launcher
echo 🚀 Opening BEAR AI Interface Selector...
"%PYTHON_EXE%" gui_launcher.py

endlocal