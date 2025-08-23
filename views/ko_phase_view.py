# views/ko_phase_view.py
# v0.7-Ansicht (klassische Tabelle) + Bronze-Runde (automatisch)
# Fix: Sieger-Anzeige ermittelt ausschließlich den Final-Sieger (Bronze wird ignoriert).
# Finale & Bronze werden ohne Propagation direkt gespeichert; andere Runden via save_ko_result_and_propagate.

from __future__ import annotations

import os
import sqlite3
from typing import List, Optional

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton, QHBoxLayout,
    QTableWidget, QTableWidgetItem, QMessageBox, QSplitter, QSpinBox,
    QInputDialog, QLineEdit
)

from database.models import (
    fetch_turniere, fetch_ko_rounds, fetch_ko_matches, save_ko_result_and_propagate,
    generate_ko_bracket_total, clear_ko_matches, has_ko_matches, has_recorded_ko_results,
    fetch_groups, compute_group_table, fetch_ko_champion  # bleibt importiert, wird aber nicht genutzt für die Anzeige
)

# Optionaler DB-Pfad aus models; Fallback auf ./data/ibu.sqlite
try:
    from database.models import DB_PATH as MODELS_DB_PATH
except Exception:
    MODELS_DB_PATH = None

def _project_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

DB_PATH = MODELS_DB_PATH or os.path.join(_project_root(), "data", "ibu.sqlite")

DELETE_PASSWORD = "6460"
BRONZE_ROUND = 99  # interne Rundennummer fuer "Kleines Finale"


class KOPhaseView(QWidget):
    def __init__(self):
        super().__init__()
        self._turnier_map = {}   # Anzeige -> id
        self._rounds: List[int] = []
        self._matches = []       # (id, match_no, p1, p2, s1, s2)

        root = QVBoxLayout(self)

        title = QLabel("KO-Phase – Bracket & Ergebnisse")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # Kopfzeile
        row = QHBoxLayout()
        row.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox()
        self.cbo_turnier.currentIndexChanged.connect(self._load_rounds_and_matches)
        row.addWidget(self.cbo_turnier, 2)

        row.addWidget(QLabel("Gesamt-Qualifikanten (2,4,8,16 …):"))
        self.spn_total = QSpinBox()
        self.spn_total.setRange(2, 64)
        self.spn_total.setSingleStep(2)
        self.spn_total.setValue(8)
        row.addWidget(self.spn_total)

        self.btn_generate = QPushButton("KO-Plan erstellen/überschreiben")
        self.btn_generate.clicked.connect(self._generate_bracket)
        row.addWidget(self.btn_generate)

        self.btn_clear = QPushButton("KO-Plan löschen")
        self.btn_clear.clicked.connect(self._clear_bracket)
        row.addWidget(self.btn_clear)

        self.btn_reload = QPushButton("Neu laden")
        self.btn_reload.clicked.connect(self._load_turniere)
        row.addWidget(self.btn_reload)

        root.addLayout(row)

        # Rundenzeile
        rline = QHBoxLayout()
        rline.addWidget(QLabel("Runde:"))
        self.cbo_round = QComboBox()
        self.cbo_round.currentIndexChanged.connect(self._load_matches_only)
        rline.addWidget(self.cbo_round, 1)
        self.lbl_champion = QLabel("")
        self.lbl_champion.setStyleSheet("font-weight: bold;")
        rline.addWidget(self.lbl_champion, 2)
        root.addLayout(rline)

        splitter = QSplitter()
        splitter.setOrientation(Qt.Orientation.Horizontal)

        self.tbl_matches = QTableWidget(0, 5)
        self.tbl_matches.setHorizontalHeaderLabels(["Match", "Spieler 1", "Spieler 2", "S1", "S2"])
        self.tbl_matches.horizontalHeader().setStretchLastSection(True)
        splitter.addWidget(self.tbl_matches)

        root.addWidget(splitter)

        bottom = QHBoxLayout()
        self.btn_save = QPushButton("Ergebnisse speichern")
        self.btn_save.clicked.connect(self._save_results)
        bottom.addWidget(self.btn_save)
        bottom.addStretch()
        root.addLayout(bottom)

        self._load_turniere()

    # ---------------- Hilfen ----------------
    def _current_turnier_id(self):
        return self._turnier_map.get(self.cbo_turnier.currentText())

    def _round_name_for(self, round_index: int, total_qualifiers: int) -> str:
        if total_qualifiers is None or total_qualifiers <= 0:
            return f"Runde {round_index}"
        size_this_round = total_qualifiers // (2 ** (round_index - 1))
        mapping_short = {16: "Achtel", 8: "Viertel", 4: "Halb", 2: "Finale"}
        return mapping_short.get(size_this_round, f"Runde {round_index}")

    def _round1_total_qualifiers(self, turnier_id: int) -> int:
        rounds = fetch_ko_rounds(turnier_id)
        if 1 in rounds:
            matches = fetch_ko_matches(turnier_id, 1)
            return max(0, len(matches) * 2)
        return int(self.spn_total.value())

    def _db(self) -> sqlite3.Connection:
        con = sqlite3.connect(DB_PATH)
        con.row_factory = sqlite3.Row
        return con

    # ------------- Bronze/Finale: Ableiten/Anlegen/Erkennen -------------
    def _semi_round_index(self, total_qual: int) -> Optional[int]:
        if not self._rounds:
            return None
        for r in self._rounds:
            size = total_qual // (2 ** (r - 1))
            if size == 4:
                return r
        return None

    def _final_round_index(self, total_qual: int) -> Optional[int]:
        if not self._rounds:
            return None
        for r in self._rounds:
            size = total_qual // (2 ** (r - 1))
            if size == 2:
                return r
        return None

    def _bronze_exists(self, tid: int) -> bool:
        with self._db() as con:
            row = con.execute(
                "SELECT 1 FROM ko_spiele WHERE turnier_id=? AND runde=? LIMIT 1",
                (tid, BRONZE_ROUND)
            ).fetchone()
            return row is not None

    def _ensure_bronze_from_semis(self, tid: int, total_qual: int) -> None:
        semi_idx = self._semi_round_index(total_qual)
        if semi_idx is None:
            return
        with self._db() as con:
            semis = con.execute(
                "SELECT p1_id, p2_id, s1, s2 FROM ko_spiele "
                "WHERE turnier_id=? AND runde=? ORDER BY match_no ASC",
                (tid, semi_idx)
            ).fetchall()

            losers = []
            for r in semis:
                if r["s1"] is None or r["s2"] is None:
                    continue
                try:
                    s1 = int(r["s1"]); s2 = int(r["s2"])
                except Exception:
                    continue
                if s1 == s2:
                    continue
                loser = int(r["p1_id"]) if s1 < s2 else int(r["p2_id"])
                losers.append(loser)

            if len(losers) < 2:
                return

            bron = con.execute(
                "SELECT id FROM ko_spiele WHERE turnier_id=? AND runde=? LIMIT 1",
                (tid, BRONZE_ROUND)
            ).fetchone()
            if bron is None:
                con.execute(
                    "INSERT INTO ko_spiele (turnier_id, runde, match_no, p1_id, p2_id, s1, s2) "
                    "VALUES (?, ?, 1, ?, ?, NULL, NULL)",
                    (tid, BRONZE_ROUND, losers[0], losers[1])
                )
            else:
                con.execute(
                    "UPDATE ko_spiele SET p1_id=?, p2_id=? WHERE id=?",
                    (losers[0], losers[1], int(bron["id"]))
                )
            con.commit()

    # ---------------- Laden ----------------
    def _load_turniere(self):
        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        self._turnier_map.clear()
        for tid, name, datum, modus, _ms in fetch_turniere():
            label = f"{datum} – {name} ({modus})"
            self._turnier_map[label] = tid
            self.cbo_turnier.addItem(label)
        self.cbo_turnier.blockSignals(False)
        self._load_rounds_and_matches()

    def _load_rounds_and_matches(self):
        self.cbo_round.blockSignals(True)
        self.cbo_round.clear()

        tid = self._current_turnier_id()
        self._rounds = []
        total_qual = None

        if tid:
            # Runden laden und "99" (Bronze) aus der normalen Liste ENTFERNEN
            try:
                fetched = fetch_ko_rounds(tid)
                self._rounds = [int(r) for r in fetched if int(r) != BRONZE_ROUND]
            except Exception:
                self._rounds = []
            total_qual = self._round1_total_qualifiers(tid)
            # Bronze ggf. erzeugen, wenn HF-Verlierer feststehen
            self._ensure_bronze_from_semis(tid, total_qual)

        # Normale Runden (ohne 99) anzeigen
        for r in self._rounds:
            self.cbo_round.addItem(self._round_name_for(r, total_qual), r)

        # Bronze als zusätzliche Auswahl anhängen, wenn vorhanden
        if tid and self._bronze_exists(tid):
            if self.cbo_round.findText("Bronze", Qt.MatchFlag.MatchExactly) == -1:
                self.cbo_round.addItem("Bronze", BRONZE_ROUND)

        self.cbo_round.blockSignals(False)
        self._load_matches_only()
        self._update_champion()

    def _load_matches_only(self):
        tid = self._current_turnier_id()
        self.tbl_matches.setRowCount(0)
        self._matches = []
        if not tid:
            return
        r_sel = self.cbo_round.currentData()
        if r_sel is None:
            if not self._rounds:
                return
            r_sel = self._rounds[0]

        matches = fetch_ko_matches(tid, r_sel)
        self._matches = matches[:]
        self.tbl_matches.setRowCount(len(matches))
        for i, (mid, mno, p1, p2, s1, s2) in enumerate(matches):
            self.tbl_matches.setItem(i, 0, QTableWidgetItem(str(mno)))
            self.tbl_matches.setItem(i, 1, QTableWidgetItem(p1))
            self.tbl_matches.setItem(i, 2, QTableWidgetItem(p2))
            i1 = QTableWidgetItem("" if s1 is None else str(s1))
            i2 = QTableWidgetItem("" if s2 is None else str(s2))
            i1.setFlags(i1.flags() | Qt.ItemFlag.ItemIsEditable)
            i2.setFlags(i2.flags() | Qt.ItemFlag.ItemIsEditable)
            self.tbl_matches.setItem(i, 3, i1)
            self.tbl_matches.setItem(i, 4, i2)

    # ---- Final-Sieger ermitteln (Bronze ignorieren) ----
    def _compute_final_champion_name(self, tid: int) -> str:
        """Ermittelt den Sieger NUR aus der Final-Runde; liefert '' wenn nicht entscheidbar."""
        if not tid:
            return ""
        total_qual = self._round1_total_qualifiers(tid)
        final_idx = self._final_round_index(total_qual)
        if final_idx is None:
            return ""
        try:
            matches = fetch_ko_matches(tid, final_idx)
        except Exception:
            return ""
        if not matches:
            return ""
        # Wir erwarten 1 Final-Spiel
        _mid, _mno, p1, p2, s1, s2 = matches[0]
        if s1 is None or s2 is None or s1 == s2:
            return ""
        try:
            s1i = int(s1); s2i = int(s2)
        except Exception:
            return ""
        return p1 if s1i > s2i else p2

    def _update_champion(self):
        tid = self._current_turnier_id()
        name = self._compute_final_champion_name(tid) if tid else ""
        self.lbl_champion.setText(f"🏆 Sieger: {name}" if name else "")

    # ---------------- Aktionen ----------------
    def _confirm(self, title, msg) -> bool:
        ret = QMessageBox.question(
            self, title, msg,
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        return ret == QMessageBox.StandardButton.Yes

    def _ask_pw(self, title, msg) -> bool:
        pw, ok = QInputDialog.getText(self, title, msg, QLineEdit.EchoMode.Password)
        return ok and (pw or "").strip() == DELETE_PASSWORD

    def _generate_bracket(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt.")
            return

        total = int(self.spn_total.value())
        if total & (total - 1) != 0:
            QMessageBox.warning(self, "Eingabe", "Gesamt-Qualifikanten muss eine Potenz von 2 sein (2,4,8,16,…).")
            return

        groups = fetch_groups(tid)
        if not groups:
            QMessageBox.warning(self, "Fehler", "Keine Gruppen vorhanden.")
            return
        if len(groups) % 2 != 0:
            QMessageBox.warning(self, "Fehler", "Anzahl Gruppen muss gerade sein.")
            return
        if total % len(groups) != 0:
            QMessageBox.warning(self, "Fehler", "Gesamt-Qualifikanten sind nicht gleichmäßig auf Gruppen teilbar.")
            return

        q = total // len(groups)
        for gid, _ in groups:
            if len(compute_group_table(tid, gid)) < q:
                QMessageBox.warning(self, "Fehler", "Nicht jede Gruppe hat genug Spieler (Qualifikanten).")
                return

        if has_ko_matches(tid):
            if has_recorded_ko_results(tid):
                if not self._ask_pw("Passwort erforderlich", "KO-Plan überschreiben – Passwort:"):
                    QMessageBox.critical(self, "Abbruch", "Falsches Passwort oder abgebrochen.")
                    return
                if not self._confirm("Überschreiben bestätigen",
                                     "Vorhandene KO-Spiele (mit Ergebnissen) werden gelöscht und neu erstellt. Fortfahren?"):
                    return
            else:
                if not self._confirm("Überschreiben bestätigen",
                                     "Vorhandene KO-Spiele ohne Ergebnisse werden ersetzt. Fortfahren?"):
                    return

        try:
            generate_ko_bracket_total(tid, total)
        except ValueError as e:
            QMessageBox.critical(self, "Fehler", str(e))
            return

        QMessageBox.information(self, "OK", "KO-Plan gemäß Seeding-Regeln erzeugt.")
        self._load_rounds_and_matches()

    def _clear_bracket(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt.")
            return
        if not has_ko_matches(tid):
            QMessageBox.information(self, "Hinweis", "Kein KO-Plan vorhanden.")
            return

        if has_recorded_ko_results(tid):
            if not self._ask_pw("Passwort erforderlich", "KO-Plan löschen – Passwort:"):
                QMessageBox.critical(self, "Abbruch", "Falsches Passwort oder abgebrochen.")
                return
            if not self._confirm("Löschen bestätigen", "Alle KO-Spiele (mit Ergebnissen) werden gelöscht. Fortfahren?"):
                return
        else:
            if not self._confirm("Löschen bestätigen", "Alle KO-Spiele (ohne Ergebnisse) werden gelöscht. Fortfahren?"):
                return

        clear_ko_matches(tid)
        QMessageBox.information(self, "OK", "KO-Plan gelöscht.")
        self._load_rounds_and_matches()

    def _save_results(self):
        if not self._matches:
            QMessageBox.information(self, "Hinweis", "Keine Spiele geladen.")
            return
        tid = self._current_turnier_id()
        if not tid:
            return

        # Erkennen, ob aktuelle Auswahl Finale/Bronze ist
        total_qual = self._round1_total_qualifiers(tid)
        final_idx = self._final_round_index(total_qual) or -1
        r_sel = self.cbo_round.currentData()
        is_bronze_round = (r_sel == BRONZE_ROUND)
        is_final_round = (r_sel == final_idx)

        changed = 0

        for r, (mid, _mno, _p1, _p2, _s1_old, _s2_old) in enumerate(self._matches):
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
                s1 = parse(s1_txt)
                s2 = parse(s2_txt)
            except ValueError:
                QMessageBox.warning(self, "Eingabefehler",
                                    f"Ungültiger Wert in Zeile {r+1}. Nur ganze Zahlen oder leer.")
                return

            try:
                if is_bronze_round or is_final_round:
                    # KEINE Propagation (Finale hat keinen Parent; Bronze sowieso nicht)
                    with self._db() as con:
                        con.execute("UPDATE ko_spiele SET s1=?, s2=? WHERE id=?", (s1, s2, mid))
                        con.commit()
                else:
                    # alle anderen Runden: mit Propagation (Signatur inkl. turnier_id!)
                    save_ko_result_and_propagate(mid, s1, s2, tid)
                changed += 1
            except Exception as e:
                QMessageBox.critical(self, "Fehler beim Speichern", f"Match {mid}: {e}")
                return

        # Nach Speichern Bronze ggf. erzeugen/aktualisieren und neu laden
        self._ensure_bronze_from_semis(tid, total_qual)

        QMessageBox.information(self, "OK", f"{changed} KO-Spiele gespeichert.")
        self._load_rounds_and_matches()
