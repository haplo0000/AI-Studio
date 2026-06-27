$ErrorActionPreference = 'Stop'

$RepoRoot = 'C:\Dev\AI-Studio'
$BatPath = Join-Path $RepoRoot 'scripts\Launch-AI-Studio.bat'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'AI Studio.lnk'

if (-not (Test-Path $BatPath)) {
  throw "Launcher not found: $BatPath"
}

$iconCandidates = @(
  (Join-Path $RepoRoot 'assets\ai-studio.ico'),
  (Join-Path $RepoRoot 'electron\icon.ico'),
  (Join-Path $RepoRoot 'public\favicon.ico')
)

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $RepoRoot
$Shortcut.WindowStyle = 1
$Shortcut.Description = 'Launch AI Studio desktop app'

foreach ($icon in $iconCandidates) {
  if (Test-Path $icon) {
    $Shortcut.IconLocation = "$icon,0"
    break
  }
}

$Shortcut.Save()
Write-Host "Created shortcut: $ShortcutPath"
Write-Host "Target: $BatPath"
