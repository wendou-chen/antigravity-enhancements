Option Explicit
Dim WshShell, fso, scriptDir, daemonScript, logFile, cmdLine, nodePath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
daemonScript = scriptDir & "\src\daemon.js"
logFile = scriptDir & "\daemon.log"

If Not fso.FileExists(daemonScript) Then
  WScript.Quit 1
End If

nodePath = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(nodePath) Then
  nodePath = "node.exe"
End If

cmdLine = "cmd.exe /c """"" & nodePath & """ """ & daemonScript & """ >> """ & scriptDir & "\daemon.err.log"" 2>&1"""
WshShell.Run cmdLine, 0, False
