@echo off
echo ==========================================
echo EntyCollab2 Setup Script
echo ==========================================

echo === Step 1: Killing existing Node processes ===
taskkill /f /im node.exe 2>nul
timeout /t 1 /nobreak >nul
echo Done killing node processes.

echo === Step 2: Starting Backend server ===
start "EntyCollab Backend" cmd /k "cd /d C:\Users\Luis Javier\Documents\GitHub\entycollab2\backend && node --env-file=.env src/index.js"
timeout /t 2 /nobreak >nul

echo === Step 3: Starting Vite development server ===
cd /d "C:\Users\Luis Javier\Documents\GitHub\entycollab2\frontend"
npx vite --host localhost --port 5175

echo === Setup complete! ===
echo Frontend running at: http://localhost:5175
echo Backend running at:  http://localhost:3001
echo ==========================================
