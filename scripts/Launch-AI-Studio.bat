@echo off
title AI Studio
cd /d "C:\Dev\AI-Studio"
if not exist "node_modules\" (
  echo Running npm install...
  call npm install
)
if not exist "dist\index.html" (
  echo Building AI Studio...
  call npm run build
)
set NODE_ENV=production
start "AI Studio" /MIN cmd /c "npm start"
exit /b 0
