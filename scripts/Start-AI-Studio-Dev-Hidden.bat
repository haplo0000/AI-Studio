@echo off
setlocal EnableExtensions
if not defined AI_STUDIO_LAUNCH_MODE set "AI_STUDIO_LAUNCH_MODE=production"
set "REPO_ROOT=%~dp0.."
set "LAUNCHER_LOG=%LOCALAPPDATA%\AIStudio\launcher.log"
if not exist "%LOCALAPPDATA%\AIStudio" mkdir "%LOCALAPPDATA%\AIStudio" >nul 2>&1

REM GUI/VBS launches often inherit a minimal PATH — ensure Node.js is available.
if exist "C:\Program Files\nodejs\npm.cmd" (
  set "PATH=C:\Program Files\nodejs;%PATH%"
)

cd /d "%REPO_ROOT%"
if not exist "package.json" (
  echo [%date% %time%] ERROR: AI Studio not found at %REPO_ROOT%>> "%LAUNCHER_LOG%"
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [%date% %time%] ERROR: npm.cmd was not found in PATH.>> "%LAUNCHER_LOG%"
  exit /b 1
)

if not exist "dist\index.html" (
  echo [%date% %time%] Building production bundle...>> "%LAUNCHER_LOG%"
  call npm.cmd run build >> "%LAUNCHER_LOG%" 2>&1
  if errorlevel 1 (
    echo [%date% %time%] ERROR: build failed>> "%LAUNCHER_LOG%"
    exit /b 1
  )
)

title AI Studio
echo [%date% %time%] Starting AI Studio Electron (production, mode=%AI_STUDIO_LAUNCH_MODE%)>> "%LAUNCHER_LOG%"
call npm.cmd start >> "%LAUNCHER_LOG%" 2>&1
echo [%date% %time%] AI Studio exited %ERRORLEVEL%>> "%LAUNCHER_LOG%"
exit /b %ERRORLEVEL%
