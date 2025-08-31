Option Explicit
Dim fso, shell, scriptsDir, repoDir, venvPy, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' scriptsDir = folder containing this .vbs
scriptsDir = fso.GetParentFolderName(WScript.ScriptFullName)
' repoDir = parent of scriptsDir
repoDir = fso.GetParentFolderName(scriptsDir)

venvPy = repoDir & "\.venv\Scripts\pythonw.exe"
If Not fso.FileExists(venvPy) Then
  MsgBox "Virtual environment not found. Please run scripts\install.bat first.", 48, "BEAR AI"
  WScript.Quit 1
End If

shell.CurrentDirectory = repoDir
cmd = """" & venvPy & """ -m bear_ai.gui"
shell.Run cmd, 0, False ' 0=hidden, async
