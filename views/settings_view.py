from __future__ import annotations
import shutil
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QHBoxLayout, QPushButton, QFileDialog,
    QLineEdit, QMessageBox, QGroupBox, QTabWidget
)

APP_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = APP_ROOT / "data"
DB_FILE = DATA_DIR / "ibu.sqlite"
EXPORTS_DIR_DEFAULT = APP_ROOT / "exports"
BACKUPS_DIR = APP_ROOT / "backups"
DELETE_PASSWORD = "6460"

# Optionale Utils (werden benutzt, wenn vorhanden)
try:
    from utils.settings import get_export_dir as _get_export_dir, set_export_dir as _set_export_dir, reset_export_dir as _reset_export_dir
except Exception:
    _get_export_dir = _set_export_dir = _reset_export_dir = None

try:
    from utils.backup import create_backup as _create_backup, restore_backup as _restore_backup
except Exception:
    _create_backup = _restore_backup = None

# ---------------------------------------------
# Boards-Widget: dynamischer Import mit Fallback
# ---------------------------------------------
from PyQt6.QtWidgets import QWidget as _QW

def _make_boards_widget(parent: _QW) -> _QW:
    """Versucht, BoardsSettingsWidget aus settings_boards zu laden.
    Fällt auf ein Hinweis-Widget zurück, wenn das Modul fehlt.
    """
    try:
        import importlib
        pkg = __package__  # 'views'
        mod = importlib.import_module(f"{pkg}.settings_boards") if pkg else importlib.import_module("views.settings_boards")
        cls = getattr(mod, "BoardsSettingsWidget")
        return cls(parent)
    except Exception as e:
        box = QGroupBox("Dartscheiben")
        v = QVBoxLayout(box)
        lab = QLabel(
            "Dartscheiben-Verwaltung nicht geladen.\n"
            "Bitte Datei 'views/settings_boards.py' hinzufügen.\n\n"
            f"Fehler: {e}"
        )
        lab.setStyleSheet("color:#a00;")
        v.addWidget(lab)
        return box


def _ensure_dirs():
    EXPORTS_DIR_DEFAULT.mkdir(parents=True, exist_ok=True)
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_FILE.exists():
        con = sqlite3.connect(DB_FILE.as_posix()); con.close()


class SettingsView(QWidget):
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        _ensure_dirs()
        self._build_ui()
        self._load()

    # --------------------------------------------------------------
    # UI
    # --------------------------------------------------------------
    def _build_ui(self):
        root = QVBoxLayout(self)

        title = QLabel("Einstellungen (v0.9.4)")
        title.setStyleSheet("font-size:18px; font-weight:600; margin-bottom:6px;")
        root.addWidget(title)

        self.tabs = QTabWidget()
        root.addWidget(self.tabs, 1)

        # Tab 1: Allgemein (Exportordner + Backup)
        self.tab_general = QWidget(); v1 = QVBoxLayout(self.tab_general)
        self.tabs.addTab(self.tab_general, "Allgemein")

        # Export-Ordner
        g_export = QGroupBox("Export-Ordner")
        v1.addWidget(g_export)
        ge = QVBoxLayout(g_export)
        row = QHBoxLayout(); ge.addLayout(row)
        row.addWidget(QLabel("Pfad:"))
        self.ed_export = QLineEdit(); self.ed_export.setReadOnly(True)
        row.addWidget(self.ed_export, 1)
        self.btn_pick_export = QPushButton("Ordner wählen")
        self.btn_pick_export.clicked.connect(self._pick_export_dir)
        row.addWidget(self.btn_pick_export)
        self.btn_reset_export = QPushButton("Zurücksetzen")
        self.btn_reset_export.clicked.connect(self._reset_export_dir)
        row.addWidget(self.btn_reset_export)

        # Backup
        g_backup = QGroupBox("Backup & Restore")
        v1.addWidget(g_backup)
        gb = QHBoxLayout(g_backup)
        self.btn_backup = QPushButton("Backup erstellen")
        self.btn_backup.clicked.connect(self._do_backup)
        gb.addWidget(self.btn_backup)
        self.btn_restore = QPushButton("Backup wiederherstellen")
        self.btn_restore.clicked.connect(self._do_restore)
        gb.addWidget(self.btn_restore)
        gb.addStretch(1)

        v1.addStretch(1)

        # Tab 2: Dartscheiben – über dyn. Import
        self.tab_boards = QWidget(); v2 = QVBoxLayout(self.tab_boards)
        self.tabs.addTab(self.tab_boards, "Dartscheiben")
        v2.addWidget(_make_boards_widget(self.tab_boards))

    # --------------------------------------------------------------
    # Load
    # --------------------------------------------------------------
    def _load(self):
        self.ed_export.setText(self._get_export_dir().as_posix())

    # --------------------------------------------------------------
    # Export-Ordner
    # --------------------------------------------------------------
    def _get_export_dir(self) -> Path:
        if _get_export_dir:
            try:
                p = Path(_get_export_dir())
                if p: return p
            except Exception:
                pass
        return EXPORTS_DIR_DEFAULT

    def _set_export_dir(self, p: Path) -> None:
        if _set_export_dir:
            try:
                _set_export_dir(p.as_posix()); return
            except Exception:
                pass
        # Fallback: nichts persistieren, nur UI

    def _reset_export_dir(self):
        if _reset_export_dir:
            try:
                _reset_export_dir()
            except Exception:
                pass
        self.ed_export.setText(EXPORTS_DIR_DEFAULT.as_posix())

    def _pick_export_dir(self):
        p = QFileDialog.getExistingDirectory(self, "Export-Ordner wählen", self._get_export_dir().as_posix())
        if not p:
            return
        pth = Path(p)
        pth.mkdir(parents=True, exist_ok=True)
        self._set_export_dir(pth)
        self.ed_export.setText(pth.as_posix())

    # --------------------------------------------------------------
    # Backup
    # --------------------------------------------------------------
    def _do_backup(self):
        BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
        if _create_backup:
            try:
                _create_backup()
                QMessageBox.information(self, "Backup", "Backup wurde erstellt.")
                return
            except Exception as e:
                QMessageBox.warning(self, "Backup", f"Interner Backup-Helper fehlgeschlagen: {e}. Fallback wird genutzt.")
        # Fallback: DB-Datei kopieren
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dst = BACKUPS_DIR / f"ibu_backup_{ts}.sqlite"
        try:
            shutil.copy2(DB_FILE, dst)
            QMessageBox.information(self, "Backup", f"Backup gespeichert: {dst.name}")
        except Exception as e:
            QMessageBox.critical(self, "Backup", f"Fehlgeschlagen: {e}")

    def _do_restore(self):
        if _restore_backup:
            try:
                _restore_backup()
                QMessageBox.information(self, "Restore", "Backup wurde wiederhergestellt.")
                return
            except Exception as e:
                QMessageBox.warning(self, "Restore", f"Interner Restore-Helper fehlgeschlagen: {e}. Fallback wird genutzt.")
        # Fallback: Datei auswählen und über DB kopieren
        fn, _ = QFileDialog.getOpenFileName(self, "Backup wählen", BACKUPS_DIR.as_posix(), "DB/Backup (*.sqlite *.db *.*)")
        if not fn:
            return
        src = Path(fn)
        try:
            shutil.copy2(src, DB_FILE)
            QMessageBox.information(self, "Restore", f"Datenbank aus {src.name} wiederhergestellt.")
        except Exception as e:
            QMessageBox.critical(self, "Restore", f"Fehlgeschlagen: {e}")
