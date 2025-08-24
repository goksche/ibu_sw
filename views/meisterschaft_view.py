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
    QMessageBox, QSpinBox
)

from database.models import (
    fetch_meisterschaften, fetch_turniere,
    fetch_punkteschema, save_punkteschema, standard_punkteschema_basic,
    set_meisterschaft_turniere, fetch_meisterschaft_turnier_ids,
    compute_meisterschaft_rangliste
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
        self.btn_schema_std = QPushButton("Standard-Schema anwenden")
        self.btn_schema_std.clicked.connect(self._apply_standard_schema)
        self.btn_schema_save = QPushButton("Schema speichern")
        self.btn_schema_save.clicked.connect(self._save_schema)
        btns_s.addStretch(1)
        btns_s.addWidget(self.btn_schema_std)
        btns_s.addWidget(self.btn_schema_save)
        l_s.addLayout(btns_s)
        mid.addWidget(gb_s, 1)

        root.addLayout(mid)

        # --- Rangliste
        gb_r = QGroupBox("Rangliste")
        l_r = QVBoxLayout(gb_r)
        self.tbl_rank = QTableWidget(0, 6)
        self.tbl_rank.setHorizontalHeaderLabels(
            ["Rang", "Spieler", "Punkte gesamt", "Turniere", "Beste Platzierung", "Letztes Turnierdatum"]
        )
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
        for tid, name, datum, modus, _msflag in fetch_turniere():
            it = QListWidgetItem(f"{datum} – {name} ({modus})")
            it.setFlags(it.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            it.setCheckState(Qt.CheckState.Checked if tid in assigned else Qt.CheckState.Unchecked)
            it.setData(Qt.ItemDataRole.UserRole, tid)
            self.lst_turniere.addItem(it)

    # ---- Schema ----
    def _load_schema_table(self):
        self.tbl_schema.blockSignals(True)
        for r in range(self.tbl_schema.rowCount()):
            self.tbl_schema.item(r, 1).setText("")
        ms_id = self._current_ms_id()
        if ms_id is None:
            self.tbl_schema.blockSignals(False)
            return
        mapping = {platz: punkte for platz, punkte in fetch_punkteschema(ms_id)}
        for platz, punkte in mapping.items():
            if 1 <= platz <= self.tbl_schema.rowCount():
                self.tbl_schema.item(platz-1, 1).setText(str(punkte))
        self.tbl_schema.blockSignals(False)

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
                QMessageBox.warning(self, "Eingabe", f"Ungültige Punkte in Zeile {platz}.")
                return
            rows.append((platz, punkte))
        save_punkteschema(ms_id, rows)
        QMessageBox.information(self, "OK", "Punkteschema gespeichert.")
        self._load_rangliste()

    def _apply_standard_schema(self):
        ms_id = self._current_ms_id()
        if ms_id is None:
            return
        standard_punkteschema_basic(ms_id)
        self._load_schema_table()
        self._load_rangliste()

    # ---- Turnierzuweisung speichern ----
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
