@echo off
REM BEAR AI Legal Assistant - Windows Batch Installer
REM Simple one-click Windows installation

title BEAR AI Legal Assistant - Windows Installer

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                                                               ║
echo ║   🐻  BEAR AI Legal Assistant - Windows Installer  ⚖️        ║
echo ║                                                               ║
echo ║   One-click installation for Windows                         ║
echo ║   Professional Legal AI Assistant                            ║
echo ║                                                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running with administrator privileges
) else (
    echo ⚠️  Not running as administrator - some features may be limited
)

REM Set variables
set INSTALL_DIR=%USERPROFILE%\BEAR_AI
set REPO_URL=https://github.com/KingOfTheAce2/BEAR_AI/archive/refs/heads/main.zip
set ZIP_FILE=%TEMP%\bear-ai.zip

echo.
echo 📋 Installation Plan:
echo • Download location: %ZIP_FILE%
echo • Installation directory: %INSTALL_DIR%
echo • Repository: %REPO_URL%
echo.

REM Check prerequisites
echo 🔍 Checking prerequisites...

REM Check PowerShell availability
powershell -Command "Get-Host" >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ PowerShell not available
    echo Please install PowerShell or use install-windows.js instead
    pause
    exit /b 1
) else (
    echo ✅ PowerShell - Available
)

REM Check internet connectivity
echo ℹ️  Testing internet connection...
ping github.com -n 1 >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Cannot reach GitHub
    echo Please check your internet connection
    pause
    exit /b 1
) else (
    echo ✅ Internet connection - Available
)

REM Create installation directory
echo ℹ️  Creating installation directory...
if exist "%INSTALL_DIR%" (
    echo ⚠️  Directory already exists - updating installation
    rmdir /s /q "%INSTALL_DIR%" 2>nul
)

mkdir "%INSTALL_DIR%" 2>nul
if %errorLevel% neq 0 (
    echo ❌ Cannot create installation directory
    echo Please check permissions or run as administrator
    pause
    exit /b 1
) else (
    echo ✅ Installation directory created
)

REM Download BEAR AI
echo ℹ️  Downloading BEAR AI Legal Assistant...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%REPO_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing}"
if %errorLevel% neq 0 (
    echo ❌ Download failed
    echo Please check your internet connection and try again
    pause
    exit /b 1
) else (
    echo ✅ BEAR AI downloaded successfully
)

REM Extract files
echo ℹ️  Extracting files...
powershell -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%INSTALL_DIR%' -Force"
if %errorLevel% neq 0 (
    echo ❌ Extraction failed
    pause
    exit /b 1
) else (
    echo ✅ Files extracted successfully
)

REM Move files from subdirectory
if exist "%INSTALL_DIR%\BEAR_AI-main" (
    echo ℹ️  Moving files to correct location...
    xcopy "%INSTALL_DIR%\BEAR_AI-main\*" "%INSTALL_DIR%" /E /H /Y >nul 2>&1
    rmdir /s /q "%INSTALL_DIR%\BEAR_AI-main" 2>nul
    echo ✅ Files organized successfully
)

REM Clean up temporary files
del "%ZIP_FILE%" 2>nul
echo ✅ Cleanup completed

REM Create basic configuration
echo ℹ️  Setting up configuration...
if not exist "%INSTALL_DIR%\config" mkdir "%INSTALL_DIR%\config"
if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs"
if not exist "%INSTALL_DIR%\temp" mkdir "%INSTALL_DIR%\temp"

echo {> "%INSTALL_DIR%\config\bear-ai.json"
echo   "version": "2.0.0",>> "%INSTALL_DIR%\config\bear-ai.json"
echo   "installDate": "%date% %time%",>> "%INSTALL_DIR%\config\bear-ai.json"
echo   "platform": "win32",>> "%INSTALL_DIR%\config\bear-ai.json"
echo   "installedBy": "windows-batch-installer">> "%INSTALL_DIR%\config\bear-ai.json"
echo }>> "%INSTALL_DIR%\config\bear-ai.json"
echo ✅ Configuration created

REM Create desktop shortcut
echo ℹ️  Creating desktop shortcut...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\BEAR AI Legal Assistant.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'BEAR AI Legal Assistant'; $Shortcut.Save()"
if %errorLevel% == 0 (
    echo ✅ Desktop shortcut created
) else (
    echo ⚠️  Could not create desktop shortcut
)

REM Verify installation
echo ℹ️  Verifying installation...
set VERIFIED=0

if exist "%INSTALL_DIR%\package.json" (
    echo ✅ Package configuration - Found
    set /a VERIFIED+=1
)

if exist "%INSTALL_DIR%\src" (
    echo ✅ Source directory - Found
    set /a VERIFIED+=1
)

if exist "%INSTALL_DIR%\docs" (
    echo ✅ Documentation - Found
    set /a VERIFIED+=1
)

if exist "%INSTALL_DIR%\README.md" (
    echo ✅ README file - Found
    set /a VERIFIED+=1
)

echo.
if %VERIFIED% geq 3 (
    echo ✅ Installation verified successfully (%VERIFIED%/4 checks passed)
) else (
    echo ⚠️  Installation may be incomplete (%VERIFIED%/4 checks passed)
)

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                     INSTALLATION COMPLETE!                      ║
echo ╠══════════════════════════════════════════════════════════════════╣
echo ║                                                                  ║
echo ║  🎉 BEAR AI Legal Assistant has been installed successfully!     ║
echo ║                                                                  ║
echo ║  Installation directory: %INSTALL_DIR%                           ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo 🚀 Next Steps:
echo.
echo 1. Install Node.js (if not already installed):
echo    https://nodejs.org
echo.
echo 2. Open Command Prompt or PowerShell and run:
echo    cd "%INSTALL_DIR%"
echo    npm install
echo    npm start
echo.
echo 3. Open your browser to:
echo    http://localhost:3000
echo.
echo 📚 What's Included:
echo • Desktop shortcut to BEAR AI folder
echo • Complete source code and documentation  
echo • Ready-to-use configuration
echo.
echo 🆘 Need Help?
echo • Documentation: %INSTALL_DIR%\docs\
echo • Issues: https://github.com/KingOfTheAce2/BEAR_AI/issues
echo.
echo Thank you for choosing BEAR AI! 🐻⚖️
echo.

REM Ask if user wants to open the installation directory
set /p OPEN_DIR="Would you like to open the installation directory now? (Y/N): "
if /i "%OPEN_DIR%"=="Y" (
    explorer "%INSTALL_DIR%"
)

pause