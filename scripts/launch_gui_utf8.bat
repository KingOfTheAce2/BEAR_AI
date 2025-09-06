@echo off
REM Robust GUI launcher with UTF-8 encoding support
REM Handles Unicode characters properly on Windows

cd /d "%~dp0.."
echo Launching GUI with UTF-8 encoding support...

REM Set UTF-8 code page for proper Unicode support
chcp 65001 >nul 2>&1

REM Try to use virtual environment Python if available
set PYTHON_EXE=python
if exist ".venv\Scripts\python.exe" (
    set PYTHON_EXE=.venv\Scripts\python.exe
) else if exist ".venv312\Scripts\python.exe" (
    set PYTHON_EXE=.venv312\Scripts\python.exe
)

REM Launch the specified GUI with UTF-8 support
if "%1"=="" (
    echo Usage: %0 ^<gui_file^>
    echo Available options:
    echo   gui_launcher.py
    echo   simple_gui.py
    echo   modern_gui.py
    echo   src\bear_ai\professional_gui.py
    pause
    exit /b 1
)

echo Using Python: %PYTHON_EXE%
echo Launching: %1

REM Use -X utf8 flag to force UTF-8 encoding
%PYTHON_EXE% -X utf8 scripts\launch_gui.py "%1"

if errorlevel 1 (
    echo.
    echo Error launching GUI. Trying alternative method...
    %PYTHON_EXE% -X utf8 "%1"
)

pause