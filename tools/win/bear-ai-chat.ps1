# BEAR AI Chat Launcher - Windows PowerShell
# Standardized cross-platform launcher for BEAR AI Chat
param(
    [switch]$Debug,
    [switch]$Help,
    [string]$VenvPath = "",
    [string]$Model = ""
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
BEAR AI Chat Launcher - Windows PowerShell

Usage: bear-ai-chat.ps1 [OPTIONS]

Options:
  -Debug         Enable debug output
  -Help          Show this help message
  -VenvPath      Path to Python virtual environment (optional)
  -Model         Model to use for chat (optional)

Examples:
  .\bear-ai-chat.ps1                         # Launch chat with auto-detection
  .\bear-ai-chat.ps1 -Model "llama-2-7b"    # Use specific model
  .\bear-ai-chat.ps1 -VenvPath C:\venv       # Use specific virtual environment
  .\bear-ai-chat.ps1 -Debug                  # Launch with debug output

This launcher:
1. Detects Python virtual environments
2. Activates appropriate environment
3. Checks and installs dependencies if needed
4. Launches BEAR AI Chat using proper entry points

Console Script Entry Point: bear-chat (after pip install -e .)
Module Entry Point: python -m bear_ai.chat
Direct Script: python src/bear_ai/chat.py
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
        $output = bear-chat --help 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear-chat console script"
            return @{ Method = "console_script"; Command = "bear-chat" }
        }
    }
    catch {
        # Console script not available, try other methods
    }
    
    # Method 2: Check if module import works
    try {
        $output = python -c "import bear_ai.chat; print('Module import successful')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear_ai.chat module"
            return @{ Method = "module"; Command = "python -m bear_ai.chat" }
        }
    }
    catch {
        # Module not available
    }
    
    # Method 3: Check if direct script exists
    $scriptPath = Join-Path $REPO_ROOT "src\bear_ai\chat.py"
    if (Test-Path $scriptPath) {
        Write-Log "Found direct script: $scriptPath"
        return @{ Method = "script"; Command = "python `"$scriptPath`"" }
    }
    
    # Method 4: Check main module with chat subcommand
    try {
        $output = python -c "import bear_ai.__main__; print('Main module available')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Found bear_ai main module"
            return @{ Method = "main_module"; Command = "python -m bear_ai chat" }
        }
    }
    catch {
        # Main module not available
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
            python -m pip install -e ".[inference]"
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
        Write-Log "Installing basic chat requirements..."
        python -m pip install huggingface_hub tqdm click rich typer
        return $true
    }
    catch {
        Write-Log "Failed to install basic requirements: $_" "ERROR"
        return $false
    }
}

function Launch-BearAIChat {
    param($LaunchInfo, $Model)
    
    if (-not $LaunchInfo) {
        Write-Log "No launch method available - attempting dependency installation" "WARNING"
        
        if (Install-Dependencies) {
            # Retry detection after installation
            $LaunchInfo = Test-BearAIInstallation
        }
        
        if (-not $LaunchInfo) {
            Write-Log "Failed to find or install BEAR AI Chat" "ERROR"
            Write-Host @"

ERROR: Cannot launch BEAR AI Chat

Troubleshooting steps:
1. Install BEAR AI: pip install -e .
2. Check Python version: python --version (needs 3.9+)
3. Try manual launch: python -m bear_ai.chat
4. Run from repo root: cd $REPO_ROOT

"@
            exit 1
        }
    }
    
    Write-Log "Launching BEAR AI Chat using method: $($LaunchInfo.Method)"
    
    # Build command with model parameter
    $command = $LaunchInfo.Command
    if ($Model) {
        if ($LaunchInfo.Method -eq "console_script") {
            $command = "bear-chat --model `"$Model`""
        }
        elseif ($LaunchInfo.Method -eq "main_module") {
            $command = "python -m bear_ai chat --model `"$Model`""
        }
        else {
            Write-Log "Model parameter not supported for method: $($LaunchInfo.Method)" "WARNING"
        }
    }
    
    Write-Log "Command: $command"
    
    # Set working directory to repo root
    Set-Location $REPO_ROOT
    
    try {
        # Execute the launch command
        if ($LaunchInfo.Method -eq "console_script") {
            if ($Model) {
                & bear-chat --model $Model
            } else {
                & bear-chat
            }
        }
        elseif ($LaunchInfo.Method -eq "module") {
            python -m bear_ai.chat
        }
        elseif ($LaunchInfo.Method -eq "main_module") {
            if ($Model) {
                python -m bear_ai chat --model $Model
            } else {
                python -m bear_ai chat
            }
        }
        else {
            Invoke-Expression $command
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Launch command failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-Log "Failed to launch BEAR AI Chat: $_" "ERROR"
        exit 1
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
    }
    
    Write-Log "BEAR AI Chat Launcher Starting..."
    if ($Debug) {
        Write-Log "Debug mode enabled"
        Write-Log "Script directory: $SCRIPT_DIR"
        Write-Log "Repository root: $REPO_ROOT"
        if ($Model) {
            Write-Log "Model specified: $Model"
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
    
    # Launch Chat
    Launch-BearAIChat $launchInfo $Model
}

# Execute main function
try {
    Main
}
catch {
    Write-Log "Unexpected error: $_" "ERROR"
    exit 1
}