@echo off
REM ============================================================================
REM BEAR AI - Manual Desktop Shortcut Creator
REM Creates desktop shortcut for BEAR AI
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo 🔗 Creating BEAR AI Desktop Shortcut...
echo.

REM Get current directory (BEAR AI folder)
set "BEAR_AI_DIR=%CD%"
set "DESKTOP_PATH=%USERPROFILE%\Desktop"

echo    BEAR AI Location: %BEAR_AI_DIR%
echo    Desktop Location: %DESKTOP_PATH%
echo.

REM Check if run.bat exists
if not exist "run.bat" (
    echo ❌ Error: run.bat not found in current directory
    echo    Please run this script from the BEAR AI root folder
    pause
    exit /b 1
)

REM Create shortcut using PowerShell
echo Creating shortcut...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP_PATH%\BEAR AI.lnk'); $Shortcut.TargetPath = '%BEAR_AI_DIR%\run.bat'; $Shortcut.WorkingDirectory = '%BEAR_AI_DIR%'; $Shortcut.Description = 'BEAR AI - Privacy-First Local AI Assistant'; $Shortcut.Save()"

if !ERRORLEVEL! equ 0 (
    echo ✅ Desktop shortcut created successfully!
    echo    Location: %DESKTOP_PATH%\BEAR AI.lnk
) else (
    echo ❌ Failed to create shortcut
    echo.
    echo 💡 Alternative methods:
    echo    1. Right-click run.bat → Send to → Desktop (create shortcut)
    echo    2. Copy run.bat to desktop and rename to "BEAR AI"
)

echo.
echo 🚀 To launch BEAR AI:
echo    • Double-click the "BEAR AI" desktop shortcut
echo    • Or double-click run.bat in this folder
echo.

pause
endlocal