# BEAR AI Cargo Build Fix Script
# Comprehensive solution for Rust build issues

param(
    [switch]$Minimal,
    [switch]$Clean,
    [switch]$Reset
)

Write-Host "🔧 BEAR AI Cargo Build Fix v1.0.0" -ForegroundColor Cyan

$srcTauriPath = "D:\GitHub\BEAR_AI\src-tauri"

if ($Reset) {
    Write-Host "🔄 Resetting Rust environment..." -ForegroundColor Yellow

    # Stop any Rust processes
    Get-Process | Where-Object { $_.Name -match "rustc|cargo|rust-analyzer" } | Stop-Process -Force -ErrorAction SilentlyContinue

    # Clean up corrupted installations
    Remove-Item -Path "$env:USERPROFILE\.rustup\downloads\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$env:USERPROFILE\.rustup\tmp\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$env:USERPROFILE\.cargo\registry\cache\*" -Recurse -Force -ErrorAction SilentlyContinue

    # Reinstall Rust
    rustup self update-no-self-update
    rustup toolchain install stable --force
    rustup default stable
}

if ($Clean) {
    Write-Host "🧹 Cleaning build artifacts..." -ForegroundColor Yellow
    Set-Location $srcTauriPath
    cargo clean 2>$null
}

if ($Minimal) {
    Write-Host "📦 Using minimal dependency configuration..." -ForegroundColor Cyan

    # Backup original Cargo.toml
    Copy-Item "$srcTauriPath\Cargo.toml" "$srcTauriPath\Cargo.toml.backup" -Force

    # Use minimal configuration
    Copy-Item "$srcTauriPath\Cargo.minimal.toml" "$srcTauriPath\Cargo.toml" -Force

    Write-Host "✅ Switched to minimal Cargo.toml" -ForegroundColor Green
}

# Test the build
Write-Host "🔍 Testing Cargo check..." -ForegroundColor Cyan
Set-Location $srcTauriPath

$checkResult = cargo check --no-default-features 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cargo check passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Cargo check failed:" -ForegroundColor Red
    Write-Host $checkResult -ForegroundColor Red

    Write-Host "`n💡 Troubleshooting suggestions:" -ForegroundColor Yellow
    Write-Host "1. Run with -Reset to reinstall Rust" -ForegroundColor White
    Write-Host "2. Check disk space: Get-WmiObject -Class Win32_LogicalDisk" -ForegroundColor White
    Write-Host "3. Run emergency cleanup again" -ForegroundColor White
    Write-Host "4. Consider using -Minimal flag for reduced dependencies" -ForegroundColor White
}

# Show disk space
Write-Host "`n💾 Current disk space:" -ForegroundColor Cyan
Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | ForEach-Object {
    $freeGB = [math]::Round($_.FreeSpace / 1GB, 2)
    $totalGB = [math]::Round($_.Size / 1GB, 2)
    $percentFree = [math]::Round(($_.FreeSpace / $_.Size) * 100, 1)

    $color = if ($percentFree -lt 10) { "Red" } elseif ($percentFree -lt 20) { "Yellow" } else { "Green" }
    Write-Host "Drive $($_.DeviceID) $freeGB GB free of $totalGB GB ($percentFree% free)" -ForegroundColor $color
}

Write-Host "`n🎯 Next steps if build still fails:" -ForegroundColor Cyan
Write-Host "1. Use: .\fix-cargo-build.ps1 -Reset -Clean -Minimal" -ForegroundColor White
Write-Host "2. Check: cargo --version && rustc --version" -ForegroundColor White
Write-Host "3. Try: cargo build --release --no-default-features" -ForegroundColor White