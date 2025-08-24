@echo off
REM v0.9.3 – Build-Skript für portable EXE (PyInstaller), robust für PyQt6
REM Öffnet nach dem Build den Explorer und markiert die EXE.
REM Aufruf: Doppelklick oder: build\build_exe.bat

setlocal
cd /d "%~dp0\.."

echo [1/5] Python venv prüfen/anlegen ...
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
)

echo [2/5] venv aktivieren und Abhängigkeiten installieren ...
call .venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install PyQt6 pyinstaller

echo [3/5] Verzeichnisse sicherstellen ...
if not exist data mkdir data
if not exist exports mkdir exports
if not exist backups mkdir backups

echo [4/5] PyInstaller-Build (onefile, sammelt PyQt6-Ressourcen) ...
pyinstaller ^
  --onefile ^
  --windowed ^
  --noconsole ^
  --noconfirm ^
  --clean ^
  --name "IBU Turniere" ^
  --collect-all PyQt6 ^
  --add-data "data;data" ^
  --add-data "exports;exports" ^
  --add-data "backups;backups" ^
  main.py

echo [5/5] Suche nach der erzeugten EXE ...
set "ROOT=%CD%"
set "DISTDIR=%ROOT%\dist"
set "TARGET="

REM 1) One-File (Standard)
if exist "%DISTDIR%\IBU Turniere.exe" (
  set "TARGET=%DISTDIR%\IBU Turniere.exe"
)

REM 2) One-Folder (falls PyInstaller nicht onefile gebaut hat)
if not defined TARGET if exist "%DISTDIR%\IBU Turniere\IBU Turniere.exe" (
  set "TARGET=%DISTDIR%\IBU Turniere\IBU Turniere.exe"
)

REM 3) Notfall: im gesamten Repo suchen
if not defined TARGET (
  for /r "%ROOT%" %%F in ("IBU Turniere.exe") do (
    set "TARGET=%%~fF"
    goto :found
  )
)

:found
if defined TARGET (
  echo [INFO] EXE gefunden:
  echo     %TARGET%
  echo.
  echo Explorer wird geöffnet ...
  start "" explorer.exe /select,"%TARGET%"
) else (
  echo [WARN] Keine EXE gefunden. Bitte Build-Output oben prüfen.
  echo Erwartete Pfade:
  echo   %DISTDIR%\IBU Turniere.exe
  echo   %DISTDIR%\IBU Turniere\IBU Turniere.exe
)

echo.
echo Fertig. Druecke eine Taste zum Schliessen.
pause
