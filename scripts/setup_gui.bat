@echo off
setlocal

REM One-shot setup for non-technical users:
REM  - Creates a virtual environment
REM  - Installs BEAR AI and inference extra (llama-cpp-python)
REM  - Launches the GUI

pushd "%~dp0"
call install.bat
if %ERRORLEVEL% NEQ 0 (
  echo Setup failed during install. See messages above.
  echo Attempting Conda-based setup instead (no compiler required)...
  powershell -ExecutionPolicy Bypass -File "%~dp0setup_conda.ps1" -LaunchGUI
  exit /b %ERRORLEVEL%
)

set VENV_PY="%~dp0..\.venv\Scripts\python.exe"
if not exist %VENV_PY% (
  echo Virtual environment not found. Something went wrong.
  pause
  exit /b 1
)

echo Ensuring inference runtime is installed (CPU build)...
%VENV_PY% -m pip show llama-cpp-python >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Installing prebuilt CPU wheel for llama-cpp-python...
  rem Prefer official prebuilt wheels to avoid local compilation
  %VENV_PY% -m pip install --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu llama-cpp-python
if %ERRORLEVEL% NEQ 0 (
  echo CPU wheel install failed. Retrying with PyPI wheel only...
  %VENV_PY% -m pip install --only-binary=:all: llama-cpp-python
  if %ERRORLEVEL% NEQ 0 (
    echo Wheel-only install failed. Falling back to project extra: bear_ai[inference]
    %VENV_PY% -m pip install "bear_ai[inference]"
  )
)
)

rem Verify llama-cpp-python is now present; if not, stop with guidance
%VENV_PY% -m pip show llama-cpp-python >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed to install llama-cpp-python automatically.
  echo Switching to Conda-based installer (prebuilt Windows binaries)...
  powershell -ExecutionPolicy Bypass -File "%~dp0setup_conda.ps1" -LaunchGUI
  exit /b %ERRORLEVEL%
)

echo Launching BEAR AI GUI...
REM Start without a console window via VBScript launcher
wscript.exe "%~dp0run_gui.vbs"
popd
