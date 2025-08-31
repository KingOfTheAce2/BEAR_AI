@echo off
setlocal
set VENV_PY="%~dp0..\.venv\Scripts\python.exe"
if exist %VENV_PY% (
  %VENV_PY% -m pip show llama-cpp-python >NUL 2>&1
  if %ERRORLEVEL% NEQ 0 (
    echo Installing inference extra: llama-cpp-python
    %VENV_PY% -m pip install "bear_ai[inference]" >NUL
  )
  %VENV_PY% -m bear_ai.chat %*
  goto :eof
)

REM Fallback to Conda env if venv missing
set CONDA_EXE="%LOCALAPPDATA%\Miniconda3\Scripts\conda.exe"
if exist %CONDA_EXE% (
  %CONDA_EXE% run -n bearai python -m bear_ai.chat %*
  goto :eof
)

echo No Python environment found. Run scripts\setup_gui.bat first.
exit /b 1
