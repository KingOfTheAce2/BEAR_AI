@echo off
REM ===================================================================
REM BEAR AI Legal Assistant - Clean Uninstaller
REM Removes all traces of BEAR AI from Windows system
REM ===================================================================

setlocal EnableDelayedExpansion

title BEAR AI Legal Assistant - Uninstaller
color 0C

echo.
echo ╭──────────────────────────────────────────────────────────────────╮
echo │   🗑️  BEAR AI Legal Assistant - Uninstaller                      │
echo │   Complete removal from Windows system                          │
echo ╰──────────────────────────────────────────────────────────────────╯
echo.

set "INSTALL_DIR=%USERPROFILE%\BEAR_AI"
set "LOG_FILE=%TEMP%\bear_ai_uninstall.log"

echo ⚠️  WARNING: This will completely remove BEAR AI Legal Assistant
echo    and all its data from your computer.
echo.
set /p CONFIRM="Are you sure you want to continue? (Type YES to confirm): "

if /i not "%CONFIRM%"=="YES" (
    echo Uninstallation cancelled.
    goto :end
)

echo.
echo 🗑️  Proceeding with uninstallation...
echo Uninstallation started at %date% %time% > "%LOG_FILE%"

REM Stop processes
echo 🛁 Stopping BEAR AI processes...
for /f "tokens=2" %%p in ('tasklist /fi "imagename eq python.exe" /fo csv 2^>nul ^| find "python.exe"') do (
    set "PID=%%p"
    set "PID=!PID:"=!"
    if not "!PID!"=="" taskkill /PID !PID! /F >nul 2>&1
)
tasklist /fi "imagename eq node.exe" >nul 2>&1
if %errorLevel% equ 0 taskkill /im node.exe /F >nul 2>&1

echo ✅ Process cleanup completed

REM Remove shortcuts
echo 🗑️  Removing shortcuts...
set "DESKTOP_SHORTCUT=%USERPROFILE%\Desktop\BEAR AI Legal Assistant.lnk"
set "STARTMENU_SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI Legal Assistant.lnk"

if exist "%DESKTOP_SHORTCUT%" (
    del "%DESKTOP_SHORTCUT%" >nul 2>&1
    echo ✅ Desktop shortcut removed
)
if exist "%STARTMENU_SHORTCUT%" (
    del "%STARTMENU_SHORTCUT%" >nul 2>&1
    echo ✅ Start Menu shortcut removed
)

REM Remove installation directory
echo 🗑️  Removing installation directory...
if exist "%INSTALL_DIR%" (
    attrib -R "%INSTALL_DIR%\*" /S /D >nul 2>&1
    rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
    if exist "%INSTALL_DIR%" (
        echo ⚠️  Some files may still be in use
        ren "%INSTALL_DIR%" "BEAR_AI_TO_DELETE_%RANDOM%" >nul 2>&1
    ) else (
        echo ✅ Installation directory removed
    )
) else (
    echo ℹ️  Installation directory not found
)

REM Clean temp files
echo 🧹 Cleaning temporary files...
for %%f in (
    "%TEMP%\bear_ai*.log"
    "%TEMP%\bear_ai*.txt" 
    "%TEMP%\bear-ai*.zip"
) do (
    if exist "%%f" del "%%f" >nul 2>&1
)

echo ✅ Temporary files cleaned

REM Validation
echo 🔍 Validating uninstallation...
set "CLEANUP_SCORE=0"
set "TOTAL_CHECKS=4"

if not exist "%INSTALL_DIR%" (
    echo ✅ Check 1/4: Installation directory removed
    set /a CLEANUP_SCORE+=1
)
if not exist "%DESKTOP_SHORTCUT%" (
    echo ✅ Check 2/4: Desktop shortcut removed
    set /a CLEANUP_SCORE+=1
)
if not exist "%STARTMENU_SHORTCUT%" (
    echo ✅ Check 3/4: Start Menu shortcut removed
    set /a CLEANUP_SCORE+=1
)
tasklist /fi "windowtitle eq BEAR AI*" >nul 2>&1
if %errorLevel% neq 0 (
    echo ✅ Check 4/4: No BEAR AI processes running
    set /a CLEANUP_SCORE+=1
)

echo.
echo 📊 Cleanup Results: %CLEANUP_SCORE%/%TOTAL_CHECKS%

if %CLEANUP_SCORE% equ %TOTAL_CHECKS% (
    echo ✅ Uninstallation: COMPLETE
    echo.
    echo 🎉 BEAR AI Legal Assistant has been completely removed!
    echo ✅ Installation directory, shortcuts, and processes cleaned
    echo 💻 Your computer is now clean of BEAR AI
) else (
    echo ⚠️  Uninstallation: MOSTLY COMPLETE
    echo    Some files may require manual cleanup or restart
)

echo.
echo 📝 Uninstallation log: %LOG_FILE%
echo Uninstallation completed at %date% %time% >> "%LOG_FILE%"

if %CLEANUP_SCORE% lss %TOTAL_CHECKS% (
    echo.
    set /p REBOOT="💻 Restart computer to complete removal? (Y/N): "
    if /i "!REBOOT!"=="Y" (
        echo Restarting in 10 seconds...
        timeout /t 10
        shutdown /r /t 0
    )
)

:end
echo.
echo 👋 Thank you for using BEAR AI Legal Assistant!
echo.
pause
endlocal
exit /b