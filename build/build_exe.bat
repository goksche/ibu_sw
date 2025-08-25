@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==============================================================
REM  IBU Turniere – Build-Skript (v0.9.6)
REM  Erzeugt eine portable OneFile-EXE mit PyInstaller.
REM ==============================================================

set "APP_NAME=IBU Turniere"
set "APP_VERSION=0.9.6"
set "ENTRY=main.py"

REM Verzeichnisse relativ zu diesem Skript
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\"
set "DIST_DIR=%REPO_ROOT%dist"
set "WORK_DIR=%REPO_ROOT%build\pyinstaller"
set "ICON_PATH=%REPO_ROOT%assets\ibu.ico"

if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"

REM Optionales Icon-Flag
set "ICON_FLAG="
if exist "%ICON_PATH%" set ICON_FLAG=--icon "%ICON_PATH%"

pushd "%REPO_ROOT%"

echo [1/3] Aufräumen…
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"

REM Hinweis: --collect-all PyQt6 sammelt Plugins/Qt-Ressourcen zuverlässig ein
REM         --hidden-import PyQt6.sip fix für manche Umgebungen

echo [2/3] Baue EXE mit PyInstaller…
py -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --onefile ^
  --windowed ^
  --name "%APP_NAME%" ^
  %ICON_FLAG% ^
  --optimize 1 ^
  --collect-all PyQt6 ^
  --hidden-import PyQt6.sip ^
  --distpath "%DIST_DIR%" ^
  --workpath "%WORK_DIR%" ^
  "%ENTRY%"

if errorlevel 1 (
  echo *** FEHLER: PyInstaller Build fehlgeschlagen. ***
  popd
  pause
  exit /b 1
)

echo [3/3] Fertig. Oeffne Explorer…
set "EXE=%DIST_DIR%\%APP_NAME%.exe"
if exist "%EXE%" (
  explorer /select,"%EXE%"
  echo Gebaut: %EXE%
) else (
  echo WARNUNG: EXE nicht gefunden in %DIST_DIR%.
)

popd
pause
