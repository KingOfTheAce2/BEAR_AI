# BEAR AI Legal Assistant - Unified PowerShell Installer
# Apple-style simple installation for Windows
# Usage: .\scripts\install-bear-ai.ps1

param(
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [switch]$Dev,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipShortcuts,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [string]$LogPath = ""
)

# Configuration
$Config = @{
    Name = "BEAR AI Legal Assistant"
    Version = "2.0.0"
    MinNodeVersion = "16.0.0"
    MinNpmVersion = "8.0.0"
    RequirementsUrl = "https://github.com/KingOfTheAce2/BEAR_AI#system-requirements"
    SupportUrl = "https://github.com/KingOfTheAce2/BEAR_AI/issues"
}

# Global variables
$script:CurrentStep = 0
$script:TotalSteps = 7
$script:StartTime = Get-Date
$script:Errors = @()
$script:Warnings = @()
$script:ProjectRoot = Get-Location
$script:IsVerbose = $Verbose

# Enhanced error handling
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Logging setup
if ($LogPath -eq "") {
    $LogPath = Join-Path $script:ProjectRoot "installation.log"
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [ConsoleColor]$Color = [ConsoleColor]::White
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to console with color
    Write-Host $logEntry -ForegroundColor $Color
    
    # Write to log file
    try {
        Add-Content -Path $LogPath -Value $logEntry -ErrorAction SilentlyContinue
    } catch {
        # Silently ignore log file errors
    }
}

function Write-Success {
    param([string]$Message)
    Write-Log "✅ $Message" "SUCCESS" Green
}

function Write-Error {
    param([string]$Message, [switch]$Fatal)
    Write-Log "❌ $Message" "ERROR" Red
    $script:Errors += $Message
    
    if ($Fatal) {
        Show-FatalError
        exit 1
    }
}

function Write-Warning {
    param([string]$Message)
    Write-Log "⚠️  $Message" "WARNING" Yellow
    $script:Warnings += $Message
}

function Write-Info {
    param([string]$Message)
    Write-Log "ℹ️  $Message" "INFO" Cyan
}

function Write-Verbose {
    param([string]$Message)
    if ($script:IsVerbose) {
        Write-Log "🔍 $Message" "VERBOSE" DarkGray
    }
}

function Show-Progress {
    param(
        [int]$Step,
        [string]$Message
    )
    
    $script:CurrentStep = $Step
    $percentage = [math]::Round(($Step / $script:TotalSteps) * 100)
    $progressBar = '█' * [math]::Floor($percentage / 5) + '░' * (20 - [math]::Floor($percentage / 5))
    
    Write-Host "`n" -NoNewline
    Write-Host "[$Step/$script:TotalSteps] " -ForegroundColor White -NoNewline
    Write-Host $progressBar -ForegroundColor Cyan -NoNewline
    Write-Host " $percentage%" -ForegroundColor White
    Write-Info $Message
}

function Test-Administrator {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-CommandExists {
    param([string]$Command)
    
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Compare-Version {
    param(
        [string]$Version1,
        [string]$Version2
    )
    
    $v1Parts = $Version1.Split('.') | ForEach-Object { [int]$_ }
    $v2Parts = $Version2.Split('.') | ForEach-Object { [int]$_ }
    
    for ($i = 0; $i -lt [math]::Max($v1Parts.Length, $v2Parts.Length); $i++) {
        $v1Part = if ($i -lt $v1Parts.Length) { $v1Parts[$i] } else { 0 }
        $v2Part = if ($i -lt $v2Parts.Length) { $v2Parts[$i] } else { 0 }
        
        if ($v1Part -gt $v2Part) { return 1 }
        if ($v1Part -lt $v2Part) { return -1 }
    }
    return 0
}

function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$WorkingDirectory = $script:ProjectRoot,
        [int]$TimeoutSeconds = 300
    )
    
    Write-Verbose "Executing: $Command"
    
    try {
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $Command -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $env:TEMP\bear-ai-stdout.tmp -RedirectStandardError $env:TEMP\bear-ai-stderr.tmp
        
        $stdout = if (Test-Path $env:TEMP\bear-ai-stdout.tmp) { Get-Content $env:TEMP\bear-ai-stdout.tmp -Raw } else { "" }
        $stderr = if (Test-Path $env:TEMP\bear-ai-stderr.tmp) { Get-Content $env:TEMP\bear-ai-stderr.tmp -Raw } else { "" }
        
        # Cleanup temp files
        Remove-Item $env:TEMP\bear-ai-stdout.tmp -ErrorAction SilentlyContinue
        Remove-Item $env:TEMP\bear-ai-stderr.tmp -ErrorAction SilentlyContinue
        
        $result = @{
            Success = ($process.ExitCode -eq 0)
            ExitCode = $process.ExitCode
            Output = $stdout
            Error = $stderr
        }
        
        Write-Verbose "Command completed with exit code: $($process.ExitCode)"
        return $result
        
    } catch {
        Write-Verbose "Command failed: $($_.Exception.Message)"
        return @{
            Success = $false
            ExitCode = -1
            Output = ""
            Error = $_.Exception.Message
        }
    }
}

function Show-Welcome {
    Clear-Host
    
    Write-Host @"

╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🐻  BEAR AI Legal Assistant Installer  ⚖️      ║
║                                                   ║
║   Bridge for Expertise, Audit and Research       ║
║   Version $($Config.Version) - Professional Edition      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

    Write-Info "Welcome to the BEAR AI installation wizard"
    Write-Info "This installer will set up everything you need automatically"
    
    if (-not $script:IsVerbose) {
        Write-Host "💡 Add -Verbose for detailed output" -ForegroundColor DarkGray
    }
    
    Start-Sleep -Seconds 2
}

function Test-SystemRequirements {
    Show-Progress 1 "Checking system requirements..."
    
    # Check Windows version
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10) {
        Write-Error "Windows 10 or later required. Current: Windows $($osVersion.Major).$($osVersion.Minor)" -Fatal
    }
    Write-Success "Windows $($osVersion.Major).$($osVersion.Minor) - Compatible"
    
    # Check architecture
    $arch = $env:PROCESSOR_ARCHITECTURE
    if ($arch -ne "AMD64") {
        Write-Error "64-bit Windows required. Current: $arch" -Fatal
    }
    Write-Success "Architecture $arch - Compatible"
    
    # Check Node.js
    if (-not (Test-CommandExists "node")) {
        Write-Error "Node.js not found. Please install Node.js $($Config.MinNodeVersion) or later from https://nodejs.org/" -Fatal
    }
    
    $nodeVersionOutput = node --version
    $nodeVersion = $nodeVersionOutput.TrimStart('v')
    
    if ((Compare-Version $nodeVersion $Config.MinNodeVersion) -lt 0) {
        Write-Error "Node.js $($Config.MinNodeVersion)+ required. Current: $nodeVersion" -Fatal
    }
    Write-Success "Node.js $nodeVersion - Compatible"
    
    # Check npm
    if (-not (Test-CommandExists "npm")) {
        Write-Error "npm not found. Please ensure npm is installed with Node.js" -Fatal
    }
    
    $npmVersionOutput = npm --version
    $npmVersion = $npmVersionOutput.Trim()
    
    if ((Compare-Version $npmVersion $Config.MinNpmVersion) -lt 0) {
        Write-Warning "npm $($Config.MinNpmVersion)+ recommended. Current: $npmVersion"
    } else {
        Write-Success "npm $npmVersion - Compatible"
    }
    
    # Check disk space (simplified)
    $drive = Get-PSDrive -Name C
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    if ($freeSpaceGB -lt 5) {
        Write-Warning "Low disk space: $freeSpaceGB GB available. 5GB+ recommended"
    } else {
        Write-Success "Disk space: $freeSpaceGB GB available"
    }
    
    # Check RAM
    $totalRAM = [math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    if ($totalRAM -lt 8) {
        Write-Warning "RAM: $totalRAM GB. 8GB+ recommended for optimal performance"
    } else {
        Write-Success "RAM: $totalRAM GB - Sufficient"
    }
    
    # Check admin privileges
    if (Test-Administrator) {
        Write-Success "Running with Administrator privileges"
    } else {
        Write-Warning "Not running as Administrator - some features may be limited"
    }
    
    Write-Verbose "System requirements check completed"
}

function Initialize-Project {
    Show-Progress 2 "Setting up project structure..."
    
    # Verify project root
    $packageJsonPath = Join-Path $script:ProjectRoot "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Write-Error "package.json not found. Please run from the BEAR AI project root directory." -Fatal
    }
    
    # Validate package.json
    try {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        if ($packageJson.name -ne "bear-ai-gui") {
            Write-Warning "Package name mismatch - proceeding anyway"
        }
        Write-Success "Project structure validated"
    } catch {
        Write-Error "Invalid package.json format" -Fatal
    }
    
    # Create necessary directories
    $directories = @("logs", "temp", "models", "config")
    foreach ($dir in $directories) {
        $dirPath = Join-Path $script:ProjectRoot $dir
        if (-not (Test-Path $dirPath)) {
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
            Write-Verbose "Created directory: $dir"
        }
    }
    
    Write-Success "Project structure ready"
}

function Install-Dependencies {
    Show-Progress 3 "Installing dependencies..."
    
    # Clean install approach
    $packageLockPath = Join-Path $script:ProjectRoot "package-lock.json"
    $command = if (Test-Path $packageLockPath) { "npm ci" } else { "npm install" }
    $command += " --prefer-offline --no-audit --no-fund"
    
    Write-Info "Installing Node.js dependencies..."
    $result = Invoke-SafeCommand $command
    
    if (-not $result.Success) {
        Write-Error "Failed to install dependencies: $($result.Error)" -Fatal
    }
    
    Write-Success "Dependencies installed successfully"
    
    # Install development dependencies if requested
    if ($Dev) {
        Write-Info "Installing development dependencies..."
        $devResult = Invoke-SafeCommand "npm install --only=dev"
        
        if ($devResult.Success) {
            Write-Success "Development dependencies installed"
        } else {
            Write-Warning "Some development dependencies failed to install"
        }
    }
}

function Initialize-Tauri {
    Show-Progress 4 "Setting up Tauri desktop integration..."
    
    # Check Rust installation
    if (-not (Test-CommandExists "rustc")) {
        Write-Warning "Rust not found - desktop features will be limited"
        Write-Info "To install Rust: https://rustup.rs/"
        return
    }
    
    $rustVersion = rustc --version
    Write-Success "Rust detected: $rustVersion"
    
    # Check Tauri CLI
    $tauriResult = Invoke-SafeCommand "cargo tauri --version"
    if (-not $tauriResult.Success) {
        Write-Info "Installing Tauri CLI..."
        $installResult = Invoke-SafeCommand "cargo install tauri-cli --version ^2.0" -TimeoutSeconds 600
        
        if (-not $installResult.Success) {
            Write-Warning "Failed to install Tauri CLI - desktop features may be limited"
            return
        }
    }
    
    # Verify Tauri configuration
    $tauriConfigPath = Join-Path $script:ProjectRoot "src-tauri\tauri.conf.json"
    if (Test-Path $tauriConfigPath) {
        Write-Success "Tauri configuration found"
        
        # Build Tauri dependencies (debug mode for faster installation)
        Write-Info "Building Tauri dependencies..."
        $buildResult = Invoke-SafeCommand "npm run tauri build -- --debug" -TimeoutSeconds 600
        
        if ($buildResult.Success) {
            Write-Success "Tauri desktop integration ready"
        } else {
            Write-Warning "Tauri build failed - web interface will still work"
        }
    } else {
        Write-Info "Tauri not configured - web-only installation"
    }
}

function Test-Installation {
    Show-Progress 5 "Running installation verification tests..."
    
    $tests = @(
        @{
            Name = "Package structure"
            Command = "node -e `"require('./package.json'); console.log('Package structure valid')`""
        },
        @{
            Name = "TypeScript compilation"
            Command = "npm run typecheck"
        },
        @{
            Name = "Build process"
            Command = "npm run build"
        }
    )
    
    $testsPassed = 0
    $testsTotal = $tests.Count
    
    foreach ($test in $tests) {
        Write-Verbose "Running test: $($test.Name)"
        $result = Invoke-SafeCommand $test.Command
        
        if ($result.Success) {
            Write-Success "Test passed: $($test.Name)"
            $testsPassed++
        } else {
            Write-Warning "Test failed: $($test.Name)"
            Write-Verbose "Error: $($result.Error)"
        }
        
        Start-Sleep -Milliseconds 500
    }
    
    if ($testsPassed -eq $testsTotal) {
        Write-Success "All $testsTotal tests passed"
    } else {
        Write-Warning "$testsPassed/$testsTotal tests passed - installation may have issues"
    }
}

function New-Shortcuts {
    if ($SkipShortcuts) {
        Write-Info "Skipping shortcut creation"
        return
    }
    
    Show-Progress 6 "Creating shortcuts and launchers..."
    
    try {
        # Create desktop shortcut
        $desktopPath = [Environment]::GetFolderPath("Desktop")
        $shortcutPath = Join-Path $desktopPath "BEAR AI Legal Assistant.lnk"
        
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($shortcutPath)
        $Shortcut.TargetPath = "cmd.exe"
        $Shortcut.Arguments = "/c cd /d `"$script:ProjectRoot`" && npm start"
        $Shortcut.WorkingDirectory = $script:ProjectRoot
        $Shortcut.Description = "BEAR AI Legal Assistant"
        $Shortcut.Save()
        
        Write-Success "Desktop shortcut created"
        
        # Create Start Menu shortcut
        $startMenuPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
        $bearAIFolder = Join-Path $startMenuPath "BEAR AI"
        
        if (-not (Test-Path $bearAIFolder)) {
            New-Item -ItemType Directory -Path $bearAIFolder -Force | Out-Null
        }
        
        $startShortcutPath = Join-Path $bearAIFolder "BEAR AI Legal Assistant.lnk"
        $StartShortcut = $WshShell.CreateShortcut($startShortcutPath)
        $StartShortcut.TargetPath = "cmd.exe"
        $StartShortcut.Arguments = "/c cd /d `"$script:ProjectRoot`" && npm start"
        $StartShortcut.WorkingDirectory = $script:ProjectRoot
        $StartShortcut.Description = "BEAR AI Legal Assistant"
        $StartShortcut.Save()
        
        Write-Success "Start Menu shortcut created"
        
    } catch {
        Write-Warning "Failed to create shortcuts: $($_.Exception.Message)"
    }
    
    # Create batch launcher
    $launcherContent = @"
@echo off
cd /d "%~dp0"
echo Starting BEAR AI Legal Assistant...
echo.
npm start
pause
"@
    
    $launcherPath = Join-Path $script:ProjectRoot "start-bear-ai.bat"
    Set-Content -Path $launcherPath -Value $launcherContent
    Write-Success "Batch launcher created"
}

function Complete-Installation {
    Show-Progress 7 "Finalizing installation..."
    
    # Create configuration file
    $configPath = Join-Path $script:ProjectRoot "config\bear-ai.json"
    $config = @{
        version = $Config.Version
        installDate = (Get-Date).ToString("o")
        platform = "Windows"
        features = @{
            desktop = Test-Path (Join-Path $script:ProjectRoot "src-tauri")
            webInterface = $true
            api = $true
        }
    } | ConvertTo-Json -Depth 3
    
    Set-Content -Path $configPath -Value $config
    Write-Success "Configuration saved"
    
    # Generate installation report
    $installTime = [math]::Round(((Get-Date) - $script:StartTime).TotalSeconds)
    $reportPath = Join-Path $script:ProjectRoot "installation-report.txt"
    
    $report = @"
BEAR AI Legal Assistant - Installation Report
============================================

Installation Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Installation Time: $installTime seconds
Platform: Windows $([System.Environment]::OSVersion.Version.Major).$([System.Environment]::OSVersion.Version.Minor)
PowerShell Version: $($PSVersionTable.PSVersion)

Features Installed:
- Web Interface: ✓
- Desktop App: $(if (Test-Path (Join-Path $script:ProjectRoot "src-tauri")) { '✓' } else { '✗' })
- API Server: ✓
- Shortcuts: $(if ($SkipShortcuts) { '✗ (Skipped)' } else { '✓' })

Warnings: $($script:Warnings.Count)
$($script:Warnings | ForEach-Object { "- $_" })

Errors: $($script:Errors.Count)
$($script:Errors | ForEach-Object { "- $_" })

Installation Status: $(if ($script:Errors.Count -eq 0) { 'SUCCESS' } else { 'COMPLETED WITH ISSUES' })
"@
    
    Set-Content -Path $reportPath -Value $report
    Write-Success "Installation report saved"
}

function Show-Success {
    $installTime = [math]::Round(((Get-Date) - $script:StartTime).TotalSeconds)
    
    Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                   INSTALLATION COMPLETE                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎉 BEAR AI Legal Assistant has been successfully installed! ║
║                                                              ║
║  Installation completed in $installTime seconds                      ║
║  $($script:Warnings.Count) warnings, $($script:Errors.Count) errors                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

    Write-Host "Quick Start:" -ForegroundColor Cyan
    Write-Host "  • Run: " -NoNewline -ForegroundColor White
    Write-Host "npm start" -ForegroundColor Yellow -NoNewline
    Write-Host " (or use desktop shortcut)" -ForegroundColor White
    Write-Host "  • Web Interface: " -NoNewline -ForegroundColor White
    Write-Host "http://localhost:3000" -ForegroundColor Yellow
    Write-Host "  • Documentation: " -NoNewline -ForegroundColor White
    Write-Host "docs\README.md" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Available Commands:" -ForegroundColor Cyan
    Write-Host "  • " -NoNewline -ForegroundColor White
    Write-Host "npm run dev" -ForegroundColor Yellow -NoNewline
    Write-Host "     - Development mode" -ForegroundColor White
    Write-Host "  • " -NoNewline -ForegroundColor White
    Write-Host "npm run build" -ForegroundColor Yellow -NoNewline
    Write-Host "   - Production build" -ForegroundColor White
    Write-Host "  • " -NoNewline -ForegroundColor White
    Write-Host "npm test" -ForegroundColor Yellow -NoNewline
    Write-Host "        - Run tests" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Support: " -NoNewline -ForegroundColor Yellow
    Write-Host $Config.SupportUrl -ForegroundColor White
    
    if ($script:Warnings.Count -gt 0) {
        Write-Host "`n⚠️  Warnings during installation:" -ForegroundColor Yellow
        $script:Warnings | ForEach-Object { Write-Host "   • $_" -ForegroundColor White }
    }
}

function Show-FatalError {
    Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                     INSTALLATION FAILED                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  The installation could not be completed due to a critical  ║
║  error. Please check the requirements and try again.        ║
║                                                              ║
║  Requirements: $($Config.RequirementsUrl.Substring(0, 40))...
║  Support:      $($Config.SupportUrl.Substring(0, 40))...
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Red
}

# Main installation flow
function Start-Installation {
    try {
        Show-Welcome
        Test-SystemRequirements
        Initialize-Project
        Install-Dependencies
        Initialize-Tauri
        Test-Installation
        New-Shortcuts
        Complete-Installation
        Show-Success
        
        return $true
        
    } catch {
        Write-Error "Installation failed: $($_.Exception.Message)" -Fatal
        return $false
    }
}

# Entry point
if ($MyInvocation.InvocationName -ne '.') {
    $success = Start-Installation
    exit $(if ($success) { 0 } else { 1 })
}