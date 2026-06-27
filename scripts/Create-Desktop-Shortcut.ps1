$ErrorActionPreference = 'Stop'

$RepoRoot = 'C:\Dev\AI-Studio'
$ProductionLauncher = Join-Path $RepoRoot 'scripts\Launch-AI-Studio.vbs'
$DeveloperLauncher = Join-Path $RepoRoot 'scripts\Launch-AI-Studio-Developer.bat'
$Desktop = [Environment]::GetFolderPath('Desktop')

$iconCandidates = @(
  (Join-Path $RepoRoot 'assets\ai-studio.ico'),
  (Join-Path $RepoRoot 'electron\icon.ico'),
  (Join-Path $RepoRoot 'public\favicon.ico')
)

function Set-ShortcutIcon($Shortcut) {
  foreach ($icon in $iconCandidates) {
    if (Test-Path $icon) {
      $Shortcut.IconLocation = "$icon,0"
      return
    }
  }
}

$WshShell = New-Object -ComObject WScript.Shell

if (-not (Test-Path $ProductionLauncher)) {
  throw "Production launcher not found: $ProductionLauncher"
}

$ProdShortcutPath = Join-Path $Desktop 'AI Studio.lnk'
$ProdShortcut = $WshShell.CreateShortcut($ProdShortcutPath)
$ProdShortcut.TargetPath = $ProductionLauncher
$ProdShortcut.WorkingDirectory = $RepoRoot
$ProdShortcut.WindowStyle = 7
$ProdShortcut.Description = 'Launch AI Studio (production — no console windows)'
Set-ShortcutIcon $ProdShortcut
$ProdShortcut.Save()

if (Test-Path $DeveloperLauncher) {
  $DevShortcutPath = Join-Path $Desktop 'AI Studio (Developer).lnk'
  $DevShortcut = $WshShell.CreateShortcut($DevShortcutPath)
  $DevShortcut.TargetPath = $DeveloperLauncher
  $DevShortcut.WorkingDirectory = $RepoRoot
  $DevShortcut.WindowStyle = 1
  $DevShortcut.Description = 'Launch AI Studio (developer — consoles visible)'
  Set-ShortcutIcon $DevShortcut
  $DevShortcut.Save()
  Write-Host "Created shortcut: $DevShortcutPath"
}

Write-Host "Created shortcut: $ProdShortcutPath"
Write-Host "Target: $ProductionLauncher"
