# BEAR AI Build Cleanup Script
# Addresses critical disk space issues preventing Rust compilation

param(
    [switch]$DryRun,
    [switch]$Aggressive,
    [switch]$Force
)

Write-Host "🧹 BEAR AI Build Cleanup Script v1.0.0" -ForegroundColor Cyan
Write-Host "Addressing critical disk space issues..." -ForegroundColor Yellow

# Function to get folder size
function Get-FolderSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-ChildItem -Path $Path -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1MB, 2)
    }
    return 0
}

# Function to safely remove directory
function Remove-SafeDirectory {
    param([string]$Path, [string]$Description)

    if (Test-Path $Path) {
        $size = Get-FolderSize -Path $Path
        Write-Host "📁 Found $Description : $size MB" -ForegroundColor Yellow

        if (-not $DryRun) {
            try {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
                Write-Host "✅ Cleaned $Description : $size MB freed" -ForegroundColor Green
                return $size
            } catch {
                Write-Host "❌ Failed to clean $Description : $($_.Exception.Message)" -ForegroundColor Red
                return 0
            }
        } else {
            Write-Host "🔍 [DRY RUN] Would clean $Description : $size MB" -ForegroundColor Cyan
            return $size
        }
    }
    return 0
}
}

$totalFreed = 0
$projectRoot = "D:\GitHub\BEAR_AI"

Write-Host "`n🎯 Starting cleanup process..." -ForegroundColor Green

# 1. Clean Rust/Cargo artifacts
Write-Host "`n📦 Cleaning Rust/Cargo artifacts..." -ForegroundColor Cyan
$totalFreed += Remove-SafeDirectory -Path "$projectRoot\src-tauri\target" -Description "Rust target directory"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\.cargo\registry\cache" -Description "Cargo registry cache"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\.cargo\git\checkouts" -Description "Cargo git checkouts"

if ($Aggressive) {
    $totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\.cargo\registry\src" -Description "Cargo registry sources"
}

# 2. Clean Node.js artifacts
Write-Host "`n📦 Cleaning Node.js artifacts..." -ForegroundColor Cyan
$totalFreed += Remove-SafeDirectory -Path "$projectRoot\node_modules\.cache" -Description "Node modules cache"
$totalFreed += Remove-SafeDirectory -Path "$projectRoot\build" -Description "Build output"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\AppData\Local\npm-cache" -Description "NPM cache"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\AppData\Roaming\npm-cache" -Description "NPM roaming cache"

# 3. Clean system temp files
Write-Host "`n🗑️ Cleaning system temp files..." -ForegroundColor Cyan
$totalFreed += Remove-SafeDirectory -Path "$env:TEMP\*" -Description "User temp files"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\AppData\Local\Temp\*" -Description "Local temp files"

# 4. Clean Tauri-specific caches
Write-Host "`n🦀 Cleaning Tauri caches..." -ForegroundColor Cyan
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\.tauri" -Description "Tauri cache"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\AppData\Local\tauri" -Description "Tauri local data"

# 5. Clean Rust toolchain cache (if aggressive)
if ($Aggressive) {
    Write-Host "`n⚠️ Aggressive mode: Cleaning Rust toolchain cache..." -ForegroundColor Yellow
    $totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-msvc\share\doc" -Description "Rust documentation"
    $totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\.rustup\downloads" -Description "Rust downloads"
}

# 6. Clean Visual Studio/MSBuild artifacts
Write-Host "`n🛠️ Cleaning Visual Studio artifacts..." -ForegroundColor Cyan
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\AppData\Local\Microsoft\VisualStudio\ComponentModelCache" -Description "VS Component cache"
$totalFreed += Remove-SafeDirectory -Path "$env:USERPROFILE\AppData\Local\Microsoft\MSBuild" -Description "MSBuild cache"

# 7. Clean Windows Update cache (if force mode)
if ($Force) {
    Write-Host "`n⚠️ Force mode: Cleaning Windows Update cache..." -ForegroundColor Red
    try {
        Stop-Service -Name "wuauserv" -Force -ErrorAction SilentlyContinue
        $totalFreed += Remove-SafeDirectory -Path "C:\Windows\SoftwareDistribution\Download" -Description "Windows Update cache"
        Start-Service -Name "wuauserv" -ErrorAction SilentlyContinue
    } catch {
        Write-Host "❌ Could not clean Windows Update cache: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 8. Check disk space before and after
Write-Host "`n💾 Disk space analysis..." -ForegroundColor Cyan
$drives = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
foreach ($drive in $drives) {
    $freeGB = [math]::Round($drive.FreeSpace / 1GB, 2)
    $totalGB = [math]::Round($drive.Size / 1GB, 2)
    $percentFree = [math]::Round(($drive.FreeSpace / $drive.Size) * 100, 1)

    $color = if ($percentFree -lt 10) { "Red" } elseif ($percentFree -lt 20) { "Yellow" } else { "Green" }
    Write-Host "Drive $($drive.DeviceID) $freeGB GB free of $totalGB GB ($percentFree% free)" -ForegroundColor $color
}

# Summary
Write-Host "`n📊 Cleanup Summary:" -ForegroundColor Green
Write-Host "Total space freed: $([math]::Round($totalFreed, 2)) MB" -ForegroundColor Green

if ($DryRun) {
    Write-Host "This was a DRY RUN - no files were actually deleted." -ForegroundColor Cyan
    Write-Host "Run without -DryRun to perform actual cleanup." -ForegroundColor Cyan
}

# Recommendations
Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan
Write-Host "1. Run 'cargo clean' in src-tauri directory before builds" -ForegroundColor White
Write-Host "2. Use 'npm run clean' to clean Node.js artifacts" -ForegroundColor White
Write-Host "3. Consider moving project to a drive with more space" -ForegroundColor White
Write-Host "4. Run this script with -Aggressive for deeper cleanup" -ForegroundColor White
Write-Host "5. Run this script with -Force for system-level cleanup (requires admin)" -ForegroundColor White

Write-Host "`n✅ Cleanup completed!" -ForegroundColor Green