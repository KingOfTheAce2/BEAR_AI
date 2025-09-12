@echo off
echo Starting BEAR AI Web Interface...
echo Opening browser at http://localhost:3000
cd /d "%~dp0"
start http://localhost:3000
npm start
