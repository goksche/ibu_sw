from PyQt6.QtWidgets import (
    QWidget, QLabel, QVBoxLayout, QHBoxLayout, QLineEdit, QDateEdit,
    QComboBox, QPushButton, QTableWidget, QTableWidgetItem,
    QMessageBox, QAbstractItemView, QInputDialog
)
from PyQt6.QtCore import QDate, Qt
from database.models import insert_turnier, fetch_turniere, update_turnier, delete_turnier


class TurnierView(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("TurnierView")
        self._current_id = None  # id des selektierten Turniers

        root = QVBoxLayout(self)

        # Titel
        title = QLabel("Turnier erfassen / bearbeiten")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # Name
        root.addWidget(QLabel("Turniername:"))
        self.name_input = QLineEdit()
        root.addWidget(self.name_input)

        # Datum
        root.addWidget(QLabel("Datum:"))
        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)
        self.date_input.setDate(QDate.currentDate())
        root.addWidget(self.date_input)

        # Modus
        root.addWidget(QLabel("Turniermodus:"))
        self.mode_select = QComboBox()
        self.mode_select.addItems([
            "Gruppenphase",
            "KO",
            "Gruppenphase und KO",
        ])
        root.addWidget(self.mode_select)

        # Meisterschaftsrelevanz
        root.addWidget(QLabel("Meisterschaftsrelevant:"))
        self.meisterschaft_select = QComboBox()
        self.meisterschaft_select.addItems(["Nein", "Ja"])
        root.addWidget(self.meisterschaft_select)

        # Buttons: Neu/Speichern/Aktualisieren/Löschen
        btn_row = QHBoxLayout()
        self.new_btn = QPushButton("Neu")
        self.new_btn.clicked.connect(self._clear_form)
        btn_row.addWidget(self.new_btn)

        self.save_btn = QPushButton("Speichern (neu)")
        self.save_btn.clicked.connect(self._save_turnier)
        btn_row.addWidget(self.save_btn)

        self.update_btn = QPushButton("Aktualisieren")
        self.update_btn.clicked.connect(self._update_turnier)
        btn_row.addWidget(self.update_btn)

        self.delete_btn = QPushButton("Löschen")
        self.delete_btn.clicked.connect(self._delete_turnier)
        btn_row.addWidget(self.delete_btn)

        root.addLayout(btn_row)

        # Liste gespeicherter Turniere
        list_title = QLabel("Gespeicherte Turniere (zum Bearbeiten auswählen):")
        list_title.setStyleSheet("font-weight: bold; margin-top: 12px;")
        root.addWidget(list_title)

        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["Name", "Datum", "Modus", "Meisterschaft"])
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.itemSelectionChanged.connect(self._on_table_selection_changed)
        root.addWidget(self.table)

        self._load_turniere()
        self._set_buttons_state(False)

    # -----------------------------
    # Datenoperationen
    # -----------------------------

    def _save_turnier(self):
        name = (self.name_input.text() or "").strip()
        datum = self.date_input.date().toString("yyyy-MM-dd")
        modus = self.mode_select.currentText()
        meisterschaft = self.meisterschaft_select.currentText()

        if not name:
            QMessageBox.warning(self, "Fehler", "Bitte einen Turniernamen eingeben.")
            return

        insert_turnier(name, datum, modus, meisterschaft)
        self._clear_form()
        self._load_turniere()
        QMessageBox.information(self, "OK", "Turnier gespeichert.")

    def _update_turnier(self):
        if self._current_id is None:
            QMessageBox.warning(self, "Hinweis", "Bitte zuerst einen Eintrag auswählen.")
            return

        name = (self.name_input.text() or "").strip()
        datum = self.date_input.date().toString("yyyy-MM-dd")
        modus = self.mode_select.currentText()
        meisterschaft = self.meisterschaft_select.currentText()

        if not name:
            QMessageBox.warning(self, "Fehler", "Bitte einen Turniernamen eingeben.")
            return

        update_turnier(self._current_id, name, datum, modus, meisterschaft)
        self._clear_form()
        self._load_turniere()
        QMessageBox.information(self, "OK", "Turnier aktualisiert.")

    def _delete_turnier(self):
        if self._current_id is None:
            QMessageBox.warning(self, "Hinweis", "Bitte zuerst einen Eintrag auswählen.")
            return

        # Passwortabfrage (Pflicht: 6460)
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

        # Sicherheitsabfrage nach korrektem Passwort
        ret = QMessageBox.question(
            self,
            "Löschen bestätigen",
            "Ausgewähltes Turnier wirklich löschen?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        if ret != QMessageBox.StandardButton.Yes:
            return

        delete_turnier(self._current_id)
        self._clear_form()
        self._load_turniere()
        QMessageBox.information(self, "OK", "Turnier gelöscht.")

    # -----------------------------
    # UI-Helpers
    # -----------------------------

    def _load_turniere(self):
        data = fetch_turniere()
        self.table.setRowCount(len(data))
        for row, (tid, name, datum, modus, meisterschaft) in enumerate(data):
            name_item = QTableWidgetItem(name)
            # id im UserRole ablegen
            name_item.setData(Qt.ItemDataRole.UserRole, tid)
            self.table.setItem(row, 0, name_item)
            self.table.setItem(row, 1, QTableWidgetItem(datum))
            self.table.setItem(row, 2, QTableWidgetItem(modus))
            self.table.setItem(row, 3, QTableWidgetItem(meisterschaft))

        # nach dem Laden Auswahl leeren
        self.table.clearSelection()
        self._set_buttons_state(False)
        self._current_id = None

    def _on_table_selection_changed(self):
        sel = self.table.selectionModel().selectedRows()
        if not sel:
            self._current_id = None
            self._set_buttons_state(False)
            return

        row = sel[0].row()
        name_item = self.table.item(row, 0)
        if not name_item:
            self._current_id = None
            self._set_buttons_state(False)
            return

        tid = name_item.data(Qt.ItemDataRole.UserRole)
        name = name_item.text()
        datum = self.table.item(row, 1).text()
        modus = self.table.item(row, 2).text()
        meisterschaft = self.table.item(row, 3).text()

        # Formular füllen
        self._current_id = int(tid)
        self.name_input.setText(name)
        try:
            y, m, d = map(int, datum.split("-"))
            self.date_input.setDate(QDate(y, m, d))
        except Exception:
            self.date_input.setDate(QDate.currentDate())
        self._set_combo_text(self.mode_select, modus)
        self._set_combo_text(self.meisterschaft_select, meisterschaft)

        self._set_buttons_state(True)

    def _clear_form(self):
        self._current_id = None
        self.name_input.clear()
        self.date_input.setDate(QDate.currentDate())
        self.mode_select.setCurrentIndex(0)
        self.meisterschaft_select.setCurrentIndex(0)
        self.table.clearSelection()
        self._set_buttons_state(False)

    def _set_buttons_state(self, has_selection: bool):
        self.update_btn.setEnabled(has_selection)
        self.delete_btn.setEnabled(has_selection)

    @staticmethod
    def _set_combo_text(combo: QComboBox, text: str):
        idx = combo.findText(text)
        combo.setCurrentIndex(idx if idx >= 0 else 0)
