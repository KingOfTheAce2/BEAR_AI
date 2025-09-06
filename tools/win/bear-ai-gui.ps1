# BEAR AI GUI Launcher - Windows PowerShell
# Standardized cross-platform launcher for BEAR AI GUI
param(
    [switch]$Debug,
    [switch]$Help,
    [string]$VenvPath = ""
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
BEAR AI GUI Launcher - Windows PowerShell

Usage: bear-ai-gui.ps1 [OPTIONS]

Options:
  -Debug         Enable debug output
  -Help          Show this help message
  -VenvPath      Path to Python virtual environment (optional)

Examples:
  .\bear-ai-gui.ps1                    # Launch GUI with auto-detection
  .\bear-ai-gui.ps1 -VenvPath C:\venv  # Use specific virtual environment
  .\bear-ai-gui.ps1 -Debug             # Launch with debug output

This launcher:
1. Detects Python virtual environments
2. Activates appropriate environment
3. Checks and installs dependencies if needed
4. Launches BEAR AI GUI using proper entry points

Console Script Entry Point: bear-gui (after pip install -e .)
Module Entry Point: python -m bear_ai.gui
Direct Script: python src/bear_ai/gui.py
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
        $output = bear-gui --help 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear-gui console script"
            return @{ Method = "console_script"; Command = "bear-gui" }
        }
    }
    catch {
        # Console script not available, try other methods
    }
    
    # Method 2: Check if module import works
    try {
        $output = python -c "import bear_ai.gui; print('Module import successful')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear_ai.gui module"
            return @{ Method = "module"; Command = "python -m bear_ai.gui" }
        }
    }
    catch {
        # Module not available
    }
    
    # Method 3: Check if direct script exists
    $scriptPath = Join-Path $REPO_ROOT "src\bear_ai\gui.py"
    if (Test-Path $scriptPath) {
        Write-Log "Found direct script: $scriptPath"
        return @{ Method = "script"; Command = "python `"$scriptPath`"" }
    }
    
    # Method 4: Check for legacy GUI scripts
    $legacyScripts = @(
        "gui_launcher.py",
        "simple_gui.py", 
        "modern_gui.py",
        "src\bear_ai\professional_gui.py"
    )
    
    foreach ($script in $legacyScripts) {
        $fullPath = Join-Path $REPO_ROOT $script
        if (Test-Path $fullPath) {
            Write-Log "Found legacy GUI script: $fullPath"
            return @{ Method = "legacy"; Command = "python `"$fullPath`"" }
        }
    }
    
    return $null
}

function Install-Dependencies {
    Write-Log "Checking and installing dependencies..."
    
    # Check if setup.py exists for development install
    $setupPath = Join-Path $REPO_ROOT "setup.py"
    if (Test-Path $setupPath) {
        Write-Log "Installing BEAR AI in development mode..."
        Set-Location $REPO_ROOT
        
        try {
            python -m pip install -e ".[gui]"
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
    
    # Try installing basic requirements
    try {
        Write-Log "Installing basic GUI requirements..."
        python -m pip install tkinter customtkinter Pillow
        return $true
    }
    catch {
        Write-Log "Failed to install basic requirements: $_" "ERROR"
        return $false
    }
}

function Launch-BearAIGUI {
    param($LaunchInfo)
    
    if (-not $LaunchInfo) {
        Write-Log "No launch method available - attempting dependency installation" "WARNING"
        
        if (Install-Dependencies) {
            # Retry detection after installation
            $LaunchInfo = Test-BearAIInstallation
        }
        
        if (-not $LaunchInfo) {
            Write-Log "Failed to find or install BEAR AI GUI" "ERROR"
            Write-Host @"

ERROR: Cannot launch BEAR AI GUI

Troubleshooting steps:
1. Install BEAR AI: pip install -e .
2. Check Python version: python --version (needs 3.9+)
3. Try manual launch: python -m bear_ai.gui
4. Run from repo root: cd $REPO_ROOT

"@
            exit 1
        }
    }
    
    Write-Log "Launching BEAR AI GUI using method: $($LaunchInfo.Method)"
    Write-Log "Command: $($LaunchInfo.Command)"
    
    # Set working directory to repo root
    Set-Location $REPO_ROOT
    
    try {
        # Execute the launch command
        if ($LaunchInfo.Method -eq "console_script") {
            & bear-gui
        }
        elseif ($LaunchInfo.Method -eq "module") {
            python -m bear_ai.gui
        }
        else {
            Invoke-Expression $LaunchInfo.Command
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Launch command failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-Log "Failed to launch BEAR AI GUI: $_" "ERROR"
        exit 1
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
    }
    
    Write-Log "BEAR AI GUI Launcher Starting..."
    if ($Debug) {
        Write-Log "Debug mode enabled"
        Write-Log "Script directory: $SCRIPT_DIR"
        Write-Log "Repository root: $REPO_ROOT"
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
    
    # Launch GUI
    Launch-BearAIGUI $launchInfo
}

# Execute main function
try {
    Main
}
catch {
    Write-Log "Unexpected error: $_" "ERROR"
    exit 1
}