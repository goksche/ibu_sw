from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Optional

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QInputDialog, QLineEdit, QMessageBox, QHeaderView, QLabel
)

DELETE_PASSWORD = "6460"
DB_PATH = Path(__file__).resolve().parents[1] / "data" / "ibu.sqlite"


def _ensure_schema(con: sqlite3.Connection) -> None:
    cur = con.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS dartscheiben (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nummer INTEGER NOT NULL UNIQUE,
            name TEXT NOT NULL,
            aktiv INTEGER NOT NULL DEFAULT 1
        );
        """
    )
    con.commit()


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH.as_posix())
    con.row_factory = sqlite3.Row
    _ensure_schema(con)
    return con


class BoardsSettingsWidget(QWidget):
    """Dartscheiben-Verwaltung für den Einstellungen-Tab.

    Einbindung in `views/settings_view.py`:

        from .settings_boards import BoardsSettingsWidget
        ...
        self.boards = BoardsSettingsWidget(self)
        layout.addWidget(self.boards)
    """

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._build_ui()
        self._reload()

    def _build_ui(self):
        root = QVBoxLayout(self)
        title = QLabel("Dartscheiben")
        title.setStyleSheet("font-size:16px; font-weight:600; margin:4px 0 6px 0;")
        root.addWidget(title)

        self.tbl = QTableWidget(0, 3)
        self.tbl.setHorizontalHeaderLabels(["Nummer", "Name", "Aktiv"])
        self.tbl.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        root.addWidget(self.tbl)

        btns = QHBoxLayout()
        self.btn_add = QPushButton("Hinzufügen"); self.btn_add.clicked.connect(self._add)
        btns.addWidget(self.btn_add)
        self.btn_toggle = QPushButton("Aktiv/Passiv"); self.btn_toggle.clicked.connect(self._toggle)
        btns.addWidget(self.btn_toggle)
        self.btn_rename = QPushButton("Umbenennen"); self.btn_rename.clicked.connect(self._rename)
        btns.addWidget(self.btn_rename)
        self.btn_delete = QPushButton("Löschen"); self.btn_delete.clicked.connect(self._delete)
        btns.addWidget(self.btn_delete)
        btns.addStretch()
        root.addLayout(btns)

    def _reload(self):
        with _db() as con:
            rows = con.execute("SELECT * FROM dartscheiben ORDER BY aktiv DESC, nummer").fetchall()
        self.tbl.setRowCount(len(rows))
        for r, row in enumerate(rows):
            self.tbl.setItem(r, 0, QTableWidgetItem(str(row["nummer"])))
            self.tbl.setItem(r, 1, QTableWidgetItem(row["name"]))
            self.tbl.setItem(r, 2, QTableWidgetItem("Ja" if row["aktiv"] else "Nein"))
            for c in range(3):
                it = self.tbl.item(r, c)
                it.setFlags(it.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl.item(r, 0).setData(Qt.ItemDataRole.UserRole, int(row["id"]))

    def _add(self):
        num, ok = QInputDialog.getInt(self, "Nummer", "Dartscheibe Nummer:", 1, 1, 9999, 1)
        if not ok: return
        name, ok = QInputDialog.getText(self, "Name", "Bezeichnung:")
        if not ok: return
        with _db() as con:
            try:
                con.execute("INSERT INTO dartscheiben(nummer, name, aktiv) VALUES(?,?,1)", (num, name.strip() or f"Board {num}"))
                con.commit()
            except sqlite3.IntegrityError:
                QMessageBox.warning(self, "Fehler", "Nummer bereits vergeben.")
                return
        self._reload()

    def _toggle(self):
        r = self.tbl.currentRow()
        if r < 0: return
        bid = int(self.tbl.item(r, 0).data(Qt.ItemDataRole.UserRole))
        with _db() as con:
            cur = con.execute("SELECT aktiv FROM dartscheiben WHERE id=?", (bid,)).fetchone()
            newv = 0 if cur and cur[0] else 1
            con.execute("UPDATE dartscheiben SET aktiv=? WHERE id=?", (newv, bid))
            con.commit()
        self._reload()

    def _rename(self):
        r = self.tbl.currentRow()
        if r < 0: return
        bid = int(self.tbl.item(r, 0).data(Qt.ItemDataRole.UserRole))
        name, ok = QInputDialog.getText(self, "Umbenennen", "Neuer Name:")
        if not ok: return
        with _db() as con:
            con.execute("UPDATE dartscheiben SET name=? WHERE id=?", (name.strip(), bid))
            con.commit()
        self._reload()

    def _delete(self):
        r = self.tbl.currentRow()
        if r < 0: return
        bid = int(self.tbl.item(r, 0).data(Qt.ItemDataRole.UserRole))
        pw, ok = QInputDialog.getText(self, "Löschen", "Passwort:", QLineEdit.EchoMode.Password)
        if not ok: return
        if (pw or "").strip() != DELETE_PASSWORD:
            QMessageBox.warning(self, "Abbruch", "Falsches Passwort.")
            return
        with _db() as con:
            con.execute("DELETE FROM dartscheiben WHERE id=?", (bid,))
            con.commit()
        self._reload()
