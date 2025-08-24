# views/settings_view.py
# v0.9.2 – Tab „Einstellungen“: Backups + Export-Ordner

from __future__ import annotations
import os
import sys
from typing import Optional

from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QDesktopServices
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QGroupBox, QGridLayout, QLabel, QPushButton,
    QFileDialog, QHBoxLayout
)

from utils.backup import create_backup, list_backups, restore_backup, BACKUP_DIR
from utils.settings import get_export_dir, set_export_dir, reset_export_dir_to_default
from utils.ui import show_info, show_error, ask_yes_no

class SettingsView(QWidget):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setObjectName("SettingsView")
        self._build_ui()
        self._refresh()

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(8, 8, 8, 8)
        root.setSpacing(10)

        # --- Backups -----------------------------------------------------
        gb_bu = QGroupBox("Backups der Datenbank")
        grid_bu = QGridLayout(gb_bu)

        self.lbl_last = QLabel("-")
        self.lbl_last.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)

        self.btn_bu_create = QPushButton("Backup erstellen")
        self.btn_bu_restore = QPushButton("Backup wiederherstellen …")
        self.btn_bu_open = QPushButton("Backup-Ordner öffnen")

        grid_bu.addWidget(QLabel("Letztes Backup:"), 0, 0)
        grid_bu.addWidget(self.lbl_last, 0, 1, 1, 3)
        grid_bu.addWidget(self.btn_bu_create, 1, 1)
        grid_bu.addWidget(self.btn_bu_restore, 1, 2)
        grid_bu.addWidget(self.btn_bu_open, 1, 3)

        self.btn_bu_create.clicked.connect(self._on_backup_create)
        self.btn_bu_restore.clicked.connect(self._on_backup_restore)
        self.btn_bu_open.clicked.connect(self._on_open_backup_dir)

        # --- Export-Verzeichnis ------------------------------------------
        gb_ex = QGroupBox("Export-Einstellungen")
        grid_ex = QGridLayout(gb_ex)

        self.lbl_export_dir = QLabel("-")
        self.lbl_export_dir.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        self.btn_change_export = QPushButton("Export-Ordner ändern …")
        self.btn_reset_export = QPushButton("Zurücksetzen")

        grid_ex.addWidget(QLabel("Export-Ordner:"), 0, 0)
        grid_ex.addWidget(self.lbl_export_dir, 0, 1, 1, 2)
        grid_ex.addWidget(self.btn_change_export, 1, 1)
        grid_ex.addWidget(self.btn_reset_export, 1, 2)

        self.btn_change_export.clicked.connect(self._on_change_export)
        self.btn_reset_export.clicked.connect(self._on_reset_export)

        # --- Zusammenbau --------------------------------------------------
        root.addWidget(gb_bu)
        root.addWidget(gb_ex)
        root.addStretch(1)

    def _refresh(self) -> None:
        # Backups
        items = list_backups()
        if items:
            p, mtime = items[0]
            from datetime import datetime
            self.lbl_last.setText(f"{os.path.basename(p)} – {datetime.fromtimestamp(mtime).strftime('%d.%m.%Y %H:%M')}")
        else:
            self.lbl_last.setText("— noch kein Backup vorhanden —")
        # Export-Ordner
        self.lbl_export_dir.setText(get_export_dir())

    # --- Slots ------------------------------------------------------------

    def _on_backup_create(self) -> None:
        try:
            path = create_backup()
            show_info(self, "Backup", f"Backup erstellt:\n{path}")
            self._refresh()
        except Exception as e:
            show_error(self, "Fehler beim Backup", f"{type(e).__name__}: {e}")

    def _on_backup_restore(self) -> None:
        directory = BACKUP_DIR
        os.makedirs(directory, exist_ok=True)
        fname, _ = QFileDialog.getOpenFileName(self, "Backup auswählen", directory, "SQLite (*.sqlite)")
        if not fname:
            return
        if not ask_yes_no(self, "Wiederherstellen bestätigen",
                          "Das aktuelle Datenbankfile wird durch das gewählte Backup ersetzt.\n"
                          "Es wird zuvor eine Sicherheitskopie erstellt.\n\nFortfahren?"):
            return
        try:
            safety = restore_backup(fname)
            show_info(self, "Backup wiederhergestellt",
                      f"Die Datenbank wurde aus dem Backup wiederhergestellt.\n"
                      f"Sicherheitskopie: {safety}\n\n"
                      f"Es kann notwendig sein, die Anwendung neu zu starten.")
            self._refresh()
        except Exception as e:
            show_error(self, "Fehler beim Wiederherstellen", f"{type(e).__name__}: {e}")

    def _on_open_backup_dir(self) -> None:
        directory = BACKUP_DIR
        os.makedirs(directory, exist_ok=True)
        try:
            if sys.platform.startswith("win"):
                os.startfile(directory)  # type: ignore[attr-defined]
            else:
                QDesktopServices.openUrl(QUrl.fromLocalFile(directory))
        except Exception as e:
            show_error(self, "Fehler", f"{type(e).__name__}: {e}")

    def _on_change_export(self) -> None:
        current = get_export_dir()
        new_dir = QFileDialog.getExistingDirectory(self, "Export-Ordner wählen", current)
        if not new_dir:
            return
        try:
            set_export_dir(new_dir)
            self._refresh()
        except Exception as e:
            show_error(self, "Fehler", f"{type(e).__name__}: {e}")

    def _on_reset_export(self) -> None:
        try:
            reset_export_dir_to_default()
            self._refresh()
        except Exception as e:
            show_error(self, "Fehler", f"{type(e).__name__}: {e}")
