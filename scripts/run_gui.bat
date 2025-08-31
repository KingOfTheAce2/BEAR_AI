@echo off
setlocal
set VENV_PY="%~dp0..\.venv\Scripts\pythonw.exe"
if exist %VENV_PY% (
  %VENV_PY% -m bear_ai.gui %*
  goto :eof
)

REM Fallback to Conda env if venv missing
set CONDA_EXE="%LOCALAPPDATA%\Miniconda3\Scripts\conda.exe"
if exist %CONDA_EXE% (
  %CONDA_EXE% run -n bearai pythonw -m bear_ai.gui %*
  goto :eof
)

echo No Python environment found. Run scripts\setup_gui.bat first.
exit /b 1
