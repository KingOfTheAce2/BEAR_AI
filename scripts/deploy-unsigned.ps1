# Deploy BEAR AI Without Code Signing Certificate
# This script enables deployment without signing (users will see security warnings)

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipWarning = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   BEAR AI - UNSIGNED DEPLOYMENT SCRIPT" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

if (-not $SkipWarning) {
    Write-Host "⚠️  WARNING: Deploying without code signing certificate" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Users will see the following warnings:" -ForegroundColor Yellow
    Write-Host "  • Windows SmartScreen warning on first run" -ForegroundColor Red
    Write-Host "  • 'Unknown Publisher' in UAC prompts" -ForegroundColor Red
    Write-Host "  • Potential antivirus false positives" -ForegroundColor Red
    Write-Host ""
    Write-Host "To avoid these warnings, you need:" -ForegroundColor Cyan
    Write-Host "  1. Code signing certificate (~$200-600/year)" -ForegroundColor White
    Write-Host "  2. OR users manually approve the app" -ForegroundColor White
    Write-Host ""

    $response = Read-Host "Continue with unsigned deployment? (yes/no)"
    if ($response -ne "yes") {
        Write-Host "Deployment cancelled." -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "📦 Building unsigned application..." -ForegroundColor Green

# Set environment to allow unsigned builds
$env:TAURI_SKIP_SIGNING = "true"
$env:WINDOWS_SIGNING_DISABLED = "true"

# Update tauri.conf.json to disable signing requirements
$tauriConfig = Get-Content "$PSScriptRoot\..\src-tauri\tauri.conf.json" | ConvertFrom-Json
$tauriConfig.tauri.bundle.windows.wix.skipWebviewInstall = $false
$tauriConfig.tauri.bundle.windows.certificateThumbprint = $null
$tauriConfig | ConvertTo-Json -Depth 10 | Set-Content "$PSScriptRoot\..\src-tauri\tauri.conf.json"

Write-Host "✅ Tauri configuration updated for unsigned build" -ForegroundColor Green

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Build Tauri without signing
Write-Host "🔨 Building Tauri application (unsigned)..." -ForegroundColor Cyan
npm run tauri build -- --config '{"tauri": {"bundle": {"windows": {"certificateThumbprint": null}}}}'

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tauri build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host ""

# Create distribution package
$distPath = "$PSScriptRoot\..\dist-unsigned"
New-Item -ItemType Directory -Path $distPath -Force | Out-Null

# Copy installer files
Write-Host "📋 Creating distribution package..." -ForegroundColor Cyan
Copy-Item "$PSScriptRoot\..\src-tauri\target\release\bundle\nsis\*.exe" $distPath -Force
Copy-Item "$PSScriptRoot\..\src-tauri\target\release\bundle\msi\*.msi" $distPath -Force -ErrorAction SilentlyContinue

# Create README for users
$readmeContent = @"
# BEAR AI Legal Assistant - Installation Instructions

## ⚠️ Security Warning
This application is not digitally signed. You may see security warnings during installation.

## Installation Steps:

### For Windows 10/11:

1. **Download the installer** (BEAR_AI_Setup.exe)

2. **When you see "Windows protected your PC":**
   - Click "More info"
   - Click "Run anyway"

3. **If Windows Defender blocks the file:**
   - Open Windows Security
   - Go to "Virus & threat protection"
   - Click "Protection history"
   - Find BEAR AI and click "Actions" → "Allow"

4. **During installation:**
   - You may see "Unknown Publisher" - this is normal
   - Click "Yes" to continue

## Why These Warnings?
- The app is not digitally signed (certificates cost $200-600/year)
- The app is safe but Windows doesn't recognize it
- After first installation, warnings will be reduced

## Verify Application Integrity
SHA256 Checksum: $(Get-FileHash "$distPath\*.exe" -Algorithm SHA256 | Select-Object -First 1 -ExpandProperty Hash)

## Support
If you have issues, please contact: support@bear-ai.com

## Making Installation Smoother
To avoid warnings in the future, we need to:
1. Purchase a code signing certificate
2. Get enough users to build reputation with Windows SmartScreen

Thank you for your patience during our initial release!
"@

$readmeContent | Set-Content "$distPath\INSTALLATION_GUIDE.txt"

# Create a batch file for easier installation
$batchContent = @"
@echo off
echo ================================================
echo    BEAR AI - Installation Helper
echo ================================================
echo.
echo This helper will guide you through installation.
echo.
echo IMPORTANT: You will see security warnings.
echo This is normal for unsigned applications.
echo.
pause

echo.
echo Adding Windows Defender exclusion...
powershell -Command "Add-MpPreference -ExclusionPath '%CD%\BEAR_AI_Setup.exe'" 2>nul
echo Done!

echo.
echo Starting installation...
start BEAR_AI_Setup.exe

echo.
echo ================================================
echo Installation started!
echo.
echo If you see "Windows protected your PC":
echo   1. Click "More info"
echo   2. Click "Run anyway"
echo ================================================
pause
"@

$batchContent | Set-Content "$distPath\INSTALL_HELPER.bat"

Write-Host "================================================" -ForegroundColor Green
Write-Host "   UNSIGNED BUILD COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Output location: $distPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created:" -ForegroundColor White
Get-ChildItem $distPath | ForEach-Object { Write-Host "  • $($_.Name)" -ForegroundColor Gray }
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Upload files to GitHub Releases" -ForegroundColor White
Write-Host "  2. Include INSTALLATION_GUIDE.txt" -ForegroundColor White
Write-Host "  3. Tell users to run INSTALL_HELPER.bat" -ForegroundColor White
Write-Host ""
Write-Host "💡 To avoid warnings in future:" -ForegroundColor Cyan
Write-Host "  • Purchase code signing certificate" -ForegroundColor White
Write-Host "  • Use a service like SignPath.io (~$20/month)" -ForegroundColor White
Write-Host "  • Build reputation over time" -ForegroundColor White
Write-Host ""