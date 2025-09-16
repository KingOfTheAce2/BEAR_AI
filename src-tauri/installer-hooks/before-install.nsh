; BEAR AI Legal Assistant - Before Install Hook
; Ensures proper installation for legal professionals

!include "MUI2.nsh"
!include "x64.nsh"

; Check for administrator privileges
Function .onInit
  UserInfo::GetAccountType
  pop $0
  ${If} $0 != "admin"
    MessageBox MB_ICONSTOP "Administrator privileges are required to install BEAR AI Legal Assistant. Please run the installer as an administrator."
    SetErrorLevel 740 ; ERROR_ELEVATION_REQUIRED
    Quit
  ${EndIf}

  ; Check for minimum Windows version (Windows 10)
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "BEAR AI Legal Assistant requires Windows 10 or later."
    Quit
  ${EndIf}

  ; Check for .NET Framework requirement
  Call CheckDotNetFramework

  ; Check available disk space (minimum 500MB)
  ${GetRoot} "$INSTDIR" $R0
  ${DriveSpace} "$R0" "/D=F /S=M" $R1
  ${If} $R1 < 500
    MessageBox MB_ICONSTOP "Insufficient disk space. At least 500MB is required."
    Quit
  ${EndIf}
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