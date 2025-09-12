@echo off
echo BEAR AI Legal Assistant - Portable Version
echo.
echo Choose interface:
echo 1) Web GUI (default)
echo 2) Command Line
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="2" goto cli
echo Starting BEAR AI Web Interface...
echo Opening browser at http://localhost:3000
cd /d "%~dp0"
start http://localhost:3000
npm start
goto end

:cli
echo Starting BEAR AI Command Line...
set PYTHONPATH=%CD%\src;%PYTHONPATH%
cd /d "%~dp0"
python -m bear_ai %*
pause

:end
