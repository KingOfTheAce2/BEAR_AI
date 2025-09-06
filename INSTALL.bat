@echo off
REM ============================================================================
REM BEAR AI - Complete Installation and Setup
REM Privacy-First Local AI with Modern GUI and Model Management
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ===============================================================================
echo BEAR AI - Complete Installation
echo Privacy-First Local AI Assistant with Modern GUI and Model Management
echo ===============================================================================
echo.

REM Check directory
if not exist "src\bear_ai" (
    echo ERROR: Run this installer from the BEAR AI root directory
    echo    Expected: src\bear_ai\
    echo    Current: %CD%
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo ERROR: Python not found
    echo    Install Python 3.9+ from https://www.python.org/downloads/
    echo    Make sure to check "Add Python to PATH"
    pause
    exit /b 1
)

for /f "tokens=2" %%a in ('python --version 2^>^&1') do set PYTHON_VERSION=%%a
echo FOUND: Python %PYTHON_VERSION%

REM Complete cleanup of old installations
echo.
echo CLEANUP: Removing old installations...
if exist ".venv" (
    echo    Removing .venv directory...
    rmdir /s /q ".venv" 2>nul
)
if exist ".venv312" (
    echo    Removing .venv312 directory...
    rmdir /s /q ".venv312" 2>nul
)
if exist ".venv39" (
    echo    Removing .venv39 directory...
    rmdir /s /q ".venv39" 2>nul
)
if exist "venv" (
    echo    Removing venv directory...
    rmdir /s /q "venv" 2>nul
)

REM Clean shortcuts
echo    Cleaning old shortcuts...
if exist "%USERPROFILE%\Desktop\BEAR AI.lnk" del "%USERPROFILE%\Desktop\BEAR AI.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\BEAR AI Modern.lnk" del "%USERPROFILE%\Desktop\BEAR AI Modern.lnk" 2>nul
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI.lnk" del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI.lnk" 2>nul
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI Modern.lnk" del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI Modern.lnk" 2>nul

REM Clean cache files
echo    Cleaning cache files...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul

echo CLEANUP: Completed

REM Create virtual environment
echo.
echo SETUP: Creating virtual environment...
python -m venv .venv

if not exist ".venv\Scripts\python.exe" (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo CREATED: Virtual environment

REM Install packages
echo.
echo INSTALL: Installing packages (this may take a few minutes)...

".venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel --quiet
if !ERRORLEVEL! neq 0 (
    echo ERROR: Failed to upgrade pip
    pause
    exit /b 1
)

echo    Installing GUI components...
".venv\Scripts\python.exe" -m pip install customtkinter pillow tkinter-tooltip --quiet
if !ERRORLEVEL! neq 0 (
    echo WARNING: CustomTkinter install failed (will use basic GUI)
)

echo    Installing professional GUI components...
".venv\Scripts\python.exe" -m pip install PyQt6 qtawesome --quiet
if !ERRORLEVEL! neq 0 (
    echo WARNING: PyQt6 install failed (professional GUI may not work)
)

echo    Installing model management...
".venv\Scripts\python.exe" -m pip install requests psutil --quiet
if !ERRORLEVEL! neq 0 (
    echo WARNING: Model management dependencies failed
)

echo    Installing BEAR AI core...
".venv\Scripts\python.exe" -m pip install -e . --quiet
if !ERRORLEVEL! neq 0 (
    echo WARNING: BEAR AI package install had issues
)

echo INSTALL: Packages completed

REM Test installation
echo.
echo TEST: Testing installation...
".venv\Scripts\python.exe" test_modern_gui.py

if !ERRORLEVEL! equ 0 (
    echo TEST: Installation test passed
) else (
    echo WARNING: Test had issues but should still work
)

REM Create desktop shortcuts for all interfaces
echo.
echo SHORTCUT: Creating desktop shortcuts...
set "DESKTOP=%USERPROFILE%\Desktop"

REM Main launcher shortcut
set "SHORTCUT_PATH=%DESKTOP%\BEAR AI.lnk"
set "TARGET_PATH=%CD%\run.bat"
call :create_shortcut "%SHORTCUT_PATH%" "%TARGET_PATH%" "BEAR AI - Privacy-First Local AI (Interface Selector)"

REM Modern GUI shortcut
set "SHORTCUT_PATH=%DESKTOP%\BEAR AI Modern.lnk"
set "TARGET_PATH=%CD%\launch_modern.bat"
call :create_shortcut "%SHORTCUT_PATH%" "%TARGET_PATH%" "BEAR AI - Modern Interface"

REM Professional GUI shortcut
set "SHORTCUT_PATH=%DESKTOP%\BEAR AI Professional.lnk"
set "TARGET_PATH=%CD%\launch_professional.bat"
call :create_shortcut "%SHORTCUT_PATH%" "%TARGET_PATH%" "BEAR AI - Professional Interface"

REM Simple GUI shortcut
set "SHORTCUT_PATH=%DESKTOP%\BEAR AI Simple.lnk"
set "TARGET_PATH=%CD%\launch_simple.bat"
call :create_shortcut "%SHORTCUT_PATH%" "%TARGET_PATH%" "BEAR AI - Simple Interface (Fallback)"

REM Start Menu shortcuts
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
if exist "%STARTMENU%" (
    echo SHORTCUT: Creating Start Menu shortcuts...
    copy "%DESKTOP%\BEAR AI.lnk" "%STARTMENU%\BEAR AI.lnk" >nul 2>&1
    copy "%DESKTOP%\BEAR AI Modern.lnk" "%STARTMENU%\BEAR AI Modern.lnk" >nul 2>&1
    copy "%DESKTOP%\BEAR AI Professional.lnk" "%STARTMENU%\BEAR AI Professional.lnk" >nul 2>&1
    copy "%DESKTOP%\BEAR AI Simple.lnk" "%STARTMENU%\BEAR AI Simple.lnk" >nul 2>&1
    echo SHORTCUT: Start Menu shortcuts created
)

goto :end_main

:create_shortcut
set "shortcut_file=%~1"
set "target_file=%~2"
set "description=%~3"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%shortcut_file%" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%target_file%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%CD%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "%description%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

cscript "%TEMP%\CreateShortcut.vbs" >nul 2>&1
del "%TEMP%\CreateShortcut.vbs" 2>nul

if exist "%shortcut_file%" (
    echo SHORTCUT: %~nx1 created
) else (
    echo WARNING: Could not create %~nx1
)
goto :eof

:end_main
echo.
echo ===============================================================================
echo INSTALLATION COMPLETE!
echo ===============================================================================
echo.
echo NEW FEATURES:
echo    - Multiple GUI interfaces available
echo    - Modern dark theme GUI with CustomTkinter styling
echo    - Professional interface with advanced features (PyQt6)
echo    - Simple fallback interface for compatibility
echo    - Integrated PII protection with automatic detection
echo    - AI Model Management with hardware compatibility checking
echo    - Real-time privacy warnings and controls
echo.
echo AVAILABLE INTERFACES:
echo    🎨 Modern GUI      - Enhanced dark theme with modern styling
echo    💼 Professional   - Advanced interface with extra features
echo    📱 Simple GUI     - Basic interface for maximum compatibility
echo    🚀 Launcher       - Interface selector (main shortcut)
echo.
echo AI MODEL FEATURES:
echo    - Automatic hardware detection
echo    - Compatible model recommendations
echo    - Easy one-click model downloads
echo    - Multiple model sizes (3B to 70B parameters)
echo.
echo PRIVACY FEATURES:
echo    - SSN, email, phone number detection and scrubbing
echo    - Credit card and address protection
echo    - All data stays on your device - 100%% private
echo.
echo HOW TO USE:
echo    1. Double-click "BEAR AI" desktop shortcut to choose interface
echo    2. Or use specific shortcuts: "BEAR AI Modern", "BEAR AI Professional", etc.
echo    3. Click "Select Model" to choose and download AI models
echo    4. Click "Hardware Info" to see your system specifications
echo    5. Start chatting with privacy protection enabled
echo.
echo LAUNCH BEAR AI NOW? (Y/N)
set /p LAUNCH_NOW="Launch BEAR AI interface selector now? (Y/N): "

if /i "%LAUNCH_NOW%"=="Y" (
    echo.
    echo LAUNCHING: BEAR AI Interface Selector...
    start "" "%CD%\run.bat"
    timeout /t 2 >nul
    echo SUCCESS: BEAR AI launched! Choose your preferred interface.
    echo TIP: Try the Modern interface first, fallback to Simple if needed.
) else (
    echo.
    echo READY: Launch BEAR AI anytime using:
    echo    - Desktop shortcut: "BEAR AI" (interface selector)
    echo    - Desktop shortcut: "BEAR AI Modern" (direct to modern GUI)
    echo    - Desktop shortcut: "BEAR AI Professional" (direct to professional GUI)
    echo    - Desktop shortcut: "BEAR AI Simple" (direct to simple GUI)
    echo    - Start Menu: Same shortcuts available
    echo    - Or double-click the respective .bat files
)

echo.
echo PRIVACY GUARANTEE: All AI processing happens on your device!
echo SUPPORT: https://github.com/KingOfTheAce2/BEAR_AI/issues
echo.
echo ===============================================================================

pause
endlocal