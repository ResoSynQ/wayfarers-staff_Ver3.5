@echo off
setlocal
cd /d "%~dp0"
title Wayfarer Elastic Map

echo ========================================
echo   Wayfarer Elastic Map - Local Launcher
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Install Node.js 22.13.0 or later from:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

set "INSTALL_COMMAND=pnpm install"
set "DEV_COMMAND=pnpm dev"
set "PACKAGE_RUNNER=pnpm"
where pnpm >nul 2>nul
if errorlevel 1 (
  where corepack >nul 2>nul
  if not errorlevel 1 (
    set "INSTALL_COMMAND=corepack pnpm install"
    set "DEV_COMMAND=corepack pnpm dev"
    set "PACKAGE_RUNNER=Corepack"
  ) else (
    where npx >nul 2>nul
    if not errorlevel 1 (
      set "INSTALL_COMMAND=npx --yes pnpm@11.19.0 install"
      set "DEV_COMMAND=npx --yes pnpm@11.19.0 dev"
      set "PACKAGE_RUNNER=npx"
    ) else (
      where npm >nul 2>nul
      if not errorlevel 1 (
        set "INSTALL_COMMAND=npm install"
        set "DEV_COMMAND=npm run dev"
        set "PACKAGE_RUNNER=npm"
      ) else (
        echo [ERROR] A package installer was not found.
        echo Reinstall Node.js 22.13.0 or later from:
        echo https://nodejs.org/
        echo.
        pause
        exit /b 1
      )
    )
  )
)

if /i "%~1"=="--check" (
  echo Launcher check passed. Runner: %PACKAGE_RUNNER%
  exit /b 0
)

if not exist "node_modules\" (
  echo [1/2] Installing required packages. This may take a few minutes...
  call %INSTALL_COMMAND%
  if errorlevel 1 (
    echo.
    echo [ERROR] Package installation failed.
    echo Check the internet connection, then run this file again.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Required packages are already installed.
)

echo [2/2] Starting the app at http://localhost:3000/
echo Keep this window open while using the app.
echo Close this window or press Ctrl+C to stop the app.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000/'"
call %DEV_COMMAND%

echo.
echo The app has stopped.
pause
