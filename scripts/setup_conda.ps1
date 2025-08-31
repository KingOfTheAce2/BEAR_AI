Param(
  [switch]$LaunchGUI
)

$ErrorActionPreference = 'Stop'

# Move to repo root
$repo = (Resolve-Path "$PSScriptRoot\..\").Path
Set-Location $repo

Write-Host "Setting up Conda environment (no compiler required)..." -ForegroundColor Cyan

$condaRoot = Join-Path $env:LOCALAPPDATA 'Miniconda3'
$condaExe  = Join-Path $condaRoot 'Scripts\conda.exe'

if (-not (Test-Path $condaExe)) {
  Write-Host "Installing Miniconda to $condaRoot ..." -ForegroundColor Yellow
  $installer = Join-Path $env:TEMP 'Miniconda3-latest-Windows-x86_64.exe'
  if (-not (Test-Path $installer)) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri 'https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe' -OutFile $installer -UseBasicParsing
  }
  Start-Process -FilePath $installer -ArgumentList @('/S',('/D=' + $condaRoot),'/InstallationType=JustMe','/AddToPath=1') -Wait
  if (-not (Test-Path $condaExe)) { throw "Miniconda install failed (missing $condaExe)" }
}

Write-Host "Configuring conda-forge channel..." -ForegroundColor Cyan
& $condaExe config --remove channels defaults -f | Out-Null
& $condaExe config --prepend channels conda-forge | Out-Null
& $condaExe config --set channel_priority strict | Out-Null

# Create env if missing
Write-Host "Creating/ensuring env 'bearai' with Python 3.12..." -ForegroundColor Cyan
& $condaExe env list | Select-String -SimpleMatch "bearai" | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $condaExe create -y -n bearai python=3.12
}

Write-Host "Installing llama-cpp-python (conda-forge binary)..." -ForegroundColor Cyan
& $condaExe run -n bearai conda install -y -c conda-forge llama-cpp-python

Write-Host "Installing BEAR AI package into env..." -ForegroundColor Cyan
& $condaExe run -n bearai pip install -e .

Write-Host "Validating install..." -ForegroundColor Cyan
& $condaExe run -n bearai python -c "import llama_cpp, bear_ai; print('llama-cpp-python', llama_cpp.__version__)"

if ($LaunchGUI) {
  Write-Host "Launching GUI from Conda env..." -ForegroundColor Green
  & $condaExe run -n bearai python -m bear_ai.gui
}

