# BEAR AI Scrub Launcher - Windows PowerShell
# Standardized cross-platform launcher for BEAR AI PII Scrubber
param(
    [switch]$Debug,
    [switch]$Help,
    [string]$VenvPath = "",
    [string]$InputFile = "",
    [string]$OutputFile = ""
)

# Script configuration
$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$REPO_ROOT = Split-Path -Parent (Split-Path -Parent $SCRIPT_DIR)

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Show-Help {
    Write-Host @"
BEAR AI PII Scrub Launcher - Windows PowerShell

Usage: bear-ai-scrub.ps1 [OPTIONS]

Options:
  -Debug         Enable debug output
  -Help          Show this help message
  -VenvPath      Path to Python virtual environment (optional)
  -InputFile     Input file to scrub (optional, will prompt if not provided)
  -OutputFile    Output file for scrubbed text (optional)

Examples:
  .\bear-ai-scrub.ps1                                    # Interactive mode
  .\bear-ai-scrub.ps1 -InputFile input.txt              # Scrub specific file
  .\bear-ai-scrub.ps1 -InputFile in.txt -OutputFile out.txt  # Specify output
  .\bear-ai-scrub.ps1 -VenvPath C:\venv -Debug          # Use specific venv with debug

This launcher:
1. Detects Python virtual environments
2. Activates appropriate environment
3. Checks and installs PII scrubbing dependencies
4. Launches BEAR AI PII Scrubber using proper entry points

Console Script Entry Point: bear-scrub (after pip install -e .)
Module Entry Point: python -m bear_ai.scrub
Direct Script: python src/bear_ai/scrub.py
Legacy Script: python bin/scrub_text.py
"@
    exit 0
}

function Test-PythonInstallation {
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Python not found"
        }
        Write-Log "Found Python: $pythonVersion"
        
        # Check if version is 3.9+
        $version = [System.Version]($pythonVersion -replace "Python ", "")
        if ($version.Major -lt 3 -or ($version.Major -eq 3 -and $version.Minor -lt 9)) {
            throw "Python 3.9+ required, found $pythonVersion"
        }
        return $true
    }
    catch {
        Write-Log "Python installation check failed: $_" "ERROR"
        return $false
    }
}

function Find-VirtualEnvironment {
    param($StartPath = $REPO_ROOT)
    
    # Common virtual environment names
    $venvNames = @("venv", ".venv", "env", ".env", "bear-ai-env")
    
    # Check for virtual environments
    foreach ($name in $venvNames) {
        $venvPath = Join-Path $StartPath $name
        $activateScript = Join-Path $venvPath "Scripts\activate.ps1"
        
        if (Test-Path $activateScript) {
            Write-Log "Found virtual environment: $venvPath"
            return $venvPath
        }
    }
    
    # Check if we're already in a virtual environment
    if ($env:VIRTUAL_ENV) {
        Write-Log "Already in virtual environment: $env:VIRTUAL_ENV"
        return $env:VIRTUAL_ENV
    }
    
    return $null
}

function Activate-VirtualEnvironment {
    param($VenvPath)
    
    if (-not $VenvPath) {
        Write-Log "No virtual environment specified, using system Python"
        return $true
    }
    
    $activateScript = Join-Path $VenvPath "Scripts\activate.ps1"
    
    if (-not (Test-Path $activateScript)) {
        Write-Log "Virtual environment activation script not found: $activateScript" "ERROR"
        return $false
    }
    
    try {
        Write-Log "Activating virtual environment: $VenvPath"
        & $activateScript
        
        if ($LASTEXITCODE -ne 0) {
            throw "Activation script failed"
        }
        
        Write-Log "Virtual environment activated successfully"
        return $true
    }
    catch {
        Write-Log "Failed to activate virtual environment: $_" "ERROR"
        return $false
    }
}

function Test-BearAIInstallation {
    # Method 1: Check if console script is available
    try {
        $output = bear-scrub --help 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear-scrub console script"
            return @{ Method = "console_script"; Command = "bear-scrub" }
        }
    }
    catch {
        # Console script not available, try other methods
    }
    
    # Method 2: Check if module import works
    try {
        $output = python -c "import bear_ai.scrub; print('Module import successful')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear_ai.scrub module"
            return @{ Method = "module"; Command = "python -m bear_ai.scrub" }
        }
    }
    catch {
        # Module not available
    }
    
    # Method 3: Check if direct script exists
    $scriptPath = Join-Path $REPO_ROOT "src\bear_ai\scrub.py"
    if (Test-Path $scriptPath) {
        Write-Log "Found direct script: $scriptPath"
        return @{ Method = "script"; Command = "python `"$scriptPath`"" }
    }
    
    # Method 4: Check for legacy scrub script
    $legacyScript = Join-Path $REPO_ROOT "bin\scrub_text.py"
    if (Test-Path $legacyScript) {
        Write-Log "Found legacy scrub script: $legacyScript"
        return @{ Method = "legacy"; Command = "python `"$legacyScript`"" }
    }
    
    return $null
}

function Install-Dependencies {
    Write-Log "Checking and installing PII scrubbing dependencies..."
    
    # Check if setup.py exists for development install
    $setupPath = Join-Path $REPO_ROOT "setup.py"
    if (Test-Path $setupPath) {
        Write-Log "Installing BEAR AI in development mode with privacy features..."
        Set-Location $REPO_ROOT
        
        try {
            python -m pip install -e ".[privacy]"
            if ($LASTEXITCODE -ne 0) {
                throw "pip install failed"
            }
            Write-Log "Development installation completed"
            return $true
        }
        catch {
            Write-Log "Development installation failed: $_" "ERROR"
        }
    }
    
    # Try installing basic scrubbing requirements
    try {
        Write-Log "Installing basic PII scrubbing requirements..."
        python -m pip install presidio-analyzer presidio-anonymizer spacy click rich
        
        # Download spacy model if needed
        Write-Log "Installing spaCy language model..."
        python -m spacy download en_core_web_sm
        
        return $true
    }
    catch {
        Write-Log "Failed to install basic requirements: $_" "ERROR"
        return $false
    }
}

function Launch-BearAIScrub {
    param($LaunchInfo, $InputFile, $OutputFile)
    
    if (-not $LaunchInfo) {
        Write-Log "No launch method available - attempting dependency installation" "WARNING"
        
        if (Install-Dependencies) {
            # Retry detection after installation
            $LaunchInfo = Test-BearAIInstallation
        }
        
        if (-not $LaunchInfo) {
            Write-Log "Failed to find or install BEAR AI Scrub" "ERROR"
            Write-Host @"

ERROR: Cannot launch BEAR AI PII Scrubber

Troubleshooting steps:
1. Install BEAR AI: pip install -e ".[privacy]"
2. Check Python version: python --version (needs 3.9+)
3. Try manual launch: python -m bear_ai.scrub
4. Run from repo root: cd $REPO_ROOT
5. Install spaCy model: python -m spacy download en_core_web_sm

"@
            exit 1
        }
    }
    
    Write-Log "Launching BEAR AI PII Scrubber using method: $($LaunchInfo.Method)"
    
    # Build command with file parameters
    $command = $LaunchInfo.Command
    $args = @()
    
    if ($InputFile) {
        $args += $InputFile
    }
    
    if ($OutputFile) {
        $args += "--output", $OutputFile
    }
    
    Write-Log "Command: $command $(if ($args) { $args -join ' ' })"
    
    # Set working directory to repo root
    Set-Location $REPO_ROOT
    
    try {
        # Execute the launch command
        if ($LaunchInfo.Method -eq "console_script") {
            if ($args.Count -gt 0) {
                & bear-scrub @args
            } else {
                & bear-scrub
            }
        }
        elseif ($LaunchInfo.Method -eq "module") {
            if ($args.Count -gt 0) {
                python -m bear_ai.scrub @args
            } else {
                python -m bear_ai.scrub
            }
        }
        else {
            if ($args.Count -gt 0) {
                $fullCommand = "$command $($args -join ' ')"
                Invoke-Expression $fullCommand
            } else {
                Invoke-Expression $command
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Launch command failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-Log "Failed to launch BEAR AI Scrub: $_" "ERROR"
        exit 1
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
    }
    
    Write-Log "BEAR AI PII Scrub Launcher Starting..."
    if ($Debug) {
        Write-Log "Debug mode enabled"
        Write-Log "Script directory: $SCRIPT_DIR"
        Write-Log "Repository root: $REPO_ROOT"
        if ($InputFile) {
            Write-Log "Input file: $InputFile"
        }
        if ($OutputFile) {
            Write-Log "Output file: $OutputFile"
        }
    }
    
    # Check Python installation
    if (-not (Test-PythonInstallation)) {
        Write-Host @"

ERROR: Python 3.9+ is required but not found or not working.

Please install Python 3.9 or later:
1. Download from https://python.org
2. Make sure python.exe is in your PATH
3. Run: python --version

"@
        exit 1
    }
    
    # Handle virtual environment
    $venvPath = $VenvPath
    if (-not $venvPath) {
        $venvPath = Find-VirtualEnvironment
    }
    
    if ($venvPath -and -not (Activate-VirtualEnvironment $venvPath)) {
        Write-Log "Continuing without virtual environment" "WARNING"
    }
    
    # Test BEAR AI installation
    $launchInfo = Test-BearAIInstallation
    if ($Debug -and $launchInfo) {
        Write-Log "Launch method: $($launchInfo.Method), Command: $($launchInfo.Command)"
    }
    
    # Launch Scrub
    Launch-BearAIScrub $launchInfo $InputFile $OutputFile
}

# Execute main function
try {
    Main
}
catch {
    Write-Log "Unexpected error: $_" "ERROR"
    exit 1
}