from __future__ import annotations
from typing import Optional

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QLineEdit, QHBoxLayout, QPushButton,
    QTableWidget, QTableWidgetItem, QMessageBox, QAbstractItemView, QInputDialog
)

# Vorhandene Model-Funktionen weiterverwenden
from database.models import (
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer
)
# NEU: Helper für Scolia-ID (eigenes kleines Modul, keine Inkompatibilität mit bestehendem Code)
from database.scolia_support import ensure_scolia_schema, fetch_teilnehmer_full, set_scolia_id

DELETE_PASSWORD = "6460"


class TeilnehmerView(QWidget):
    def __init__(self):
        super().__init__()
        self._current_id: Optional[int] = None

        root = QVBoxLayout(self)

        title = QLabel("Teilnehmer – Verwaltung (v0.9.6)")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # Eingabezeile
        form = QHBoxLayout()
        form.addWidget(QLabel("Name:"))
        self.ed_name = QLineEdit(); self.ed_name.setPlaceholderText("Voller Name")
        form.addWidget(self.ed_name, 2)

        form.addWidget(QLabel("Spitzname:"))
        self.ed_spitz = QLineEdit(); self.ed_spitz.setPlaceholderText("optional")
        form.addWidget(self.ed_spitz, 2)

        form.addWidget(QLabel("Scolia-ID:"))
        self.ed_scolia = QLineEdit(); self.ed_scolia.setPlaceholderText("optional, z. B. 12345")
        form.addWidget(self.ed_scolia, 2)

        self.btn_add = QPushButton("Hinzufügen"); self.btn_add.clicked.connect(self._on_add)
        form.addWidget(self.btn_add)

        self.btn_update = QPushButton("Ändern"); self.btn_update.clicked.connect(self._on_update)
        form.addWidget(self.btn_update)

        self.btn_reload = QPushButton("Neu laden"); self.btn_reload.clicked.connect(self._reload)
        form.addWidget(self.btn_reload)

        root.addLayout(form)

        # Tabelle
        self.tbl = QTableWidget(0, 3)
        self.tbl.setHorizontalHeaderLabels(["Name", "Spitzname", "Scolia-ID"])
        self.tbl.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.tbl.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.tbl.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.tbl.itemSelectionChanged.connect(self._on_select)
        root.addWidget(self.tbl)

        # Löschen-Button
        row = QHBoxLayout(); root.addLayout(row)
        row.addStretch(1)
        self.btn_delete = QPushButton("Teilnehmer löschen…"); self.btn_delete.clicked.connect(self._on_delete)
        row.addWidget(self.btn_delete)

        ensure_scolia_schema()  # stellt sicher, dass Spalte existiert
        self._reload()

    # ----------------------------------------------
    # Laden/Refresh
    # ----------------------------------------------
    def _reload(self):
        self.tbl.setRowCount(0)
        for (tid, name, spitz, scolia) in fetch_teilnehmer_full():
            r = self.tbl.rowCount(); self.tbl.insertRow(r)
            it_name = QTableWidgetItem(name)
            it_spitz = QTableWidgetItem(spitz)
            it_scolia = QTableWidgetItem(scolia)
            # ID im UserRole der ersten Zelle halten
            it_name.setData(Qt.ItemDataRole.UserRole, int(tid))
            for c, it in enumerate([it_name, it_spitz, it_scolia]):
                it.setFlags(it.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.tbl.setItem(r, c, it)
        self._current_id = None

    def _on_select(self):
        items = self.tbl.selectedItems()
        if not items:
            self._current_id = None
            return
        row = items[0].row()
        self._current_id = int(self.tbl.item(row, 0).data(Qt.ItemDataRole.UserRole))
        self.ed_name.setText(self.tbl.item(row, 0).text())
        self.ed_spitz.setText(self.tbl.item(row, 1).text())
        self.ed_scolia.setText(self.tbl.item(row, 2).text())

    # ----------------------------------------------
    # CRUD
    # ----------------------------------------------
    def _on_add(self):
        name = (self.ed_name.text() or "").strip()
        spitz = (self.ed_spitz.text() or "").strip()
        scolia = (self.ed_scolia.text() or "").strip()
        if name == "":
            QMessageBox.warning(self, "Eingabe fehlt", "Bitte einen Namen eingeben.")
            return
        try:
            new_id = insert_teilnehmer(name, spitz)
            if scolia:
                set_scolia_id(new_id, scolia)
        except Exception as e:
            QMessageBox.critical(self, "Fehler", f"Anlegen fehlgeschlagen: {e}")
            return
        self._reload()
        self.ed_name.clear(); self.ed_spitz.clear(); self.ed_scolia.clear()

    def _on_update(self):
        if not self._current_id:
            QMessageBox.information(self, "Auswahl fehlt", "Bitte zuerst einen Teilnehmer in der Tabelle wählen.")
            return
        name = (self.ed_name.text() or "").strip()
        spitz = (self.ed_spitz.text() or "").strip()
        scolia = (self.ed_scolia.text() or "").strip()
        if name == "":
            QMessageBox.warning(self, "Eingabe fehlt", "Bitte einen Namen eingeben.")
            return
        try:
            update_teilnehmer(self._current_id, name, spitz)
            set_scolia_id(self._current_id, scolia)
        except Exception as e:
            QMessageBox.critical(self, "Fehler", f"Änderung fehlgeschlagen: {e}")
            return
        self._reload()

    def _on_delete(self):
        if not self._current_id:
            QMessageBox.information(self, "Auswahl fehlt", "Bitte zuerst einen Teilnehmer wählen.")
            return
        pw, ok = QInputDialog.getText(
            self,
            "Passwort erforderlich",
            "Bitte Lösch-Passwort eingeben:",
            QLineEdit.EchoMode.Password
        )
        if not ok:
            return
        if (pw or "").strip() != DELETE_PASSWORD:
            QMessageBox.critical(self, "Fehler", "Falsches Passwort. Löschen abgebrochen.")
            return
        if QMessageBox.question(
            self, "Löschen bestätigen",
            "Ausgewählten Teilnehmer wirklich löschen?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        ) != QMessageBox.StandardButton.Yes:
            return
        try:
            delete_teilnehmer(self._current_id)
        except Exception as e:
            QMessageBox.critical(self, "Fehler", f"Löschen fehlgeschlagen: {e}")
            return
        self._reload()
