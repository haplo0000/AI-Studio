@echo off
setlocal EnableExtensions
if not defined AI_STUDIO_LAUNCH_MODE set "AI_STUDIO_LAUNCH_MODE=production"
cd /d "C:\Dev\AI-Studio"
if not exist "package.json" (
  if /I "%AI_STUDIO_LAUNCH_MODE%"=="production" (
    mshta "javascript:alert('AI Studio not found at C:\\Dev\\AI-Studio');close()"
  ) else (
    echo Error: AI Studio not found at C:\Dev\AI-Studio
    pause
  )
  exit /b 1
)
if not exist "node_modules\" (
  if /I "%AI_STUDIO_LAUNCH_MODE%"=="production" (
    powershell -NoProfile -WindowStyle Hidden -Command "Set-Location 'C:\Dev\AI-Studio'; & npm.cmd install"
  ) else (
    echo Installing dependencies...
    call npm.cmd install
  )
  if errorlevel 1 exit /b 1
)
if /I "%AI_STUDIO_LAUNCH_MODE%"=="production" (
  powershell -NoProfile -WindowStyle Hidden -Command ^
    "$env:AI_STUDIO_LAUNCH_MODE='production';" ^
    "Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Dev\AI-Studio' -WindowStyle Hidden"
) else (
  call npm.cmd run dev
)
endlocal
exit /b 0
