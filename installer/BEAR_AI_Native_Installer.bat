@echo off
echo ================================================
echo    BEAR AI Legal Assistant - Native Installer
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

REM Create installation directory
set INSTALL_DIR=%USERPROFILE%\BEAR_AI
echo Installing to: %INSTALL_DIR%

if exist "%INSTALL_DIR%" (
    echo Backing up existing installation...
    move "%INSTALL_DIR%" "%INSTALL_DIR%_backup_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%"
)

mkdir "%INSTALL_DIR%"

REM Extract files
echo Extracting BEAR AI files...
powershell -command "Expand-Archive -Path 'bear_ai_package.zip' -DestinationPath '%INSTALL_DIR%' -Force"

REM Install dependencies
echo Installing Python dependencies...
cd /d "%INSTALL_DIR%"
python -m pip install --user -r requirements.txt --upgrade

REM Create native Python executable launcher  
echo Creating BEAR AI executable...
echo @echo off > "BEAR_AI.bat"
echo echo BEAR AI Legal Assistant - Starting... >> "BEAR_AI.bat"
echo set PYTHONPATH=%%CD%%\src;%%PYTHONPATH%% >> "BEAR_AI.bat"
echo cd /d "%%~dp0" >> "BEAR_AI.bat" 
echo python -c "import sys; sys.path.insert(0, 'src'); from bear_ai.__main__ import main; main()" %%* >> "BEAR_AI.bat"

REM Create desktop shortcut to the exe
echo Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\Desktop
echo @echo off > "%DESKTOP%\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%DESKTOP%\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%DESKTOP%\BEAR AI.bat"
echo call BEAR_AI.bat >> "%DESKTOP%\BEAR AI.bat"

REM Create start menu shortcut
set START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
echo @echo off > "%START_MENU%\BEAR AI.bat"
echo echo Starting BEAR AI Legal Assistant... >> "%START_MENU%\BEAR AI.bat"
echo cd /d "%INSTALL_DIR%" >> "%START_MENU%\BEAR AI.bat" 
echo call BEAR_AI.bat >> "%START_MENU%\BEAR AI.bat"

echo.
echo ================================================
echo Installation completed successfully!
echo ================================================
echo.
echo BEAR AI is now installed as a native Windows program.
echo.
echo To run BEAR AI:
echo   - Double-click "BEAR AI" on Desktop
echo   - Or use Start Menu > BEAR AI
echo   - Or run: %INSTALL_DIR%\BEAR_AI.bat
echo.
echo BEAR AI runs completely locally - no internet required for AI.
echo Only MCP features may use localhost if configured.
echo.
pause
