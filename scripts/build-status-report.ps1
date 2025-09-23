# BEAR AI Build Status Report Generator
# Analyzes and reports current build health

Write-Host "📊 BEAR AI Build Status Report" -ForegroundColor Cyan
Write-Host "Generated: $(Get-Date)" -ForegroundColor Gray

$report = @{
    "DiskSpace" = @{}
    "RustToolchain" = @{}
    "Dependencies" = @{}
    "BuildStatus" = @{}
    "Recommendations" = @()
}

# 1. Disk Space Analysis
Write-Host "`n💾 Disk Space Analysis" -ForegroundColor Yellow
$drives = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
foreach ($drive in $drives) {
    $freeGB = [math]::Round($drive.FreeSpace / 1GB, 2)
    $totalGB = [math]::Round($drive.Size / 1GB, 2)
    $percentFree = [math]::Round(($drive.FreeSpace / $drive.Size) * 100, 1)

    $status = if ($percentFree -lt 10) { "CRITICAL" } elseif ($percentFree -lt 20) { "WARNING" } else { "OK" }

    $report.DiskSpace[$drive.DeviceID] = @{
        "FreeGB" = $freeGB
        "TotalGB" = $totalGB
        "PercentFree" = $percentFree
        "Status" = $status
    }

    $color = if ($status -eq "CRITICAL") { "Red" } elseif ($status -eq "WARNING") { "Yellow" } else { "Green" }
    Write-Host "Drive $($drive.DeviceID) $freeGB GB free of $totalGB GB ($percentFree% free) - $status" -ForegroundColor $color
}

# 2. Rust Toolchain Status
Write-Host "`n🦀 Rust Toolchain Status" -ForegroundColor Yellow
try {
    $rustVersion = cargo --version 2>&1
    $rustcVersion = rustc --version 2>&1

    if ($rustVersion -match "cargo") {
        $report.RustToolchain.Cargo = $rustVersion
        $report.RustToolchain.Status = "OK"
        Write-Host "✅ Cargo: $rustVersion" -ForegroundColor Green
    } else {
        $report.RustToolchain.Status = "ERROR"
        $report.RustToolchain.Error = $rustVersion
        Write-Host "❌ Cargo Error: $rustVersion" -ForegroundColor Red
    }

    if ($rustcVersion -match "rustc") {
        $report.RustToolchain.Rustc = $rustcVersion
        Write-Host "✅ Rustc: $rustcVersion" -ForegroundColor Green
    } else {
        $report.RustToolchain.RustcError = $rustcVersion
        Write-Host "❌ Rustc Error: $rustcVersion" -ForegroundColor Red
    }
} catch {
    $report.RustToolchain.Status = "NOT_INSTALLED"
    Write-Host "❌ Rust toolchain not available" -ForegroundColor Red
}

# 3. Build File Status
Write-Host "`n📦 Build Configuration Status" -ForegroundColor Yellow
$srcTauri = "D:\GitHub\BEAR_AI\src-tauri"

$files = @(
    "Cargo.toml",
    "Cargo.lock",
    "Cargo.minimal.toml",
    "tauri.conf.json"
)

foreach ($file in $files) {
    $filePath = Join-Path $srcTauri $file
    if (Test-Path $filePath) {
        $size = (Get-Item $filePath).Length
        Write-Host "✅ $file ($size bytes)" -ForegroundColor Green
        $report.Dependencies[$file] = "EXISTS"
    } else {
        Write-Host "❌ $file MISSING" -ForegroundColor Red
        $report.Dependencies[$file] = "MISSING"
    }
}

# 4. Test Build Status
Write-Host "`n🔧 Testing Build Commands" -ForegroundColor Yellow
Set-Location $srcTauri

# Test cargo check
Write-Host "Testing cargo check..." -ForegroundColor Cyan
try {
    $checkOutput = cargo check --no-default-features 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ cargo check: PASSED" -ForegroundColor Green
        $report.BuildStatus.CargoCheck = "PASSED"
    } else {
        Write-Host "❌ cargo check: FAILED" -ForegroundColor Red
        $report.BuildStatus.CargoCheck = "FAILED"
        $report.BuildStatus.CargoCheckError = $checkOutput
    }
} catch {
    Write-Host "❌ cargo check: ERROR" -ForegroundColor Red
    $report.BuildStatus.CargoCheck = "ERROR"
}

# 5. Generate Recommendations
Write-Host "`n💡 Recommendations" -ForegroundColor Cyan

# Disk space recommendations
$criticalDrives = $report.DiskSpace.GetEnumerator() | Where-Object { $_.Value.Status -eq "CRITICAL" }
if ($criticalDrives) {
    $report.Recommendations += "CRITICAL: Free disk space on drives: $($criticalDrives.Name -join ', ')"
    Write-Host "🚨 CRITICAL: Free disk space immediately" -ForegroundColor Red
}

$warningDrives = $report.DiskSpace.GetEnumerator() | Where-Object { $_.Value.Status -eq "WARNING" }
if ($warningDrives) {
    $report.Recommendations += "WARNING: Monitor disk space on drives: $($warningDrives.Name -join ', ')"
    Write-Host "⚠️ WARNING: Monitor disk space" -ForegroundColor Yellow
}

# Rust toolchain recommendations
if ($report.RustToolchain.Status -ne "OK") {
    $report.Recommendations += "Fix Rust toolchain installation"
    Write-Host "🔧 Fix Rust toolchain installation" -ForegroundColor Yellow
}

# Build recommendations
if ($report.BuildStatus.CargoCheck -eq "FAILED") {
    $report.Recommendations += "Use minimal Cargo.toml configuration"
    $report.Recommendations += "Run emergency cleanup scripts"
    Write-Host "📦 Use minimal dependencies" -ForegroundColor Yellow
    Write-Host "🧹 Run cleanup scripts" -ForegroundColor Yellow
}

# 6. Save Report to File
$reportJson = $report | ConvertTo-Json -Depth 4
$reportPath = "D:\GitHub\BEAR_AI\build-reports\build-status-$(Get-Date -Format 'yyyy-MM-dd-HHmm').json"

if (-not (Test-Path "D:\GitHub\BEAR_AI\build-reports")) {
    New-Item -ItemType Directory -Path "D:\GitHub\BEAR_AI\build-reports" -Force
}

$reportJson | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "`n📄 Report saved to: $reportPath" -ForegroundColor Green

# 7. Summary
Write-Host "`n📋 Build Status Summary" -ForegroundColor Cyan
$criticalIssues = $report.Recommendations | Where-Object { $_ -match "CRITICAL" }
$warningIssues = $report.Recommendations | Where-Object { $_ -match "WARNING" }

if ($criticalIssues) {
    Write-Host "🚨 CRITICAL ISSUES: $($criticalIssues.Count)" -ForegroundColor Red
    foreach ($issue in $criticalIssues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
}

if ($warningIssues) {
    Write-Host "⚠️ WARNINGS: $($warningIssues.Count)" -ForegroundColor Yellow
    foreach ($issue in $warningIssues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}

if (-not $criticalIssues -and -not $warningIssues) {
    Write-Host "✅ Build environment appears healthy" -ForegroundColor Green
} else {
    Write-Host "`n🔧 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Run emergency cleanup: .\scripts\emergency-cleanup.bat" -ForegroundColor White
    Write-Host "2. Fix Rust toolchain: .\scripts\fix-cargo-build.ps1 -Reset" -ForegroundColor White
    Write-Host "3. Try minimal build: .\scripts\fix-cargo-build.ps1 -Minimal" -ForegroundColor White
}

Write-Host "`n✅ Build status report completed!" -ForegroundColor Green