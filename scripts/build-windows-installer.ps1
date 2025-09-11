# BEAR AI Windows Installer Build Script
# This script creates a comprehensive Windows installer for BEAR AI Legal Assistant

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0",
    
    [Parameter(Mandatory=$false)]
    [switch]$Sign,
    
    [Parameter(Mandatory=$false)]
    [string]$CertificatePath,
    
    [Parameter(Mandatory=$false)]
    [string]$CertificatePassword,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreatePortable,
    
    [Parameter(Mandatory=$false)]
    [switch]$RunTests
)

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Paths
$RootPath = Split-Path -Parent $PSScriptRoot
$BuildPath = Join-Path $RootPath "build"
$DistPath = Join-Path $RootPath "dist"
$TauriPath = Join-Path $RootPath "src-tauri"
$InstallerPath = Join-Path $BuildPath "installer"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($Message) {
    Write-ColorOutput Green "✅ $Message"
}

function Write-Warning($Message) {
    Write-ColorOutput Yellow "⚠️  $Message"
}

function Write-Error($Message) {
    Write-ColorOutput Red "❌ $Message"
}

function Write-Info($Message) {
    Write-ColorOutput Cyan "ℹ️  $Message"
}

# Create build directories
function Initialize-BuildEnvironment {
    Write-Info "Initializing build environment..."
    
    if (Test-Path $BuildPath) {
        Remove-Item $BuildPath -Recurse -Force
    }
    
    New-Item -ItemType Directory -Path $BuildPath -Force | Out-Null
    New-Item -ItemType Directory -Path $InstallerPath -Force | Out-Null
    
    Write-Success "Build environment initialized"
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js $nodeVersion found"
    } catch {
        Write-Error "Node.js is not installed or not in PATH"
        return $false
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm $npmVersion found"
    } catch {
        Write-Error "npm is not installed or not in PATH"
        return $false
    }
    
    # Check Rust
    try {
        $rustVersion = rustc --version
        Write-Success "Rust found: $rustVersion"
    } catch {
        Write-Error "Rust is not installed or not in PATH"
        return $false
    }
    
    # Check Tauri CLI
    try {
        $tauriVersion = npx tauri --version
        Write-Success "Tauri CLI found: $tauriVersion"
    } catch {
        Write-Warning "Tauri CLI not found, will install during build"
    }
    
    return $true
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    Push-Location $RootPath
    try {
        npm ci
        Write-Success "Dependencies installed successfully"
    } catch {
        Write-Error "Failed to install dependencies"
        throw
    } finally {
        Pop-Location
    }
}

# Build the application
function Build-Application {
    Write-Info "Building BEAR AI application..."
    
    Push-Location $RootPath
    try {
        # Update version in package.json
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $packageJson.version = $Version
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        
        # Update version in Tauri config
        $tauriConfig = Get-Content (Join-Path $TauriPath "tauri.conf.json") | ConvertFrom-Json
        $tauriConfig.package.version = $Version
        $tauriConfig | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $TauriPath "tauri.conf.json")
        
        # Build the application
        npm run tauri build
        
        Write-Success "Application built successfully"
    } catch {
        Write-Error "Failed to build application"
        throw
    } finally {
        Pop-Location
    }
}

# Create NSIS installer
function Create-NSISInstaller {
    Write-Info "Creating NSIS installer..."
    
    # Check if NSIS is installed
    $nsisPath = Get-Command "makensis.exe" -ErrorAction SilentlyContinue
    if (-not $nsisPath) {
        Write-Warning "NSIS not found, attempting to install via Chocolatey..."
        try {
            choco install nsis -y
            $env:PATH += ";C:\Program Files (x86)\NSIS"
        } catch {
            Write-Error "Failed to install NSIS. Please install manually from https://nsis.sourceforge.io/"
            return $false
        }
    }
    
    # Create NSIS script
    $nsisScript = @"
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "BEAR AI Legal Assistant"
!define PRODUCT_VERSION "$Version"
!define PRODUCT_PUBLISHER "BEAR AI Team"
!define PRODUCT_WEB_SITE "https://github.com/KingOfTheAce2/BEAR_AI"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\bear-ai-legal-assistant.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

Name "`${PRODUCT_NAME}"
OutFile "$BuildPath\BEAR_AI_Setup_v$Version.exe"
InstallDir "`$PROGRAMFILES64\BEAR_AI"
InstallDirRegKey HKLM "`${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show
Unicode True
RequestExecutionLevel admin

!define MUI_ABORTWARNING
!define MUI_ICON "$TauriPath\icons\icon.ico"
!define MUI_UNICON "$TauriPath\icons\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "$TauriPath\icons\installer-banner.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "$TauriPath\icons\installer-banner.bmp"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "$RootPath\LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "BEAR AI Legal Assistant (Required)" SecMain
  SectionIn RO
  SetOutPath "`$INSTDIR"
  
  ; Install main executable
  File "$TauriPath\target\release\bear-ai-legal-assistant.exe"
  
  ; Install additional files
  File /nonfatal /r "$TauriPath\target\release\bundle\*"
  
  ; Create registry entries
  WriteRegStr HKLM "`${PRODUCT_DIR_REGKEY}" "" "`$INSTDIR\bear-ai-legal-assistant.exe"
  WriteRegStr `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "DisplayName" "`$(^Name)"
  WriteRegStr `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "UninstallString" "`$INSTDIR\uninst.exe"
  WriteRegStr `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "DisplayIcon" "`$INSTDIR\bear-ai-legal-assistant.exe"
  WriteRegStr `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "DisplayVersion" "`${PRODUCT_VERSION}"
  WriteRegStr `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "URLInfoAbout" "`${PRODUCT_WEB_SITE}"
  WriteRegStr `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "Publisher" "`${PRODUCT_PUBLISHER}"
  WriteRegDWORD `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Desktop Shortcut" SecDesktop
  CreateShortCut "`$DESKTOP\BEAR AI Legal Assistant.lnk" "`$INSTDIR\bear-ai-legal-assistant.exe"
SectionEnd

Section "Start Menu Shortcuts" SecStartMenu
  CreateDirectory "`$SMPROGRAMS\BEAR AI"
  CreateShortCut "`$SMPROGRAMS\BEAR AI\BEAR AI Legal Assistant.lnk" "`$INSTDIR\bear-ai-legal-assistant.exe"
  CreateShortCut "`$SMPROGRAMS\BEAR AI\Uninstall BEAR AI.lnk" "`$INSTDIR\uninst.exe"
SectionEnd

Section -AdditionalIcons
  WriteIniStr "`$INSTDIR\`${PRODUCT_NAME}.url" "InternetShortcut" "URL" "`${PRODUCT_WEB_SITE}"
  CreateShortCut "`$SMPROGRAMS\BEAR AI\Website.lnk" "`$INSTDIR\`${PRODUCT_NAME}.url"
  CreateShortCut "`$SMPROGRAMS\BEAR AI\Uninstall BEAR AI.lnk" "`$INSTDIR\uninst.exe"
SectionEnd

Section -Post
  WriteUninstaller "`$INSTDIR\uninst.exe"
SectionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove `$(^Name) and all of its components?" IDYES +2
  Abort
FunctionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "`$(^Name) was successfully removed from your computer."
FunctionEnd

Section Uninstall
  Delete "`$INSTDIR\`${PRODUCT_NAME}.url"
  Delete "`$INSTDIR\uninst.exe"
  Delete "`$INSTDIR\bear-ai-legal-assistant.exe"
  RMDir /r "`$INSTDIR"
  
  Delete "`$SMPROGRAMS\BEAR AI\*.*"
  RMDir "`$SMPROGRAMS\BEAR AI"
  Delete "`$DESKTOP\BEAR AI Legal Assistant.lnk"
  
  DeleteRegKey `${PRODUCT_UNINST_ROOT_KEY} "`${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "`${PRODUCT_DIR_REGKEY}"
  SetAutoClose true
SectionEnd

LangString DESC_SecMain `${LANG_ENGLISH} "Main application files"
LangString DESC_SecDesktop `${LANG_ENGLISH} "Create a desktop shortcut"
LangString DESC_SecStartMenu `${LANG_ENGLISH} "Create Start Menu shortcuts"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT `${SecMain} `$(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT `${SecDesktop} `$(DESC_SecDesktop)
  !insertmacro MUI_DESCRIPTION_TEXT `${SecStartMenu} `$(DESC_SecStartMenu)
!insertmacro MUI_FUNCTION_DESCRIPTION_END
"@

    # Save NSIS script
    $nsisScriptPath = Join-Path $InstallerPath "bear-ai-installer.nsi"
    $nsisScript | Out-File -FilePath $nsisScriptPath -Encoding UTF8
    
    # Build NSIS installer
    try {
        & "makensis.exe" $nsisScriptPath
        Write-Success "NSIS installer created successfully"
        return $true
    } catch {
        Write-Error "Failed to create NSIS installer: $_"
        return $false
    }
}

# Create portable version
function Create-PortableVersion {
    if (-not $CreatePortable) {
        return
    }
    
    Write-Info "Creating portable version..."
    
    $portableDir = Join-Path $BuildPath "BEAR_AI_Portable"
    New-Item -ItemType Directory -Path $portableDir -Force | Out-Null
    
    try {
        # Copy executable
        $exePath = Join-Path $TauriPath "target\release\bear-ai-legal-assistant.exe"
        Copy-Item $exePath $portableDir -Force
        
        # Create portable marker
        New-Item -ItemType File -Path (Join-Path $portableDir "portable.txt") -Force | Out-Null
        
        # Create launch script
        $launchScript = @"
@echo off
cd /d "%~dp0"
echo Starting BEAR AI Legal Assistant (Portable Version)...
start bear-ai-legal-assistant.exe
"@
        $launchScript | Out-File -FilePath (Join-Path $portableDir "Launch_BEAR_AI.bat") -Encoding ASCII
        
        # Create README
        $readme = @"
# BEAR AI Legal Assistant - Portable Version

This is the portable version of BEAR AI Legal Assistant.

## How to use:
1. Run 'Launch_BEAR_AI.bat' to start the application
2. The application will run without installation
3. All settings will be stored in the application folder

## System Requirements:
- Windows 10 or later (64-bit)
- 4 GB RAM minimum
- 100 MB free disk space

## Version: $Version
## Website: https://github.com/KingOfTheAce2/BEAR_AI
"@
        $readme | Out-File -FilePath (Join-Path $portableDir "README.txt") -Encoding UTF8
        
        # Create ZIP archive
        $zipPath = Join-Path $BuildPath "BEAR_AI_Portable_v$Version.zip"
        Compress-Archive -Path "$portableDir\*" -DestinationPath $zipPath -Force
        
        Write-Success "Portable version created: $zipPath"
    } catch {
        Write-Error "Failed to create portable version: $_"
    }
}

# Sign executables
function Sign-Executables {
    if (-not $Sign -or -not $CertificatePath -or -not $CertificatePassword) {
        return
    }
    
    Write-Info "Signing executables..."
    
    try {
        $signTool = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
        if (-not $signTool) {
            Write-Warning "SignTool not found in PATH"
            return
        }
        
        $installerPath = Join-Path $BuildPath "BEAR_AI_Setup_v$Version.exe"
        if (Test-Path $installerPath) {
            & "signtool.exe" sign /f $CertificatePath /p $CertificatePassword /tr "http://timestamp.digicert.com" /td sha256 /fd sha256 $installerPath
            Write-Success "Installer signed successfully"
        }
        
    } catch {
        Write-Warning "Failed to sign executables: $_"
    }
}

# Run tests
function Test-Installation {
    if (-not $RunTests) {
        return
    }
    
    Write-Info "Running installation tests..."
    
    try {
        # Test silent installation
        $installerPath = Join-Path $BuildPath "BEAR_AI_Setup_v$Version.exe"
        if (Test-Path $installerPath) {
            Write-Info "Testing silent installation..."
            $testProcess = Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -PassThru -NoNewWindow
            
            if ($testProcess.ExitCode -eq 0) {
                Write-Success "Silent installation test passed"
                
                # Test uninstallation
                $uninstallPath = "$env:PROGRAMFILES\BEAR_AI\uninst.exe"
                if (Test-Path $uninstallPath) {
                    Write-Info "Testing silent uninstallation..."
                    $uninstallProcess = Start-Process -FilePath $uninstallPath -ArgumentList "/S" -Wait -PassThru -NoNewWindow
                    
                    if ($uninstallProcess.ExitCode -eq 0) {
                        Write-Success "Silent uninstallation test passed"
                    } else {
                        Write-Warning "Silent uninstallation test failed"
                    }
                }
            } else {
                Write-Warning "Silent installation test failed with exit code $($testProcess.ExitCode)"
            }
        }
    } catch {
        Write-Warning "Installation tests failed: $_"
    }
}

# Generate build report
function Generate-BuildReport {
    Write-Info "Generating build report..."
    
    $report = @"
# BEAR AI Windows Build Report

**Build Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")
**Version**: $Version
**Build Platform**: Windows $(Get-ComputerInfo -Property WindowsProductName | Select-Object -ExpandProperty WindowsProductName)

## Build Artifacts

### Installers Created:
"@
    
    $installerPath = Join-Path $BuildPath "BEAR_AI_Setup_v$Version.exe"
    if (Test-Path $installerPath) {
        $installerSize = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
        $report += "`n- ✅ NSIS Installer: BEAR_AI_Setup_v$Version.exe ($installerSize MB)"
    }
    
    $msiPath = Join-Path $TauriPath "target\release\bundle\msi"
    if (Test-Path $msiPath) {
        $msiFiles = Get-ChildItem $msiPath -Filter "*.msi"
        foreach ($msi in $msiFiles) {
            $msiSize = [math]::Round($msi.Length / 1MB, 2)
            $report += "`n- ✅ MSI Package: $($msi.Name) ($msiSize MB)"
        }
    }
    
    if ($CreatePortable) {
        $portableZip = Join-Path $BuildPath "BEAR_AI_Portable_v$Version.zip"
        if (Test-Path $portableZip) {
            $portableSize = [math]::Round((Get-Item $portableZip).Length / 1MB, 2)
            $report += "`n- ✅ Portable Version: BEAR_AI_Portable_v$Version.zip ($portableSize MB)"
        }
    }
    
    $report += @"

## Build Configuration
- Tauri Integration: ✅ Enabled
- Windows NSIS Installer: ✅ Created
- Code Signing: $(if ($Sign) { "✅ Enabled" } else { "❌ Disabled" })
- Portable Version: $(if ($CreatePortable) { "✅ Created" } else { "❌ Skipped" })
- Installation Tests: $(if ($RunTests) { "✅ Executed" } else { "❌ Skipped" })

## System Requirements
- Windows 10 or later (64-bit)
- 4 GB RAM minimum
- 100 MB free disk space

## Deployment Ready
$(if ((Test-Path $installerPath)) { "✅ This build is ready for distribution" } else { "❌ Build incomplete - check for errors" })

---
Generated by BEAR AI Build System
"@
    
    $reportPath = Join-Path $BuildPath "build-report.md"
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Success "Build report generated: $reportPath"
    Write-Output $report
}

# Main execution
function Main {
    Write-Info "Starting BEAR AI Windows Installer Build"
    Write-Info "Version: $Version"
    
    try {
        if (-not (Test-Prerequisites)) {
            throw "Prerequisites check failed"
        }
        
        Initialize-BuildEnvironment
        Install-Dependencies
        Build-Application
        
        if (-not (Create-NSISInstaller)) {
            Write-Warning "NSIS installer creation failed, but continuing with other artifacts"
        }
        
        Create-PortableVersion
        Sign-Executables
        Test-Installation
        Generate-BuildReport
        
        Write-Success "Build completed successfully!"
        Write-Info "Build artifacts are available in: $BuildPath"
        
    } catch {
        Write-Error "Build failed: $_"
        exit 1
    }
}

# Execute main function
Main