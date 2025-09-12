@echo off
REM ===================================================================
REM BEAR AI Legal Assistant - Bulletproof Windows Installer
REM No build dependencies, no CMake, no Visual Studio required
REM Tested on vanilla Windows 10/11 systems
REM ===================================================================

setlocal EnableDelayedExpansion

REM Set title and colors
title BEAR AI Legal Assistant - Bulletproof Installer
color 0F

echo.
echo ╭──────────────────────────────────────────────────────────────────╮
echo │  🐻  BEAR AI Legal Assistant - Bulletproof Installer  ⚖️        │
echo │  Zero build dependencies - Just works on Windows 10/11         │
echo │  Professional Legal AI Assistant                                │
echo ╰──────────────────────────────────────────────────────────────────╯
echo.

REM Configuration
set "APP_NAME=BEAR AI Legal Assistant"
set "APP_VERSION=2.0.0-production"
set "INSTALL_DIR=%USERPROFILE%\BEAR_AI"
set "PYTHON_MIN_VERSION=3.9"
set "LOG_FILE=%TEMP%\bear_ai_install.log"

REM GitHub repository
set "REPO_URL=https://github.com/KingOfTheAce2/BEAR_AI/archive/refs/heads/main.zip"
set "ZIP_FILE=%TEMP%\bear-ai-main.zip"

echo 📊 Installation Configuration:
echo    • App Name: %APP_NAME%
echo    • Version: %APP_VERSION%
echo    • Install Location: %INSTALL_DIR%
echo    • Python Required: %PYTHON_MIN_VERSION%+
echo    • Log File: %LOG_FILE%
echo.

REM Start logging
echo Installation started at %date% %time% > "%LOG_FILE%"

REM Check system requirements
echo 🔍 Checking system requirements...
echo.

REM Check Python
set "PYTHON_CMD="
for %%p in (python python3 py) do (
    %%p --version >nul 2>&1
    if !errorLevel! equ 0 (
        set "PYTHON_CMD=%%p"
        goto :python_found
    )
)

:python_not_found
echo ❌ Python not found in PATH
echo.
echo 📥 Python Installation Required:
echo    1. Visit: https://www.python.org/downloads/
echo    2. Download Python 3.9 or newer
echo    3. IMPORTANT: Check "Add Python to PATH" during installation
echo    4. Restart this installer after Python installation
echo.
echo Python: NOT FOUND >> "%LOG_FILE%"
goto :error_exit

:python_found
echo ✅ Python found: %PYTHON_CMD%
for /f "tokens=2" %%v in ('%PYTHON_CMD% --version 2^>^&1') do set "PYTHON_VERSION=%%v"
echo    Version: %PYTHON_VERSION%
echo Python version: %PYTHON_VERSION% >> "%LOG_FILE%"

REM Check pip
%PYTHON_CMD% -m pip --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ pip not available
    echo pip: NOT AVAILABLE >> "%LOG_FILE%"
    goto :error_exit
) else (
    echo ✅ pip: Available
    echo pip: Available >> "%LOG_FILE%"
)

REM Check PowerShell
powershell -Command "Get-Host" >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ PowerShell not available
    echo PowerShell: NOT AVAILABLE >> "%LOG_FILE%"
    goto :error_exit
) else (
    echo ✅ PowerShell: Available
    echo PowerShell: Available >> "%LOG_FILE%"
)

REM Check internet
ping github.com -n 1 >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Cannot reach GitHub
    echo Internet connectivity: FAILED >> "%LOG_FILE%"
    goto :error_exit
) else (
    echo ✅ Internet connection: Available
    echo Internet connectivity: Available >> "%LOG_FILE%"
)

echo.
echo ✅ All system requirements met!
echo.

REM Download and setup
echo 🌐 Downloading BEAR AI from GitHub...

if exist "%INSTALL_DIR%" (
    echo    Removing existing installation...
    rmdir /s /q "%INSTALL_DIR%" 2>nul
)

mkdir "%INSTALL_DIR%" 2>nul
if %errorLevel% neq 0 (
    echo ❌ Cannot create installation directory: %INSTALL_DIR%
    goto :error_exit
)

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%REPO_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing"
if %errorLevel% neq 0 (
    echo ❌ Download failed
    goto :error_exit
)

echo ✅ Download completed

REM Extract files
echo 📦 Extracting files...
powershell -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%INSTALL_DIR%' -Force"
if %errorLevel% neq 0 (
    echo ❌ Extraction failed
    goto :error_exit
)

REM Move files from subdirectory
if exist "%INSTALL_DIR%\BEAR_AI-main" (
    xcopy "%INSTALL_DIR%\BEAR_AI-main\*" "%INSTALL_DIR%" /E /H /Y /Q >nul 2>&1
    rmdir /s /q "%INSTALL_DIR%\BEAR_AI-main" 2>nul
)

del "%ZIP_FILE%" 2>nul
echo ✅ Files extracted and organized

REM Install Python dependencies
echo 🐍 Installing Python dependencies...
cd /d "%INSTALL_DIR%"

REM Create virtual environment
%PYTHON_CMD% -m venv .venv_clean >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Virtual environment created
    set "PYTHON_CMD=%INSTALL_DIR%\.venv_clean\Scripts\python.exe"
    set "PIP_CMD=%INSTALL_DIR%\.venv_clean\Scripts\pip.exe"
) else (
    set "PIP_CMD=%PYTHON_CMD% -m pip"
)

REM Upgrade pip
%PIP_CMD% install --upgrade pip >nul 2>&1

REM Install dependencies
if exist "installer\requirements-clean.txt" (
    %PIP_CMD% install -r "installer\requirements-clean.txt" --quiet
) else (
    REM Fallback minimal requirements
    %PIP_CMD% install pydantic fastapi uvicorn customtkinter rich click --quiet
)

if %errorLevel% neq 0 (
    echo ❌ Dependency installation failed
    goto :error_exit
)

echo ✅ Dependencies installed successfully

REM Setup application
echo ⚙️  Setting up application...
for %%d in (logs temp config models data) do (
    if not exist "%%d" mkdir "%%d" 2>nul
)

REM Create configuration
set "CONFIG_FILE=%INSTALL_DIR%\config\bear_ai_config.json"
echo {> "%CONFIG_FILE%"
echo   "app_name": "BEAR AI Legal Assistant",>> "%CONFIG_FILE%"
echo   "version": "%APP_VERSION%",>> "%CONFIG_FILE%"
echo   "install_date": "%date% %time%",>> "%CONFIG_FILE%"
echo   "platform": "Windows",>> "%CONFIG_FILE%"
echo   "installer": "bulletproof-batch",>> "%CONFIG_FILE%"
echo   "python_version": "%PYTHON_VERSION%",>> "%CONFIG_FILE%"
echo   "install_directory": "%INSTALL_DIR%",>> "%CONFIG_FILE%"
echo   "production_mode": true,>> "%CONFIG_FILE%"
echo   "clean_install": true>> "%CONFIG_FILE%"
echo }>> "%CONFIG_FILE%"

echo ✅ Configuration created

REM Create launcher
echo 🚀 Creating application launcher...
set "LAUNCHER_BAT=%INSTALL_DIR%\Launch_BEAR_AI.bat"
echo @echo off> "%LAUNCHER_BAT%"
echo title BEAR AI Legal Assistant>> "%LAUNCHER_BAT%"
echo cd /d "%INSTALL_DIR%">> "%LAUNCHER_BAT%"
echo if exist ".venv_clean\Scripts\python.exe" (>> "%LAUNCHER_BAT%"
echo     ".venv_clean\Scripts\python.exe" "installer\bear_ai_launcher.py">> "%LAUNCHER_BAT%"
echo ^) else (>> "%LAUNCHER_BAT%"
echo     python "installer\bear_ai_launcher.py">> "%LAUNCHER_BAT%"
echo ^)>> "%LAUNCHER_BAT%"
echo pause>> "%LAUNCHER_BAT%"

REM Create desktop shortcut
echo 🖥️  Creating desktop shortcut...
set "SHORTCUT_NAME=BEAR AI Legal Assistant.lnk"
set "DESKTOP_PATH=%USERPROFILE%\Desktop\%SHORTCUT_NAME%"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP_PATH%'); $Shortcut.TargetPath = '%LAUNCHER_BAT%'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'BEAR AI Legal Assistant - Privacy-First Local AI'; $Shortcut.Save()"

if exist "%DESKTOP_PATH%" (
    echo ✅ Desktop shortcut created
) else (
    echo ⚠️  Desktop shortcut creation failed
)

REM Create Start Menu shortcut
set "STARTMENU_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI Legal Assistant.lnk"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTMENU_PATH%'); $Shortcut.TargetPath = '%LAUNCHER_BAT%'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'BEAR AI Legal Assistant - Privacy-First Local AI'; $Shortcut.Save()"

if exist "%STARTMENU_PATH%" (
    echo ✅ Start Menu entry created
)

echo.
echo 🔍 Validating installation...
set "VALIDATION_SCORE=0"
set "TOTAL_TESTS=8"

if exist "%INSTALL_DIR%" (
    echo ✅ Test 1/8: Installation directory
    set /a VALIDATION_SCORE+=1
)
if exist "%INSTALL_DIR%\installer\bear_ai_launcher.py" (
    echo ✅ Test 2/8: Launcher script
    set /a VALIDATION_SCORE+=1
)
if exist "%CONFIG_FILE%" (
    echo ✅ Test 3/8: Configuration file
    set /a VALIDATION_SCORE+=1
)
if exist "%DESKTOP_PATH%" (
    echo ✅ Test 4/8: Desktop shortcut
    set /a VALIDATION_SCORE+=1
)
if exist "%INSTALL_DIR%\.venv_clean" (
    echo ✅ Test 5/8: Virtual environment
    set /a VALIDATION_SCORE+=1
)
if exist "%INSTALL_DIR%\src" (
    echo ✅ Test 6/8: Source code
    set /a VALIDATION_SCORE+=1
)
%PYTHON_CMD% -c "import pydantic, fastapi" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Test 7/8: Core dependencies
    set /a VALIDATION_SCORE+=1
)
%PYTHON_CMD% -c "import customtkinter" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Test 8/8: GUI framework
    set /a VALIDATION_SCORE+=1
)

echo.
echo 📊 Validation Results: %VALIDATION_SCORE%/%TOTAL_TESTS%

if %VALIDATION_SCORE% geq 6 (
    echo ✅ Installation: SUCCESS
    set "INSTALL_STATUS=SUCCESS"
) else (
    echo ⚠️  Installation: PARTIAL
    set "INSTALL_STATUS=PARTIAL"
)

echo.
echo ╭──────────────────────────────────────────────────────────────────╮
echo │                      INSTALLATION COMPLETE!                     │
echo ╰──────────────────────────────────────────────────────────────────╯
echo.

if "%INSTALL_STATUS%"=="SUCCESS" (
    echo 🎉 BEAR AI Legal Assistant installed successfully!
    echo.
    echo 📍 Installation Details:
    echo    • Location: %INSTALL_DIR%
    echo    • Version: %APP_VERSION%
    echo    • Python: %PYTHON_VERSION%
    echo    • Status: Production Ready
    echo.
    echo 🚀 How to Launch:
    echo    1. Double-click desktop shortcut
    echo    2. Or run: "%LAUNCHER_BAT%"
    echo    3. Or from Start Menu
    echo.
    echo 💡 Available Interfaces:
    echo    • Desktop GUI ^(Recommended^)
    echo    • Web Interface ^(Modern UI^)
    echo    • API Server ^(Developers^)
    echo    • Terminal Chat ^(Advanced users^)
    echo.
) else (
    echo ⚠️  Installation completed with limitations
    echo    Check log file: %LOG_FILE%
)

echo 📚 Documentation:
    echo    • Log: %LOG_FILE%
    echo    • Config: %CONFIG_FILE%
    echo    • Support: https://github.com/KingOfTheAce2/BEAR_AI/issues
echo.

echo 🔒 Privacy: All processing runs locally - no data sent to external servers
echo.

set /p LAUNCH_NOW="🚀 Launch BEAR AI now? (Y/N): "
if /i "%LAUNCH_NOW%"=="Y" (
    start "" "%LAUNCHER_BAT%"
)

echo.
echo 👋 Thank you for choosing BEAR AI Legal Assistant!
goto :end

:error_exit
echo.
echo ❌ Installation failed - see log: %LOG_FILE%
echo 🔧 Try running as Administrator or check system requirements
echo.

:end
echo Press any key to exit...
pause >nul
endlocal
exit /b