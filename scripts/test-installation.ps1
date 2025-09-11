# BEAR AI Installation Testing Script
# Comprehensive testing of Windows installation and functionality

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallerPath = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$TestSilentInstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestPortableVersion,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestUninstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport,
    
    [Parameter(Mandatory=$false)]
    [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Test results tracking
$script:TestResults = @()
$script:TestStartTime = Get-Date

function Write-TestResult {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Details = "",
        [string]$Duration = ""
    )
    
    $result = [PSCustomObject]@{
        TestName = $TestName
        Status = $Status
        Details = $Details
        Duration = $Duration
        Timestamp = Get-Date
    }
    
    $script:TestResults += $result
    
    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
        default { "White" }
    }
    
    Write-Host "[$Status] $TestName" -ForegroundColor $color
    if ($Details) {
        Write-Host "    $Details" -ForegroundColor Gray
    }
}

function Test-Prerequisites {
    Write-Host "`n=== Prerequisites Check ===" -ForegroundColor Cyan
    
    $testStart = Get-Date
    
    try {
        # Check Windows version
        $osVersion = [System.Environment]::OSVersion.Version
        if ($osVersion.Major -ge 10) {
            Write-TestResult "Windows Version Check" "PASS" "Windows $($osVersion.Major).$($osVersion.Minor)"
        } else {
            Write-TestResult "Windows Version Check" "FAIL" "Windows $($osVersion.Major).$($osVersion.Minor) - Requires Windows 10+"
        }
        
        # Check architecture
        $arch = $env:PROCESSOR_ARCHITECTURE
        if ($arch -eq "AMD64") {
            Write-TestResult "System Architecture" "PASS" "64-bit ($arch)"
        } else {
            Write-TestResult "System Architecture" "FAIL" "32-bit ($arch) - Requires 64-bit"
        }
        
        # Check available disk space
        $drive = Get-PSDrive -Name C
        $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
        if ($freeSpaceGB -gt 1) {
            Write-TestResult "Disk Space Check" "PASS" "$freeSpaceGB GB available"
        } else {
            Write-TestResult "Disk Space Check" "FAIL" "$freeSpaceGB GB available - Requires 1 GB+"
        }
        
        # Check RAM
        $totalRAM = [math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
        if ($totalRAM -gt 4) {
            Write-TestResult "Memory Check" "PASS" "$totalRAM GB RAM"
        } else {
            Write-TestResult "Memory Check" "FAIL" "$totalRAM GB RAM - Requires 4 GB+"
        }
        
        # Check admin privileges
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        if ($isAdmin) {
            Write-TestResult "Admin Privileges" "PASS" "Running as Administrator"
        } else {
            Write-TestResult "Admin Privileges" "FAIL" "Not running as Administrator"
        }
        
    } catch {
        Write-TestResult "Prerequisites Check" "FAIL" "Error: $_"
    }
    
    $duration = ((Get-Date) - $testStart).TotalSeconds
    Write-Host "Prerequisites check completed in $([math]::Round($duration, 1)) seconds`n" -ForegroundColor Gray
}

function Test-InstallerFiles {
    Write-Host "=== Installer Files Check ===" -ForegroundColor Cyan
    
    $testStart = Get-Date
    
    # Find installer files if not specified
    if (-not $InstallerPath) {
        $buildPath = Join-Path (Split-Path -Parent $PSScriptRoot) "build"
        $installers = Get-ChildItem $buildPath -Filter "BEAR_AI_Setup*.exe" -ErrorAction SilentlyContinue
        if ($installers) {
            $InstallerPath = $installers[0].FullName
        }
    }
    
    if ($InstallerPath -and (Test-Path $InstallerPath)) {
        $fileInfo = Get-Item $InstallerPath
        $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-TestResult "Installer File Exists" "PASS" "$($fileInfo.Name) ($fileSizeMB MB)"
        
        # Check digital signature
        try {
            $signature = Get-AuthenticodeSignature $InstallerPath
            if ($signature.Status -eq "Valid") {
                Write-TestResult "Digital Signature" "PASS" "Valid signature by $($signature.SignerCertificate.Subject)"
            } elseif ($signature.Status -eq "NotSigned") {
                Write-TestResult "Digital Signature" "SKIP" "File is not digitally signed"
            } else {
                Write-TestResult "Digital Signature" "FAIL" "Invalid signature: $($signature.StatusMessage)"
            }
        } catch {
            Write-TestResult "Digital Signature" "SKIP" "Could not check signature: $_"
        }
        
        # Virus scan (if Windows Defender is available)
        try {
            $scanResult = & "C:\Program Files\Windows Defender\MpCmdRun.exe" -Scan -ScanType 3 -File $InstallerPath -DisableRemediation 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-TestResult "Virus Scan" "PASS" "No threats detected"
            } else {
                Write-TestResult "Virus Scan" "FAIL" "Scan failed or threats detected"
            }
        } catch {
            Write-TestResult "Virus Scan" "SKIP" "Windows Defender not available"
        }
        
    } else {
        Write-TestResult "Installer File Exists" "FAIL" "Installer not found at: $InstallerPath"
    }
    
    $duration = ((Get-Date) - $testStart).TotalSeconds
    Write-Host "Installer files check completed in $([math]::Round($duration, 1)) seconds`n" -ForegroundColor Gray
}

function Test-SilentInstallation {
    if (-not $TestSilentInstall -or -not $InstallerPath -or -not (Test-Path $InstallerPath)) {
        Write-TestResult "Silent Installation" "SKIP" "Test not requested or installer not found"
        return
    }
    
    Write-Host "=== Silent Installation Test ===" -ForegroundColor Cyan
    
    $testStart = Get-Date
    
    try {
        # Run silent installation
        Write-Host "Running silent installation..." -ForegroundColor Gray
        $installProcess = Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait -PassThru -NoNewWindow
        
        if ($installProcess.ExitCode -eq 0) {
            Write-TestResult "Silent Install Process" "PASS" "Exit code: 0"
            
            # Check if application was installed
            $installPath = "$env:PROGRAMFILES\BEAR_AI\bear-ai-legal-assistant.exe"
            if (Test-Path $installPath) {
                Write-TestResult "Application Files" "PASS" "Files installed to Program Files"
                
                # Check Start Menu shortcut
                $startMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\BEAR AI\BEAR AI Legal Assistant.lnk"
                if (Test-Path $startMenuPath) {
                    Write-TestResult "Start Menu Shortcut" "PASS" "Shortcut created"
                } else {
                    Write-TestResult "Start Menu Shortcut" "FAIL" "Shortcut not found"
                }
                
                # Check Desktop shortcut
                $desktopPath = "$env:PUBLIC\Desktop\BEAR AI Legal Assistant.lnk"
                if (Test-Path $desktopPath) {
                    Write-TestResult "Desktop Shortcut" "PASS" "Shortcut created"
                } else {
                    Write-TestResult "Desktop Shortcut" "SKIP" "Shortcut not created (optional)"
                }
                
                # Check registry entries
                $regPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\BEAR AI Legal Assistant"
                if (Test-Path $regPath) {
                    Write-TestResult "Registry Entries" "PASS" "Uninstall registry entries created"
                } else {
                    Write-TestResult "Registry Entries" "FAIL" "Registry entries not found"
                }
                
            } else {
                Write-TestResult "Application Files" "FAIL" "Application executable not found"
            }
            
        } else {
            Write-TestResult "Silent Install Process" "FAIL" "Exit code: $($installProcess.ExitCode)"
        }
        
    } catch {
        Write-TestResult "Silent Installation" "FAIL" "Error during installation: $_"
    }
    
    $duration = ((Get-Date) - $testStart).TotalSeconds
    Write-Host "Silent installation test completed in $([math]::Round($duration, 1)) seconds`n" -ForegroundColor Gray
}

function Test-ApplicationLaunch {
    Write-Host "=== Application Launch Test ===" -ForegroundColor Cyan
    
    $testStart = Get-Date
    
    $installPath = "$env:PROGRAMFILES\BEAR_AI\bear-ai-legal-assistant.exe"
    
    if (-not (Test-Path $installPath)) {
        Write-TestResult "Application Launch" "SKIP" "Application not installed"
        return
    }
    
    try {
        # Test application launch
        Write-Host "Testing application launch..." -ForegroundColor Gray
        $appProcess = Start-Process -FilePath $installPath -PassThru
        
        if ($appProcess) {
            Start-Sleep -Seconds 5  # Wait for app to initialize
            
            if (-not $appProcess.HasExited) {
                Write-TestResult "Application Launch" "PASS" "Application started successfully"
                
                # Test if window is responsive (basic check)
                $windows = Get-Process -Name "bear-ai-legal-assistant" -ErrorAction SilentlyContinue
                if ($windows) {
                    Write-TestResult "Process Running" "PASS" "Application process is active"
                } else {
                    Write-TestResult "Process Running" "FAIL" "Application process not found"
                }
                
                # Clean shutdown
                try {
                    $appProcess.CloseMainWindow()
                    Start-Sleep -Seconds 3
                    if (-not $appProcess.HasExited) {
                        $appProcess.Kill()
                    }
                    Write-TestResult "Application Shutdown" "PASS" "Application closed cleanly"
                } catch {
                    Write-TestResult "Application Shutdown" "FAIL" "Error during shutdown: $_"
                }
                
            } else {
                Write-TestResult "Application Launch" "FAIL" "Application exited immediately"
            }
        } else {
            Write-TestResult "Application Launch" "FAIL" "Failed to start application process"
        }
        
    } catch {
        Write-TestResult "Application Launch" "FAIL" "Error launching application: $_"
    }
    
    $duration = ((Get-Date) - $testStart).TotalSeconds
    Write-Host "Application launch test completed in $([math]::Round($duration, 1)) seconds`n" -ForegroundColor Gray
}

function Test-PortableVersion {
    if (-not $TestPortableVersion) {
        Write-TestResult "Portable Version" "SKIP" "Test not requested"
        return
    }
    
    Write-Host "=== Portable Version Test ===" -ForegroundColor Cyan
    
    $testStart = Get-Date
    
    # Find portable version
    $buildPath = Join-Path (Split-Path -Parent $PSScriptRoot) "build"
    $portableZip = Get-ChildItem $buildPath -Filter "BEAR_AI_Portable*.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if (-not $portableZip) {
        Write-TestResult "Portable Archive" "FAIL" "Portable version not found"
        return
    }
    
    try {
        Write-TestResult "Portable Archive" "PASS" "Found $($portableZip.Name)"
        
        # Extract to temp location
        $tempDir = Join-Path $env:TEMP "BEAR_AI_Portable_Test"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        
        Expand-Archive -Path $portableZip.FullName -DestinationPath $tempDir -Force
        Write-TestResult "Portable Extraction" "PASS" "Extracted to temp directory"
        
        # Check portable files
        $portableExe = Join-Path $tempDir "bear-ai-legal-assistant.exe"
        $launchBat = Join-Path $tempDir "Launch_BEAR_AI.bat"
        $portableMarker = Join-Path $tempDir "portable.txt"
        
        if (Test-Path $portableExe) {
            Write-TestResult "Portable Executable" "PASS" "Executable found"
        } else {
            Write-TestResult "Portable Executable" "FAIL" "Executable not found"
        }
        
        if (Test-Path $launchBat) {
            Write-TestResult "Launch Script" "PASS" "Launch script found"
        } else {
            Write-TestResult "Launch Script" "FAIL" "Launch script not found"
        }
        
        if (Test-Path $portableMarker) {
            Write-TestResult "Portable Marker" "PASS" "Portable marker file found"
        } else {
            Write-TestResult "Portable Marker" "FAIL" "Portable marker not found"
        }
        
        # Test portable launch (brief test)
        if (Test-Path $portableExe) {
            try {
                $portableProcess = Start-Process -FilePath $portableExe -WorkingDirectory $tempDir -PassThru
                Start-Sleep -Seconds 3
                
                if ($portableProcess -and -not $portableProcess.HasExited) {
                    Write-TestResult "Portable Launch" "PASS" "Portable version launches successfully"
                    $portableProcess.CloseMainWindow()
                    Start-Sleep -Seconds 2
                    if (-not $portableProcess.HasExited) {
                        $portableProcess.Kill()
                    }
                } else {
                    Write-TestResult "Portable Launch" "FAIL" "Portable version failed to launch"
                }
            } catch {
                Write-TestResult "Portable Launch" "FAIL" "Error launching portable version: $_"
            }
        }
        
        # Cleanup
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        
    } catch {
        Write-TestResult "Portable Version" "FAIL" "Error testing portable version: $_"
    }
    
    $duration = ((Get-Date) - $testStart).TotalSeconds
    Write-Host "Portable version test completed in $([math]::Round($duration, 1)) seconds`n" -ForegroundColor Gray
}

function Test-Uninstallation {
    if (-not $TestUninstall) {
        Write-TestResult "Uninstallation" "SKIP" "Test not requested"
        return
    }
    
    Write-Host "=== Uninstallation Test ===" -ForegroundColor Cyan
    
    $testStart = Get-Date
    
    $uninstallPath = "$env:PROGRAMFILES\BEAR_AI\uninst.exe"
    
    if (-not (Test-Path $uninstallPath)) {
        Write-TestResult "Uninstaller Exists" "FAIL" "Uninstaller not found"
        return
    }
    
    try {
        Write-TestResult "Uninstaller Exists" "PASS" "Uninstaller found"
        
        # Run silent uninstallation
        Write-Host "Running silent uninstallation..." -ForegroundColor Gray
        $uninstallProcess = Start-Process -FilePath $uninstallPath -ArgumentList "/S" -Wait -PassThru -NoNewWindow
        
        if ($uninstallProcess.ExitCode -eq 0) {
            Write-TestResult "Uninstall Process" "PASS" "Exit code: 0"
            
            # Check if files were removed
            Start-Sleep -Seconds 2  # Allow time for cleanup
            
            if (-not (Test-Path "$env:PROGRAMFILES\BEAR_AI")) {
                Write-TestResult "Files Removal" "PASS" "Application files removed"
            } else {
                Write-TestResult "Files Removal" "FAIL" "Application files still present"
            }
            
            # Check Start Menu cleanup
            $startMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\BEAR AI"
            if (-not (Test-Path $startMenuPath)) {
                Write-TestResult "Start Menu Cleanup" "PASS" "Start Menu entries removed"
            } else {
                Write-TestResult "Start Menu Cleanup" "FAIL" "Start Menu entries still present"
            }
            
            # Check registry cleanup
            $regPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\BEAR AI Legal Assistant"
            if (-not (Test-Path $regPath)) {
                Write-TestResult "Registry Cleanup" "PASS" "Registry entries removed"
            } else {
                Write-TestResult "Registry Cleanup" "FAIL" "Registry entries still present"
            }
            
        } else {
            Write-TestResult "Uninstall Process" "FAIL" "Exit code: $($uninstallProcess.ExitCode)"
        }
        
    } catch {
        Write-TestResult "Uninstallation" "FAIL" "Error during uninstallation: $_"
    }
    
    $duration = ((Get-Date) - $testStart).TotalSeconds
    Write-Host "Uninstallation test completed in $([math]::Round($duration, 1)) seconds`n" -ForegroundColor Gray
}

function Generate-TestReport {
    if (-not $GenerateReport) {
        return
    }
    
    Write-Host "=== Generating Test Report ===" -ForegroundColor Cyan
    
    $totalTests = $script:TestResults.Count
    $passedTests = ($script:TestResults | Where-Object { $_.Status -eq "PASS" }).Count
    $failedTests = ($script:TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
    $skippedTests = ($script:TestResults | Where-Object { $_.Status -eq "SKIP" }).Count
    
    $totalDuration = ((Get-Date) - $script:TestStartTime).TotalSeconds
    
    $report = @"
# BEAR AI Installation Test Report

**Test Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")
**Total Duration**: $([math]::Round($totalDuration, 1)) seconds
**Test Environment**: Windows $([System.Environment]::OSVersion.Version.Major).$([System.Environment]::OSVersion.Version.Minor) ($env:PROCESSOR_ARCHITECTURE)

## Summary
- **Total Tests**: $totalTests
- **Passed**: $passedTests ✅
- **Failed**: $failedTests ❌
- **Skipped**: $skippedTests ⏭️
- **Success Rate**: $([math]::Round(($passedTests / ($totalTests - $skippedTests)) * 100, 1))%

## Test Results

| Test Name | Status | Details |
|-----------|--------|---------|
"@

    foreach ($result in $script:TestResults) {
        $statusIcon = switch ($result.Status) {
            "PASS" { "✅" }
            "FAIL" { "❌" }
            "SKIP" { "⏭️" }
            default { "❓" }
        }
        $report += "`n| $($result.TestName) | $statusIcon $($result.Status) | $($result.Details) |"
    }
    
    $report += @"

## Failed Tests Details
"@
    
    $failedTests = $script:TestResults | Where-Object { $_.Status -eq "FAIL" }
    if ($failedTests.Count -gt 0) {
        foreach ($failed in $failedTests) {
            $report += "`n- **$($failed.TestName)**: $($failed.Details)"
        }
    } else {
        $report += "`nNo failed tests ✅"
    }
    
    $report += @"

## Recommendations

"@
    
    if ($failedTests.Count -eq 0) {
        $report += "🎉 All tests passed! The installation is working correctly and ready for distribution."
    } else {
        $report += "⚠️ Some tests failed. Please review the failed tests and address the issues before distribution."
        
        # Add specific recommendations based on failures
        $failedTestNames = $failedTests | Select-Object -ExpandProperty TestName
        
        if ($failedTestNames -contains "Admin Privileges") {
            $report += "`n- Run the installer as Administrator"
        }
        if ($failedTestNames -contains "Windows Version Check") {
            $report += "`n- Ensure the target system is Windows 10 or later"
        }
        if ($failedTestNames -contains "System Architecture") {
            $report += "`n- This installer requires a 64-bit Windows system"
        }
    }
    
    $report += @"

---
*Report generated by BEAR AI Installation Test Suite*
"@
    
    # Save report
    $reportPath = Join-Path (Split-Path -Parent $PSScriptRoot) "installation-test-report.md"
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Host "Test report saved to: $reportPath" -ForegroundColor Green
    Write-Host "`nTest Summary:" -ForegroundColor Yellow
    Write-Host "  Total: $totalTests | Passed: $passedTests | Failed: $failedTests | Skipped: $skippedTests" -ForegroundColor White
    
    if ($failedTests -gt 0) {
        Write-Host "  ❌ Some tests failed - review the report for details" -ForegroundColor Red
        return $false
    } else {
        Write-Host "  ✅ All tests passed!" -ForegroundColor Green
        return $true
    }
}

# Main execution
function Main {
    Write-Host "BEAR AI Installation Testing Suite" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    
    # Find installer if not specified
    if (-not $InstallerPath) {
        $buildPath = Join-Path (Split-Path -Parent $PSScriptRoot) "build"
        $installers = Get-ChildItem $buildPath -Filter "BEAR_AI_Setup*.exe" -ErrorAction SilentlyContinue
        if ($installers) {
            $InstallerPath = $installers[0].FullName
            Write-Host "Using installer: $($installers[0].Name)" -ForegroundColor Gray
        }
    }
    
    # Run tests
    Test-Prerequisites
    Test-InstallerFiles
    Test-SilentInstallation
    Test-ApplicationLaunch
    Test-PortableVersion
    Test-Uninstallation
    
    # Generate report
    $success = Generate-TestReport
    
    Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
    
    if ($success) {
        Write-Host "✅ All tests completed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "❌ Some tests failed. Check the report for details." -ForegroundColor Red
        exit 1
    }
}

# Execute main function
Main