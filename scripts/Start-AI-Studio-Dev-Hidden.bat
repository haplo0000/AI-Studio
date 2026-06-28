@echo off
setlocal EnableExtensions
if not defined AI_STUDIO_LAUNCH_MODE set "AI_STUDIO_LAUNCH_MODE=production"
set "REPO_ROOT=%~dp0.."
set "LAUNCHER_LOG=%LOCALAPPDATA%\AIStudio\launcher.log"
if not exist "%LOCALAPPDATA%\AIStudio" mkdir "%LOCALAPPDATA%\AIStudio" >nul 2>&1
cd /d "%REPO_ROOT%"
if not exist "package.json" (
  echo AI Studio not found at %REPO_ROOT%>> "%LAUNCHER_LOG%"
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm.cmd was not found in PATH.>> "%LAUNCHER_LOG%"
  exit /b 1
)
title AI Studio
echo [%date% %time%] Starting AI Studio (mode=%AI_STUDIO_LAUNCH_MODE%)>> "%LAUNCHER_LOG%"
npm.cmd run dev >> "%LAUNCHER_LOG%" 2>&1
echo [%date% %time%] AI Studio dev process exited %ERRORLEVEL%>> "%LAUNCHER_LOG%"
exit /b %ERRORLEVEL%
