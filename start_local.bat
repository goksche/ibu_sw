@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

echo [INFO] Projektroot: %ROOT%

if not exist "%BACKEND_DIR%\app\main.py" (
  echo [ERROR] Backend nicht gefunden: %BACKEND_DIR%
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend nicht gefunden: %FRONTEND_DIR%
  pause
  exit /b 1
)

echo [INFO] Starte Backend in neuem Fenster...
start "IBU Backend (Uvicorn :8000)" cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [INFO] Starte Frontend in neuem Fenster...
start "IBU Frontend (Vite :5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo [OK] Startbefehle wurden ausgefuehrt.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Hinweis: Falls etwas fehlt, bitte zuvor Dependencies installieren:
echo   Backend:  pip install -r backend\requirements.txt
echo   Frontend: npm install --prefix frontend
pause
