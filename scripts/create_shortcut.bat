@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1" %*
if %ERRORLEVEL% NEQ 0 (
  echo Failed to create shortcut.
  exit /b %ERRORLEVEL%
)
echo Shortcut created.
