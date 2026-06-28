@echo off
setlocal EnableExtensions
if "%COUNCIL_OS_DIR%"=="" (
  echo COUNCIL_OS_DIR is not set. 1>&2
  exit /b 1
)
if not exist "%COUNCIL_OS_DIR%\package.json" (
  echo Council OS not found at %COUNCIL_OS_DIR%. 1>&2
  exit /b 1
)
if "%COUNCIL_VITE_LOG%"=="" set "COUNCIL_VITE_LOG=%LOCALAPPDATA%\CouncilOS\vite.log"
for %%I in ("%COUNCIL_VITE_LOG%") do if not exist "%%~dpI" mkdir "%%~dpI" >nul 2>&1
if exist "C:\Program Files\nodejs\npm.cmd" set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%COUNCIL_OS_DIR%"
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm.cmd was not found in PATH. 1>&2
  exit /b 1
)
title Council OS Dev Server
npm.cmd run dev >> "%COUNCIL_VITE_LOG%" 2>&1
exit /b %ERRORLEVEL%
