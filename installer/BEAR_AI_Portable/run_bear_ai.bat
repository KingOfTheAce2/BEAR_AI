@echo off
echo Starting BEAR AI Legal Assistant...
set PYTHONPATH=%CD%\src;%PYTHONPATH%
cd /d "%~dp0"
python -m bear_ai %*
pause
