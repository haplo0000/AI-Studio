' Hidden production wrapper — runs Council OS Vite dev server with no console window.
Set WshShell = CreateObject("WScript.Shell")
councilDir = WshShell.ExpandEnvironmentStrings("%COUNCIL_OS_DIR%")
viteLog = WshShell.ExpandEnvironmentStrings("%COUNCIL_VITE_LOG%")
If councilDir = "" Or councilDir = "%COUNCIL_OS_DIR%" Then
  WScript.Quit 1
End If
If viteLog = "" Or viteLog = "%COUNCIL_VITE_LOG%" Then
  viteLog = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\CouncilOS\vite.log")
End If
Set fso = CreateObject("Scripting.FileSystemObject")
logDir = fso.GetParentFolderName(viteLog)
If Not fso.FolderExists(logDir) Then
  fso.CreateFolder logDir
End If
WshShell.CurrentDirectory = councilDir
cmdLine = "cmd /c ""set PATH=C:\Program Files\nodejs;%PATH% && npm.cmd run dev >> """ & viteLog & """ 2>&1"""
WshShell.Run cmdLine, 0, False
