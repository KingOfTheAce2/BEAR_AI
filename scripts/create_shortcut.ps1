Param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Paths
$repo = (Resolve-Path "$PSScriptRoot\..\").Path
$target = (Resolve-Path "$PSScriptRoot\run_gui.vbs").Path
$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'BEAR AI.lnk'

if ((Test-Path $lnkPath) -and -not $Force) {
  Write-Host "Shortcut already exists: $lnkPath (use -Force to overwrite)" -ForegroundColor Yellow
  exit 0
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($lnkPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $repo
$shortcut.Description = 'Launch BEAR AI GUI'

# Optional icon if present next to scripts; fall back to a generic one
$icon = Join-Path $PSScriptRoot 'bear.ico'
if (Test-Path $icon) {
  $shortcut.IconLocation = $icon
}

$shortcut.Save()
Write-Host "Created shortcut: $lnkPath" -ForegroundColor Green
