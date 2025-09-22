# Windows Code Signing Automation Script for BEAR AI
# This script handles automated code signing for Tauri applications on Windows
# Supports both CI/CD and local development environments

param(
    [Parameter(Mandatory=$false)]
    [string]$CertificatePath = "",

    [Parameter(Mandatory=$false)]
    [string]$CertificatePassword = "",

    [Parameter(Mandatory=$false)]
    [string]$SignToolPath = "",

    [Parameter(Mandatory=$false)]
    [string]$TimestampUrl = "http://timestamp.digicert.com",

    [Parameter(Mandatory=$false)]
    [string]$BuildPath = "./src-tauri/target/release/bundle",

    [Parameter(Mandatory=$false)]
    [string]$LogLevel = "INFO",

    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation = $false,

    [Parameter(Mandatory=$false)]
    [switch]$VerifyOnly = $false,

    [Parameter(Mandatory=$false)]
    [switch]$CleanupTemp = $true
)

# Configuration and Constants
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Logging setup
function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "DEBUG" { if ($LogLevel -eq "DEBUG") { Write-Host $logMessage -ForegroundColor Cyan } }
        default { Write-Host $logMessage -ForegroundColor White }
    }
}

# Environment Detection
function Get-Environment {
    if ($env:GITHUB_ACTIONS -eq "true") {
        return "GITHUB_ACTIONS"
    } elseif ($env:CI -eq "true") {
        return "CI"
    } else {
        return "LOCAL"
    }
}

# Certificate Management
function Get-CertificateInfo {
    param(
        [string]$Environment
    )

    Write-Log "Detecting certificate configuration for environment: $Environment"

    switch ($Environment) {
        "GITHUB_ACTIONS" {
            return @{
                Path = $env:WINDOWS_CERTIFICATE_PATH
                Password = $env:WINDOWS_CERTIFICATE_PASSWORD
                Base64Cert = $env:WINDOWS_CERTIFICATE_BASE64
                Subject = $env:CERTIFICATE_SUBJECT
            }
        }
        "CI" {
            return @{
                Path = $env:CERT_PATH
                Password = $env:CERT_PASSWORD
                Subject = $env:CERT_SUBJECT
            }
        }
        "LOCAL" {
            return @{
                Path = $CertificatePath
                Password = $CertificatePassword
                Subject = "CN=BEAR AI Team"
            }
        }
    }
}

# SignTool Detection and Setup
function Get-SignToolPath {
    Write-Log "Locating Windows SDK SignTool..."

    if ($SignToolPath -and (Test-Path $SignToolPath)) {
        Write-Log "Using provided SignTool path: $SignToolPath"
        return $SignToolPath
    }

    # Common SignTool locations
    $signToolPaths = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles(x86)}\Microsoft SDKs\Windows\*\bin\signtool.exe",
        "${env:ProgramFiles}\Microsoft SDKs\Windows\*\bin\signtool.exe"
    )

    foreach ($path in $signToolPaths) {
        $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($found) {
            Write-Log "Found SignTool at: $($found.FullName)"
            return $found.FullName
        }
    }

    throw "SignTool not found. Please install Windows SDK or provide SignTool path."
}

# Certificate Installation from Base64
function Install-CertificateFromBase64 {
    param(
        [string]$Base64Certificate,
        [string]$Password
    )

    if (-not $Base64Certificate) {
        return $null
    }

    Write-Log "Installing certificate from base64 string..."

    try {
        $tempCertPath = Join-Path $env:TEMP "temp_certificate.p12"
        $certBytes = [System.Convert]::FromBase64String($Base64Certificate)
        [System.IO.File]::WriteAllBytes($tempCertPath, $certBytes)

        # Install certificate to current user store
        $securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
        Import-PfxCertificate -FilePath $tempCertPath -Password $securePassword -CertStoreLocation "Cert:\CurrentUser\My" -Exportable

        Write-Log "Certificate installed successfully"
        return $tempCertPath
    } catch {
        Write-Log "Failed to install certificate: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

# File Signing Function
function Sign-File {
    param(
        [string]$FilePath,
        [string]$SignTool,
        [hashtable]$CertInfo
    )

    Write-Log "Signing file: $FilePath"

    if (-not (Test-Path $FilePath)) {
        Write-Log "File not found: $FilePath" -Level "ERROR"
        return $false
    }

    try {
        $signArgs = @(
            "sign"
            "/fd", "SHA256"
            "/tr", $TimestampUrl
            "/td", "SHA256"
            "/as"
        )

        # Add certificate parameters
        if ($CertInfo.Path -and (Test-Path $CertInfo.Path)) {
            $signArgs += "/f"
            $signArgs += $CertInfo.Path
            if ($CertInfo.Password) {
                $signArgs += "/p"
                $signArgs += $CertInfo.Password
            }
        } elseif ($CertInfo.Subject) {
            $signArgs += "/n"
            $signArgs += $CertInfo.Subject
        } else {
            Write-Log "No valid certificate configuration found" -Level "ERROR"
            return $false
        }

        $signArgs += $FilePath

        Write-Log "Executing: $SignTool $($signArgs -join ' ')" -Level "DEBUG"

        # Execute signing
        $process = Start-Process -FilePath $SignTool -ArgumentList $signArgs -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\signtool_out.txt" -RedirectStandardError "$env:TEMP\signtool_err.txt"

        $output = Get-Content "$env:TEMP\signtool_out.txt" -Raw -ErrorAction SilentlyContinue
        $errorOutput = Get-Content "$env:TEMP\signtool_err.txt" -Raw -ErrorAction SilentlyContinue

        if ($process.ExitCode -eq 0) {
            Write-Log "Successfully signed: $FilePath"
            return $true
        } else {
            Write-Log "Failed to sign $FilePath. Exit code: $($process.ExitCode)" -Level "ERROR"
            Write-Log "Output: $output" -Level "DEBUG"
            Write-Log "Error: $errorOutput" -Level "ERROR"
            return $false
        }
    } catch {
        Write-Log "Exception during signing: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Signature Verification
function Verify-Signature {
    param(
        [string]$FilePath,
        [string]$SignTool
    )

    Write-Log "Verifying signature for: $FilePath"

    try {
        $verifyArgs = @("verify", "/pa", "/all", $FilePath)
        $process = Start-Process -FilePath $SignTool -ArgumentList $verifyArgs -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\verify_out.txt" -RedirectStandardError "$env:TEMP\verify_err.txt"

        $output = Get-Content "$env:TEMP\verify_out.txt" -Raw -ErrorAction SilentlyContinue
        $errorOutput = Get-Content "$env:TEMP\verify_err.txt" -Raw -ErrorAction SilentlyContinue

        if ($process.ExitCode -eq 0) {
            Write-Log "Signature verification successful: $FilePath"
            return $true
        } else {
            Write-Log "Signature verification failed: $FilePath" -Level "WARN"
            Write-Log "Verification output: $output" -Level "DEBUG"
            return $false
        }
    } catch {
        Write-Log "Exception during verification: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Find files to sign
function Get-FilesToSign {
    param(
        [string]$BasePath
    )

    Write-Log "Searching for files to sign in: $BasePath"

    $patterns = @(
        "*.exe",
        "*.msi",
        "*.msix",
        "*.appx",
        "*.dll"
    )

    $filesToSign = @()

    foreach ($pattern in $patterns) {
        $files = Get-ChildItem -Path $BasePath -Filter $pattern -Recurse -ErrorAction SilentlyContinue
        $filesToSign += $files
    }

    Write-Log "Found $($filesToSign.Count) files to sign"

    return $filesToSign
}

# Windows Defender Exclusion
function Add-DefenderExclusion {
    param(
        [string]$Path
    )

    Write-Log "Adding Windows Defender exclusion for: $Path"

    try {
        if (Get-Command "Add-MpPreference" -ErrorAction SilentlyContinue) {
            Add-MpPreference -ExclusionPath $Path -Force
            Write-Log "Successfully added Defender exclusion"
        } else {
            Write-Log "Windows Defender PowerShell module not available" -Level "WARN"
        }
    } catch {
        Write-Log "Failed to add Defender exclusion: $($_.Exception.Message)" -Level "WARN"
    }
}

# Main execution
function Main {
    Write-Log "=== Windows Code Signing Automation Started ==="
    Write-Log "Build Path: $BuildPath"
    Write-Log "Timestamp URL: $TimestampUrl"

    try {
        $environment = Get-Environment
        Write-Log "Detected environment: $environment"

        # Get certificate configuration
        $certInfo = Get-CertificateInfo -Environment $environment

        # Handle base64 certificate installation
        if ($certInfo.Base64Cert) {
            $tempCertPath = Install-CertificateFromBase64 -Base64Certificate $certInfo.Base64Cert -Password $certInfo.Password
            if ($tempCertPath) {
                $certInfo.Path = $tempCertPath
            }
        }

        # Get SignTool path
        $signToolPath = Get-SignToolPath

        # Add Defender exclusion for build directory
        Add-DefenderExclusion -Path (Resolve-Path $BuildPath).Path

        # Find files to sign
        $filesToSign = Get-FilesToSign -BasePath $BuildPath

        if ($filesToSign.Count -eq 0) {
            Write-Log "No files found to sign in $BuildPath" -Level "WARN"
            return
        }

        if ($VerifyOnly) {
            Write-Log "=== Verification Mode ==="
            $verificationResults = @()

            foreach ($file in $filesToSign) {
                $result = Verify-Signature -FilePath $file.FullName -SignTool $signToolPath
                $verificationResults += @{
                    File = $file.FullName
                    Verified = $result
                }
            }

            $verified = ($verificationResults | Where-Object { $_.Verified }).Count
            $total = $verificationResults.Count

            Write-Log "=== Verification Results ==="
            Write-Log "Verified: $verified/$total files"

            if ($verified -lt $total) {
                Write-Log "Some files failed verification" -Level "WARN"
                exit 1
            }

            return
        }

        # Sign files
        Write-Log "=== Signing Process Started ==="
        $signedFiles = 0
        $failedFiles = 0

        foreach ($file in $filesToSign) {
            $success = Sign-File -FilePath $file.FullName -SignTool $signToolPath -CertInfo $certInfo

            if ($success) {
                $signedFiles++

                # Verify signature if not skipped
                if (-not $SkipValidation) {
                    $verified = Verify-Signature -FilePath $file.FullName -SignTool $signToolPath
                    if (-not $verified) {
                        Write-Log "Warning: Signature verification failed for $($file.FullName)" -Level "WARN"
                    }
                }
            } else {
                $failedFiles++
            }
        }

        Write-Log "=== Signing Results ==="
        Write-Log "Successfully signed: $signedFiles files"
        Write-Log "Failed to sign: $failedFiles files"

        if ($failedFiles -gt 0) {
            Write-Log "Some files failed to sign" -Level "ERROR"
            exit 1
        }

        Write-Log "=== Code Signing Completed Successfully ==="

    } catch {
        Write-Log "Fatal error during code signing: $($_.Exception.Message)" -Level "ERROR"
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level "DEBUG"
        exit 1
    } finally {
        # Cleanup
        if ($CleanupTemp) {
            Remove-Item "$env:TEMP\signtool_*.txt" -ErrorAction SilentlyContinue
            Remove-Item "$env:TEMP\verify_*.txt" -ErrorAction SilentlyContinue
            Remove-Item "$env:TEMP\temp_certificate.p12" -ErrorAction SilentlyContinue
        }
    }
}

# Execute main function
Main