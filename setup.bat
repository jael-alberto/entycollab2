@echo off
title Entycollab - Instalador de dependencias

echo ============================================================
echo           ENTYCOLLAB - INSTALADOR DE DEPENDENCIAS
echo ============================================================
echo.

REM 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado en este equipo.
    echo Por favor descargalo e instalalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 2. Verificar si npm esta instalado
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm no esta disponible. Asegurate de tener Node.js instalado con npm.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js y npm detectados correctamente.
echo.

REM 3. Instalar dependencias en la raiz
echo [1/3] Instalando dependencias en la raiz del proyecto...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Ocurrio un error al instalar las dependencias de la raiz.
    pause
    exit /b %ERRORLEVEL%
)
echo.

REM 4. Instalar dependencias del Frontend
echo [2/3] Instalando dependencias del Frontend...
call npm --prefix frontend install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Ocurrio un error al instalar las dependencias del frontend.
    pause
    exit /b %ERRORLEVEL%
)
echo.

REM 5. Instalar dependencias del Backend
echo [3/3] Instalando dependencias del Backend...
call npm --prefix backend install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Ocurrio un error al instalar las dependencias del backend.
    pause
    exit /b %ERRORLEVEL%
)
echo.

REM 6. Configurar archivos .env si no existen
if not exist frontend\.env (
    if exist frontend\.env.example (
        copy frontend\.env.example frontend\.env >nul
        echo [INFO] Se ha creado frontend\.env a partir de la plantilla.
    )
)

if not exist backend\.env (
    if exist backend\.env.example (
        copy backend\.env.example backend\.env >nul
        echo [INFO] Se ha creado backend\.env a partir de la plantilla.
    )
)

echo.
echo ============================================================
echo      TODAS LAS DEPENDENCIAS SE INSTALARON CON EXITO
echo ============================================================
echo.
echo Para iniciar la aplicacion en desarrollo, puedes ejecutar:
echo.
echo    npm run dev           (Inicia Backend y Frontend a la vez)
echo    npm run dev:frontend  (Inicia solo el Frontend)
echo.
pause
