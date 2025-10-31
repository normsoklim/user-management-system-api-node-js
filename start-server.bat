@echo off
echo Starting User Management API Server...

REM Check if port 3000 is in use
netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo Port 3000 is already in use. Starting server on port 3001...
    set PORT=3001
) else (
    echo Port 3000 is available. Starting server on port 3000...
    set PORT=3000
)

REM Start the server
npm run dev

pause