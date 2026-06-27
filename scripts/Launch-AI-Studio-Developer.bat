@echo off
title AI Studio (Developer)
setlocal EnableExtensions
set "AI_STUDIO_LAUNCH_MODE=developer"
cd /d "C:\Dev\AI-Studio"
if not exist "package.json" (
  echo Error: AI Studio not found at C:\Dev\AI-Studio
  pause
  exit /b 1
)
if not exist "node_modules\" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Starting AI Studio (Developer — consoles visible)...
call npm.cmd run dev
if errorlevel 1 (
  echo.
  echo AI Studio exited with an error.
  pause
)
endlocal
