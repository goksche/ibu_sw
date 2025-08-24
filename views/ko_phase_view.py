from __future__ import annotations
import random
import sqlite3
from pathlib import Path
from typing import List, Dict, Optional

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton,
    QSpinBox, QTableWidget, QTableWidgetItem, QMessageBox, QHeaderView,
)
from PyQt6.QtCore import Qt

from database.models import (
    fetch_turniere, generate_ko_bracket_total, fetch_ko_rounds, fetch_ko_matches,
    save_ko_result_and_propagate, clear_ko_matches, fetch_ko_champion,
    rebuild_rangliste_for_turnier
)

try:
    from database.models import ensure_bronze_from_semis
    _HAS_ENSURE_BRONZE = True
except Exception:
    _HAS_ENSURE_BRONZE = False

DELETE_PASSWORD = "6460"
BRONZE_LABEL = "Bronze"
DB_PATH = Path(__file__).resolve().parents[1] / "data" / "ibu.sqlite"


# -----------------------------
# DB-Helfer
# -----------------------------

def _ensure_schema_v094(con: sqlite3.Connection) -> None:
    cur = con.cursor()
    # Dartscheiben-Tabelle (global)
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
    # Board-Zuordnung pro KO-Spiel
    cur.execute("PRAGMA table_info(ko_spiele);")
    ks_cols = {row[1] for row in cur.fetchall()}
    if "board_id" not in ks_cols:
        try:
            cur.execute("ALTER TABLE ko_spiele ADD COLUMN board_id INTEGER NULL REFERENCES dartscheiben(id);")
        except Exception:
            pass
    con.commit()


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH.as_posix())
    con.row_factory = sqlite3.Row
    _ensure_schema_v094(con)
    return con


def _boards_list(only_active: bool = True) -> List[sqlite3.Row]:
    with _db() as con:
        if only_active:
            return list(con.execute("SELECT * FROM dartscheiben WHERE aktiv=1 ORDER BY nummer").fetchall())
        return list(con.execute("SELECT * FROM dartscheiben ORDER BY aktiv DESC, nummer").fetchall())


def _board_name(board_row: sqlite3.Row | None) -> str:
    if not board_row:
        return ""
    return f"{board_row['nummer']} – {board_row['name']}"


def _get_board(board_id: Optional[int]) -> Optional[sqlite3.Row]:
    if not board_id:
        return None
    with _db() as con:
        return con.execute("SELECT * FROM dartscheiben WHERE id=?", (board_id,)).fetchone()


def _assign_boards_fair_for_round(tid: int, rsel: int) -> None:
    boards = _boards_list(True)
    if not boards:
        return
    with _db() as con:
        # KO-Matches der Runde
        matches = con.execute(
            """
            SELECT id, p1_id, p2_id, board_id
            FROM ko_spiele
            WHERE turnier_id=? AND runde=?
            ORDER BY match_no, id
            """,
            (tid, int(rsel)),
        ).fetchall()

        # Zaehler
        count_sb: Dict[tuple[int, int], int] = {}
        count_b: Dict[int, int] = {b["id"]: 0 for b in boards}

        # Historie (Gruppen + KO)
        hist1 = con.execute(
            "SELECT p1_id, p2_id, board_id FROM spiele WHERE turnier_id=? AND board_id IS NOT NULL",
            (tid,),
        ).fetchall()
        hist2 = con.execute(
            "SELECT p1_id, p2_id, board_id FROM ko_spiele WHERE turnier_id=? AND board_id IS NOT NULL",
            (tid,),
        ).fetchall()
        for row in list(hist1) + list(hist2):
            b = row["board_id"]
            if not b:
                continue
            for pid in (row["p1_id"], row["p2_id"]):
                if pid is None:
                    continue
                count_sb[(pid, b)] = count_sb.get((pid, b), 0) + 1
            count_b[b] = count_b.get(b, 0) + 1

        # Zuweisung
        for m in matches:
            if m["board_id"]:
                bid = int(m["board_id"])
                for pid in (m["p1_id"], m["p2_id"]):
                    if pid is None:
                        continue
                    count_sb[(pid, bid)] = count_sb.get((pid, bid), 0) + 1
                count_b[bid] = count_b.get(bid, 0) + 1
                continue

            p1, p2 = m["p1_id"], m["p2_id"]
            best_bid = None
            best_tuple = None
            for b in boards:
                bid = b["id"]
                sum_players = 0
                for pid in (p1, p2):
                    if pid is None:
                        continue
                    sum_players += count_sb.get((pid, bid), 0)
                tup = (sum_players, count_b.get(bid, 0), b["nummer"])  # Spieler-last, global, Nummer
                if best_tuple is None or tup < best_tuple:
                    best_tuple = tup
                    best_bid = bid
            if best_bid is None:
                best_bid = boards[0]["id"]
            con.execute("UPDATE ko_spiele SET board_id=? WHERE id=?", (best_bid, m["id"]))
            count_b[best_bid] = count_b.get(best_bid, 0) + 1
            for pid in (p1, p2):
                if pid is None:
                    continue
                count_sb[(pid, best_bid)] = count_sb.get((pid, best_bid), 0) + 1
        con.commit()


# -----------------------------
# View
# -----------------------------
class KOPhaseView(QWidget):
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.current_tid = None
        self._build_ui()
        self._load_turniere()

    def _build_ui(self):
        root = QVBoxLayout(self)

        title = QLabel("KO-Phase – Bracket & Ergebnisse (v0.9.4)")
        title.setStyleSheet("font-size:18px; font-weight:600;")
        root.addWidget(title)

        top = QHBoxLayout(); root.addLayout(top)

        top.addWidget(QLabel("Turnier:"))
        self.cb_turnier = QComboBox(); self.cb_turnier.currentIndexChanged.connect(self._on_turnier_changed)
        top.addWidget(self.cb_turnier, 1)

        top.addWidget(QLabel("Gesamt-Qualifikanten (2,4,6,8,16,):"))
        self.sb_total = QSpinBox(); self.sb_total.setRange(2, 128); self.sb_total.setSingleStep(2); self.sb_total.setValue(8)
        top.addWidget(self.sb_total)

        self.btn_build = QPushButton("KO-Plan erstellen/überschreiben"); self.btn_build.clicked.connect(self._on_build_clicked)
        top.addWidget(self.btn_build)

        self.btn_clear = QPushButton("KO-Plan löschen"); self.btn_clear.clicked.connect(self._on_clear_clicked)
        top.addWidget(self.btn_clear)

        self.btn_reload = QPushButton("Neu laden"); self.btn_reload.clicked.connect(self._reload_turniere_keep_selection)
        top.addWidget(self.btn_reload)

        # NUR Zuweisung (keine Verwaltung hier)
        self.btn_assign_boards = QPushButton("Scheiben für Runde zuweisen"); self.btn_assign_boards.clicked.connect(self._assign_boards_current_round)
        top.addWidget(self.btn_assign_boards)

        mid = QHBoxLayout(); root.addLayout(mid)
        mid.addWidget(QLabel("Runde:"))
        self.cb_round = QComboBox(); self.cb_round.currentIndexChanged.connect(self._on_round_changed)
        mid.addWidget(self.cb_round)
        self.lbl_champion = QLabel("\U0001F3C6 Sieger: –"); mid.addWidget(self.lbl_champion, 1)

        self.tbl = QTableWidget(0, 6)
        self.tbl.setHorizontalHeaderLabels(["Match", "Spieler 1", "Spieler 2", "S1", "S2", "Scheibe"])
        self.tbl.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.tbl.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.tbl.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.tbl.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.tbl.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        self.tbl.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeMode.Stretch)
        root.addWidget(self.tbl)

        bottom = QHBoxLayout(); root.addLayout(bottom)
        bottom.addStretch(1)
        self.btn_save = QPushButton("Ergebnisse speichern"); self.btn_save.clicked.connect(self._save_results)
        bottom.addWidget(self.btn_save)

    def showEvent(self, event):
        super().showEvent(event)
        self._reload_turniere_keep_selection()

    # Hilfsfunktion: Runden-Label anhand Matchanzahl bestimmen
    def _round_display_name(self, tid: int, r: int) -> str:
        if r == 99:
            return BRONZE_LABEL
        matches = fetch_ko_matches(tid, int(r))
        n = len(matches)
        if n == 1:
            return "Finale"
        if n == 2:
            return "Halbfinale"
        if n == 4:
            return "Viertelfinale"
        if n == 8:
            return "Achtelfinale"
        if n == 16:
            return "Sechzehntelfinale"
        return f"Runde {r}"

    # Laden
    def _load_turniere(self):
        self.cb_turnier.blockSignals(True); self.cb_turnier.clear()
        items = fetch_turniere()
        for tid, name, datum, modus, _ms in items:
            self.cb_turnier.addItem(f"{datum} – {name} ({modus})".strip(), tid)
        self.cb_turnier.blockSignals(False)
        if items: self.cb_turnier.setCurrentIndex(0); self._on_turnier_changed()

    def _reload_turniere_keep_selection(self):
        old_tid = self.cb_turnier.currentData(); self.cb_turnier.blockSignals(True); self.cb_turnier.clear()
        items = fetch_turniere(); tid_to_index = {}
        for idx, (tid, name, datum, modus, _ms) in enumerate(items):
            self.cb_turnier.addItem(f"{datum} – {name} ({modus})".strip(), tid); tid_to_index[tid] = idx
        self.cb_turnier.blockSignals(False)
        if old_tid in tid_to_index: self.cb_turnier.setCurrentIndex(tid_to_index[old_tid])
        elif items: self.cb_turnier.setCurrentIndex(0)
        self._on_turnier_changed()

    def _on_turnier_changed(self):
        self.current_tid = self.cb_turnier.currentData()
        self._reload_rounds(); self._reload_matches(); self._update_champion()

    def _reload_rounds(self):
        self.cb_round.blockSignals(True); self.cb_round.clear()
        tid = self.current_tid
        if not tid:
            self.cb_round.blockSignals(False); return
        rounds = fetch_ko_rounds(tid)
        bronze_present = 99 in rounds
        rounds = [r for r in rounds if r != 99]
        for r in rounds:
            self.cb_round.addItem(self._round_display_name(tid, r), r)
        if bronze_present:
            self.cb_round.addItem(BRONZE_LABEL, 99)
        self.cb_round.blockSignals(False)
        if self.cb_round.count()>0: self.cb_round.setCurrentIndex(0)

    def _reload_matches(self):
        tid = self.current_tid
        if not tid: return
        if _HAS_ENSURE_BRONZE:
            try: ensure_bronze_from_semis(tid)
            except Exception: pass
        rsel = self.cb_round.currentData()
        if rsel is None: self._reload_rounds(); rsel = self.cb_round.currentData()
        matches = fetch_ko_matches(tid, int(rsel)) if rsel is not None else []

        with _db() as con:
            rows = con.execute(
                "SELECT id, board_id FROM ko_spiele WHERE turnier_id=? AND runde=? ORDER BY match_no, id",
                (tid, int(rsel) if rsel is not None else -1),
            ).fetchall()
            board_map: Dict[int, str] = {}
            for r in rows:
                b = _get_board(r["board_id"]) if r["board_id"] else None
                board_map[r["id"]] = _board_name(b)

        self.tbl.setRowCount(0)
        for mid, match_no, n1, n2, s1, s2 in matches:
            row = self.tbl.rowCount(); self.tbl.insertRow(row)
            self.tbl.setItem(row, 0, QTableWidgetItem(str(match_no)))
            self.tbl.item(row, 0).setData(Qt.ItemDataRole.UserRole, mid)
            it1 = QTableWidgetItem(n1); it2 = QTableWidgetItem(n2)
            it1.setFlags(it1.flags() & ~Qt.ItemFlag.ItemIsEditable)
            it2.setFlags(it2.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl.setItem(row, 1, it1); self.tbl.setItem(row, 2, it2)
            self.tbl.setItem(row, 3, QTableWidgetItem("" if s1 is None else str(s1)))
            self.tbl.setItem(row, 4, QTableWidgetItem("" if s2 is None else str(s2)))
            b_item = QTableWidgetItem(board_map.get(mid, "")); b_item.setFlags(b_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl.setItem(row, 5, b_item)
        self._update_champion()

    def _on_round_changed(self): self._reload_matches()

    def _update_champion(self):
        tid = self.current_tid
        if not tid: self.lbl_champion.setText("\U0001F3C6 Sieger: –"); return
        champ = fetch_ko_champion(tid)
        self.lbl_champion.setText(f"\U0001F3C6 Sieger: {champ[1]}" if champ else "\U0001F3C6 Sieger: –")

    def _on_build_clicked(self):
        tid = self.current_tid
        if not tid: return
        total = int(self.sb_total.value())
        try:
            if total == 6:
                # 6 Teilnehmer -> 8er-Bracket + 2 BYEs in Viertelfinale
                generate_ko_bracket_total(tid, 8)
                QMessageBox.information(self, "KO-Plan", "8er-Bracket erzeugt (für 6 Teilnehmer). Zwei BYEs werden zufällig vergeben.")
                self._reload_rounds()
                with _db() as con:
                    qms = con.execute("SELECT id FROM ko_spiele WHERE turnier_id=? AND runde=1 ORDER BY match_no, id", (tid,)).fetchall()
                    qm_ids = [row["id"] for row in qms]
                if len(qm_ids) >= 2:
                    for mid in random.sample(qm_ids, 2):
                        try: save_ko_result_and_propagate(mid, 1, 0, tid)
                        except TypeError: save_ko_result_and_propagate(mid, 1, 0)
            else:
                generate_ko_bracket_total(tid, total)

            # Erste vorhandene Runde ermitteln (nicht Bronze) und Boards sofort zuweisen
            rounds_now = [r for r in fetch_ko_rounds(tid) if r != 99]
            if rounds_now:
                first_round = min(rounds_now)
                _assign_boards_fair_for_round(tid, first_round)

            QMessageBox.information(self, "KO-Plan", "KO-Plan wurde erstellt/überschrieben.")
            self._reload_rounds(); self._reload_matches()
        except Exception as e:
            QMessageBox.critical(self, "Fehler", str(e))

    def _on_clear_clicked(self):
        tid = self.current_tid
        if not tid: return
        clear_ko_matches(tid)
        self._reload_rounds(); self._reload_matches()
        QMessageBox.information(self, "KO-Plan", "KO-Plan wurde gelöscht.")

    def _save_results(self):
        tid = self.current_tid
        if not tid: return
        for row in range(self.tbl.rowCount()):
            mid = self.tbl.item(row, 0).data(Qt.ItemDataRole.UserRole)
            try:
                s1_txt = (self.tbl.item(row, 3).text() if self.tbl.item(row, 3) else "").strip()
                s2_txt = (self.tbl.item(row, 4).text() if self.tbl.item(row, 4) else "").strip()
                s1 = int(s1_txt) if s1_txt != "" else None
                s2 = int(s2_txt) if s2_txt != "" else None
            except Exception:
                QMessageBox.warning(self, "Fehler beim Speichern", f"Match {mid}: Ungültige Eingaben.")
                return
            if s1 is not None and s2 is not None and s1 == s2:
                QMessageBox.warning(self, "Ungültig", f"Match {mid}: Unentschieden ist nicht erlaubt.")
                return
            try:
                save_ko_result_and_propagate(mid, s1, s2, tid)
            except TypeError:
                save_ko_result_and_propagate(mid, s1, s2)
            except Exception as e:
                QMessageBox.critical(self, "Fehler beim Speichern", f"Match {mid}: {e}")
                return
        try: rebuild_rangliste_for_turnier(tid)
        except Exception: pass
        QMessageBox.information(self, "Gespeichert", "Ergebnisse gespeichert.")
        self._reload_rounds(); self._reload_matches()

    def _assign_boards_current_round(self):
        tid = self.current_tid; rsel = self.cb_round.currentData()
        if not tid or rsel is None: return
        _assign_boards_fair_for_round(tid, int(rsel)); self._reload_matches()
