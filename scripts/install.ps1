Param(
  [switch]$HW,
  [switch]$Dev,
  [switch]$BuildExe
)

$ErrorActionPreference = 'Stop'

# Move to repo root
$repo = (Resolve-Path "$PSScriptRoot\..\").Path
Set-Location $repo

Write-Host "BEAR AI installer starting..." -ForegroundColor Cyan

# Detect Python launcher or python.exe
$pythonCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pythonCmd = 'py -3'
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCmd = 'python'
} else {
  Write-Error "Python 3.9+ not found. Install from https://www.python.org/downloads/windows/ and re-run."
}

# Create venv
Write-Host "Creating virtual environment in .venv..."
& cmd /c "$pythonCmd -m venv .venv"

$venvPy = Join-Path $repo '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPy)) { throw "Failed to create .venv (missing $venvPy)" }

Write-Host "Upgrading pip..."
& $venvPy -m pip install -U pip

Write-Host "Installing BEAR AI (editable)..."
& $venvPy -m pip install -e .

# Optional extras
$hasNvidiaSmi = (Get-Command nvidia-smi -ErrorAction SilentlyContinue) -ne $null
if ($HW -or $hasNvidiaSmi) {
  Write-Host "Installing hardware extras (psutil, nvidia-ml-py)..."
  & $venvPy -m pip install -e .[hw]
}

if ($Dev) {
  Write-Host "Installing dev tools (pytest, pre-commit, etc.)..."
  & $venvPy -m pip install -e .[dev]
}

if ($BuildExe) {
  Write-Host "Building Windows executable with PyInstaller..."
  & $venvPy -m pip install pyinstaller
  & $venvPy scripts\build_exe.py
}

Write-Host "\nSuccess!" -ForegroundColor Green
Write-Host "Run GUI:    scripts\\run_gui.bat"
Write-Host "Run CLI:    scripts\\run_cli.bat <model_id> [filename] [--list|--assess]"
Write-Host "Scrubber:   scripts\\run_scrub.bat --in input.txt --out output.txt"
Write-Host "(Or activate venv: .\\.venv\\Scripts\\Activate.ps1)"

