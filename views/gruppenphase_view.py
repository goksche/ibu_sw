# views/gruppenphase_view.py
from __future__ import annotations
from typing import Optional, List, Tuple, Dict

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView,
    QMessageBox, QGroupBox, QScrollArea, QSizePolicy, QFrame, QSpacerItem
)

from database.models import (
    fetch_turniere, fetch_groups, fetch_group_matches, compute_group_table,
    save_match_result, has_group_matches, generate_group_round_robin
)

# --- Fixe Spaltenbreiten ----------------------------------------------------
# Tabelle (links)
COLS_TABLE = [
    ("Platz",    52),
    ("Spieler",  180),
    ("Spiele",   58),
    ("Siege",    54),
    ("Niederl.", 68),
    ("Legs +",   58),
    ("Legs -",   58),
    ("Differenz",74),
]
TABLE_TOTAL_WIDTH = sum(w for _, w in COLS_TABLE) + 2  # + Rahmen

# Spielplan (rechts)
# 0,1,4,5 Fixbreite; 2 & 3 (Spieler) Stretch – damit bei 2 Gruppen grosszügiger Platz entsteht
COLS_MATCHES = [
    ("Match",   60),
    ("Runde",   60),
    ("Spieler 1", 180),
    ("Spieler 2", 180),
    ("S1",      50),
    ("S2",      50),
]


# ---------- Hilfen ----------
def _int_or_none(s: Optional[str]) -> Optional[int]:
    if s is None:
        return None
    t = s.strip()
    if not t:
        return None
    try:
        return int(t)
    except ValueError:
        return None


# ---------- Einzelne Gruppe (Panel) ----------
class _GroupPanel(QGroupBox):
    def __init__(self, turnier_id: int, gruppe_id: int, gruppen_name: str, parent: Optional[QWidget] = None):
        super().__init__(gruppen_name, parent)
        self.turnier_id = int(turnier_id)
        self.gruppe_id = int(gruppe_id)

        # Debounce Timer je Match-ID (für Spielplan)
        self._debounce: Dict[int, QTimer] = {}

        lay = QHBoxLayout(self)
        lay.setContentsMargins(6, 6, 6, 6)
        lay.setSpacing(12)

        # --- Tabelle links ---
        left = QVBoxLayout()
        left.setSpacing(4)
        lbl_tab = QLabel("Tabelle")
        lbl_tab.setStyleSheet("font-weight: 600;")
        left.addWidget(lbl_tab)

        self.tbl_table = QTableWidget(0, len(COLS_TABLE), self)
        self.tbl_table.setObjectName("group_table")
        self._setup_table_left(self.tbl_table)
        left.addWidget(self.tbl_table)

        left.addItem(QSpacerItem(0, 0, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding))
        lay.addLayout(left, 0)

        # Trennlinie
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.VLine)
        sep.setFrameShadow(QFrame.Shadow.Sunken)
        lay.addWidget(sep)

        # --- Spielplan rechts ---
        right = QVBoxLayout()
        right.setSpacing(4)
        lbl_sp = QLabel("Spiele")
        lbl_sp.setStyleSheet("font-weight: 600;")
        right.addWidget(lbl_sp)

        self.tbl_matches = QTableWidget(0, len(COLS_MATCHES), self)
        self.tbl_matches.setObjectName("group_matches")
        self._setup_table_right(self.tbl_matches)
        self.tbl_matches.itemChanged.connect(self._on_match_item_changed)
        right.addWidget(self.tbl_matches)

        lay.addLayout(right, 1)

        self.reload_soft()

    # --- UI Setup: Tabelle links (fixe Gesamtbreite) ---
    def _setup_table_left(self, tbl: QTableWidget):
        tbl.setHorizontalHeaderLabels([t for t, _ in COLS_TABLE])
        hh = tbl.horizontalHeader()
        hh.setStretchLastSection(False)
        hh.setMinimumSectionSize(10)
        for i, (_, w) in enumerate(COLS_TABLE):
            hh.setSectionResizeMode(i, QHeaderView.ResizeMode.Fixed)
            tbl.setColumnWidth(i, w)
        tbl.verticalHeader().setVisible(False)
        tbl.setAlternatingRowColors(True)
        tbl.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        tbl.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        tbl.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        tbl.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Preferred)
        tbl.setMinimumWidth(TABLE_TOTAL_WIDTH)
        tbl.setMaximumWidth(TABLE_TOTAL_WIDTH)

    # --- UI Setup: Spielplan rechts (Fix + Stretch) ---
    def _setup_table_right(self, tbl: QTableWidget):
        tbl.setHorizontalHeaderLabels([t for t, _ in COLS_MATCHES])
        hh = tbl.horizontalHeader()
        hh.setMinimumSectionSize(10)
        # Fix für 0,1,4,5 – Stretch für 2,3
        for i, (_, w) in enumerate(COLS_MATCHES):
            if i in (0, 1, 4, 5):
                hh.setSectionResizeMode(i, QHeaderView.ResizeMode.Fixed)
                tbl.setColumnWidth(i, w)
            else:
                hh.setSectionResizeMode(i, QHeaderView.ResizeMode.Stretch)
        tbl.verticalHeader().setVisible(False)
        tbl.setAlternatingRowColors(True)
        tbl.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        tbl.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectItems)
        tbl.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked |
            QAbstractItemView.EditTrigger.EditKeyPressed |
            QAbstractItemView.EditTrigger.AnyKeyPressed
        )

    # --- Laden / Soft-Reload nur für diese Gruppe ---
    def reload_soft(self):
        self._load_table()
        self._load_matches()

    def _load_table(self):
        rows = compute_group_table(self.turnier_id, self.gruppe_id)
        self.tbl_table.blockSignals(True)
        try:
            self.tbl_table.setRowCount(len(rows))
            for r, row in enumerate(rows):
                values = [
                    str(r + 1),                              # Platz
                    row.get("spieler", ""),                  # Spieler
                    str(row.get("spiele", 0)),
                    str(row.get("siege", 0)),
                    str(row.get("niederlagen", 0)),
                    str(row.get("lf", 0)),
                    str(row.get("la", 0)),
                    f"{int(row.get('diff', 0)):+d}",         # Differenz
                ]
                for c, val in enumerate(values):
                    it = QTableWidgetItem(val)
                    if c != 1:
                        it.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                    self.tbl_table.setItem(r, c, it)
        finally:
            self.tbl_table.blockSignals(False)

    def _load_matches(self):
        matches = fetch_group_matches(self.turnier_id, self.gruppe_id)
        # matches: (match_id, runde, match_no, n1, n2, s1, s2)
        self.tbl_matches.blockSignals(True)
        try:
            self.tbl_matches.setRowCount(len(matches))
            for r, (mid, runde, match_no, n1, n2, s1, s2) in enumerate(matches):
                # Match
                it_m = QTableWidgetItem(str(match_no))
                it_m.setFlags(it_m.flags() & ~Qt.ItemFlag.ItemIsEditable)
                it_m.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                it_m.setData(Qt.ItemDataRole.UserRole, int(mid))
                self.tbl_matches.setItem(r, 0, it_m)

                # Runde
                it_r = QTableWidgetItem(str(runde))
                it_r.setFlags(it_r.flags() & ~Qt.ItemFlag.ItemIsEditable)
                it_r.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                self.tbl_matches.setItem(r, 1, it_r)

                # Spieler
                it_p1 = QTableWidgetItem(n1 or "")
                it_p1.setFlags(it_p1.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.tbl_matches.setItem(r, 2, it_p1)

                it_p2 = QTableWidgetItem(n2 or "")
                it_p2.setFlags(it_p2.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.tbl_matches.setItem(r, 3, it_p2)

                # Scores (editierbar)
                s1_item = QTableWidgetItem("" if s1 is None else str(int(s1)))
                s1_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                s2_item = QTableWidgetItem("" if s2 is None else str(int(s2)))
                s2_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                self.tbl_matches.setItem(r, 4, s1_item)
                self.tbl_matches.setItem(r, 5, s2_item)
        finally:
            self.tbl_matches.blockSignals(False)

    # --- Eingabe / Speichern (debounced) ---
    def _on_match_item_changed(self, item: QTableWidgetItem):
        if item.column() not in (4, 5):  # nur S1/S2
            return
        row = item.row()
        mid = self.tbl_matches.item(row, 0).data(Qt.ItemDataRole.UserRole)
        if mid is None:
            return

        t = self._debounce.get(int(mid))
        if t is None:
            t = QTimer(self)
            t.setSingleShot(True)
            t.timeout.connect(lambda m=int(mid): self._commit_match_if_ready(m))
            self._debounce[int(mid)] = t
        t.start(250)  # 250ms nach letzter Eingabe

    def _commit_match_if_ready(self, match_id: int):
        # Zeile finden
        row = None
        for r in range(self.tbl_matches.rowCount()):
            mid = self.tbl_matches.item(r, 0).data(Qt.ItemDataRole.UserRole)
            if mid == match_id:
                row = r
                break
        if row is None:
            return

        s1 = _int_or_none(self.tbl_matches.item(row, 4).text() if self.tbl_matches.item(row, 4) else "")
        s2 = _int_or_none(self.tbl_matches.item(row, 5).text() if self.tbl_matches.item(row, 5) else "")

        # Nur speichern, wenn beide Zahlen gesetzt und ungleich (kein Remis)
        if s1 is None or s2 is None or s1 == s2:
            return

        try:
            save_match_result(match_id, s1, s2)
            # Weiches Reload nur dieser Gruppe
            cur_row = self.tbl_matches.currentRow()
            cur_col = self.tbl_matches.currentColumn()
            self.reload_soft()
            if 0 <= cur_row < self.tbl_matches.rowCount():
                self.tbl_matches.setCurrentCell(cur_row, cur_col)
        except Exception as ex:
            QMessageBox.warning(self, "Fehler", f"Speichern fehlgeschlagen:\n{ex}")


# ---------- Gesamt-Ansicht ----------
class GruppenphaseView(QWidget):
    """
    Gruppenphase:
    - Oben Turnierauswahl + Buttons
    - Pro Gruppe ein Panel (links Tabelle, rechts Spielplan) mit fixen Spaltenbreiten
    - Kein springender Inhalt; nur weiche Teil-Reloads
    - NEU: Wenn noch KEIN Spielplan existiert, wird automatisch Round-Robin generiert.
    """
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)

        self._group_panels: List[_GroupPanel] = []

        root = QVBoxLayout(self)
        root.setContentsMargins(6, 6, 6, 6)
        root.setSpacing(6)

        # Header
        hdr = QHBoxLayout()
        hdr.setSpacing(8)
        root.addLayout(hdr)

        hdr.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox()
        hdr.addWidget(self.cbo_turnier, 1)

        self.btn_reload = QPushButton("Neu laden")
        self.btn_reload.clicked.connect(self._reload_turniere_keep_selection)
        hdr.addWidget(self.btn_reload)

        # „Alle speichern“ ist obsolet; Eingaben werden pro Match gespeichert
        self.btn_save_all = QPushButton("Alle speichern")
        self.btn_save_all.setEnabled(False)
        hdr.addWidget(self.btn_save_all)

        hdr.addStretch(1)

        # Scrollbereich
        self.scroll = QScrollArea(self)
        self.scroll.setWidgetResizable(True)
        self._container = QWidget()
        self._container_lay = QVBoxLayout(self._container)
        self._container_lay.setContentsMargins(0, 0, 0, 0)
        self._container_lay.setSpacing(10)
        self.scroll.setWidget(self._container)
        root.addWidget(self.scroll, 1)

        # Init
        self._reload_turniere_keep_selection()
        self.cbo_turnier.currentIndexChanged.connect(self._load_groups)

    # --- Turnierhandling ---
    def _current_turnier_id(self) -> Optional[int]:
        data = self.cbo_turnier.currentData(Qt.ItemDataRole.UserRole)
        if isinstance(data, int):
            return data
        if isinstance(data, str) and data.isdigit():
            return int(data)
        return None

    def _reload_turniere_keep_selection(self):
        old = self._current_turnier_id()
        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        try:
            for tid, name, datum, modus, _ms in fetch_turniere():
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

        self._load_groups()

    # --- Gruppen laden ---
    def _clear_groups(self):
        for i in reversed(range(self._container_lay.count())):
            w = self._container_lay.itemAt(i).widget()
            if w:
                w.setParent(None)
                w.deleteLater()
        self._group_panels.clear()

    def _load_groups(self):
        tid = self._current_turnier_id()
        self._clear_groups()
        if not tid:
            return

        groups = sorted(fetch_groups(int(tid)), key=lambda x: x[1])

        # **NEU**: Falls noch kein Spielplan existiert → automatisch Round-Robin erzeugen
        try:
            if groups and not has_group_matches(int(tid)):
                generate_group_round_robin(int(tid))
        except Exception as ex:
            QMessageBox.warning(self, "Spielplan", f"Spielplan konnte nicht erzeugt werden:\n{ex}")

        if not groups:
            lbl = QLabel("Keine Gruppen vorhanden.")
            lbl.setStyleSheet("color:#777;")
            self._container_lay.addWidget(lbl)
            self._container_lay.addStretch(1)
            return

        for gid, gname in groups:
            panel = _GroupPanel(int(tid), int(gid), gname, self._container)
            self._container_lay.addWidget(panel)
            self._group_panels.append(panel)

        self._container_lay.addStretch(1)
