@echo off
REM ============================================================================
REM BEAR AI - Manual Cleanup of Old Installations
REM Run this first to clean up any old/broken BEAR AI installs
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ===============================================================================
echo BEAR AI - Manual Cleanup
echo Removing all old installations and cached files
echo ===============================================================================
echo.

REM Stop any running processes
echo CLEANUP: Stopping any running Python processes...
taskkill /f /im python.exe 2>nul
taskkill /f /im pythonw.exe 2>nul

REM Wait a moment for processes to close
timeout /t 2 /nobreak >nul

REM Remove ALL virtual environments
echo CLEANUP: Removing virtual environments...
if exist ".venv" (
    echo    Removing .venv...
    rmdir /s /q ".venv" 2>nul
    if exist ".venv" (
        echo    Force removing .venv...
        rd /s /q ".venv" 2>nul
    )
)

if exist ".venv312" (
    echo    Removing .venv312...
    rmdir /s /q ".venv312" 2>nul
    if exist ".venv312" (
        echo    Force removing .venv312...
        rd /s /q ".venv312" 2>nul
    )
)

if exist ".venv39" (
    echo    Removing .venv39...
    rmdir /s /q ".venv39" 2>nul
)

if exist "venv" (
    echo    Removing venv...
    rmdir /s /q "venv" 2>nul
)

if exist "env" (
    echo    Removing env...
    rmdir /s /q "env" 2>nul
)

REM Remove Python cache
echo CLEANUP: Removing Python cache files...
for /d /r . %%d in (__pycache__) do @if exist "%%d" (
    echo    Removing cache: %%d
    rd /s /q "%%d" 2>nul
)

REM Remove .pyc files
echo CLEANUP: Removing .pyc files...
for /r . %%f in (*.pyc) do @if exist "%%f" del "%%f" 2>nul

REM Remove build artifacts
echo CLEANUP: Removing build artifacts...
if exist "build" rmdir /s /q "build" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
for /d %%d in (*.egg-info) do if exist "%%d" rmdir /s /q "%%d" 2>nul

REM Remove old shortcuts
echo CLEANUP: Removing old shortcuts...
if exist "%USERPROFILE%\Desktop\BEAR AI.lnk" (
    echo    Removing desktop shortcut: BEAR AI.lnk
    del "%USERPROFILE%\Desktop\BEAR AI.lnk" 2>nul
)
if exist "%USERPROFILE%\Desktop\BEAR AI Modern.lnk" (
    echo    Removing desktop shortcut: BEAR AI Modern.lnk
    del "%USERPROFILE%\Desktop\BEAR AI Modern.lnk" 2>nul
)

REM Start Menu shortcuts
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
if exist "%STARTMENU%\BEAR AI.lnk" (
    echo    Removing Start Menu shortcut: BEAR AI.lnk
    del "%STARTMENU%\BEAR AI.lnk" 2>nul
)
if exist "%STARTMENU%\BEAR AI Modern.lnk" (
    echo    Removing Start Menu shortcut: BEAR AI Modern.lnk
    del "%STARTMENU%\BEAR AI Modern.lnk" 2>nul
)

REM Remove temporary files
echo CLEANUP: Removing temporary files...
del "*.tmp" 2>nul
del "%TEMP%\CreateShortcut.vbs" 2>nul

echo.
echo ===============================================================================
echo CLEANUP COMPLETE!
echo ===============================================================================
echo.
echo All old BEAR AI installations have been cleaned up.
echo You can now run INSTALL.bat for a fresh installation.
echo.
echo NEXT STEPS:
echo    1. Double-click: INSTALL.bat
echo    2. Follow the installation prompts
echo    3. Launch BEAR AI and enjoy the modern GUI with model management!
echo.

pause
endlocal