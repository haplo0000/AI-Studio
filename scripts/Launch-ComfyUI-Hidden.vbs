' Hidden production wrapper — runs Launch-ComfyUI-Optimized.bat with no console window.
' Does not launch Stability Matrix; ComfyUI only.
Set WshShell = CreateObject("WScript.Shell")
batPath = WshShell.ExpandEnvironmentStrings("%COMFYUI_OPTIMIZED_BAT%")
If batPath = "" Then
  batPath = "C:\AI\StabilityMatrix\Scripts\Launch-ComfyUI-Optimized.bat"
End If
WshShell.Run Chr(34) & batPath & Chr(34), 0, False
