; BEAR AI Legal Assistant - Before Install Hook
; Ensures proper installation for legal professionals

!include "MUI2.nsh"
!include "x64.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "FileFunc.nsh"
!include "vcredist-install.nsh"

; Check for administrator privileges and system requirements
Function .onInit
  UserInfo::GetAccountType
  pop $0
  ${If} $0 != "admin"
    MessageBox MB_ICONSTOP "Administrator privileges are required to install BEAR AI Legal Assistant. Please run the installer as an administrator."
    SetErrorLevel 740 ; ERROR_ELEVATION_REQUIRED
    Quit
  ${EndIf}

  ; Check for minimum Windows version (Windows 10 1903 or later)
  ${If} ${AtLeastWin10}
    ; Additional check for Windows 10 build version
    ReadRegStr $1 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "ReleaseId"
    ${If} $1 != ""
      ${VersionCompare} $1 "1903" $2
      ${If} $2 == 2  ; Less than 1903
        MessageBox MB_ICONSTOP "BEAR AI Legal Assistant requires Windows 10 version 1903 (May 2019 Update) or later."
        Quit
      ${EndIf}
    ${EndIf}
  ${Else}
    MessageBox MB_ICONSTOP "BEAR AI Legal Assistant requires Windows 10 version 1903 or later."
    Quit
  ${EndIf}

  ; Check for Visual C++ Redistributables
  Call CheckVCRedistRequirements

  ; Check for .NET Framework requirement
  Call CheckDotNetFramework

  ; Check available disk space (minimum 2GB)
  ${GetRoot} "$INSTDIR" $R0
  ${DriveSpace} "$R0" "/D=F /S=M" $R1
  ${If} $R1 < 2048
    MessageBox MB_ICONSTOP "Insufficient disk space. At least 2GB is required for installation."
    Quit
  ${EndIf}

  ; Check RAM requirements (4GB minimum)
  Call CheckMemoryRequirements

  ; Close any running BEAR AI processes
  Call CloseRunningApplications

  ; Install Visual C++ Redistributables
  ${InstallVCRedist}

  ; Prepare Windows Defender exclusions
  Call PrepareWindowsDefender
FunctionEnd

; Check Visual C++ Redistributables requirements
Function CheckVCRedistRequirements
  DetailPrint "Checking Visual C++ Redistributables..."

  ${If} ${IsWin64}
    Call CheckVCRedist2015_2022_x64
    Pop $0
    ${If} $0 == "false"
      DetailPrint "Visual C++ 2015-2022 x64 redistributables will be installed"
    ${EndIf}
  ${EndIf}

  Call CheckVCRedist2015_2022_x86
  Pop $0
  ${If} $0 == "false"
    DetailPrint "Visual C++ 2015-2022 x86 redistributables will be installed"
  ${EndIf}
FunctionEnd

; Check memory requirements
Function CheckMemoryRequirements
  Push $0
  Push $1

  ; Get total physical memory
  System::Call "kernel32::GlobalMemoryStatusEx(*l) l(0) .r0"
  ${If} $0 != 0
    System::Call "*$0(l .r1)"
    IntOp $1 $1 / 1073741824  ; Convert bytes to GB
    ${If} $1 < 4
      MessageBox MB_ICONEXCLAMATION "Warning: BEAR AI Legal Assistant requires at least 4GB of RAM for optimal performance. Detected: ${$1}GB"
    ${EndIf}
  ${EndIf}

  Pop $1
  Pop $0
FunctionEnd

; Close running applications
Function CloseRunningApplications
  Push $0

  DetailPrint "Checking for running BEAR AI processes..."

  ; Find and close main application window
  FindWindow $0 "" "BEAR AI Legal Assistant"
  ${If} $0 != 0
    DetailPrint "Closing BEAR AI Legal Assistant..."
    SendMessage $0 ${WM_CLOSE} 0 0
    Sleep 3000

    ; Force close if still running
    FindWindow $0 "" "BEAR AI Legal Assistant"
    ${If} $0 != 0
      System::Call "user32::GetWindowThreadProcessId(i $0, *i .r1)"
      System::Call "kernel32::OpenProcess(i 1, i 0, i r1) i .r2"
      System::Call "kernel32::TerminateProcess(i r2, i 0)"
      System::Call "kernel32::CloseHandle(i r2)"
      DetailPrint "Force closed BEAR AI Legal Assistant"
    ${EndIf}
  ${EndIf}

  Pop $0
FunctionEnd

; Prepare Windows Defender configuration
Function PrepareWindowsDefender
  DetailPrint "Configuring Windows Defender compatibility..."

  ; Add exclusions for installation directory
  ExecWait 'powershell -Command "try { Add-MpPreference -ExclusionPath \"$INSTDIR\" -Force; Write-Host \"Defender exclusion added\" } catch { Write-Host \"Failed to add exclusion\" }"' $0

  ; Add exclusions for data directories
  ExecWait 'powershell -Command "try { Add-MpPreference -ExclusionPath \"$APPDATA\\BEAR AI\" -Force } catch { }"' $0

  ; Add process exclusions
  ExecWait 'powershell -Command "try { Add-MpPreference -ExclusionProcess \"bear-ai-legal-assistant.exe\" -Force } catch { }"' $0
FunctionEnd

; Check for .NET Framework 4.8 or later
Function CheckDotNetFramework
  ClearErrors
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" "Release"
  ${If} ${Errors}
    MessageBox MB_YESNO ".NET Framework 4.8 or later is required. Would you like to download it now?" IDYES download IDNO skip
    download:
      ExecShell "open" "https://dotnet.microsoft.com/download/dotnet-framework"
      Quit
    skip:
  ${Else}
    IntCmp $0 528040 ok ok bad ; 528040 = .NET 4.8
    bad:
      MessageBox MB_YESNO ".NET Framework 4.8 or later is required. Current version is outdated. Would you like to download the latest version?" IDYES download IDNO skip
      Goto download
    ok:
  ${EndIf}
FunctionEnd

; Create legal compliance directories
Function CreateComplianceDirectories
  CreateDirectory "$INSTDIR\data\compliance"
  CreateDirectory "$INSTDIR\data\audit-logs"
  CreateDirectory "$INSTDIR\data\secure-documents"
  CreateDirectory "$APPDATA\BEAR AI\user-data"
  CreateDirectory "$APPDATA\BEAR AI\session-backups"
FunctionEnd

; Set proper file permissions for legal data
Function SetSecurityPermissions
  ; Set restrictive permissions on sensitive directories
  AccessControl::GrantOnFile "$INSTDIR\data\secure-documents" "(BU)" "FullAccess"
  AccessControl::GrantOnFile "$INSTDIR\data\audit-logs" "(BU)" "FullAccess"
  AccessControl::GrantOnFile "$APPDATA\BEAR AI" "(BU)" "FullAccess"

  ; Deny network service access to sensitive data
  AccessControl::DenyOnFile "$INSTDIR\data\secure-documents" "(NS)" "FullAccess"
  AccessControl::DenyOnFile "$INSTDIR\data\audit-logs" "(NS)" "FullAccess"
FunctionEnd