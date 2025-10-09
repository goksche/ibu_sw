# main.py
# v0.9.4 – User-Daten in benutzerschreibbaren Ordner (AppData) statt Program Files.
from __future__ import annotations

import os
import sys
import ctypes
from typing import Optional


def _app_root() -> str:
    """Installations-/App-Ordner.
    - normal (Quellcode): Ordner dieser Datei
    - PyInstaller onefile/collect: Ordner der .exe
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "executable"):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


def _is_dir_writable(path: str) -> bool:
    try:
        test = os.path.join(path, ".ibu_write_test")
        with open(test, "w", encoding="utf-8") as f:
            f.write("ok")
        os.remove(test)
        return True
    except Exception:
        return False


def _user_data_root(app_name: str = "IBU") -> str:
    """Benutzerschreibbarer Basisordner je OS."""
    # Vorrang: Umgebungsvariable erlaubt Override
    env = os.environ.get("IBU_DATA_ROOT")
    if env:
        return os.path.abspath(env)

    if sys.platform.startswith("win"):
        base = os.environ.get("APPDATA") or os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
        return os.path.join(base, app_name)
    elif sys.platform == "darwin":
        # ~/Library/Application Support/IBU
        return os.path.join(os.path.expanduser("~/Library/Application Support"), app_name)
    else:
        # ~/.local/share/IBU
        return os.path.join(os.path.expanduser("~/.local/share"), app_name)


def _choose_data_root(app_root: str) -> str:
    """Wähle Datenablage:
    - 'portable.flag' neben der EXE  -> APP-ROOT verwenden
    - wenn APP-ROOT beschreibbar     -> APP-ROOT
    - sonst                          -> benutzerspezifischer Datenordner
    """
    portable_flag = os.path.join(app_root, "portable.flag")
    if os.path.isfile(portable_flag) or _is_dir_writable(app_root):
        return app_root
    return _user_data_root("IBU")


# --- Pfade initialisieren, bevor andere Module importiert werden -------------
APP_ROOT = _app_root()
DATA_ROOT = _choose_data_root(APP_ROOT)

# Arbeitsverzeichnis nur als „Startordner“ setzen (App-Root),
# Datenpfad aber separat übergeben:
os.chdir(APP_ROOT)

# Für andere Module verfügbar machen
os.environ["IBU_APP_ROOT"] = APP_ROOT
os.environ["IBU_DATA_ROOT"] = DATA_ROOT

# Schreibverzeichnisse sicherstellen (im DATA_ROOT!)
for sub in ("data", "exports", "backups"):
    try:
        os.makedirs(os.path.join(DATA_ROOT, sub), exist_ok=True)
    except Exception:
        pass

# --- Jetzt erst PyQt & unsere Views importieren ------------------------------
from PyQt6.QtWidgets import QApplication
from views.main_window import MainWindow


def main() -> None:
    # (optional) High DPI Awareness für schärfere Fonts unter Windows
    if sys.platform.startswith("win"):
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass

    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    app.setApplicationName("IBU – Dart Turnier Tool")
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
