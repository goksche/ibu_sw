from __future__ import annotations
from typing import List, Dict, Optional, Tuple, Any
import sqlite3
from pathlib import Path

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton, QHBoxLayout,
    QTableWidget, QTableWidgetItem, QMessageBox, QSplitter, QHeaderView,
    QAbstractItemView
)

from database.models import (
    fetch_turniere, fetch_groups, fetch_group_matches, save_match_result,
    generate_group_round_robin, has_group_matches, clear_group_matches,
)

# --------------------------------------------------------------
# Konstanten / DB-Pfad
# --------------------------------------------------------------
DELETE_PASSWORD = "6460"
DB_PATH = Path(__file__).resolve().parents[1] / "data" / "ibu.sqlite"

# Ranking-Modi
RANK_MODE_LABEL_TO_KEY = {
    "Punkte (3/0)": "punkte",
    "Differenz (Sets)": "differenz",
    "Siege (Anzahl)": "siege",
}
RANK_MODE_KEY_TO_LABEL = {v: k for k, v in RANK_MODE_LABEL_TO_KEY.items()}


# --------------------------------------------------------------
# DB / Helpers
# --------------------------------------------------------------

def _ensure_schema_v094(con: sqlite3.Connection) -> None:
    cur = con.cursor()
    # 1) Ranglisten-Modus je Turnier
    cur.execute("PRAGMA table_info(turniere);")
    cols = {row[1] for row in cur.fetchall()}
    if "group_rank_mode" not in cols:
        cur.execute("ALTER TABLE turniere ADD COLUMN group_rank_mode TEXT NOT NULL DEFAULT 'punkte';")

    # 2) Dartscheiben-Tabelle (CRUD ist im Einstellungen-Tab)
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

    # 3) Board-Zuordnung pro Gruppenspiel
    cur.execute("PRAGMA table_info(spiele);")
    s_cols = {row[1] for row in cur.fetchall()}
    if "board_id" not in s_cols:
        cur.execute("ALTER TABLE spiele ADD COLUMN board_id INTEGER NULL REFERENCES dartscheiben(id);")
    con.commit()


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH.as_posix())
    con.row_factory = sqlite3.Row
    _ensure_schema_v094(con)
    return con


def _round_col(con: sqlite3.Connection) -> str:
    cols = {r[1] for r in con.execute("PRAGMA table_info(spiele)").fetchall()}
    return "spieltag" if "spieltag" in cols else "runde"


def _get_turnier_rank_mode(tid: int) -> str:
    with _db() as con:
        row = con.execute("SELECT group_rank_mode FROM turniere WHERE id=?", (tid,)).fetchone()
        return (row[0] if row else None) or "punkte"


def _set_turnier_rank_mode(tid: int, mode: str) -> None:
    if mode not in ("punkte", "differenz", "siege"):
        mode = "punkte"
    with _db() as con:
        con.execute("UPDATE turniere SET group_rank_mode=? WHERE id=?", (mode, tid))
        con.commit()


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


def _assign_boards_fair_for_group(tid: int, gid: int) -> None:
    """Weist allen Gruppenspielen faire Boards zu (min Spieler×Board-Nutzung, dann globale Last, dann Nummer)."""
    boards = _boards_list(True)
    if not boards:
        return

    with _db() as con:
        rc = _round_col(con)
        matches = con.execute(
            f"""
            SELECT s.id as mid, s.{rc} as runde, s.match_no, s.p1_id, s.p2_id, s.board_id
            FROM spiele s
            WHERE s.turnier_id=? AND s.gruppe_id=?
            ORDER BY s.{rc}, s.match_no, s.id
            """,
            (tid, gid),
        ).fetchall()

        # Nutzungszähler
        count_sb: Dict[Tuple[int, int], int] = {}
        count_b: Dict[int, int] = {int(b["id"]): 0 for b in boards}

        # Historie (alle Spiele des Turniers)
        hist = con.execute(
            "SELECT p1_id, p2_id, board_id FROM spiele WHERE turnier_id=? AND board_id IS NOT NULL",
            (tid,),
        ).fetchall()
        for row in hist:
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
                # vorhandene Zuweisung mitzählen
                b = int(m["board_id"])
                for pid in (m["p1_id"], m["p2_id"]):
                    if pid is None:
                        continue
                    count_sb[(pid, b)] = count_sb.get((pid, b), 0) + 1
                count_b[b] = count_b.get(b, 0) + 1
                continue

            p1, p2 = m["p1_id"], m["p2_id"]
            best_bid = None
            best_tuple = None  # (sum players on board, global board load, board number)
            for b in boards:
                bid = int(b["id"])
                sum_players = 0
                for pid in (p1, p2):
                    if pid is None:
                        continue
                    sum_players += count_sb.get((pid, bid), 0)
                tup = (sum_players, count_b.get(bid, 0), int(b["nummer"]))
                if best_tuple is None or tup < best_tuple:
                    best_tuple = tup
                    best_bid = bid

            if best_bid is None:
                best_bid = int(boards[0]["id"])

            con.execute("UPDATE spiele SET board_id=? WHERE id=?", (best_bid, int(m["mid"])) )
            # Zähler updaten
            count_b[best_bid] = count_b.get(best_bid, 0) + 1
            for pid in (p1, p2):
                if pid is None:
                    continue
                count_sb[(pid, best_bid)] = count_sb.get((pid, best_bid), 0) + 1
        con.commit()


# --------------------------------------------------------------
# Ranglistenberechnung (inkl. Tie-Breaks & 3er-Tabelle)
# --------------------------------------------------------------

def _fetch_group_raw(con: sqlite3.Connection, tid: int, gid: int) -> Tuple[List[int], Dict[int, Dict[str, Any]], List[sqlite3.Row]]:
    """Liefert (spieler_ids, spieler_info, matches_rows). Verwendet Tabelle 'teilnehmer'."""
    players = con.execute(
        """
        SELECT DISTINCT t.id, COALESCE(NULLIF(TRIM(t.spitzname),''), t.name) AS name
        FROM spiele s
        JOIN teilnehmer t ON t.id IN (s.p1_id, s.p2_id)
        WHERE s.turnier_id=? AND s.gruppe_id=?
        ORDER BY name
        """,
        (tid, gid),
    ).fetchall()
    pids = [int(r["id"]) for r in players]
    pinfo = {int(r["id"]): {"name": str(r["name"]) } for r in players}

    rc = _round_col(con)
    # Ergebnis-Spalten neutralisieren (sets1/sets2 ODER s1/s2)
    cols = {r[1] for r in con.execute("PRAGMA table_info(spiele)").fetchall()}
    s1c = "sets1" if "sets1" in cols else ("s1" if "s1" in cols else "")
    s2c = "sets2" if "sets2" in cols else ("s2" if "s2" in cols else "")
    if not s1c or not s2c:
        raise RuntimeError("Spalten fuer Ergebnisse (sets1/sets2 oder s1/s2) fehlen in 'spiele'.")

    matches = con.execute(
        f"""
        SELECT id, {rc} AS runde, match_no, p1_id, p2_id, {s1c} AS sets1, {s2c} AS sets2
        FROM spiele
        WHERE turnier_id=? AND gruppe_id=?
        ORDER BY {rc}, match_no, id
        """,
        (tid, gid),
    ).fetchall()
    return pids, pinfo, matches


def _compute_table(tid: int, gid: int, mode: str) -> Tuple[List[Dict[str, Any]], List[List[int]]]:
    with _db() as con:
        pids, pinfo, matches = _fetch_group_raw(con, tid, gid)

        stats = {
            pid: {"spiele": 0, "siege": 0, "niederlagen": 0, "lf": 0, "la": 0, "pkt": 0}
            for pid in pids
        }

        # Ergebnisse verarbeiten (keine Unentschieden erlaubt)
        for m in matches:
            s1, s2 = m["sets1"], m["sets2"]
            p1, p2 = m["p1_id"], m["p2_id"]
            if s1 is None or s2 is None:
                continue
            if p1 is None or p2 is None:
                continue
            s1 = int(s1); s2 = int(s2)
            stats[p1]["spiele"] += 1
            stats[p2]["spiele"] += 1
            stats[p1]["lf"] += s1
            stats[p1]["la"] += s2
            stats[p2]["lf"] += s2
            stats[p2]["la"] += s1
            if s1 == s2:
                continue
            if s1 > s2:
                stats[p1]["siege"] += 1
                stats[p2]["niederlagen"] += 1
                stats[p1]["pkt"] += 3
            else:
                stats[p2]["siege"] += 1
                stats[p1]["niederlagen"] += 1
                stats[p2]["pkt"] += 3

        def sort_key(pid: int) -> Tuple:
            diff = stats[pid]["lf"] - stats[pid]["la"]
            if mode == "punkte":
                return (-stats[pid]["pkt"], -diff, -stats[pid]["siege"], -stats[pid]["lf"], stats[pid]["la"], pinfo[pid]["name"])  # noqa
            elif mode == "differenz":
                return (-diff, -stats[pid]["pkt"], -stats[pid]["siege"], -stats[pid]["lf"], stats[pid]["la"], pinfo[pid]["name"])  # noqa
            else:  # siege
                return (-stats[pid]["siege"], -stats[pid]["pkt"], -diff, -stats[pid]["lf"], stats[pid]["la"], pinfo[pid]["name"])  # noqa

        ordered = sorted(pids, key=sort_key)

        def primary_tuple(pid: int) -> Tuple:
            diff = stats[pid]["lf"] - stats[pid]["la"]
            if mode == "punkte":
                return (stats[pid]["pkt"], diff)
            elif mode == "differenz":
                return (diff,)
            else:
                return (stats[pid]["siege"], stats[pid]["pkt"], diff)

        tie_groups: List[List[int]] = []
        i = 0; n = len(ordered)
        while i < n:
            j = i + 1
            base = primary_tuple(ordered[i])
            group = [ordered[i]]
            while j < n and primary_tuple(ordered[j]) == base:
                group.append(ordered[j]); j += 1
            if len(group) >= 2:
                resolved = _resolve_ties_subtable(group, stats, matches, pinfo, mode)
                ordered[i:j] = resolved
                if len(resolved) >= 2:
                    # Noch immer voll gleich? -> Stichmatch-Gruppe merken
                    def sk(pid: int):
                        diff = stats[pid]["lf"] - stats[pid]["la"]
                        if mode == "punkte":
                            return (stats[pid]["pkt"], diff, stats[pid]["siege"])
                        elif mode == "differenz":
                            return (diff, stats[pid]["pkt"], stats[pid]["siege"])
                        else:
                            return (stats[pid]["siege"], stats[pid]["pkt"], diff)
                    base2 = sk(resolved[0])
                    if all(sk(x) == base2 for x in resolved):
                        tie_groups.append(resolved[:])
            i = j

        rows: List[Dict[str, Any]] = []
        for pid in ordered:
            diff = stats[pid]["lf"] - stats[pid]["la"]
            rows.append({
                "spieler": pinfo[pid]["name"],
                "spiele": stats[pid]["spiele"],
                "siege": stats[pid]["siege"],
                "niederlagen": stats[pid]["niederlagen"],
                "lf": stats[pid]["lf"],
                "la": stats[pid]["la"],
                "diff": diff,
                "pkt": stats[pid]["pkt"],
                "pid": pid,
            })
        return rows, tie_groups


def _resolve_ties_subtable(group: List[int], stats: Dict[int, Dict[str, int]], matches: List[sqlite3.Row], pinfo: Dict[int, Dict[str, str]], mode: str) -> List[int]:
    # Sub-Stats aus Direktbegegnungen
    sub = {pid: {"siege": 0, "pkt": 0, "lf": 0, "la": 0} for pid in group}
    for m in matches:
        p1, p2, s1, s2 = m["p1_id"], m["p2_id"], m["sets1"], m["sets2"]
        if s1 is None or s2 is None:
            continue
        if p1 in sub and p2 in sub:
            s1 = int(s1); s2 = int(s2)
            sub[p1]["lf"] += s1; sub[p1]["la"] += s2
            sub[p2]["lf"] += s2; sub[p2]["la"] += s1
            if s1 == s2:
                continue
            if s1 > s2:
                sub[p1]["siege"] += 1; sub[p1]["pkt"] += 3
            else:
                sub[p2]["siege"] += 1; sub[p2]["pkt"] += 3

    def key(pid: int) -> Tuple:
        diff = sub[pid]["lf"] - sub[pid]["la"]
        if mode == "punkte":
            return (-sub[pid]["pkt"], -diff, pinfo[pid]["name"])  # Punkte -> Diff -> Direktbegegnung steckt in Subtabelle
        elif mode == "differenz":
            return (-diff, pinfo[pid]["name"])  # Differenz -> Direktbegegnung
        else:
            return (-sub[pid]["siege"], -sub[pid]["pkt"], -diff, pinfo[pid]["name"])  # Siege -> Punkte -> Diff

    return sorted(group, key=key)


# --------------------------------------------------------------
# View-Klasse
# --------------------------------------------------------------
class GruppenphaseView(QWidget):
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._turnier_map: Dict[str, int] = {}
        self._group_map: Dict[str, int] = {}
        self._matches: List[Tuple] = []

        root = QVBoxLayout(self)

        title = QLabel("Gruppenphase – Spielplan & Ergebnisse (v0.9.5)")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # Auswahlzeile
        row = QHBoxLayout()
        row.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox(); self.cbo_turnier.currentIndexChanged.connect(self._load_groups_and_matches)
        row.addWidget(self.cbo_turnier, 2)

        row.addWidget(QLabel("Gruppe:"))
        self.cbo_group = QComboBox(); self.cbo_group.currentIndexChanged.connect(self._load_matches_only)
        row.addWidget(self.cbo_group, 1)

        # Ranglisten-Modus
        row.addWidget(QLabel("Ranglisten-Modus:"))
        self.cbo_rankmode = QComboBox()
        for label in RANK_MODE_LABEL_TO_KEY.keys():
            self.cbo_rankmode.addItem(label)
        self.cbo_rankmode.currentIndexChanged.connect(self._on_rankmode_changed)
        row.addWidget(self.cbo_rankmode, 1)

        self.btn_reload = QPushButton("Neu laden"); self.btn_reload.clicked.connect(self._reload_turniere_keep_selection)
        row.addWidget(self.btn_reload)

        self.btn_generate = QPushButton("Plan erstellen/überschreiben"); self.btn_generate.clicked.connect(self._generate_plan)
        row.addWidget(self.btn_generate)

        self.btn_clear = QPushButton("Plan löschen"); self.btn_clear.clicked.connect(self._clear_plan)
        row.addWidget(self.btn_clear)

        # Nur noch Zuweisung (CRUD in Einstellungen)
        self.btn_assign_boards = QPushButton("Scheiben neu verteilen"); self.btn_assign_boards.clicked.connect(self._assign_boards_current_group)
        row.addWidget(self.btn_assign_boards)

        root.addLayout(row)

        # Split: links Spiele, rechts Tabelle
        splitter = QSplitter(); splitter.setOrientation(Qt.Orientation.Horizontal)

        # Tabelle: Spiele (+ Board)
        self.tbl_matches = QTableWidget(0, 6)
        self.tbl_matches.setHorizontalHeaderLabels(["Runde", "Spieler 1", "Spieler 2", "S1", "S2", "Scheibe"])
        self.tbl_matches.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        # ✅ Editier-Modus: Benutzer kann S1/S2 per Doppelklick/AnyKey/EditKey öffnen
        self.tbl_matches.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked
            | QAbstractItemView.EditTrigger.EditKeyPressed
            | QAbstractItemView.EditTrigger.AnyKeyPressed
        )
        splitter.addWidget(self.tbl_matches)

        # Tabelle: Rangliste (komplett read-only)
        self.tbl_table = QTableWidget(0, 8)
        self.tbl_table.setHorizontalHeaderLabels(["Spieler", "Spiele", "Siege", "Niederl.", "Legs +", "Legs -", "Diff", "Punkte"])
        self.tbl_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.tbl_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        splitter.addWidget(self.tbl_table)

        root.addWidget(splitter)

        # Buttonzeile unten
        bottom = QHBoxLayout()
        self.btn_save_results = QPushButton("Ergebnisse speichern"); self.btn_save_results.clicked.connect(self._save_results)
        bottom.addWidget(self.btn_save_results)
        bottom.addStretch(); root.addLayout(bottom)

        # Initial laden
        self._load_turniere()

    # Auto-Reload beim Anzeigen
    def showEvent(self, event):
        super().showEvent(event)
        self._reload_turniere_keep_selection()

    # ----------------------------------------------------------
    # Laden
    # ----------------------------------------------------------
    def _current_turnier_id(self) -> Optional[int]:
        return self._turnier_map.get(self.cbo_turnier.currentText())

    def _current_group_id(self) -> Optional[int]:
        return self._group_map.get(self.cbo_group.currentText())

    def _load_turniere(self):
        self.cbo_turnier.blockSignals(True); self.cbo_turnier.clear(); self._turnier_map.clear()
        for tid, name, datum, modus, _ms in fetch_turniere():
            label = f"{datum} – {name} ({modus})"; self._turnier_map[label] = tid; self.cbo_turnier.addItem(label)
        self.cbo_turnier.blockSignals(False)
        self._load_groups_and_matches()

    def _reload_turniere_keep_selection(self):
        old_tid: Optional[int] = self._current_turnier_id()
        self.cbo_turnier.blockSignals(True); self.cbo_turnier.clear(); self._turnier_map.clear()
        items = fetch_turniere(); tid_to_index: Dict[int, int] = {}
        for idx, (tid, name, datum, modus, _ms) in enumerate(items):
            label = f"{datum} – {name} ({modus})"; self._turnier_map[label] = tid; self.cbo_turnier.addItem(label); tid_to_index[tid] = idx
        self.cbo_turnier.blockSignals(False)
        if old_tid is not None and old_tid in tid_to_index: self.cbo_turnier.setCurrentIndex(tid_to_index[old_tid])
        elif items: self.cbo_turnier.setCurrentIndex(0)
        self._load_groups_and_matches()

    def _load_groups_and_matches(self):
        self.cbo_group.blockSignals(True); self.cbo_group.clear(); self._group_map.clear()
        tid = self._current_turnier_id()
        if not tid:
            self._load_matches_into_table([]); self._load_table_into_table([], [], show_dialog=False)
            self.cbo_group.blockSignals(False); return

        # Ranglisten-Modus laden/anzeigen
        mode_key = _get_turnier_rank_mode(tid)
        self.cbo_rankmode.blockSignals(True)
        self.cbo_rankmode.setCurrentText(RANK_MODE_KEY_TO_LABEL.get(mode_key, "Punkte (3/0)"))
        self.cbo_rankmode.blockSignals(False)

        for gid, gname in fetch_groups(tid):
            self._group_map[gname] = gid; self.cbo_group.addItem(gname)
        self.cbo_group.blockSignals(False)
        self._load_matches_only()

    def _load_matches_only(self):
        tid = self._current_turnier_id(); gid = self._current_group_id()
        if not tid or not gid:
            self._load_matches_into_table([]); self._load_table_into_table([], [], show_dialog=False); return

        matches = fetch_group_matches(tid, gid)  # (id, runde, match_no, p1, p2, s1, s2)

        # Board-Anzeige auflösen
        with _db() as con:
            rc = _round_col(con)
            rows = con.execute(
                f"SELECT id, board_id FROM spiele WHERE turnier_id=? AND gruppe_id=? ORDER BY {rc}, match_no, id",
                (tid, gid),
            ).fetchall()
            board_map: Dict[int, str] = {}
            for r in rows:
                b = _get_board(r["board_id"]) if r["board_id"] else None
                board_map[r["id"]] = _board_name(b)

        self._load_matches_into_table(matches, board_map)

        mode_key = _get_turnier_rank_mode(tid)
        rows, tie_groups = _compute_table(tid, gid, mode_key)
        # Beim Laden KEIN Popup
        self._load_table_into_table(rows, tie_groups, show_dialog=False)

    # ----------------------------------------------------------
    # UI-Füller
    # ----------------------------------------------------------
    def _load_matches_into_table(self, matches, board_map: Optional[Dict[int, str]] = None):
        self._matches = matches[:]  # (id, runde, match_no, p1, p2, s1, s2)
        self.tbl_matches.setRowCount(len(matches))
        for r, (mid, runde, _mno, p1, p2, s1, s2) in enumerate(matches):
            # Runde
            it_r = QTableWidgetItem(str(runde)); it_r.setFlags(it_r.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl_matches.setItem(r, 0, it_r)
            # Spieler (read-only)
            item_p1 = QTableWidgetItem(p1); item_p1.setFlags(item_p1.flags() & ~Qt.ItemFlag.ItemIsEditable)
            item_p2 = QTableWidgetItem(p2); item_p2.setFlags(item_p2.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl_matches.setItem(r, 1, item_p1)
            self.tbl_matches.setItem(r, 2, item_p2)
            # S1/S2 (einzige editierbare Felder)
            s1_item = QTableWidgetItem("" if s1 is None else str(s1))
            s2_item = QTableWidgetItem("" if s2 is None else str(s2))
            s1_item.setFlags((s1_item.flags() | Qt.ItemFlag.ItemIsEditable) & ~Qt.ItemFlag.ItemIsUserCheckable)
            s2_item.setFlags((s2_item.flags() | Qt.ItemFlag.ItemIsEditable) & ~Qt.ItemFlag.ItemIsUserCheckable)
            self.tbl_matches.setItem(r, 3, s1_item)
            self.tbl_matches.setItem(r, 4, s2_item)
            # Board (read-only)
            board_txt = board_map.get(mid, "") if board_map else ""
            b_item = QTableWidgetItem(board_txt); b_item.setFlags(b_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.tbl_matches.setItem(r, 5, b_item)
            # ID im UserRole hinterlegen auf einer read-only Zelle
            it_r.setData(Qt.ItemDataRole.UserRole, mid)

    def _load_table_into_table(self, rows: List[dict], tie_groups: List[List[int]], show_dialog: bool):
        self.tbl_table.setRowCount(len(rows))
        for r, row in enumerate(rows):
            for c, key in enumerate(["spieler", "spiele", "siege", "niederlagen", "lf", "la", "diff", "pkt"]):
                it = QTableWidgetItem(str(row[key]))
                it.setFlags(it.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.tbl_table.setItem(r, c, it)

        # Popup nur auf Aktion (nicht beim Laden)
        if show_dialog and tie_groups:
            turnier = self.cbo_turnier.currentText() or "(kein Turnier)"
            gruppe = self.cbo_group.currentText() or "(keine Gruppe)"
            namesets = []
            with _db() as con:
                for grp in tie_groups:
                    n = [con.execute("SELECT COALESCE(NULLIF(TRIM(spitzname),''), name) FROM teilnehmer WHERE id=?", (pid,)).fetchone()[0] for pid in grp]
                    namesets.append("- " + ", ".join(n))
            QMessageBox.information(
                self,
                f"Stichmatch erforderlich – {turnier} | Gruppe {gruppe}",
                "Folgende Spieler sind nach allen Regeln weiterhin gleichauf:\n" +
                "\n".join(namesets) +
                "\n\nBitte Stichmatch(s) austragen und Ergebnis(e) eintragen.")

    # ----------------------------------------------------------
    # Aktionen
    # ----------------------------------------------------------
    def _confirm(self, title: str, msg: str) -> bool:
        ret = QMessageBox.question(
            self, title, msg,
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        return ret == QMessageBox.StandardButton.Yes

    def _generate_plan(self):
        tid = self._current_turnier_id(); gid = self._current_group_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt."); return
        if not gid:
            QMessageBox.warning(self, "Fehler", "Keine Gruppe ausgewählt."); return

        if has_group_matches(tid):
            ok = self._confirm("Überschreiben bestätigen", "Vorhandene Gruppenspiele werden ersetzt (ohne Ergebnisse). Fortfahren?")
            if not ok: return

        generate_group_round_robin(tid)
        # Nach Erstellung: faire Scheibenverteilung (nur aktuelle Gruppe)
        _assign_boards_fair_for_group(tid, gid)

        QMessageBox.information(self, "OK", "Spielplan erzeugt und Scheiben verteilt.")
        self._load_groups_and_matches()

    def _clear_plan(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt."); return
        if not has_group_matches(tid):
            QMessageBox.information(self, "Hinweis", "Kein Spielplan vorhanden."); return

        ok = self._confirm("Löschen bestätigen", "Alle Gruppenspiele (ohne Ergebnisse) werden gelöscht. Fortfahren?")
        if not ok: return

        clear_group_matches(tid)
        QMessageBox.information(self, "OK", "Spielplan gelöscht.")
        self._load_groups_and_matches()

    def _save_results(self):
        if not self._matches:
            QMessageBox.information(self, "Hinweis", "Kein Spiel geladen."); return

        changed = 0
        for r, (mid, _runde, _mno, _p1, _p2, _s1_old, _s2_old) in enumerate(self._matches):
            s1_txt = self.tbl_matches.item(r, 3).text() if self.tbl_matches.item(r, 3) else ""
            s2_txt = self.tbl_matches.item(r, 4).text() if self.tbl_matches.item(r, 4) else ""

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
                QMessageBox.warning(self, "Eingabefehler", f"Ungültiger Wert in Zeile {r+1}. Nur ganze Zahlen oder leer.")
                return

            # Keine Unentschieden
            if s1 is not None and s2 is not None and s1 == s2:
                QMessageBox.warning(self, "Ungültig", f"Zeile {r+1}: Unentschieden ist nicht erlaubt.")
                return

            save_match_result(mid, s1, s2)
            changed += 1

        # Nach Speichern Tabelle berechnen und ggf. Popup zeigen
        tid = self._current_turnier_id(); gid = self._current_group_id()
        mode_key = _get_turnier_rank_mode(tid) if tid else "punkte"
        rows, tie_groups = _compute_table(tid, gid, mode_key) if (tid and gid) else ([], [])
        self._load_table_into_table(rows, tie_groups, show_dialog=True)

        QMessageBox.information(self, "OK", f"{changed} Spiele gespeichert.")
        # Liste neu laden (z. B. Board-Texte)
        self._load_matches_only()

    def _on_rankmode_changed(self):
        tid = self._current_turnier_id()
        if not tid: return
        label = self.cbo_rankmode.currentText(); mode = RANK_MODE_LABEL_TO_KEY.get(label, "punkte")
        _set_turnier_rank_mode(tid, mode)
        self._load_matches_only()

    def _assign_boards_current_group(self):
        tid = self._current_turnier_id(); gid = self._current_group_id()
        if not tid or not gid: return
        _assign_boards_fair_for_group(tid, gid)
        self._load_matches_only()
