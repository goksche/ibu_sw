# main.py
# v0.9.3 – Start-Bootstrap: Pfade & Ordner robust setzen (auch im PyInstaller-"frozen"-Modus)

from __future__ import annotations

import os
import sys

def _app_root() -> str:
    """
    Ermittelt den Installations-/App-Ordner.
    - normal (Quellcode): Ordner dieser Datei
    - PyInstaller onefile: Ordner der .exe
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "executable"):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

# --- Pfade initialisieren, bevor andere Module importiert werden -------------
APP_ROOT = _app_root()
os.chdir(APP_ROOT)  # aktuelle Arbeitsumgebung = Installationsordner
os.environ["IBU_APP_ROOT"] = APP_ROOT  # von utils.* verwendbar

# Schreibverzeichnisse sicherstellen
for sub in ("data", "exports", "backups"):
    try:
        os.makedirs(os.path.join(APP_ROOT, sub), exist_ok=True)
    except Exception:
        pass

# --- Jetzt erst PyQt & unsere Views importieren ------------------------------
from PyQt6.QtWidgets import QApplication
from views.main_window import MainWindow

def main() -> None:
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
