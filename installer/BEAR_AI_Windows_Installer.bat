@echo off
echo ================================================
echo    BEAR AI Legal Assistant - Windows Installer
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM Create installation directory
set INSTALL_DIR=%USERPROFILE%\BEAR_AI
echo Installing to: %INSTALL_DIR%

if exist "%INSTALL_DIR%" (
    echo Backing up existing installation...
    move "%INSTALL_DIR%" "%INSTALL_DIR%_backup_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%"
)

mkdir "%INSTALL_DIR%"

REM Extract files using PowerShell (more reliable than extract command)
echo Extracting BEAR AI files...
powershell -command "if (Test-Path 'bear_ai_package.zip') { Expand-Archive -Path 'bear_ai_package.zip' -DestinationPath '%INSTALL_DIR%' -Force; Write-Host 'Files extracted successfully' } else { Write-Host 'ERROR: bear_ai_package.zip not found'; exit 1 }"

REM Install Python dependencies
echo Installing Python dependencies...
cd /d "%INSTALL_DIR%"
python -m pip install --user -r requirements.txt --upgrade

REM Create launcher script with proper Python path
echo Creating launcher...
echo @echo off > bear_ai_launcher.bat
echo set PYTHONPATH=%%CD%%\src;%%PYTHONPATH%% >> bear_ai_launcher.bat
echo cd /d "%%~dp0" >> bear_ai_launcher.bat
echo python -m bear_ai %%* >> bear_ai_launcher.bat

REM Create GUI launcher
echo @echo off > bear_ai_gui.bat
echo echo Starting BEAR AI Web Interface... >> bear_ai_gui.bat  
echo cd /d "%%~dp0" >> bear_ai_gui.bat
echo start http://localhost:3000 >> bear_ai_gui.bat
echo npm start >> bear_ai_gui.bat

REM Create desktop shortcut
echo Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\Desktop
echo @echo off > "%DESKTOP%\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\BEAR AI.bat"
echo call bear_ai_launcher.bat %%* >> "%DESKTOP%\BEAR AI.bat"

REM Create GUI desktop shortcut  
echo @echo off > "%DESKTOP%\BEAR AI GUI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\BEAR AI GUI.bat"
echo call bear_ai_gui.bat >> "%DESKTOP%\BEAR AI GUI.bat"

REM Create Start Menu shortcuts
set START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
if not exist "%START_MENU%\BEAR AI" mkdir "%START_MENU%\BEAR AI"

echo @echo off > "%START_MENU%\BEAR AI\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\BEAR AI\BEAR AI.bat"
echo call bear_ai_launcher.bat %%* >> "%START_MENU%\BEAR AI\BEAR AI.bat"

echo @echo off > "%START_MENU%\BEAR AI\BEAR AI GUI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\BEAR AI\BEAR AI GUI.bat"
echo call bear_ai_gui.bat >> "%START_MENU%\BEAR AI\BEAR AI GUI.bat"

REM Test installation
echo Testing installation...
call bear_ai_launcher.bat --help >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: BEAR AI test failed. Installation may be incomplete.
) else (
    echo Installation test passed!
)

echo.
echo ================================================
echo Installation completed successfully!
echo ================================================
echo.
echo You can now run BEAR AI using:
echo   - Desktop shortcut: "BEAR AI"
echo   - Command line: cd "%INSTALL_DIR%" ^&^& bear_ai_launcher.bat
echo   - GUI: Desktop shortcut "BEAR AI GUI"
echo.
echo For help: bear_ai_launcher.bat --help
echo For model discovery: bear_ai_launcher.bat discover
echo.
pause
