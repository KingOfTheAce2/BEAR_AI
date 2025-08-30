@echo off
setlocal
set VENV_PY="%~dp0..\.venv\Scripts\python.exe"
if not exist %VENV_PY% (
  echo Virtual environment not found. Run scripts\install.bat first.
  exit /b 1
)
%VENV_PY% -m pip show llama-cpp-python >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Installing inference extra: llama-cpp-python
  %VENV_PY% -m pip install "bear_ai[inference]" >NUL
)
%VENV_PY% -m bear_ai.chat %*
