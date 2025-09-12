@echo off
REM ===================================================================
REM BEAR AI Legal Assistant - Installation Tester
REM Tests the bulletproof installer on a clean Windows system
REM ===================================================================

setlocal EnableDelayedExpansion

title BEAR AI Installation Tester
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║   🧪 BEAR AI Legal Assistant - Installation Tester              ║
echo ║                                                                  ║
echo ║   Validates bulletproof installer functionality                 ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

set "TEST_LOG=%TEMP%\bear_ai_installation_test.log"
set "INSTALL_DIR=%USERPROFILE%\BEAR_AI"
set "TEST_START_TIME=%time%"

echo 🔬 Starting installation test at %date% %time%
echo Installation test started at %date% %time% > "%TEST_LOG%"
echo.

REM =============================================================================
REM PRE-TEST SYSTEM ANALYSIS  
REM =============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║ Pre-Test System Analysis                                      ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

set "SYSTEM_SCORE=0"

echo 🖥️  System Information:
echo    • OS: %OS%
systeminfo | findstr /B /C:"OS Name" | findstr /V "Boot"
systeminfo | findstr /B /C:"OS Version"
echo    • Architecture: %PROCESSOR_ARCHITECTURE%
echo.

REM Check available disk space
for /f "tokens=3" %%a in ('dir /-c %USERPROFILE% 2^>nul ^| find "bytes free"') do set "FREE_SPACE=%%a"
if not "%FREE_SPACE%"=="" (
    echo ✅ Disk space: %FREE_SPACE% bytes free
    set /a SYSTEM_SCORE+=1
) else (
    echo ❌ Could not determine disk space
)

REM Check RAM
for /f "tokens=4" %%a in ('systeminfo ^| find "Total Physical Memory"') do set "TOTAL_RAM=%%a"
if not "%TOTAL_RAM%"=="" (
    echo ✅ Total RAM: %TOTAL_RAM%
    set /a SYSTEM_SCORE+=1
) else (
    echo ❌ Could not determine RAM
)

REM Check Python
python --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo ✅ Python: %%v
    set /a SYSTEM_SCORE+=1
) else (
    echo ❌ Python not found
)

REM Check pip
python -m pip --version >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ pip: Available
    set /a SYSTEM_SCORE+=1
) else (
    echo ❌ pip not available
)

REM Check PowerShell
powershell -Command "Get-Host" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ PowerShell: Available
    set /a SYSTEM_SCORE+=1
) else (
    echo ❌ PowerShell not available
)

REM Check internet
ping github.com -n 1 >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Internet: Connected
    set /a SYSTEM_SCORE+=1
) else (
    echo ❌ Internet not available
)

echo.
echo 📊 System readiness: %SYSTEM_SCORE%/6
echo System readiness score: %SYSTEM_SCORE%/6 >> "%TEST_LOG%"

if %SYSTEM_SCORE% lss 4 (
    echo ❌ System not ready for testing
    echo System requirements not met >> "%TEST_LOG%"
    goto :test_end
)

echo.

REM =============================================================================
REM CLEAN ENVIRONMENT SETUP
REM =============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║ Clean Environment Setup                                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 🧹 Ensuring clean test environment...

REM Remove any existing BEAR AI installation
if exist "%INSTALL_DIR%" (
    echo    Removing existing installation...
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
    if exist "%INSTALL_DIR%" (
        echo ❌ Could not remove existing installation
        echo Cleanup: Failed >> "%TEST_LOG%"
        goto :test_end
    )
)

REM Remove shortcuts
del "%USERPROFILE%\Desktop\BEAR AI Legal Assistant.lnk" >nul 2>&1
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI Legal Assistant.lnk" >nul 2>&1

REM Clean temp files
del "%TEMP%\bear_ai*.*" >nul 2>&1
del "%TEMP%\bear-ai*.*" >nul 2>&1

echo ✅ Clean environment ready
echo Environment: Clean >> "%TEST_LOG%"
echo.

REM =============================================================================
REM INSTALLER EXECUTION TEST
REM =============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║ Installer Execution Test                                      ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 🚀 Running bulletproof installer...

set "INSTALLER_PATH=%~dp0install-bulletproof.bat"

if not exist "%INSTALLER_PATH%" (
    echo ❌ Installer not found: %INSTALLER_PATH%
    echo Installer: Not found >> "%TEST_LOG%"
    goto :test_end
)

echo    Installer: %INSTALLER_PATH%
echo    Starting installer in silent mode...

REM Create a response file for automated installation
echo Y> "%TEMP%\bear_ai_test_responses.txt"
echo Y>> "%TEMP%\bear_ai_test_responses.txt"

REM Run installer with automated responses
"%INSTALLER_PATH%" < "%TEMP%\bear_ai_test_responses.txt" > "%TEMP%\bear_ai_installer_output.txt" 2>&1

set "INSTALLER_EXIT_CODE=%errorLevel%"
echo Installer exit code: %INSTALLER_EXIT_CODE% >> "%TEST_LOG%"

if %INSTALLER_EXIT_CODE% neq 0 (
    echo ❌ Installer failed with exit code: %INSTALLER_EXIT_CODE%
    echo Installer: Failed >> "%TEST_LOG%"
    echo.
    echo 📄 Installer output:
    type "%TEMP%\bear_ai_installer_output.txt"
    goto :test_end
) else (
    echo ✅ Installer completed successfully
    echo Installer: Success >> "%TEST_LOG%"
)

echo.

REM =============================================================================
REM POST-INSTALLATION VALIDATION
REM =============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║ Post-Installation Validation                                  ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Validating installation...

set "VALIDATION_SCORE=0"
set "TOTAL_VALIDATIONS=12"

REM Test 1: Installation directory
if exist "%INSTALL_DIR%" (
    echo ✅ Test 1: Installation directory exists
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 1: Installation directory missing
)

REM Test 2: Main launcher
if exist "%INSTALL_DIR%\installer\bear_ai_launcher.py" (
    echo ✅ Test 2: Main launcher exists
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 2: Main launcher missing
)

REM Test 3: Requirements file
if exist "%INSTALL_DIR%\installer\requirements-clean.txt" (
    echo ✅ Test 3: Clean requirements file exists
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 3: Clean requirements file missing
)

REM Test 4: Batch launcher
if exist "%INSTALL_DIR%\Launch_BEAR_AI.bat" (
    echo ✅ Test 4: Batch launcher exists
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 4: Batch launcher missing
)

REM Test 5: Configuration
if exist "%INSTALL_DIR%\config\bear_ai_config.json" (
    echo ✅ Test 5: Configuration file exists
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 5: Configuration file missing
)

REM Test 6: Desktop shortcut
if exist "%USERPROFILE%\Desktop\BEAR AI Legal Assistant.lnk" (
    echo ✅ Test 6: Desktop shortcut created
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 6: Desktop shortcut missing
)

REM Test 7: Start Menu shortcut
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BEAR AI Legal Assistant.lnk" (
    echo ✅ Test 7: Start Menu shortcut created
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 7: Start Menu shortcut missing
)

REM Test 8: Python environment
if exist "%INSTALL_DIR%\.venv_clean\" (
    echo ✅ Test 8: Virtual environment created
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 8: Virtual environment missing
)

REM Test 9: Directory structure
set "DIRS_FOUND=0"
for %%d in (logs temp config models) do (
    if exist "%INSTALL_DIR%\%%d" set /a DIRS_FOUND+=1
)
if %DIRS_FOUND% geq 3 (
    echo ✅ Test 9: Directory structure created
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 9: Directory structure incomplete
)

REM Test 10: Python import test
cd /d "%INSTALL_DIR%"
if exist ".venv_clean\Scripts\python.exe" (
    ".venv_clean\Scripts\python.exe" -c "import pydantic, rich" >nul 2>&1
) else (
    python -c "import pydantic, rich" >nul 2>&1
)
if %errorLevel% equ 0 (
    echo ✅ Test 10: Core dependencies importable
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 10: Core dependencies not importable
)

REM Test 11: FastAPI availability
if exist ".venv_clean\Scripts\python.exe" (
    ".venv_clean\Scripts\python.exe" -c "import fastapi" >nul 2>&1
) else (
    python -c "import fastapi" >nul 2>&1
)
if %errorLevel% equ 0 (
    echo ✅ Test 11: FastAPI available
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 11: FastAPI not available
)

REM Test 12: GUI framework
if exist ".venv_clean\Scripts\python.exe" (
    ".venv_clean\Scripts\python.exe" -c "import customtkinter" >nul 2>&1
) else (
    python -c "import customtkinter" >nul 2>&1
)
if %errorLevel% equ 0 (
    echo ✅ Test 12: GUI framework available
    set /a VALIDATION_SCORE+=1
) else (
    echo ❌ Test 12: GUI framework not available
)

echo.
echo 📊 Validation Results: %VALIDATION_SCORE%/%TOTAL_VALIDATIONS%
echo Validation score: %VALIDATION_SCORE%/%TOTAL_VALIDATIONS% >> "%TEST_LOG%"

if %VALIDATION_SCORE% geq 10 (
    echo ✅ Installation validation: EXCELLENT
    set "TEST_RESULT=SUCCESS"
) else if %VALIDATION_SCORE% geq 8 (
    echo ⚠️  Installation validation: GOOD
    set "TEST_RESULT=PARTIAL"
) else (
    echo ❌ Installation validation: FAILED
    set "TEST_RESULT=FAILED"
)

echo.

REM =============================================================================
REM FUNCTIONAL TESTING
REM =============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║ Functional Testing                                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 🔧 Testing launcher functionality...

cd /d "%INSTALL_DIR%"

REM Test launcher import
if exist ".venv_clean\Scripts\python.exe" (
    set "TEST_PYTHON=.venv_clean\Scripts\python.exe"
) else (
    set "TEST_PYTHON=python"
)

"%TEST_PYTHON%" -c "import sys; sys.path.insert(0, r'%INSTALL_DIR%\installer'); import bear_ai_launcher; print('Launcher imports successfully')" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Launcher imports successfully
    set "FUNCTIONAL_TEST=SUCCESS"
) else (
    echo ❌ Launcher import failed
    set "FUNCTIONAL_TEST=FAILED"
)

REM Test basic help
"%TEST_PYTHON%" "installer\bear_ai_launcher.py" --help >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Launcher help system works
) else (
    echo ❌ Launcher help system failed
)

echo Functional test: %FUNCTIONAL_TEST% >> "%TEST_LOG%"
echo.

REM =============================================================================
REM UNINSTALLER TEST
REM =============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║ Uninstaller Test                                              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 🗑️  Testing uninstaller...

set /p TEST_UNINSTALL="Would you like to test the uninstaller? (Y/N): "

if /i "%TEST_UNINSTALL%"=="Y" (
    echo.
    echo Running uninstaller test...
    
    REM Create automated responses for uninstaller
    echo YES> "%TEMP%\bear_ai_uninstall_responses.txt"
    echo N>> "%TEMP%\bear_ai_uninstall_responses.txt"
    
    "%INSTALL_DIR%\installer\uninstall.bat" < "%TEMP%\bear_ai_uninstall_responses.txt" > "%TEMP%\bear_ai_uninstall_output.txt" 2>&1
    
    REM Check if uninstallation was successful
    if not exist "%INSTALL_DIR%" (
        echo ✅ Uninstaller test: SUCCESS
        echo Uninstaller: Success >> "%TEST_LOG%"
        set "UNINSTALL_TEST=SUCCESS"
    ) else (
        echo ⚠️  Uninstaller test: PARTIAL
        echo Uninstaller: Partial >> "%TEST_LOG%"
        set "UNINSTALL_TEST=PARTIAL"
    )
) else (
    echo Uninstaller test skipped by user
    echo Uninstaller: Skipped >> "%TEST_LOG%"
    set "UNINSTALL_TEST=SKIPPED"
)

echo.

:test_end

REM =============================================================================
REM TEST RESULTS SUMMARY
REM =============================================================================

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                         TEST RESULTS                            ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

set "TEST_END_TIME=%time%"

echo 📊 Test Summary:
echo    • System Readiness: %SYSTEM_SCORE%/6
echo    • Installation: %TEST_RESULT%
echo    • Validation Score: %VALIDATION_SCORE%/%TOTAL_VALIDATIONS%
echo    • Functional Test: %FUNCTIONAL_TEST%
echo    • Uninstaller Test: %UNINSTALL_TEST%
echo    • Start Time: %TEST_START_TIME%
echo    • End Time: %TEST_END_TIME%
echo.

REM Overall assessment
if "%TEST_RESULT%"=="SUCCESS" (
    echo ✅ OVERALL RESULT: BULLETPROOF INSTALLER WORKS PERFECTLY
    echo    The installer is ready for production use.
) else if "%TEST_RESULT%"=="PARTIAL" (
    echo ⚠️  OVERALL RESULT: INSTALLER MOSTLY WORKS
    echo    Minor issues detected - review test log.
) else (
    echo ❌ OVERALL RESULT: INSTALLER HAS SIGNIFICANT ISSUES
    echo    Major problems detected - requires fixes.
)

echo.
echo 📄 Detailed test log: %TEST_LOG%
echo.

echo Test completed at %date% %time% >> "%TEST_LOG%"
echo Overall result: %TEST_RESULT% >> "%TEST_LOG%"

echo Press any key to view the full test log...
pause >nul

if exist "%TEST_LOG%" (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║                         FULL TEST LOG                           ║
    echo ╚══════════════════════════════════════════════════════════════════╝
    echo.
    type "%TEST_LOG%"
)

echo.
echo 🧪 Installation testing complete!
echo.
pause
endlocal
exit /b