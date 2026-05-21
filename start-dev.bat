@echo off
title StayWithMyPet - Dev Server
cd /d "%~dp0"

echo Starting StayWithMyPet development server...
echo.

call npm run dev

if errorlevel 1 (
  echo.
  echo Dev server exited with an error. See messages above.
  pause
)
