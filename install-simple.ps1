# BEAR AI Legal Assistant - PowerShell Installer
# Run with: powershell -ExecutionPolicy Bypass -File install-simple.ps1

param(
    [switch]$Verbose = $false,
    [string]$InstallPath = "$env:USERPROFILE\BEAR_AI"
)

# Configuration
$RepoUrl = "https://github.com/KingOfTheAce2/BEAR_AI/archive/refs/heads/main.zip"
$TempZip = "$env:TEMP\bear-ai-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

# Colors for output
$Colors = @{
    Red = 'Red'
    Green = 'Green' 
    Yellow = 'Yellow'
    Cyan = 'Cyan'
    White = 'White'
}

function Write-Status {
    param([string]$Message, [string]$Color = 'White', [string]$Prefix = '')
    Write-Host "$Prefix$Message" -ForegroundColor $Colors[$Color]
}

function Write-Success {
    param([string]$Message)
    Write-Status "✅ $Message" -Color 'Green'
}

function Write-Error {
    param([string]$Message)
    Write-Status "❌ $Message" -Color 'Red'
}

function Write-Warning {
    param([string]$Message)
    Write-Status "⚠️  $Message" -Color 'Yellow'
}

function Write-Info {
    param([string]$Message)
    Write-Status "ℹ️  $Message" -Color 'Cyan'
}

function Show-Welcome {
    Clear-Host
    Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🐻  BEAR AI Legal Assistant - PowerShell Installer  ⚖️     ║
║                                                               ║
║   Professional installation for Windows PowerShell          ║
║   Legal AI Assistant for Professionals                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

    Write-Host "What this installer does:" -ForegroundColor White
    Write-Host "• Downloads the latest BEAR AI from GitHub" -ForegroundColor Gray
    Write-Host "• Extracts to your specified directory" -ForegroundColor Gray
    Write-Host "• Sets up configuration and shortcuts" -ForegroundColor Gray
    Write-Host "• Verifies installation integrity" -ForegroundColor Gray
    Write-Host ""
    Write-Status "Installation directory: $InstallPath" -Color 'Yellow'
    Write-Host ""

    if (Test-Path $InstallPath) {
        Write-Warning "Directory already exists - this will update your installation"
    }

    Start-Sleep -Seconds 2
}

function Test-Prerequisites {
    Write-Info "Checking system compatibility..."
    
    # Check PowerShell version
    $PSVersion = $PSVersionTable.PSVersion
    if ($PSVersion.Major -lt 3) {
        Write-Error "PowerShell 3.0+ required. Current: $($PSVersion.ToString())"
        exit 1
    }
    Write-Success "PowerShell $($PSVersion.ToString()) - Compatible"
    
    # Check .NET Framework
    try {
        $NetVersion = (Get-ItemProperty "HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\" -Name Release -ErrorAction Stop).Release
        if ($NetVersion -ge 461808) {
            Write-Success ".NET Framework 4.7.2+ - Available"
        } else {
            Write-Warning ".NET Framework version may be outdated"
        }
    } catch {
        Write-Warning "Could not verify .NET Framework version"
    }
    
    # Check internet connectivity
    try {
        $TestConnection = Test-NetConnection -ComputerName "github.com" -Port 443 -WarningAction SilentlyContinue
        if ($TestConnection.TcpTestSucceeded) {
            Write-Success "Internet connection - Available"
        } else {
            Write-Error "Cannot connect to GitHub"
            exit 1
        }
    } catch {
        # Fallback test
        try {
            Invoke-WebRequest -Uri "https://github.com" -Method Head -TimeoutSec 10 -UseBasicParsing | Out-Null
            Write-Success "Internet connection - Available (fallback test)"
        } catch {
            Write-Error "Internet connection test failed: $($_.Exception.Message)"
            exit 1
        }
    }
    
    # Check disk space (require at least 1GB free)
    $Drive = (Get-Item $InstallPath -ErrorAction SilentlyContinue).PSDrive
    if (-not $Drive) {
        $Drive = Get-PSDrive -Name (Split-Path $InstallPath -Qualifier).TrimEnd(':')
    }
    
    $FreeSpaceGB = [Math]::Round($Drive.Free / 1GB, 2)
    if ($FreeSpaceGB -gt 1) {
        Write-Success "Disk space - $FreeSpaceGB GB available"
    } else {
        Write-Warning "Low disk space - $FreeSpaceGB GB available (1GB+ recommended)"
    }
}

function Get-BearAI {
    Write-Info "Downloading BEAR AI Legal Assistant..."
    
    # Create installation directory
    if (Test-Path $InstallPath) {
        Write-Info "Updating existing installation..."
        # Backup important files
        $BackupFiles = @("package-lock.json", "node_modules", "config\bear-ai.json")
        $BackupDir = "$InstallPath\.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        
        foreach ($File in $BackupFiles) {
            $FilePath = Join-Path $InstallPath $File
            if (Test-Path $FilePath) {
                if (-not (Test-Path $BackupDir)) {
                    New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
                }
                $BackupPath = Join-Path $BackupDir (Split-Path $File -Leaf)
                Move-Item $FilePath $BackupPath -Force
                if ($Verbose) { Write-Info "Backed up $File" }
            }
        }
    } else {
        New-Item -Path $InstallPath -ItemType Directory -Force | Out-Null
    }
    
    try {
        # Download with progress
        Write-Info "Downloading from GitHub..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        # Use BITS if available for better progress tracking
        if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
            Start-BitsTransfer -Source $RepoUrl -Destination $TempZip -DisplayName "BEAR AI Download"
        } else {
            # Fallback to Invoke-WebRequest
            $ProgressPreference = 'Continue'
            Invoke-WebRequest -Uri $RepoUrl -OutFile $TempZip -UseBasicParsing
        }
        
        Write-Success "BEAR AI downloaded successfully"
    } catch {
        Write-Error "Download failed: $($_.Exception.Message)"
        exit 1
    }
    
    # Extract files
    Write-Info "Extracting files..."
    try {
        # Use Expand-Archive for PowerShell 5+, or Shell.Application for older versions
        if ($PSVersionTable.PSVersion.Major -ge 5) {
            Expand-Archive -Path $TempZip -DestinationPath $InstallPath -Force
        } else {
            # Fallback for PowerShell < 5
            $Shell = New-Object -ComObject Shell.Application
            $ZipFile = $Shell.NameSpace($TempZip)
            $Destination = $Shell.NameSpace($InstallPath)
            $Destination.CopyHere($ZipFile.Items(), 4 -bor 16) # No dialog + Yes to all
        }
        
        # Move files from subdirectory
        $ExtractedDir = Join-Path $InstallPath "BEAR_AI-main"
        if (Test-Path $ExtractedDir) {
            Get-ChildItem $ExtractedDir | Move-Item -Destination $InstallPath -Force
            Remove-Item $ExtractedDir -Force -Recurse
        }
        
        Write-Success "Files extracted successfully"
    } catch {
        Write-Error "Extraction failed: $($_.Exception.Message)"
        exit 1
    } finally {
        # Clean up temporary file
        if (Test-Path $TempZip) {
            Remove-Item $TempZip -Force
        }
    }
}

function Set-Environment {
    Write-Info "Setting up environment..."
    
    try {
        # Create necessary directories
        $Directories = @("logs", "temp", "config")
        foreach ($Dir in $Directories) {
            $DirPath = Join-Path $InstallPath $Dir
            if (-not (Test-Path $DirPath)) {
                New-Item -Path $DirPath -ItemType Directory -Force | Out-Null
            }
        }
        
        # Create configuration file
        $ConfigPath = Join-Path $InstallPath "config\bear-ai.json"
        if (-not (Test-Path $ConfigPath)) {
            $Config = @{
                version = "2.0.0"
                installDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                platform = "win32"
                powershellVersion = $PSVersionTable.PSVersion.ToString()
                installedBy = "powershell-installer"
                installPath = $InstallPath
            }
            
            $Config | ConvertTo-Json -Depth 10 | Out-File -FilePath $ConfigPath -Encoding UTF8
        }
        
        # Create desktop shortcut
        $ShortcutPath = "$env:USERPROFILE\Desktop\BEAR AI Legal Assistant.lnk"
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = $InstallPath
        $Shortcut.WorkingDirectory = $InstallPath
        $Shortcut.Description = "BEAR AI Legal Assistant"
        $Shortcut.Save()
        
        Write-Success "Environment setup completed"
        Write-Success "Desktop shortcut created"
    } catch {
        Write-Warning "Environment setup encountered issues: $($_.Exception.Message)"
    }
}

function Test-Installation {
    Write-Info "Verifying installation..."
    
    $Checks = @(
        @{ Name = "Package file"; Path = "package.json" },
        @{ Name = "Source directory"; Path = "src" },
        @{ Name = "Documentation"; Path = "docs" },
        @{ Name = "README file"; Path = "README.md" },
        @{ Name = "Configuration"; Path = "config\bear-ai.json" }
    )
    
    $Passed = 0
    foreach ($Check in $Checks) {
        $FullPath = Join-Path $InstallPath $Check.Path
        if (Test-Path $FullPath) {
            Write-Success "$($Check.Name) - Found"
            $Passed++
        } else {
            Write-Warning "$($Check.Name) - Missing"
        }
    }
    
    if ($Passed -ge 4) {
        Write-Success "Installation verified ($Passed/$($Checks.Count) checks passed)"
    } else {
        Write-Warning "Installation may have issues ($Passed/$($Checks.Count) checks passed)"
    }
    
    return $Passed -ge 4
}

function Show-Completion {
    param([bool]$Success = $true)
    
    Write-Host ""
    if ($Success) {
        Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                     INSTALLATION COMPLETE!                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  🎉 BEAR AI Legal Assistant has been installed successfully!     ║
║                                                                  ║
║  Ready to use immediately!                                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
    } else {
        Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                   INSTALLATION INCOMPLETE                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ⚠️  BEAR AI was installed but some issues were detected        ║
║                                                                  ║
║  You may need to install dependencies manually                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Install Node.js (if not already installed):" -ForegroundColor White
    Write-Host "   https://nodejs.org" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Open Command Prompt or PowerShell and run:" -ForegroundColor White
    Write-Host "   cd `"$InstallPath`"" -ForegroundColor Yellow
    Write-Host "   npm install" -ForegroundColor Yellow
    Write-Host "   npm start" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Open your browser to:" -ForegroundColor White
    Write-Host "   http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📚 Resources:" -ForegroundColor Cyan
    Write-Host "• Installation folder: $InstallPath" -ForegroundColor Gray
    Write-Host "• Documentation: $InstallPath\docs\" -ForegroundColor Gray
    Write-Host "• Issues: https://github.com/KingOfTheAce2/BEAR_AI/issues" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Thank you for choosing BEAR AI! 🐻⚖️" -ForegroundColor Green
}

# Main installation flow
function Start-Installation {
    try {
        Show-Welcome
        Test-Prerequisites
        Get-BearAI
        Set-Environment
        $InstallSuccess = Test-Installation
        Show-Completion -Success $InstallSuccess
        
        # Ask if user wants to open the directory
        $OpenDir = Read-Host "`nWould you like to open the installation directory now? (Y/N)"
        if ($OpenDir -match '^[Yy]') {
            Start-Process "explorer.exe" -ArgumentList $InstallPath
        }
        
        return $InstallSuccess
    } catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        Write-Host "`nFor support, visit: https://github.com/KingOfTheAce2/BEAR_AI/issues" -ForegroundColor Yellow
        return $false
    }
}

# Run installer
$Result = Start-Installation
exit ($Result ? 0 : 1)