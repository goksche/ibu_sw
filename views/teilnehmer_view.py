from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QLineEdit, QHBoxLayout, QPushButton,
    QTableWidget, QTableWidgetItem, QMessageBox, QAbstractItemView, QInputDialog
)
from PyQt6.QtCore import Qt
from database.models import (
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer
)


class TeilnehmerView(QWidget):
    def __init__(self):
        super().__init__()
        self._current_id = None

        root = QVBoxLayout(self)

        title = QLabel("Teilnehmer erfassen / bearbeiten")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        root.addWidget(QLabel("Name:"))
        self.name_input = QLineEdit()
        root.addWidget(self.name_input)

        root.addWidget(QLabel("Spitzname (optional):"))
        self.nick_input = QLineEdit()
        root.addWidget(self.nick_input)

        row_btns = QHBoxLayout()
        self.new_btn = QPushButton("Neu")
        self.new_btn.clicked.connect(self._clear_form)
        row_btns.addWidget(self.new_btn)

        self.save_btn = QPushButton("Speichern (neu)")
        self.save_btn.clicked.connect(self._save)
        row_btns.addWidget(self.save_btn)

        self.update_btn = QPushButton("Aktualisieren")
        self.update_btn.clicked.connect(self._update)
        row_btns.addWidget(self.update_btn)

        self.delete_btn = QPushButton("Löschen")
        self.delete_btn.clicked.connect(self._delete)
        row_btns.addWidget(self.delete_btn)

        root.addLayout(row_btns)

        tbl_title = QLabel("Gespeicherte Teilnehmer (zum Bearbeiten auswählen):")
        tbl_title.setStyleSheet("font-weight: bold; margin-top: 12px;")
        root.addWidget(tbl_title)

        self.table = QTableWidget(0, 2)
        self.table.setHorizontalHeaderLabels(["Name", "Spitzname"])
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.itemSelectionChanged.connect(self._on_selection)
        root.addWidget(self.table)

        self._load()
        self._set_state(False)

    # --- actions ---
    def _save(self):
        name = (self.name_input.text() or "").strip()
        nick = (self.nick_input.text() or "").strip()
        if not name:
            QMessageBox.warning(self, "Fehler", "Bitte einen Namen eingeben.")
            return
        insert_teilnehmer(name, nick or None)
        self._clear_form()
        self._load()
        QMessageBox.information(self, "OK", "Teilnehmer gespeichert.")

    def _update(self):
        if self._current_id is None:
            QMessageBox.information(self, "Hinweis", "Bitte zuerst einen Eintrag auswählen.")
            return
        name = (self.name_input.text() or "").strip()
        nick = (self.nick_input.text() or "").strip()
        if not name:
            QMessageBox.warning(self, "Fehler", "Bitte einen Namen eingeben.")
            return
        update_teilnehmer(self._current_id, name, nick or None)
        self._clear_form()
        self._load()
        QMessageBox.information(self, "OK", "Teilnehmer aktualisiert.")

    def _delete(self):
        if self._current_id is None:
            QMessageBox.information(self, "Hinweis", "Bitte zuerst einen Eintrag auswählen.")
            return

        # Passwortabfrage
        pw, ok = QInputDialog.getText(
            self,
            "Passwort erforderlich",
            "Bitte Lösch-Passwort eingeben:",
            QLineEdit.EchoMode.Password
        )
        if not ok:
            return
        if (pw or "").strip() != "6460":
            QMessageBox.critical(self, "Fehler", "Falsches Passwort. Löschen abgebrochen.")
            return

        ret = QMessageBox.question(
            self, "Löschen bestätigen",
            "Ausgewählten Teilnehmer wirklich löschen?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        if ret != QMessageBox.StandardButton.Yes:
            return
        delete_teilnehmer(self._current_id)
        self._clear_form()
        self._load()
        QMessageBox.information(self, "OK", "Teilnehmer gelöscht.")

    # --- helpers ---
    def _load(self):
        data = fetch_teilnehmer()
        self.table.setRowCount(len(data))
        for row, (tid, name, nick) in enumerate(data):
            name_item = QTableWidgetItem(name)
            name_item.setData(Qt.ItemDataRole.UserRole, tid)
            self.table.setItem(row, 0, name_item)
            self.table.setItem(row, 1, QTableWidgetItem(nick))
        self.table.clearSelection()
        self._current_id = None
        self._set_state(False)

    def _on_selection(self):
        sel = self.table.selectionModel().selectedRows()
        if not sel:
            self._current_id = None
            self._set_state(False)
            return
        r = sel[0].row()
        name_item = self.table.item(r, 0)
        nick_item = self.table.item(r, 1)
        self._current_id = int(name_item.data(Qt.ItemDataRole.UserRole))
        self.name_input.setText(name_item.text())
        self.nick_input.setText(nick_item.text() if nick_item else "")
        self._set_state(True)

    def _clear_form(self):
        self._current_id = None
        self.name_input.clear()
        self.nick_input.clear()
        self.table.clearSelection()
        self._set_state(False)

    def _set_state(self, has_selection: bool):
        self.update_btn.setEnabled(has_selection)
        self.delete_btn.setEnabled(has_selection)
