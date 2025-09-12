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

REM Create single unified desktop shortcut
echo Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\Desktop
echo @echo off > "%DESKTOP%\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%DESKTOP%\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\BEAR AI.bat"
echo echo Choose interface: 1) Web GUI 2) Command Line >> "%DESKTOP%\BEAR AI.bat"
echo set /p choice="Enter choice (1 or 2, default 1): " >> "%DESKTOP%\BEAR AI.bat"
echo if "%%choice%%"=="2" goto cli >> "%DESKTOP%\BEAR AI.bat"
echo echo Starting BEAR AI Web Interface... >> "%DESKTOP%\BEAR AI.bat"
echo start http://localhost:3000 >> "%DESKTOP%\BEAR AI.bat"
echo npm start >> "%DESKTOP%\BEAR AI.bat"
echo goto end >> "%DESKTOP%\BEAR AI.bat"
echo :cli >> "%DESKTOP%\BEAR AI.bat"
echo call bear_ai_launcher.bat %%* >> "%DESKTOP%\BEAR AI.bat"
echo :end >> "%DESKTOP%\BEAR AI.bat"

REM Create single Start Menu shortcut
set START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
echo @echo off > "%START_MENU%\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%START_MENU%\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\BEAR AI.bat"
echo echo Choose interface: 1) Web GUI 2) Command Line >> "%START_MENU%\BEAR AI.bat"
echo set /p choice="Enter choice (1 or 2, default 1): " >> "%START_MENU%\BEAR AI.bat"
echo if "%%choice%%"=="2" goto cli >> "%START_MENU%\BEAR AI.bat"
echo echo Starting BEAR AI Web Interface... >> "%START_MENU%\BEAR AI.bat"
echo start http://localhost:3000 >> "%START_MENU%\BEAR AI.bat"
echo npm start >> "%START_MENU%\BEAR AI.bat"
echo goto end >> "%START_MENU%\BEAR AI.bat"
echo :cli >> "%START_MENU%\BEAR AI.bat"
echo call bear_ai_launcher.bat %%* >> "%START_MENU%\BEAR AI.bat"
echo :end >> "%START_MENU%\BEAR AI.bat"

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
echo   - Desktop shortcut: "BEAR AI" (offers GUI/CLI choice)
echo   - Command line: cd "%INSTALL_DIR%" ^&^& bear_ai_launcher.bat
echo   - Web GUI: Desktop shortcut selects GUI by default
echo.
echo For help: bear_ai_launcher.bat --help
echo For model discovery: bear_ai_launcher.bat discover
echo.
pause
