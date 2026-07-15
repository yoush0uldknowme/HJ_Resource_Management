@echo off
cd /d "%~dp0\.."

set MODE=%1
if "%MODE%"=="" set MODE=dev

echo ==================================================
echo  HJ Resource Management - Server Log
if "%MODE%"=="prod" (
    echo  Mode: PRODUCTION
    set NODE_ENV=production
) else (
    echo  Mode: DEVELOPMENT
    set NODE_ENV=development
)
echo  Close this window to stop the server
echo ==================================================
echo.
echo Project: %CD%
echo Command: node server.mjs
echo.
node server.mjs
echo.
echo ==================================================
echo Server stopped. Press any key to close...
pause >nul
