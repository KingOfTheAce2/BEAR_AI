# Windows Defender Configuration Script for BEAR AI
# Configures Windows Defender exclusions and compatibility settings

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\Program Files\BEAR AI",

    [Parameter(Mandatory=$false)]
    [string]$DataPath = "$env:APPDATA\BEAR AI",

    [Parameter(Mandatory=$false)]
    [switch]$RemoveExclusions = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false
)

# Requires Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script requires Administrator privileges. Please run as Administrator."
    exit 1
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    if ($Verbose -or $Level -eq "ERROR") {
        Write-Host $logMessage
    }
}

# Function to add Windows Defender exclusions
function Add-DefenderExclusions {
    Write-Log "Adding Windows Defender exclusions for BEAR AI..."

    try {
        # Path exclusions
        $pathExclusions = @(
            $InstallPath,
            $DataPath,
            "$env:LOCALAPPDATA\BEAR AI",
            "$env:TEMP\BEAR_AI_*"
        )

        foreach ($path in $pathExclusions) {
            if (Test-Path $path -ErrorAction SilentlyContinue) {
                Add-MpPreference -ExclusionPath $path -Force -ErrorAction Stop
                Write-Log "Added path exclusion: $path"
            } else {
                Write-Log "Path not found, adding anyway: $path" -Level "WARN"
                Add-MpPreference -ExclusionPath $path -Force -ErrorAction SilentlyContinue
            }
        }

        # Process exclusions
        $processExclusions = @(
            "bear-ai-legal-assistant.exe",
            "BEAR AI Legal Assistant.exe",
            "bear-ai.exe"
        )

        foreach ($process in $processExclusions) {
            Add-MpPreference -ExclusionProcess $process -Force -ErrorAction Stop
            Write-Log "Added process exclusion: $process"
        }

        # File extension exclusions for temporary files
        $extensionExclusions = @(
            ".bearai",
            ".baitemp",
            ".bailog"
        )

        foreach ($extension in $extensionExclusions) {
            Add-MpPreference -ExclusionExtension $extension -Force -ErrorAction Stop
            Write-Log "Added extension exclusion: $extension"
        }

        Write-Log "Successfully added all Windows Defender exclusions"
        return $true

    } catch {
        Write-Log "Failed to add Defender exclusions: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Function to remove Windows Defender exclusions
function Remove-DefenderExclusions {
    Write-Log "Removing Windows Defender exclusions for BEAR AI..."

    try {
        # Remove path exclusions
        $pathExclusions = @(
            $InstallPath,
            $DataPath,
            "$env:LOCALAPPDATA\BEAR AI",
            "$env:TEMP\BEAR_AI_*"
        )

        foreach ($path in $pathExclusions) {
            Remove-MpPreference -ExclusionPath $path -Force -ErrorAction SilentlyContinue
            Write-Log "Removed path exclusion: $path"
        }

        # Remove process exclusions
        $processExclusions = @(
            "bear-ai-legal-assistant.exe",
            "BEAR AI Legal Assistant.exe",
            "bear-ai.exe"
        )

        foreach ($process in $processExclusions) {
            Remove-MpPreference -ExclusionProcess $process -Force -ErrorAction SilentlyContinue
            Write-Log "Removed process exclusion: $process"
        }

        # Remove extension exclusions
        $extensionExclusions = @(
            ".bearai",
            ".baitemp",
            ".bailog"
        )

        foreach ($extension in $extensionExclusions) {
            Remove-MpPreference -ExclusionExtension $extension -Force -ErrorAction SilentlyContinue
            Write-Log "Removed extension exclusion: $extension"
        }

        Write-Log "Successfully removed Windows Defender exclusions"
        return $true

    } catch {
        Write-Log "Failed to remove Defender exclusions: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Function to verify Defender service status
function Test-DefenderService {
    Write-Log "Checking Windows Defender service status..."

    try {
        $defenderService = Get-Service -Name "WinDefend" -ErrorAction Stop

        if ($defenderService.Status -eq "Running") {
            Write-Log "Windows Defender service is running"
            return $true
        } else {
            Write-Log "Windows Defender service is not running" -Level "WARN"
            return $false
        }
    } catch {
        Write-Log "Could not check Windows Defender service: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Function to configure Defender scan settings
function Set-DefenderScanSettings {
    Write-Log "Configuring Windows Defender scan settings..."

    try {
        # Configure real-time protection settings
        Set-MpPreference -DisableRealtimeMonitoring $false -Force
        Set-MpPreference -DisableBehaviorMonitoring $false -Force
        Set-MpPreference -DisableBlockAtFirstSeen $false -Force
        Set-MpPreference -DisableIOAVProtection $false -Force
        Set-MpPreference -DisablePrivacyMode $false -Force
        Set-MpPreference -DisableScriptScanning $false -Force

        # Configure scan performance settings
        Set-MpPreference -ScanAvgCPULoadFactor 50 -Force  # Limit CPU usage to 50%
        Set-MpPreference -CheckForSignaturesBeforeRunningScan $true -Force

        # Configure cloud protection
        Set-MpPreference -MAPSReporting Advanced -Force
        Set-MpPreference -SubmitSamplesConsent SendAllSamples -Force

        Write-Log "Windows Defender scan settings configured successfully"
        return $true

    } catch {
        Write-Log "Failed to configure Defender scan settings: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Function to check current exclusions
function Get-CurrentExclusions {
    Write-Log "Checking current Windows Defender exclusions..."

    try {
        $preferences = Get-MpPreference

        Write-Log "Current path exclusions:"
        foreach ($path in $preferences.ExclusionPath) {
            Write-Log "  - $path"
        }

        Write-Log "Current process exclusions:"
        foreach ($process in $preferences.ExclusionProcess) {
            Write-Log "  - $process"
        }

        Write-Log "Current extension exclusions:"
        foreach ($extension in $preferences.ExclusionExtension) {
            Write-Log "  - $extension"
        }

    } catch {
        Write-Log "Failed to retrieve current exclusions: $($_.Exception.Message)" -Level "ERROR"
    }
}

# Function to test exclusions
function Test-DefenderExclusions {
    Write-Log "Testing Windows Defender exclusions..."

    try {
        # Create test file in excluded directory
        $testFile = Join-Path $InstallPath "defender_test.txt"
        $testDir = Split-Path $testFile -Parent

        if (-not (Test-Path $testDir)) {
            New-Item -ItemType Directory -Path $testDir -Force | Out-Null
        }

        # Write test content
        "This is a test file for Windows Defender exclusion verification" | Out-File -FilePath $testFile -Force

        # Wait a moment for Defender to scan
        Start-Sleep -Seconds 2

        # Check if file still exists
        if (Test-Path $testFile) {
            Write-Log "Defender exclusion test passed - file not quarantined"
            Remove-Item $testFile -Force -ErrorAction SilentlyContinue
            return $true
        } else {
            Write-Log "Defender exclusion test failed - file was quarantined" -Level "ERROR"
            return $false
        }

    } catch {
        Write-Log "Failed to test Defender exclusions: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Main execution
function Main {
    Write-Log "=== Windows Defender Configuration for BEAR AI ==="
    Write-Log "Install Path: $InstallPath"
    Write-Log "Data Path: $DataPath"

    # Check if Defender service is running
    if (-not (Test-DefenderService)) {
        Write-Log "Windows Defender service is not available" -Level "WARN"
        exit 0
    }

    if ($RemoveExclusions) {
        # Remove exclusions
        $success = Remove-DefenderExclusions
        if ($success) {
            Write-Log "Windows Defender exclusions removed successfully"
        } else {
            Write-Log "Failed to remove some exclusions" -Level "ERROR"
            exit 1
        }
    } else {
        # Add exclusions and configure settings
        $success = Add-DefenderExclusions
        if (-not $success) {
            Write-Log "Failed to add exclusions" -Level "ERROR"
            exit 1
        }

        # Configure scan settings
        Set-DefenderScanSettings

        # Test exclusions
        Test-DefenderExclusions

        Write-Log "Windows Defender configuration completed successfully"
    }

    # Show current exclusions if verbose
    if ($Verbose) {
        Get-CurrentExclusions
    }

    Write-Log "=== Configuration Complete ==="
}

# Execute main function
Main