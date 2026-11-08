@echo off
echo ==========================================
echo EntyCollab2 Setup Script
echo ==========================================

echo === Step 1: Killing existing Node processes ===
taskkill /f /im node.exe 2>nul
echo Done killing node processes.

echo === Step 2: Starting Vite development server ===
cd C:\Users\Luis Javier\Documents\GitHub\entycollab2\frontend
npx vite --host localhost --port 5175

echo === Setup complete! ===
echo Frontend running at: http://localhost:5175
echo ==========================================