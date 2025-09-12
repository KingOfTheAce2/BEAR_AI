@echo off
echo Testing BEAR AI installation...
set PYTHONPATH=%CD%\src;%PYTHONPATH%
python -m bear_ai --help
if %errorlevel% neq 0 (
    echo ERROR: BEAR AI test failed
    pause
    exit /b 1
) else (
    echo SUCCESS: BEAR AI is working correctly!
    pause
)
