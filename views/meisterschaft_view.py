from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QLineEdit, QPlainTextEdit, QHBoxLayout,
    QPushButton, QTableWidget, QTableWidgetItem, QMessageBox, QAbstractItemView,
    QInputDialog
)
from PyQt6.QtCore import Qt
from database.models import (
    insert_meisterschaft, fetch_meisterschaften, update_meisterschaft, delete_meisterschaft
)


class MeisterschaftView(QWidget):
    def __init__(self):
        super().__init__()
        self._current_id = None

        root = QVBoxLayout(self)

        title = QLabel("Meisterschaft erfassen / bearbeiten")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        root.addWidget(QLabel("Name:"))
        self.name_input = QLineEdit()
        root.addWidget(self.name_input)

        root.addWidget(QLabel("Saison (z. B. 2025/26):"))
        self.saison_input = QLineEdit()
        root.addWidget(self.saison_input)

        root.addWidget(QLabel("Punkteschema (frei als Text, z. B. JSON/CSV):"))
        self.schema_input = QPlainTextEdit()
        self.schema_input.setPlaceholderText("Beispiel:\n1,10\n2,7\n3,5\n4,3\n...")
        root.addWidget(self.schema_input)

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

        tbl_title = QLabel("Meisterschaften (zum Bearbeiten auswählen):")
        tbl_title.setStyleSheet("font-weight: bold; margin-top: 12px;")
        root.addWidget(tbl_title)

        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["Name", "Saison", "Schema…"])
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
        saison = (self.saison_input.text() or "").strip()
        schema = (self.schema_input.toPlainText() or "").strip()
        if not name or not saison:
            QMessageBox.warning(self, "Fehler", "Bitte Name und Saison eingeben.")
            return
        insert_meisterschaft(name, saison, schema)
        self._clear_form()
        self._load()
        QMessageBox.information(self, "OK", "Meisterschaft gespeichert.")

    def _update(self):
        if self._current_id is None:
            QMessageBox.information(self, "Hinweis", "Bitte zuerst einen Eintrag auswählen.")
            return
        name = (self.name_input.text() or "").strip()
        saison = (self.saison_input.text() or "").strip()
        schema = (self.schema_input.toPlainText() or "").strip()
        if not name or not saison:
            QMessageBox.warning(self, "Fehler", "Bitte Name und Saison eingeben.")
            return
        update_meisterschaft(self._current_id, name, saison, schema)
        self._clear_form()
        self._load()
        QMessageBox.information(self, "OK", "Meisterschaft aktualisiert.")

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
            "Ausgewählte Meisterschaft wirklich löschen?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        if ret != QMessageBox.StandardButton.Yes:
            return
        delete_meisterschaft(self._current_id)
        self._clear_form()
        self._load()
        QMessageBox.information(self, "OK", "Meisterschaft gelöscht.")

    # --- helpers ---
    def _load(self):
        data = fetch_meisterschaften()
        self.table.setRowCount(len(data))
        for row, (mid, name, saison, schema) in enumerate(data):
            name_item = QTableWidgetItem(name)
            name_item.setData(Qt.ItemDataRole.UserRole, mid)
            self.table.setItem(row, 0, name_item)
            self.table.setItem(row, 1, QTableWidgetItem(saison))
            preview = (schema[:40] + "…") if schema and len(schema) > 40 else (schema or "")
            self.table.setItem(row, 2, QTableWidgetItem(preview))
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
        saison_item = self.table.item(r, 1)
        self._current_id = int(name_item.data(Qt.ItemDataRole.UserRole))
        self.name_input.setText(name_item.text())
        self.saison_input.setText(saison_item.text() if saison_item else "")
        # Volltext-Schema nachladen:
        for mid, name, saison, schema in fetch_meisterschaften():
            if mid == self._current_id:
                self.schema_input.setPlainText(schema or "")
                break
        self._set_state(True)

    def _clear_form(self):
        self._current_id = None
        self.name_input.clear()
        self.saison_input.clear()
        self.schema_input.clear()
        self.table.clearSelection()
        self._set_state(False)

    def _set_state(self, has_selection: bool):
        self.update_btn.setEnabled(has_selection)
        self.delete_btn.setEnabled(has_selection)
