@echo off
cd /d "%~dp0\.."
echo ==================================================
echo  HJ Resource Management - Server Log
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
