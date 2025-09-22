# Visual C++ Redistributables Installation Hook for BEAR AI
# This NSIS script ensures Visual C++ Redistributables are installed

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"

# Define VC++ Redistributable versions and download URLs
!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

# Registry keys to check for installed VC++ versions
!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86"

# Function to check if VC++ 2015-2022 x64 is installed
Function CheckVCRedist2015_2022_x64
  Push $0
  Push $1

  # Check registry for installed version
  ReadRegDWORD $0 HKLM "${VCREDIST_2015_2022_X64_KEY}" "Installed"
  ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X64_KEY}" "Major"

  # Check if installed and version is sufficient (14.30 or higher)
  ${If} $0 == 1
    ${AndIf} $1 >= 14
      Push "true"
    ${Else}
      Push "false"
    ${EndIf}
  ${Else}
    Push "false"
  ${EndIf}

  Pop $1
  Pop $0
FunctionEnd

# Function to check if VC++ 2015-2022 x86 is installed
Function CheckVCRedist2015_2022_x86
  Push $0
  Push $1

  # Check registry for installed version
  ReadRegDWORD $0 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Installed"
  ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Major"

  # Check if installed and version is sufficient
  ${If} $0 == 1
    ${AndIf} $1 >= 14
      Push "true"
    ${Else}
      Push "false"
    ${EndIf}
  ${Else}
    Push "false"
  ${EndIf}

  Pop $1
  Pop $0
FunctionEnd

# Function to download file with progress
Function DownloadVCRedist
  Pop $0  ; URL
  Pop $1  ; Output file

  DetailPrint "Downloading Visual C++ Redistributable..."

  # Use NSISdl or inetc plugin for download
  inetc::get /CAPTION "Downloading VC++ Redistributable" /CANCELTEXT "Cancel" "$0" "$1" /END
  Pop $2

  ${If} $2 == "OK"
    DetailPrint "Download completed successfully"
    Push "true"
  ${Else}
    DetailPrint "Download failed: $2"
    Push "false"
  ${EndIf}
FunctionEnd

# Function to install VC++ Redistributable
Function InstallVCRedist
  Pop $0  ; Path to redistributable installer

  DetailPrint "Installing Visual C++ Redistributable..."

  # Execute the redistributable installer silently
  ExecWait '"$0" /quiet /norestart' $1

  ${If} $1 == 0
    DetailPrint "Visual C++ Redistributable installed successfully"
    Push "true"
  ${ElseIf} $1 == 1638
    DetailPrint "Visual C++ Redistributable already installed (newer version)"
    Push "true"
  ${ElseIf} $1 == 3010
    DetailPrint "Visual C++ Redistributable installed (restart required)"
    Push "true"
  ${Else}
    DetailPrint "Visual C++ Redistributable installation failed (exit code: $1)"
    Push "false"
  ${EndIf}
FunctionEnd

# Main VC++ installation function
Function InstallVCRedistributable
  Push $0
  Push $1
  Push $2

  DetailPrint "Checking Visual C++ Redistributable requirements..."

  # Create temp directory for downloads
  CreateDirectory "$TEMP\BEAR_AI_VCRedist"

  ${If} ${IsWin64}
    # For 64-bit systems, install both x64 and x86 versions
    DetailPrint "Installing for 64-bit Windows..."

    # Check and install x64 version
    Call CheckVCRedist2015_2022_x64
    Pop $0
    ${If} $0 == "false"
      DetailPrint "VC++ 2015-2022 x64 not found, downloading..."

      Push "${VCREDIST_2015_2022_X64_URL}"
      Push "$TEMP\BEAR_AI_VCRedist\vc_redist.x64.exe"
      Call DownloadVCRedist
      Pop $1

      ${If} $1 == "true"
        Push "$TEMP\BEAR_AI_VCRedist\vc_redist.x64.exe"
        Call InstallVCRedist
        Pop $2

        ${If} $2 == "false"
          MessageBox MB_ICONEXCLAMATION "Failed to install Visual C++ Redistributable x64. BEAR AI may not function properly."
        ${EndIf}
      ${Else}
        MessageBox MB_ICONEXCLAMATION "Failed to download Visual C++ Redistributable x64. Please install manually."
      ${EndIf}
    ${Else}
      DetailPrint "VC++ 2015-2022 x64 already installed"
    ${EndIf}

    # Check and install x86 version (for compatibility)
    Call CheckVCRedist2015_2022_x86
    Pop $0
    ${If} $0 == "false"
      DetailPrint "VC++ 2015-2022 x86 not found, downloading..."

      Push "${VCREDIST_2015_2022_X86_URL}"
      Push "$TEMP\BEAR_AI_VCRedist\vc_redist.x86.exe"
      Call DownloadVCRedist
      Pop $1

      ${If} $1 == "true"
        Push "$TEMP\BEAR_AI_VCRedist\vc_redist.x86.exe"
        Call InstallVCRedist
        Pop $2

        ${If} $2 == "false"
          DetailPrint "Warning: Failed to install Visual C++ Redistributable x86"
        ${EndIf}
      ${Else}
        DetailPrint "Warning: Failed to download Visual C++ Redistributable x86"
      ${EndIf}
    ${Else}
      DetailPrint "VC++ 2015-2022 x86 already installed"
    ${EndIf}
  ${Else}
    # For 32-bit systems, install x86 version only
    DetailPrint "Installing for 32-bit Windows..."

    Call CheckVCRedist2015_2022_x86
    Pop $0
    ${If} $0 == "false"
      DetailPrint "VC++ 2015-2022 x86 not found, downloading..."

      Push "${VCREDIST_2015_2022_X86_URL}"
      Push "$TEMP\BEAR_AI_VCRedist\vc_redist.x86.exe"
      Call DownloadVCRedist
      Pop $1

      ${If} $1 == "true"
        Push "$TEMP\BEAR_AI_VCRedist\vc_redist.x86.exe"
        Call InstallVCRedist
        Pop $2

        ${If} $2 == "false"
          MessageBox MB_ICONEXCLAMATION "Failed to install Visual C++ Redistributable. BEAR AI may not function properly."
        ${EndIf}
      ${Else}
        MessageBox MB_ICONEXCLAMATION "Failed to download Visual C++ Redistributable. Please install manually."
      ${EndIf}
    ${Else}
      DetailPrint "VC++ 2015-2022 x86 already installed"
    ${EndIf}
  ${EndIf}

  # Cleanup temp files
  RMDir /r "$TEMP\BEAR_AI_VCRedist"

  DetailPrint "Visual C++ Redistributable check completed"

  Pop $2
  Pop $1
  Pop $0
FunctionEnd

# Function to verify VC++ installation
Function VerifyVCRedistInstallation
  Push $0
  Push $1

  DetailPrint "Verifying Visual C++ Redistributable installation..."

  ${If} ${IsWin64}
    # Check x64 version
    Call CheckVCRedist2015_2022_x64
    Pop $0

    # Check x86 version
    Call CheckVCRedist2015_2022_x86
    Pop $1

    ${If} $0 == "true"
      ${AndIf} $1 == "true"
        DetailPrint "VC++ Redistributables verified successfully (x64 and x86)"
        Push "true"
      ${ElseIf} $0 == "true"
        DetailPrint "VC++ Redistributables verified (x64 only)"
        Push "true"
      ${Else}
        DetailPrint "VC++ Redistributables verification failed"
        Push "false"
      ${EndIf}
  ${Else}
    # Check x86 version only for 32-bit systems
    Call CheckVCRedist2015_2022_x86
    Pop $0

    ${If} $0 == "true"
      DetailPrint "VC++ Redistributables verified successfully (x86)"
      Push "true"
    ${Else}
      DetailPrint "VC++ Redistributables verification failed"
      Push "false"
    ${EndIf}
  ${EndIf}

  Pop $1
  Pop $0
FunctionEnd

# Export functions for use in main installer
!define InstallVCRedist "Call InstallVCRedistributable"
!define VerifyVCRedist "Call VerifyVCRedistInstallation"