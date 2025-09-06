@echo off
REM ============================================================================
REM BEAR AI - WORKING GUI Launch Methods
REM Tested and verified launch methods for BEAR AI GUI
REM ============================================================================

echo.
echo ===============================================================================
echo 🐻 BEAR AI - Verified Working Launch Methods
echo ===============================================================================
echo.

REM Check if we're in the correct directory
if not exist "simple_gui.py" (
    echo ❌ Error: Not in BEAR AI root directory
    echo Expected to find: simple_gui.py
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Choose a verified working launch method:
echo.
echo   1. 📱 Simple GUI (Most Reliable) - python simple_gui.py
echo   2. 🚀 Visual Launcher (Fixed)    - UTF-8 encoding fix
echo   3. 📋 Master Menu               - run.bat interface
echo   0. ❌ Exit
echo.

set /p choice="Enter your choice (0-3): "

if "%choice%"=="1" goto :launch_simple
if "%choice%"=="2" goto :launch_visual
if "%choice%"=="3" goto :launch_menu
if "%choice%"=="0" goto :exit
echo Invalid choice. Please select 0-3.
goto :start

:launch_simple
echo.
echo 🚀 Launching Simple GUI (Most Reliable Method)...
python simple_gui.py
goto :done

:launch_visual
echo.
echo 🚀 Launching Visual Interface Selector (UTF-8 Fixed)...
python -c "import codecs; exec(codecs.open('gui_launcher.py', 'r', 'utf-8').read())"
goto :done

:launch_menu
echo.
echo 🚀 Launching Master Menu Interface...
call run.bat
goto :done

:done
echo.
echo ✅ GUI session completed.
pause

:exit
echo.
echo 👋 Goodbye!