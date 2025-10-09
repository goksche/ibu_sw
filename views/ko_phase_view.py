# views/ko_phase_view.py
from __future__ import annotations
from typing import Optional, List, Tuple, Dict

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView,
    QMessageBox, QGroupBox, QScrollArea
)

from database.models import (
    fetch_turniere, fetch_groups,
    fetch_ko_rounds, fetch_ko_matches,
    save_ko_result_and_propagate, ensure_bronze_from_semis,
    generate_ko_from_groups_advanced
)

MODE_LABELS = [
    "Cross Halbfinal (Top 4)",
    "Cross Viertelfinal (Top 8)",
    "Cross Achtelfinal (Top 16)",
    "Auslosung Halbfinal (Top 4)",
    "Auslosung Viertelfinal (Top 8)",
    "Auslosung Achtelfinal (Top 16)",
]

def _parse_mode(label: str) -> Tuple[str, int]:
    """Liefert (mode, first_round_size)."""
    mode = "cross" if "Cross" in label else "draw"
    if "Top 16" in label:
        frs = 16
    elif "Top 8" in label:
        frs = 8
    else:
        frs = 4
    return mode, frs


class _RoundTable(QGroupBox):
    COL_MATCH = 0
    COL_P1 = 1
    COL_P2 = 2
    COL_S1 = 3
    COL_S2 = 4

    def __init__(self, title: str, turnier_id: int, runde: int, parent: Optional[QWidget] = None):
        super().__init__(title, parent)
        self.turnier_id = int(turnier_id)
        self.runde = int(runde)

        # Debounce je Match-ID: Wenn S1/S2 editiert werden, speichern wir erst,
        # sobald beide Zahlen vorliegen und 250 ms ohne weitere Tasten vergangen sind.
        self._debounce_timers: Dict[int, QTimer] = {}

        lay = QVBoxLayout(self)
        self.tbl = QTableWidget(0, 5, self)
        self.tbl.setHorizontalHeaderLabels(["Match", "Spieler 1", "Spieler 2", "S1", "S2"])
        self.tbl.verticalHeader().setVisible(False)
        hh = self.tbl.horizontalHeader()
        hh.setSectionResizeMode(self.COL_MATCH, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(self.COL_P1, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(self.COL_P2, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(self.COL_S1, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(self.COL_S2, QHeaderView.ResizeMode.ResizeToContents)

        self.tbl.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked |
            QAbstractItemView.EditTrigger.EditKeyPressed |
            QAbstractItemView.EditTrigger.AnyKeyPressed
        )
        self.tbl.itemChanged.connect(self._on_item_changed)
        lay.addWidget(self.tbl)

    # ---------- Daten ----------
    def load(self):
        self.tbl.blockSignals(True)
        try:
            matches = list(fetch_ko_matches(self.turnier_id, self.runde))
            self.tbl.setRowCount(len(matches))
            for r, (mid, match_no, n1, n2, s1, s2) in enumerate(matches):
                itm_m = QTableWidgetItem(str(match_no))
                itm_m.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                itm_m.setFlags(itm_m.flags() & ~Qt.ItemFlag.ItemIsEditable)
                itm_m.setData(Qt.ItemDataRole.UserRole, int(mid))
                self.tbl.setItem(r, self.COL_MATCH, itm_m)

                itm_p1 = QTableWidgetItem(n1 or "")
                itm_p1.setFlags(itm_p1.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.tbl.setItem(r, self.COL_P1, itm_p1)

                itm_p2 = QTableWidgetItem(n2 or "")
                itm_p2.setFlags(itm_p2.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.tbl.setItem(r, self.COL_P2, itm_p2)

                s1_item = QTableWidgetItem("" if s1 is None else str(int(s1)))
                s1_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                s2_item = QTableWidgetItem("" if s2 is None else str(int(s2)))
                s2_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)

                # explizit editierbar (ohne Checkboxen etc.)
                s1_item.setFlags((s1_item.flags() | Qt.ItemFlag.ItemIsEditable) & ~Qt.ItemFlag.ItemIsUserCheckable)
                s2_item.setFlags((s2_item.flags() | Qt.ItemFlag.ItemIsEditable) & ~Qt.ItemFlag.ItemIsUserCheckable)

                self.tbl.setItem(r, self.COL_S1, s1_item)
                self.tbl.setItem(r, self.COL_S2, s2_item)
        finally:
            self.tbl.blockSignals(False)

    def soft_reload(self):
        """
        Weiches Nachladen NUR dieser Runde:
        - Spieler- & Ergebnis-Zellen neu aus DB
        - Scrollposition & Fokus bleiben erhalten
        - Signale sind währenddessen blockiert (keine Speicherschleife)
        """
        cur_row = self.tbl.currentRow()
        cur_col = self.tbl.currentColumn()
        self.load()
        if 0 <= cur_row < self.tbl.rowCount():
            self.tbl.setCurrentCell(cur_row, max(0, cur_col))

    # ---------- Edit/Speichern ----------
    def _on_item_changed(self, item: QTableWidgetItem) -> None:
        if item.column() not in (self.COL_S1, self.COL_S2):
            return
        row = item.row()
        mid = self._match_id_at_row(row)
        if mid is None:
            return

        # Debounce Timer pro Match
        t = self._debounce_timers.get(mid)
        if t is None:
            t = QTimer(self)
            t.setSingleShot(True)
            t.timeout.connect(lambda m=mid: self._commit_match_if_ready(m))
            self._debounce_timers[mid] = t
        # 250 ms nach letzter Eingabe speichern
        t.start(250)

    def _commit_match_if_ready(self, match_id: int):
        # Finde Zeile zu match_id
        row = self._row_of_match(match_id)
        if row is None:
            return
        s1 = self._parse_int(self.tbl.item(row, self.COL_S1))
        s2 = self._parse_int(self.tbl.item(row, self.COL_S2))

        # Speichern NUR wenn beide Werte valide ints sind
        if s1 is None or s2 is None:
            return
        if s1 == s2:
            # keine Unentschieden — lass einfach stehen, aber nicht speichern/weiterleiten
            return
        try:
            save_ko_result_and_propagate(match_id, s1, s2, self.turnier_id)
            # Nach erfolgreichem Speichern: nur diese Runde weich neu laden,
            # damit die Weiterleitung sichtbar wird
            self.soft_reload()
        except Exception as ex:
            QMessageBox.warning(self, "Fehler", f"Speichern fehlgeschlagen:\n{ex}")

    def _row_of_match(self, match_id: int) -> Optional[int]:
        for r in range(self.tbl.rowCount()):
            mid = self._match_id_at_row(r)
            if mid == match_id:
                return r
        return None

    def _match_id_at_row(self, row: int) -> Optional[int]:
        mitem = self.tbl.item(row, self.COL_MATCH)
        if not mitem:
            return None
        val = mitem.data(Qt.ItemDataRole.UserRole)
        try:
            return int(val)
        except Exception:
            return None

    @staticmethod
    def _parse_int(it: Optional[QTableWidgetItem]) -> Optional[int]:
        if it is None:
            return None
        t = (it.text() or "").strip()
        if t == "":
            return None
        try:
            return int(t)
        except ValueError:
            return None


class KOPhaseView(QWidget):
    """
    KO-Phase:
    - Oben Turnierauswahl + Erzeugungsmodus (6 Optionen) + Buttons
    - Darunter ALLE KO-Runden als eigene Tabellen (kein Zurückspringen mehr)
    - Debounced Speichern (siehe _RoundTable)
    """
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._round_tables: List[_RoundTable] = []

        root = QVBoxLayout(self)

        # ---- Header ----
        hdr = QHBoxLayout()
        root.addLayout(hdr)

        hdr.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox()
        hdr.addWidget(self.cbo_turnier)

        self.btn_reload = QPushButton("Neu laden")
        self.btn_reload.clicked.connect(self._reload_turniere_keep_selection)
        hdr.addWidget(self.btn_reload)

        hdr.addWidget(QLabel("Erzeugungsmodus:"))
        self.cbo_mode = QComboBox()
        self.cbo_mode.addItems(MODE_LABELS)
        hdr.addWidget(self.cbo_mode)

        self.btn_gen = QPushButton("Erzeugen")
        self.btn_gen.clicked.connect(self._generate_clicked)
        hdr.addWidget(self.btn_gen)

        self.btn_bronze = QPushButton("Bronze erstellen/aktualisieren")
        self.btn_bronze.clicked.connect(self._bronze_clicked)
        hdr.addWidget(self.btn_bronze)

        hdr.addStretch(1)

        # ---- Scroll-Bereich mit allen Runden ----
        self.scroll = QScrollArea(self)
        self.scroll.setWidgetResizable(True)
        self._container = QWidget()
        self._container_layout = QVBoxLayout(self._container)
        self._container_layout.setContentsMargins(0, 4, 0, 0)
        self.scroll.setWidget(self._container)
        root.addWidget(self.scroll, 1)

        # Init-Daten
        self._reload_turniere_keep_selection()
        self.cbo_turnier.currentIndexChanged.connect(self._load_rounds_all)

    # ---------- Turnier-Handling ----------
    def _current_turnier_id(self) -> Optional[int]:
        data = self.cbo_turnier.currentData(Qt.ItemDataRole.UserRole)
        if isinstance(data, int):
            return data
        if isinstance(data, str) and data.isdigit():
            return int(data)
        return None

    def _reload_turniere_keep_selection(self) -> None:
        old = self._current_turnier_id()
        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        try:
            items = list(fetch_turniere())
            for tid, name, datum, modus, _ms in items:
                label = f"{(datum or '').strip()} – {name} ({modus})".strip(" –()")
                self.cbo_turnier.addItem(label, int(tid))
        finally:
            self.cbo_turnier.blockSignals(False)

        if old is not None:
            for i in range(self.cbo_turnier.count()):
                if self.cbo_turnier.itemData(i, Qt.ItemDataRole.UserRole) == old:
                    self.cbo_turnier.setCurrentIndex(i)
                    break
        if self.cbo_turnier.currentIndex() < 0 and self.cbo_turnier.count() > 0:
            self.cbo_turnier.setCurrentIndex(0)

        self._load_rounds_all()

    # ---------- Runden-UI ----------
    def _clear_rounds(self):
        for i in reversed(range(self._container_layout.count())):
            w = self._container_layout.itemAt(i).widget()
            if w:
                w.setParent(None)
                w.deleteLater()
        self._round_tables.clear()

    def _load_rounds_all(self):
        tid = self._current_turnier_id()
        self._clear_rounds()
        if not tid:
            return
        rounds = fetch_ko_rounds(int(tid))
        if not rounds:
            lbl = QLabel("Noch keine KO-Runde vorhanden. Wähle oben einen Erzeugungsmodus und klicke „Erzeugen“.")
            lbl.setStyleSheet("color:#777;")
            self._container_layout.addWidget(lbl)
            self._container_layout.addStretch(1)
            return
        for r in rounds:
            title = "Bronze" if r == 99 else f"Runde {r}"
            rt = _RoundTable(title, int(tid), int(r), self._container)
            rt.load()
            self._container_layout.addWidget(rt)
            self._round_tables.append(rt)
        self._container_layout.addStretch(1)

    # ---------- Aktionen ----------
    def _generate_clicked(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.information(self, "Hinweis", "Kein Turnier ausgewählt.")
            return

        mode, first_round_size = _parse_mode(self.cbo_mode.currentText())
        groups = list(fetch_groups(int(tid)))
        if not groups:
            QMessageBox.warning(self, "Fehler", "Keine Gruppen vorhanden.")
            return
        gcount = len(groups)

        # Qualifikanten je Gruppe nach TopGesamt/AnzahlGruppen
        if first_round_size % gcount != 0:
            QMessageBox.warning(self, "Nicht möglich", f"Top {first_round_size} ist mit {gcount} Gruppen nicht teilbar.")
            return
        qualifiers_per_group = first_round_size // gcount

        ok, msg = generate_ko_from_groups_advanced(
            int(tid),
            qualifiers_per_group=qualifiers_per_group,
            first_round_size=first_round_size,
            mode=mode,
            rematch_block=True
        )
        if not ok:
            QMessageBox.warning(self, "Erzeugen fehlgeschlagen", msg)
            return
        self._load_rounds_all()
        QMessageBox.information(self, "OK", f"KO erzeugt: {self.cbo_mode.currentText()}")

    def _bronze_clicked(self):
        tid = self._current_turnier_id()
        if not tid:
            return
        try:
            created = ensure_bronze_from_semis(int(tid))
            self._load_rounds_all()
            if created:
                QMessageBox.information(self, "OK", "Bronzespiel erstellt/aktualisiert.")
            else:
                QMessageBox.information(self, "Hinweis", "Bronze konnte noch nicht erstellt werden (Halbfinals unvollständig).")
        except Exception as ex:
            QMessageBox.warning(self, "Fehler", f"{ex}")
