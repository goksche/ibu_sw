@echo off
setlocal ENABLEDELAYEDEXPANSION

cd /d "%~dp0"

set "PY_EXE="
if exist ".venv\Scripts\python.exe" set "PY_EXE=.venv\Scripts\python.exe"
if not defined PY_EXE where py >nul 2>nul && set "PY_EXE=py -3"
if not defined PY_EXE where python >nul 2>nul && set "PY_EXE=python"

if not defined PY_EXE (
  echo [FEHLER] Python nicht gefunden. Bitte Python installieren oder .venv anlegen.
  pause
  exit /b 1
)

echo [INFO] Builde Kontrollseite...
call %PY_EXE% "scripts\start_control_center.py"
if errorlevel 1 (
  echo [FEHLER] Start fehlgeschlagen.
  echo [HINWEIS] Manuell pruefen: %PY_EXE% scripts\control_query_server.py
  pause
  exit /b 1
)
exit /b 0
