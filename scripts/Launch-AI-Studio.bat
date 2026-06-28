@echo off
setlocal EnableExtensions
if not defined AI_STUDIO_LAUNCH_MODE set "AI_STUDIO_LAUNCH_MODE=production"
cd /d "%~dp0.."
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
    powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Set-Location 'C:\Dev\AI-Studio'; & npm.cmd install"
  ) else (
    echo Installing dependencies...
    call npm.cmd install
  )
  if errorlevel 1 exit /b 1
)
if /I "%AI_STUDIO_LAUNCH_MODE%"=="production" (
  if /I "%~1"=="--embedded" (
    call "%~dp0Start-AI-Studio-Dev-Hidden.bat"
    exit /b %ERRORLEVEL%
  )
  start "AI Studio" /MIN cmd.exe /c ""%~dp0Start-AI-Studio-Dev-Hidden.bat""
  exit /b 0
)
call npm.cmd run dev
endlocal
exit /b 0
