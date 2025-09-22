# Complete Build and Signing Pipeline for BEAR AI
# Integrates building, signing, and CI/CD processes

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",

    [Parameter(Mandatory=$false)]
    [ValidateSet("x86", "x64", "arm64")]
    [string]$Architecture = "x64",

    [Parameter(Mandatory=$false)]
    [string]$Version = "",

    [Parameter(Mandatory=$false)]
    [switch]$SkipSigning = $false,

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,

    [Parameter(Mandatory=$false)]
    [switch]$CreateRelease = $false,

    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "",

    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor White }
    }

    if ($Verbose) {
        Add-Content -Path "$ProjectRoot\build.log" -Value $logMessage
    }
}

# Environment detection
function Get-BuildEnvironment {
    if ($env:GITHUB_ACTIONS -eq "true") {
        return "GITHUB_ACTIONS"
    } elseif ($env:CI -eq "true") {
        return "CI"
    } else {
        return "LOCAL"
    }
}

# Version management
function Get-ProjectVersion {
    try {
        $packageJson = Get-Content "$ProjectRoot\package.json" | ConvertFrom-Json
        return $packageJson.version
    } catch {
        Write-Log "Failed to read version from package.json" -Level "WARN"
        return "1.0.0"
    }
}

# Prerequisites check
function Test-Prerequisites {
    Write-Log "Checking build prerequisites..."

    $prerequisites = @(
        @{ Name = "Node.js"; Command = "node"; Args = "--version" },
        @{ Name = "npm"; Command = "npm"; Args = "--version" },
        @{ Name = "Rust"; Command = "cargo"; Args = "--version" },
        @{ Name = "Tauri CLI"; Command = "cargo"; Args = "tauri --version" }
    )

    $allPresent = $true

    foreach ($prereq in $prerequisites) {
        try {
            $result = & $prereq.Command $prereq.Args.Split(' ') 2>$null
            Write-Log "$($prereq.Name): $result"
        } catch {
            Write-Log "$($prereq.Name): NOT FOUND" -Level "ERROR"
            $allPresent = $false
        }
    }

    if (-not $allPresent) {
        throw "Missing required build prerequisites"
    }

    Write-Log "All prerequisites are satisfied" -Level "SUCCESS"
}

# Clean build artifacts
function Invoke-CleanBuild {
    Write-Log "Cleaning previous build artifacts..."

    $cleanPaths = @(
        "$ProjectRoot\src-tauri\target",
        "$ProjectRoot\build",
        "$ProjectRoot\dist",
        "$ProjectRoot\node_modules\.cache"
    )

    foreach ($path in $cleanPaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Log "Cleaned: $path"
        }
    }

    Write-Log "Build cleanup completed" -Level "SUCCESS"
}

# Install dependencies
function Install-Dependencies {
    Write-Log "Installing dependencies..."

    # Frontend dependencies
    Set-Location $ProjectRoot
    npm ci --no-audit --prefer-offline
    Write-Log "Frontend dependencies installed"

    # Rust dependencies
    Set-Location "$ProjectRoot\src-tauri"
    cargo fetch
    Write-Log "Rust dependencies fetched"

    Set-Location $ProjectRoot
    Write-Log "Dependencies installation completed" -Level "SUCCESS"
}

# Run tests
function Invoke-Tests {
    if ($SkipTests) {
        Write-Log "Skipping tests as requested"
        return
    }

    Write-Log "Running tests..."

    try {
        # Frontend tests
        Set-Location $ProjectRoot
        npm run test:ci
        Write-Log "Frontend tests passed"

        # Rust tests
        Set-Location "$ProjectRoot\src-tauri"
        cargo test --all-features
        Write-Log "Rust tests passed"

        Set-Location $ProjectRoot
        Write-Log "All tests completed successfully" -Level "SUCCESS"

    } catch {
        Write-Log "Tests failed: $($_.Exception.Message)" -Level "ERROR"
        throw "Test failures detected"
    }
}

# Run linting
function Invoke-Linting {
    Write-Log "Running code linting..."

    try {
        # Frontend linting
        Set-Location $ProjectRoot
        npm run lint
        Write-Log "Frontend linting passed"

        # Rust linting
        Set-Location "$ProjectRoot\src-tauri"
        cargo clippy --all-features -- -D warnings
        cargo fmt --all -- --check
        Write-Log "Rust linting passed"

        Set-Location $ProjectRoot
        Write-Log "All linting completed successfully" -Level "SUCCESS"

    } catch {
        Write-Log "Linting failed: $($_.Exception.Message)" -Level "WARN"
        # Don't fail the build for linting issues, just warn
    }
}

# Build application
function Invoke-Build {
    Write-Log "Building BEAR AI Legal Assistant..."

    try {
        Set-Location $ProjectRoot

        # Build frontend
        npm run build
        Write-Log "Frontend build completed"

        # Configure Tauri target
        $target = switch ($Architecture) {
            "x86" { "i686-pc-windows-msvc" }
            "x64" { "x86_64-pc-windows-msvc" }
            "arm64" { "aarch64-pc-windows-msvc" }
        }

        # Build Tauri application
        Set-Location "$ProjectRoot\src-tauri"

        $buildArgs = @("tauri", "build")
        if ($target) {
            $buildArgs += "--target"
            $buildArgs += $target
        }

        if ($Configuration -eq "Debug") {
            $buildArgs += "--debug"
        }

        & cargo $buildArgs
        Write-Log "Tauri build completed for target: $target"

        Set-Location $ProjectRoot
        Write-Log "Application build completed successfully" -Level "SUCCESS"

    } catch {
        Write-Log "Build failed: $($_.Exception.Message)" -Level "ERROR"
        throw "Build process failed"
    }
}

# Code signing
function Invoke-CodeSigning {
    if ($SkipSigning) {
        Write-Log "Skipping code signing as requested"
        return
    }

    Write-Log "Starting code signing process..."

    try {
        $buildPath = "$ProjectRoot\src-tauri\target\release\bundle"

        & powershell -ExecutionPolicy Bypass -File "$ScriptDir\windows-signing.ps1" `
            -BuildPath $buildPath `
            -LogLevel "INFO"

        Write-Log "Code signing completed successfully" -Level "SUCCESS"

    } catch {
        Write-Log "Code signing failed: $($_.Exception.Message)" -Level "ERROR"
        throw "Code signing process failed"
    }
}

# Configure Windows Defender
function Set-WindowsDefenderSettings {
    Write-Log "Configuring Windows Defender compatibility..."

    try {
        & powershell -ExecutionPolicy Bypass -File "$ScriptDir\windows-defender-config.ps1" `
            -InstallPath "$env:ProgramFiles\BEAR AI" `
            -Verbose:$Verbose

        Write-Log "Windows Defender configuration completed" -Level "SUCCESS"

    } catch {
        Write-Log "Windows Defender configuration failed: $($_.Exception.Message)" -Level "WARN"
        # Don't fail the build for Defender configuration issues
    }
}

# Create release package
function New-ReleasePackage {
    if (-not $CreateRelease) {
        Write-Log "Skipping release package creation"
        return
    }

    Write-Log "Creating release package..."

    try {
        $projectVersion = if ($Version) { $Version } else { Get-ProjectVersion }
        $releaseDir = if ($OutputPath) { $OutputPath } else { "$ProjectRoot\release" }
        $archiveName = "BEAR-AI-Legal-Assistant-$projectVersion-windows-$Architecture"

        # Create release directory
        New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

        # Copy build artifacts
        $bundlePath = "$ProjectRoot\src-tauri\target\release\bundle"

        if (Test-Path "$bundlePath\msi") {
            Copy-Item "$bundlePath\msi\*" $releaseDir -Force
            Write-Log "Copied MSI installer"
        }

        if (Test-Path "$bundlePath\nsis") {
            Copy-Item "$bundlePath\nsis\*" $releaseDir -Force
            Write-Log "Copied NSIS installer"
        }

        # Copy documentation
        $docFiles = @("README.md", "LICENSE", "CHANGELOG.md")
        foreach ($doc in $docFiles) {
            if (Test-Path "$ProjectRoot\$doc") {
                Copy-Item "$ProjectRoot\$doc" $releaseDir -Force
            }
        }

        # Create archive
        $archivePath = "$ProjectRoot\$archiveName.zip"
        Compress-Archive -Path "$releaseDir\*" -DestinationPath $archivePath -Force

        Write-Log "Release package created: $archivePath" -Level "SUCCESS"

        return @{
            ArchivePath = $archivePath
            ArchiveName = $archiveName
            ReleaseDir = $releaseDir
        }

    } catch {
        Write-Log "Release package creation failed: $($_.Exception.Message)" -Level "ERROR"
        throw "Release package creation failed"
    }
}

# Generate build report
function New-BuildReport {
    Write-Log "Generating build report..."

    $report = @{
        BuildTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Environment = Get-BuildEnvironment
        Configuration = $Configuration
        Architecture = $Architecture
        Version = Get-ProjectVersion
        Success = $true
        Artifacts = @()
    }

    # Find build artifacts
    $bundlePath = "$ProjectRoot\src-tauri\target\release\bundle"

    if (Test-Path $bundlePath) {
        $artifacts = Get-ChildItem -Path $bundlePath -Recurse -File | Where-Object {
            $_.Extension -in @('.exe', '.msi', '.msix')
        }

        foreach ($artifact in $artifacts) {
            $report.Artifacts += @{
                Name = $artifact.Name
                Path = $artifact.FullName
                Size = $artifact.Length
                LastModified = $artifact.LastWriteTime
            }
        }
    }

    # Save report
    $reportPath = "$ProjectRoot\build-report.json"
    $report | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath -Encoding UTF8

    Write-Log "Build report saved: $reportPath" -Level "SUCCESS"
    return $report
}

# Main pipeline execution
function Invoke-BuildPipeline {
    $startTime = Get-Date
    Write-Log "=== BEAR AI Build Pipeline Started ===" -Level "SUCCESS"
    Write-Log "Configuration: $Configuration"
    Write-Log "Architecture: $Architecture"
    Write-Log "Environment: $(Get-BuildEnvironment)"

    try {
        # Pipeline steps
        Test-Prerequisites
        Invoke-CleanBuild
        Install-Dependencies
        Invoke-Linting
        Invoke-Tests
        Invoke-Build
        Invoke-CodeSigning
        Set-WindowsDefenderSettings

        $releaseInfo = New-ReleasePackage
        $buildReport = New-BuildReport

        $endTime = Get-Date
        $duration = $endTime - $startTime

        Write-Log "=== Build Pipeline Completed Successfully ===" -Level "SUCCESS"
        Write-Log "Total Duration: $($duration.ToString('hh\:mm\:ss'))"

        if ($releaseInfo) {
            Write-Log "Release Archive: $($releaseInfo.ArchivePath)"
        }

        return @{
            Success = $true
            Duration = $duration
            ReleaseInfo = $releaseInfo
            BuildReport = $buildReport
        }

    } catch {
        $endTime = Get-Date
        $duration = $endTime - $startTime

        Write-Log "=== Build Pipeline Failed ===" -Level "ERROR"
        Write-Log "Error: $($_.Exception.Message)" -Level "ERROR"
        Write-Log "Duration: $($duration.ToString('hh\:mm\:ss'))"

        return @{
            Success = $false
            Duration = $duration
            Error = $_.Exception.Message
        }
    } finally {
        Set-Location $ProjectRoot
    }
}

# Execute the pipeline
$result = Invoke-BuildPipeline

# Exit with appropriate code
if ($result.Success) {
    exit 0
} else {
    exit 1
}