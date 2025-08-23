from typing import List
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton, QHBoxLayout,
    QTableWidget, QTableWidgetItem, QMessageBox, QSplitter, QSpinBox,
    QInputDialog, QLineEdit
)

from database.models import (
    fetch_turniere, fetch_ko_rounds, fetch_ko_matches, save_ko_result_and_propagate,
    generate_ko_bracket_total, clear_ko_matches, has_ko_matches, has_recorded_ko_results,
    fetch_groups, compute_group_table, fetch_ko_champion
)

DELETE_PASSWORD = "6460"


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

        # --- Kopfzeile: Turnier & Aktionen
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

        # --- Rundenauswahl
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

    # ------------------------------
    # Hilfen
    # ------------------------------
    def _current_turnier_id(self):
        return self._turnier_map.get(self.cbo_turnier.currentText())

    def _round_name_for(self, round_index: int, total_qualifiers: int) -> str:
        """
        Ermittelt die Rundenbezeichnung anhand der tatsächlich vorhandenen
        Gesamt-Qualifikanten.
        """
        if total_qualifiers is None or total_qualifiers <= 0:
            return f"Runde {round_index}"
        size_this_round = total_qualifiers // (2 ** (round_index - 1))
        # kurze Labels gewünscht: "Achtel", "Viertel", "Halb", "Finale"
        mapping_short = {16: "Achtel", 8: "Viertel", 4: "Halb", 2: "Finale"}
        return mapping_short.get(size_this_round, f"Runde {round_index}")

    def _round1_total_qualifiers(self, turnier_id: int) -> int:
        """
        Liest die Anzahl R1-Matches und multipliziert ×2.
        Falls kein KO-Plan existiert, nimmt den Wert aus dem SpinBox-Feld (Fallback).
        """
        rounds = fetch_ko_rounds(turnier_id)
        if 1 in rounds:
            matches = fetch_ko_matches(turnier_id, 1)
            return max(0, len(matches) * 2)
        # noch kein Plan -> Fallback
        return int(self.spn_total.value())

    # ------------------------------
    # Laden
    # ------------------------------
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
            self._rounds = fetch_ko_rounds(tid)
            total_qual = self._round1_total_qualifiers(tid)

        for r in self._rounds:
            self.cbo_round.addItem(self._round_name_for(r, total_qual), r)

        self.cbo_round.blockSignals(False)
        self._load_matches_only()
        self._update_champion()

    def _load_matches_only(self):
        tid = self._current_turnier_id()
        self.tbl_matches.setRowCount(0)
        self._matches = []
        if not tid or not self._rounds:
            return
        r_sel = self.cbo_round.currentData()
        if r_sel is None:
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

    def _update_champion(self):
        tid = self._current_turnier_id()
        if not tid:
            self.lbl_champion.setText("")
            return
        champ = fetch_ko_champion(tid)
        if champ:
            self.lbl_champion.setText(f"🏆 Sieger: {champ[1]}")
        else:
            self.lbl_champion.setText("")

    # ------------------------------
    # Aktionen
    # ------------------------------
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

            save_ko_result_and_propagate(mid, s1, s2, tid)
            changed += 1

        QMessageBox.information(self, "OK", f"{changed} KO-Spiele gespeichert.")
        self._load_rounds_and_matches()
