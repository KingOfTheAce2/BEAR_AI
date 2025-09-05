Param(
  [switch]$HW,
  [switch]$Dev,
  [switch]$BuildExe,
  [switch]$CreateShortcut,
  [switch]$Force
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

# Create desktop shortcut if requested
if ($CreateShortcut) {
  Write-Host "Creating desktop shortcut..."
  $WshShell = New-Object -comObject WScript.Shell
  $Shortcut = $WshShell.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\BEAR AI.lnk")
  $Shortcut.TargetPath = Join-Path $repo "run.bat"
  $Shortcut.WorkingDirectory = $repo
  $Shortcut.IconLocation = Join-Path $repo "BEAR_AI_logo.png"
  $Shortcut.Description = "BEAR AI - Privacy-First Local AI Assistant"
  $Shortcut.Save()
  Write-Host "Desktop shortcut created: BEAR AI.lnk" -ForegroundColor Green
}

Write-Host "\n🎉 BEAR AI Installation Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Quick Start:" -ForegroundColor Yellow
Write-Host "   Double-click:  run.bat                    (Launch BEAR AI GUI)"
Write-Host "   GUI:          scripts\\run_gui.bat         (Alternative GUI launch)"
Write-Host "   CLI:          scripts\\run_cli.bat         (Command line interface)"
Write-Host "   PII Scrubber: scripts\\run_scrub.bat       (Privacy tool)"
Write-Host ""
Write-Host "🔧 Advanced:" -ForegroundColor Yellow  
Write-Host "   Manual venv:  .\\.venv\\Scripts\\Activate.ps1  (Developer mode)"
Write-Host "   Python CLI:   python -m bear_ai --help    (Direct Python access)"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   README.md         - Quick start and overview"
Write-Host "   docs/SPEC.md      - Technical specifications"  
Write-Host "   RELEASE_NOTES.md  - Current version features"
Write-Host ""
Write-Host "🛡️  Privacy-First: All processing happens locally - no data ever leaves your device!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
