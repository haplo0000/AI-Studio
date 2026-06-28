' Production launcher — no visible console windows
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)
batPath = scriptDir & "\Launch-AI-Studio.bat"

If Not fso.FileExists(batPath) Then
  MsgBox "AI Studio launcher not found:" & vbCrLf & batPath, vbCritical, "AI Studio"
  WScript.Quit 1
End If

WshShell.CurrentDirectory = repoRoot
WshShell.Environment("Process")("AI_STUDIO_LAUNCH_MODE") = "production"
WshShell.Run Chr(34) & batPath & Chr(34) & " --embedded", 0, False
