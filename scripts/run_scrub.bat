@echo off
setlocal
set VENV_PY="%~dp0..\.venv\Scripts\python.exe"
if not exist %VENV_PY% (
  echo Virtual environment not found. Run scripts\install.bat first.
  exit /b 1
)
%VENV_PY% -m bear_ai.scrub %*
