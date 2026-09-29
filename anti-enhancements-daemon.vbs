Option Explicit
Dim WshShell, fso, scriptDir, daemonScript, cmdLine

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
daemonScript = scriptDir & "\src\daemon.js"

If Not fso.FileExists(daemonScript) Then
  WScript.Quit 1
End If

cmdLine = "cmd.exe /c node """ & daemonScript & """"
WshShell.Run cmdLine, 0, False
