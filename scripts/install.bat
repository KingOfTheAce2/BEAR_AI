@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
if %ERRORLEVEL% NEQ 0 (
  echo Install failed. See messages above.
  exit /b %ERRORLEVEL%
)
echo Install completed.
