# views/meisterschaft_view.py
# v0.8 – Meisterschaften mit Rangliste, Schema-Pflege und Turnierzuweisung.
# Komplett eigenständig, nutzt nur die in database.models bereitgestellten Funktionen.

from __future__ import annotations

import os
from typing import Dict, List, Optional

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton,
    QTableWidget, QTableWidgetItem, QListWidget, QListWidgetItem, QGroupBox,
    QMessageBox, QSpinBox, QDialog, QFormLayout, QLineEdit, QDialogButtonBox
)

from database.models import (
    fetch_meisterschaften, fetch_turniere,
    fetch_punkteschema, save_punkteschema, standard_punkteschema_basic,
    set_meisterschaft_turniere, fetch_meisterschaft_turnier_ids,
    compute_meisterschaft_rangliste,
    insert_meisterschaft, update_meisterschaft, delete_meisterschaft
)

STANDARD_FALLBACK5 = 5  # Ab Platz 5

class MeisterschaftView(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("MeisterschaftView")

        self._ms_index_to_id: List[int] = []

        root = QVBoxLayout(self)

        title = QLabel("Meisterschaften – Verwaltung & Rangliste")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # --- Kopf: Auswahl Meisterschaft
        head = QHBoxLayout()
        head.addWidget(QLabel("Meisterschaft:"))
        self.cbo_ms = QComboBox()
        self.cbo_ms.currentIndexChanged.connect(self._on_ms_change)
        head.addWidget(self.cbo_ms, 2)

        self.btn_recalc = QPushButton("Rangliste neu berechnen")
        self.btn_recalc.clicked.connect(self._load_rangliste)
        head.addWidget(self.btn_recalc)

        self.btn_new = QPushButton("Neu")
        self.btn_new.clicked.connect(self._on_new_ms)
        head.addWidget(self.btn_new)

        self.btn_edit = QPushButton("Bearbeiten")
        self.btn_edit.clicked.connect(self._on_edit_ms)
        head.addWidget(self.btn_edit)

        self.btn_delete = QPushButton("Loeschen")
        self.btn_delete.clicked.connect(self._on_delete_ms)
        head.addWidget(self.btn_delete)

        self.btn_reload = QPushButton("Neu laden")
        self.btn_reload.clicked.connect(self._load_ms)
        head.addWidget(self.btn_reload)
        head.addStretch(1)
        root.addLayout(head)

        # --- Mittlere Zone: links Turnierzuweisung, rechts Punkteschema
        mid = QHBoxLayout()

        # Turniere zuweisen
        gb_t = QGroupBox("Zugewiesene Turniere")
        l_t = QVBoxLayout(gb_t)
        self.lst_turniere = QListWidget()
        self.lst_turniere.setSelectionMode(self.lst_turniere.SelectionMode.NoSelection)
        l_t.addWidget(self.lst_turniere, 1)
        btns_t = QHBoxLayout()
        self.btn_save_turniere = QPushButton("Zuweisungen speichern")
        self.btn_save_turniere.clicked.connect(self._save_turnier_zuweisungen)
        btns_t.addStretch(1)
        btns_t.addWidget(self.btn_save_turniere)
        l_t.addLayout(btns_t)
        mid.addWidget(gb_t, 1)

        # Punkteschema
        gb_s = QGroupBox("Punkteschema (Platz → Punkte)")
        l_s = QVBoxLayout(gb_s)
        self.tbl_schema = QTableWidget(10, 2)
        self.tbl_schema.setHorizontalHeaderLabels(["Platz", "Punkte"])
        self.tbl_schema.verticalHeader().setVisible(False)
        for r in range(10):
            it_p = QTableWidgetItem(str(r+1))
            it_p.setFlags(it_p.flags() & ~Qt.ItemFlag.ItemIsEditable)
            it_p.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.tbl_schema.setItem(r, 0, it_p)
            self.tbl_schema.setItem(r, 1, QTableWidgetItem(""))
        l_s.addWidget(self.tbl_schema, 1)
        btns_s = QHBoxLayout()
        self.btn_fill_std = QPushButton("Standard befuellen")
        self.btn_fill_std.clicked.connect(self._fill_standard_schema)
        btns_s.addWidget(self.btn_fill_std)
        self.btn_save_schema = QPushButton("Schema speichern")
        self.btn_save_schema.clicked.connect(self._save_schema)
        btns_s.addWidget(self.btn_save_schema)
        btns_s.addStretch(1)
        l_s.addLayout(btns_s)
        mid.addWidget(gb_s, 1)

        root.addLayout(mid)

        # Rangliste
        gb_r = QGroupBox("Rangliste")
        l_r = QVBoxLayout(gb_r)
        self.tbl_rank = QTableWidget(0, 6)
        self.tbl_rank.setHorizontalHeaderLabels(["Rang", "Name", "Punkte", "Turniere", "Beste", "Letztes Turnier"])
        self.tbl_rank.verticalHeader().setVisible(False)
        self.tbl_rank.setSortingEnabled(False)
        l_r.addWidget(self.tbl_rank)
        root.addWidget(gb_r, 2)

        self._load_ms()

    # ------------------ Laden ------------------

    def _load_ms(self):
        self.cbo_ms.blockSignals(True)
        self.cbo_ms.clear()
        self._ms_index_to_id.clear()
        for r in fetch_meisterschaften():
            # Erwartetes Tuple: (id, name, saison, punkteschema)
            mid, name, saison, _schema = r
            label = f"{name} – {saison}"
            self.cbo_ms.addItem(label)
            self._ms_index_to_id.append(mid)
        self.cbo_ms.blockSignals(False)
        if self.cbo_ms.count() > 0:
            self.cbo_ms.setCurrentIndex(0)
            self._on_ms_change(0)

    def _current_ms_id(self) -> Optional[int]:
        idx = self.cbo_ms.currentIndex()
        if idx < 0 or idx >= len(self._ms_index_to_id):
            return None
        return self._ms_index_to_id[idx]

    # ---- Meisterschaft CRUD ----
    def _current_ms_tuple(self) -> Optional[tuple]:
        ms_id = self._current_ms_id()
        if ms_id is None:
            return None
        for r in fetch_meisterschaften():
            if int(r[0]) == int(ms_id):
                return r
        return None

    class _DlgMs(QDialog):
        def __init__(self, parent=None, name:str="", saison:str=""):
            super().__init__(parent)
            self.setWindowTitle("Meisterschaft")
            fl = QFormLayout(self)
            self.ed_name = QLineEdit(self); self.ed_name.setText(name)
            self.ed_saison = QLineEdit(self); self.ed_saison.setText(saison)
            fl.addRow("Name*", self.ed_name)
            fl.addRow("Saison", self.ed_saison)
            bb = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel, parent=self)
            bb.accepted.connect(self.accept); bb.rejected.connect(self.reject)
            fl.addWidget(bb)

        def values(self) -> tuple[str,str]:
            return self.ed_name.text().strip(), self.ed_saison.text().strip()

        def accept(self):
            name, _ = self.values()
            if not name:
                QMessageBox.warning(self, "Hinweis", "Name ist Pflicht.")
                return
            super().accept()

    def _on_new_ms(self):
        dlg = self._DlgMs(self)
        if dlg.exec():
            name, saison = dlg.values()
            insert_meisterschaft(name, saison)
            self._load_ms()

    def _on_edit_ms(self):
        t = self._current_ms_tuple()
        if not t:
            QMessageBox.information(self, "Hinweis", "Bitte zuerst eine Meisterschaft waehlen.")
            return
        _id, name, saison, _schema = t
        dlg = self._DlgMs(self, name, saison or "")
        if dlg.exec():
            n, s = dlg.values()
            update_meisterschaft(int(_id), n, s)
            self._load_ms()

    def _on_delete_ms(self):
        ms_id = self._current_ms_id()
        if ms_id is None:
            QMessageBox.information(self, "Hinweis", "Bitte zuerst eine Meisterschaft waehlen.")
            return
        ret = QMessageBox.question(
            self, "Loeschen bestaetigen",
            "Meisterschaft wirklich loeschen? Zugewiesene Daten werden entfernt.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        if ret != QMessageBox.StandardButton.Yes:
            return
        delete_meisterschaft(int(ms_id))
        self._load_ms()

    def _on_ms_change(self, _idx: int):
        self._load_turniere_list()
        self._load_schema_table()
        self._load_rangliste()

    # ---- Turniere ----
    def _load_turniere_list(self):
        self.lst_turniere.clear()
        ms_id = self._current_ms_id()
        if ms_id is None:
            return
        assigned = set(fetch_meisterschaft_turnier_ids(ms_id))  # [ids]

        # Gesamtliste aktiver Turniere
        self.lst_turniere.blockSignals(True)
        for tid, name, datum, modus, _ms in fetch_turniere():
            it = QListWidgetItem(f"{datum} – {name} ({modus})")
            it.setFlags(it.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            it.setCheckState(Qt.CheckState.Checked if tid in assigned else Qt.CheckState.Unchecked)
            it.setData(Qt.ItemDataRole.UserRole, int(tid))
            self.lst_turniere.addItem(it)
        self.lst_turniere.blockSignals(False)

    def _save_turnier_zuweisungen(self):
        ms_id = self._current_ms_id()
        if ms_id is None:
            return
        ids: List[int] = []
        for i in range(self.lst_turniere.count()):
            it: QListWidgetItem = self.lst_turniere.item(i)
            if it.checkState() == Qt.CheckState.Checked:
                ids.append(int(it.data(Qt.ItemDataRole.UserRole)))
        set_meisterschaft_turniere(ms_id, ids)
        QMessageBox.information(self, "OK", "Zuweisungen gespeichert.")
        self._load_rangliste()

    # ---- Schema ----
    def _fill_standard_schema(self):
        # Standard befuellen (aus DB-Helper), Rest ab Platz 5 mit Fallback
        schema = standard_punkteschema_basic()
        while len(schema) < 10:
            schema.append(max(0, schema[-1] - 1) if len(schema) >= STANDARD_FALLBACK5 else 0)
        for r, p in enumerate(schema[:10]):
            self.tbl_schema.setItem(r, 1, QTableWidgetItem(str(p)))

    def _save_schema(self):
        ms_id = self._current_ms_id()
        if ms_id is None:
            return
        rows = []
        for r in range(self.tbl_schema.rowCount()):
            platz = r + 1
            txt = self.tbl_schema.item(r, 1).text().strip() if self.tbl_schema.item(r, 1) else ""
            if txt == "":
                continue
            try:
                punkte = int(txt)
            except ValueError:
                QMessageBox.warning(self, "Eingabe", f"Ungueltige Punkte in Zeile {platz}.")
                return
            rows.append((platz, punkte))
        save_punkteschema(ms_id, rows)
        QMessageBox.information(self, "OK", "Schema gespeichert.")
        self._load_rangliste()

    def _load_schema_table(self):
        self.tbl_schema.setRowCount(10)
        for r in range(10):
            it_p = QTableWidgetItem(str(r+1))
            it_p.setFlags(it_p.flags() & ~Qt.ItemFlag.ItemIsEditable)
            it_p.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.tbl_schema.setItem(r, 0, it_p)
            self.tbl_schema.setItem(r, 1, QTableWidgetItem(""))

        ms_id = self._current_ms_id()
        if ms_id is None:
            return
        rows = fetch_punkteschema(ms_id)  # [(platz, punkte)]
        for platz, punkte in rows:
            if 1 <= platz <= 10:
                self.tbl_schema.setItem(platz-1, 1, QTableWidgetItem(str(punkte)))

    # ---- Rangliste ----
    def _load_rangliste(self):
        self.tbl_rank.setRowCount(0)
        ms_id = self._current_ms_id()
        if ms_id is None:
            return
        rows = compute_meisterschaft_rangliste(ms_id)

        self.tbl_rank.setRowCount(len(rows))
        for i, d in enumerate(rows):
            def _cell(txt, center=False, ro=True):
                it = QTableWidgetItem("" if txt is None else str(txt))
                if ro:
                    it.setFlags(it.flags() & ~Qt.ItemFlag.ItemIsEditable)
                if center:
                    it.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                return it

            self.tbl_rank.setItem(i, 0, _cell(d["rank"], center=True))
            self.tbl_rank.setItem(i, 1, _cell(d["name"]))
            self.tbl_rank.setItem(i, 2, _cell(d["punkte"], center=True))
            self.tbl_rank.setItem(i, 3, _cell(d["turniere"], center=True))
            best = d["beste_platzierung"] if d["beste_platzierung"] is not None else "-"
            self.tbl_rank.setItem(i, 4, _cell(best, center=True))
            self.tbl_rank.setItem(i, 5, _cell(d["letztes_datum"], center=True))
