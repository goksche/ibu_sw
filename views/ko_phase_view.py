from typing import Optional, List, Tuple, Dict

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton, QHBoxLayout,
    QTableWidget, QTableWidgetItem, QMessageBox, QHeaderView, QAbstractItemView
)

from database.models import (
    fetch_turniere, fetch_ko_rounds, fetch_ko_matches,
    save_ko_result_and_propagate, ensure_bronze_from_semis, fetch_ko_champion
)


class KOPhaseView(QWidget):
    """
    Verbesserungen v0.9.6.1:
    - Turnier/Runden IDs via itemData(UserRole)
    - showEvent() Reload + 'Neu laden' + Auto-Refresh (5s)
    - Nur S1/S2 editierbar; gelöschte Turniere verschwinden, neue erscheinen sofort
    """
    def __init__(self, parent=None):
        super().__init__(parent)

        self._matches: List[Tuple] = []

        root = QVBoxLayout(self)

        title = QLabel("KO-Phase – Spielplan & Ergebnisse")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        row = QHBoxLayout()
        row.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox(); self.cbo_turnier.currentIndexChanged.connect(self._load_rounds_and_matches)
        row.addWidget(self.cbo_turnier, 2)

        row.addWidget(QLabel("Runde:"))
        self.cbo_runde = QComboBox(); self.cbo_runde.currentIndexChanged.connect(self._load_matches_only)
        row.addWidget(self.cbo_runde, 1)

        self.btn_reload = QPushButton("Neu laden"); self.btn_reload.clicked.connect(self.reload_turniere_keep_selection)
        row.addWidget(self.btn_reload)

        self.btn_save = QPushButton("Ergebnisse speichern"); self.btn_save.clicked.connect(self._save_results)
        row.addWidget(self.btn_save)

        self.btn_bronze = QPushButton("Bronze aus Halbfinals erzeugen"); self.btn_bronze.clicked.connect(self._ensure_bronze)
        row.addWidget(self.btn_bronze)

        self.btn_champion = QPushButton("Champion anzeigen"); self.btn_champion.clicked.connect(self._show_champion)
        row.addWidget(self.btn_champion)

        root.addLayout(row)

        self.tbl = QTableWidget(0, 5)
        self.tbl.setHorizontalHeaderLabels(["Match #", "Spieler 1", "Spieler 2", "S1", "S2"])
        self.tbl.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.tbl.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked
            | QAbstractItemView.EditTrigger.EditKeyPressed
            | QAbstractItemView.EditTrigger.AnyKeyPressed
        )
        root.addWidget(self.tbl)

        # Initial + Auto-Refresh
        self.reload_turniere_keep_selection()
        self._timer = QTimer(self)
        self._timer.setInterval(5000)
        self._timer.timeout.connect(self.reload_turniere_keep_selection)
        self._timer.start()

    # Auto-Reload beim Anzeigen
    def showEvent(self, event):
        super().showEvent(event)
        self.reload_turniere_keep_selection()

    # ----------------------------------------------------------
    # Helpers
    # ----------------------------------------------------------
    def _current_turnier_id(self) -> Optional[int]:
        return self.cbo_turnier.currentData(Qt.ItemDataRole.UserRole)

    def _current_runde(self) -> Optional[int]:
        return self.cbo_runde.currentData(Qt.ItemDataRole.UserRole)

    def _set_combo_by_id(self, combo: QComboBox, wanted_id: Optional[int]) -> None:
        if wanted_id is None:
            return
        for i in range(combo.count()):
            if combo.itemData(i, Qt.ItemDataRole.UserRole) == wanted_id:
                combo.setCurrentIndex(i)
                return

    # ----------------------------------------------------------
    # Laden
    # ----------------------------------------------------------
    def reload_turniere_keep_selection(self):
        old_tid = self._current_turnier_id()
        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        for (tid, name, datum, modus, _ms) in fetch_turniere():
            label = f"{datum} – {name} ({modus})".strip()
            self.cbo_turnier.addItem(label, int(tid))
        self.cbo_turnier.blockSignals(False)

        if old_tid is not None:
            self._set_combo_by_id(self.cbo_turnier, old_tid)
        if self.cbo_turnier.currentIndex() < 0 and self.cbo_turnier.count() > 0:
            self.cbo_turnier.setCurrentIndex(0)

        self._load_rounds_and_matches()

    def _load_rounds_and_matches(self):
        self.cbo_runde.blockSignals(True)
        self.cbo_runde.clear()
        tid = self._current_turnier_id()
        if not tid:
            self._load_matches_into_table([])
            self.cbo_runde.blockSignals(False)
            return

        rounds = fetch_ko_rounds(tid)  # [1,2,..., 99 fuer Bronze]
        # Runde 99 als "Bronze" beschriften
        for r in rounds:
            label = "Bronze (99)" if int(r) == 99 else f"Runde {int(r)}"
            self.cbo_runde.addItem(label, int(r))

        self.cbo_runde.blockSignals(False)
        if self.cbo_runde.count() > 0 and self.cbo_runde.currentIndex() < 0:
            self.cbo_runde.setCurrentIndex(0)

        self._load_matches_only()

    def _load_matches_only(self):
        tid = self._current_turnier_id()
        runde = self._current_runde()
        if not tid or runde is None:
            self._load_matches_into_table([])
            return

        matches = fetch_ko_matches(tid, int(runde))  # (id, match_no, n1, n2, s1, s2)
        self._load_matches_into_table(matches)

    def _load_matches_into_table(self, matches: List[Tuple[int, int, str, str, Optional[int], Optional[int]]]):
        self._matches = matches[:]
        self.tbl.setRowCount(len(matches))
        for r, (mid, match_no, n1, n2, s1, s2) in enumerate(matches):
            it_no = QTableWidgetItem(str(match_no)); it_no.setFlags(it_no.flags() & ~Qt.ItemFlag.ItemIsEditable)
            it_no.setData(Qt.ItemDataRole.UserRole, int(mid))
            self.tbl.setItem(r, 0, it_no)

            ip1 = QTableWidgetItem(n1); ip1.setFlags(ip1.flags() & ~Qt.ItemFlag.ItemIsEditable)
            ip2 = QTableWidgetItem(n2); ip2.setFlags(ip2.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl.setItem(r, 1, ip1)
            self.tbl.setItem(r, 2, ip2)

            s1_item = QTableWidgetItem("" if s1 is None else str(s1))
            s2_item = QTableWidgetItem("" if s2 is None else str(s2))
            s1_item.setFlags((s1_item.flags() | Qt.ItemFlag.ItemIsEditable) & ~Qt.ItemFlag.ItemIsUserCheckable)
            s2_item.setFlags((s2_item.flags() | Qt.ItemFlag.ItemIsEditable) & ~Qt.ItemFlag.ItemIsUserCheckable)
            self.tbl.setItem(r, 3, s1_item)
            self.tbl.setItem(r, 4, s2_item)

    # ----------------------------------------------------------
    # Aktionen
    # ----------------------------------------------------------
    def _save_results(self):
        if not self._matches:
            QMessageBox.information(self, "Hinweis", "Kein Spiel geladen.")
            return

        changed = 0
        tid = self._current_turnier_id()
        for r, (mid, _mno, _n1, _n2, _s1_old, _s2_old) in enumerate(self._matches):
            s1_txt = self.tbl.item(r, 3).text() if self.tbl.item(r, 3) else ""
            s2_txt = self.tbl.item(r, 4).text() if self.tbl.item(r, 4) else ""

            def parse(v):
                v = (v or "").strip()
                if v == "":
                    return None
                try:
                    return int(v)
                except ValueError:
                    raise

            try:
                s1 = parse(s1_txt); s2 = parse(s2_txt)
            except ValueError:
                QMessageBox.warning(self, "Eingabefehler", f"Ungueltiger Wert in Zeile {r+1}. Nur ganze Zahlen oder leer.")
                return

            if s1 is not None and s2 is not None and s1 == s2:
                QMessageBox.warning(self, "Ungueltig", f"Zeile {r+1}: Unentschieden ist nicht erlaubt.")
                return

            save_ko_result_and_propagate(mid, s1, s2, tid)
            changed += 1

        QMessageBox.information(self, "OK", f"{changed} Spiele gespeichert.")
        self._load_matches_only()

    def _ensure_bronze(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.information(self, "Hinweis", "Kein Turnier ausgewaehlt.")
            return
        if ensure_bronze_from_semis(tid):
            QMessageBox.information(self, "OK", "Bronze-Spiel wurde angelegt/aktualisiert.")
        else:
            QMessageBox.information(self, "Hinweis", "Bronze konnte noch nicht erzeugt werden (beide Halbfinals fertig?).")
        self._load_rounds_and_matches()

    def _show_champion(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.information(self, "Hinweis", "Kein Turnier ausgewaehlt.")
            return
        winner = fetch_ko_champion(tid)
        if not winner:
            QMessageBox.information(self, "Hinweis", "Finale noch nicht entschieden.")
            return
        pid, name = winner
        QMessageBox.information(self, "Champion", f"Sieger: {name} (ID {pid})")
