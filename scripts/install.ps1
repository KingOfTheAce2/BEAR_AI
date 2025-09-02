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

# Detect and prefer a Python with prebuilt wheels for llama-cpp-python (3.12 preferred)
$pythonCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  # Try specific versions in order of preference
  $candidates = @('py -3.12', 'py -3.11', 'py -3.10', 'py -3')
  foreach ($cand in $candidates) {
    try {
      $ver = & cmd /c "$cand -c ""import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"""
      if ($LASTEXITCODE -eq 0 -and $ver) {
        $pythonCmd = $cand
        break
      }
    } catch {}
  }
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCmd = 'python'
} else {
  Write-Error "Python 3.9+ not found. Install from https://www.python.org/downloads/windows/ and re-run."
}

if ($pythonCmd -eq $null) { Write-Error "No suitable Python found." }

# Create venv
Write-Host "Using Python: $pythonCmd"
Write-Host "Creating virtual environment in .venv..."
& cmd /c "$pythonCmd -m venv .venv"

$venvPy = Join-Path $repo '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPy)) { throw "Failed to create .venv (missing $venvPy)" }

Write-Host "Upgrading pip..."
& $venvPy -m pip install -U pip

Write-Host "Installing BEAR AI (editable, with inference runtime)..."
& $venvPy -m pip install -e .[inference]

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
  # Ensure llama-cpp-python (CPU wheel) is present so it gets bundled
  Write-Host "Ensuring llama-cpp-python (CPU) is installed for bundling..."
  try {
    & $venvPy -m pip show llama-cpp-python | Out-Null
  } catch {
    & $venvPy -m pip install --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu llama-cpp-python
  }
  & $venvPy scripts\build_exe.py
}

Write-Host "\nSuccess!" -ForegroundColor Green
Write-Host "Run GUI:    scripts\\run_gui.bat"
Write-Host "Run CLI:    scripts\\run_cli.bat <model_id> [filename] [--list|--assess]"
Write-Host "Scrubber:   scripts\\run_scrub.bat --in input.txt --out output.txt"
Write-Host "(Or activate venv: .\\.venv\\Scripts\\Activate.ps1)"
