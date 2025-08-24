from typing import List, Dict, Optional
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton, QHBoxLayout,
    QTableWidget, QTableWidgetItem, QMessageBox, QSplitter, QInputDialog, QLineEdit
)

from database.models import (
    fetch_turniere, fetch_groups, fetch_group_matches, save_match_result,
    generate_group_round_robin, has_group_matches, clear_group_matches,
    compute_group_table, has_recorded_group_results
)

DELETE_PASSWORD = "6460"


class GruppenphaseView(QWidget):
    def __init__(self):
        super().__init__()
        self._turnier_map: Dict[str, int] = {}  # Anzeige -> id
        self._group_map: Dict[str, int] = {}    # Anzeige -> id
        self._matches = []      # Cache der aktuell geladenen Matches (fuer IDs)

        root = QVBoxLayout(self)

        title = QLabel("Gruppenphase – Spielplan & Ergebnisse")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # Auswahlzeile
        row = QHBoxLayout()
        row.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox()
        self.cbo_turnier.currentIndexChanged.connect(self._load_groups_and_matches)
        row.addWidget(self.cbo_turnier, 2)

        row.addWidget(QLabel("Gruppe:"))
        self.cbo_group = QComboBox()
        self.cbo_group.currentIndexChanged.connect(self._load_matches_only)
        row.addWidget(self.cbo_group, 1)

        self.btn_reload = QPushButton("Neu laden")
        # WICHTIG: ab jetzt mit Auswahl-Erhalt
        self.btn_reload.clicked.connect(self._reload_turniere_keep_selection)
        row.addWidget(self.btn_reload)

        self.btn_generate = QPushButton("Plan erstellen/ueberschreiben")
        self.btn_generate.clicked.connect(self._generate_plan)
        row.addWidget(self.btn_generate)

        self.btn_clear = QPushButton("Plan loeschen")
        self.btn_clear.clicked.connect(self._clear_plan)
        row.addWidget(self.btn_clear)

        root.addLayout(row)

        # Split: links Spiele, rechts Tabelle
        splitter = QSplitter()
        splitter.setOrientation(Qt.Orientation.Horizontal)

        # Tabelle: Spiele
        self.tbl_matches = QTableWidget(0, 5)
        self.tbl_matches.setHorizontalHeaderLabels(["Runde", "Spieler 1", "Spieler 2", "S1", "S2"])
        self.tbl_matches.horizontalHeader().setStretchLastSection(True)
        splitter.addWidget(self.tbl_matches)

        # Tabelle: Rangliste
        self.tbl_table = QTableWidget(0, 8)
        self.tbl_table.setHorizontalHeaderLabels(["Spieler", "Spiele", "Siege", "Niederl.", "Legs +", "Legs -", "Diff", "Punkte"])
        self.tbl_table.horizontalHeader().setStretchLastSection(True)
        splitter.addWidget(self.tbl_table)

        root.addWidget(splitter)

        # Buttonzeile unten
        bottom = QHBoxLayout()
        self.btn_save_results = QPushButton("Ergebnisse speichern")
        self.btn_save_results.clicked.connect(self._save_results)
        bottom.addWidget(self.btn_save_results)
        bottom.addStretch()
        root.addLayout(bottom)

        # Initial laden
        self._load_turniere()

    # ----------------------------------------------------------
    # Auto-Reload beim Anzeigen des Tabs
    # ----------------------------------------------------------
    def showEvent(self, event):
        super().showEvent(event)
        # JEDES Mal, wenn der Tab sichtbar wird: Turniere neu laden (Selektion behalten)
        self._reload_turniere_keep_selection()

    # ----------------------------------------------------------
    # Laden
    # ----------------------------------------------------------
    def _current_turnier_id(self) -> Optional[int]:
        return self._turnier_map.get(self.cbo_turnier.currentText())

    def _current_group_id(self) -> Optional[int]:
        return self._group_map.get(self.cbo_group.currentText())

    def _load_turniere(self):
        """Erstbefuellung ohne Auswahl-Erhalt (nur im Konstruktor)."""
        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        self._turnier_map.clear()
        for tid, name, datum, modus, _ms in fetch_turniere():
            label = f"{datum} – {name} ({modus})"
            self._turnier_map[label] = tid
            self.cbo_turnier.addItem(label)
        self.cbo_turnier.blockSignals(False)
        self._load_groups_and_matches()

    def _reload_turniere_keep_selection(self):
        """Turnierliste neu laden und – falls moeglich – die aktuelle Auswahl beibehalten."""
        old_tid: Optional[int] = self._current_turnier_id()

        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        self._turnier_map.clear()

        items = fetch_turniere()
        tid_to_index: Dict[int, int] = {}
        for idx, (tid, name, datum, modus, _ms) in enumerate(items):
            label = f"{datum} – {name} ({modus})"
            self._turnier_map[label] = tid
            self.cbo_turnier.addItem(label)
            tid_to_index[tid] = idx

        self.cbo_turnier.blockSignals(False)

        if old_tid is not None and old_tid in tid_to_index:
            self.cbo_turnier.setCurrentIndex(tid_to_index[old_tid])
        elif items:
            self.cbo_turnier.setCurrentIndex(0)

        self._load_groups_and_matches()

    def _load_groups_and_matches(self):
        self.cbo_group.blockSignals(True)
        self.cbo_group.clear()
        self._group_map.clear()
        tid = self._current_turnier_id()
        if not tid:
            self._load_matches_into_table([])
            self._load_table_into_table([])
            self.cbo_group.blockSignals(False)
            return
        for gid, gname in fetch_groups(tid):
            self._group_map[gname] = gid
            self.cbo_group.addItem(gname)
        self.cbo_group.blockSignals(False)
        self._load_matches_only()

    def _load_matches_only(self):
        tid = self._current_turnier_id()
        gid = self._current_group_id()
        if not tid or not gid:
            self._load_matches_into_table([])
            self._load_table_into_table([])
            return
        matches = fetch_group_matches(tid, gid)
        self._load_matches_into_table(matches)
        table = compute_group_table(tid, gid)
        self._load_table_into_table(table)

    # ----------------------------------------------------------
    # UI-Fueller
    # ----------------------------------------------------------
    def _load_matches_into_table(self, matches):
        self._matches = matches[:]  # (id, runde, match_no, p1, p2, s1, s2)
        self.tbl_matches.setRowCount(len(matches))
        for r, (mid, runde, mno, p1, p2, s1, s2) in enumerate(matches):
            self.tbl_matches.setItem(r, 0, QTableWidgetItem(str(runde)))
            self.tbl_matches.setItem(r, 1, QTableWidgetItem(p1))
            self.tbl_matches.setItem(r, 2, QTableWidgetItem(p2))
            s1_item = QTableWidgetItem("" if s1 is None else str(s1))
            s2_item = QTableWidgetItem("" if s2 is None else str(s2))
            s1_item.setFlags(s1_item.flags() | Qt.ItemFlag.ItemIsEditable)
            s2_item.setFlags(s2_item.flags() | Qt.ItemFlag.ItemIsEditable)
            self.tbl_matches.setItem(r, 3, s1_item)
            self.tbl_matches.setItem(r, 4, s2_item)

    def _load_table_into_table(self, rows: List[dict]):
        self.tbl_table.setRowCount(len(rows))
        for r, row in enumerate(rows):
            self.tbl_table.setItem(r, 0, QTableWidgetItem(str(row['spieler'])))
            self.tbl_table.setItem(r, 1, QTableWidgetItem(str(row['spiele'])))
            self.tbl_table.setItem(r, 2, QTableWidgetItem(str(row['siege'])))
            self.tbl_table.setItem(r, 3, QTableWidgetItem(str(row['niederlagen'])))
            self.tbl_table.setItem(r, 4, QTableWidgetItem(str(row['lf'])))
            self.tbl_table.setItem(r, 5, QTableWidgetItem(str(row['la'])))
            self.tbl_table.setItem(r, 6, QTableWidgetItem(str(row['diff'])))
            self.tbl_table.setItem(r, 7, QTableWidgetItem(str(row['pkt'])))

    # ----------------------------------------------------------
    # Aktionen
    # ----------------------------------------------------------
    def _confirm_or_password(self, title: str, msg: str) -> bool:
        """Nur Bestaetigung (Yes/No)."""
        ret = QMessageBox.question(
            self, title, msg,
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        return ret == QMessageBox.StandardButton.Yes

    def _ask_password(self, title: str, prompt: str) -> bool:
        pw, ok = QInputDialog.getText(self, title, prompt, QLineEdit.EchoMode.Password)
        if not ok:
            return False
        return (pw or "").strip() == DELETE_PASSWORD

    def _generate_plan(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewaehlt.")
            return

        if has_group_matches(tid):
            # Wenn bereits Ergebnisse existieren -> Passwort noetig
            if has_recorded_group_results(tid):
                ok_pw = self._ask_password("Passwort erforderlich", "Plan ueberschreiben – Passwort:")
                if not ok_pw:
                    QMessageBox.critical(self, "Abbruch", "Falsches Passwort oder abgebrochen.")
                    return
                ok = self._confirm_or_password("Ueberschreiben bestaetigen",
                                               "Vorhandene Gruppenspiele werden geloescht und neu erzeugt. Fortfahren?")
                if not ok:
                    return
            else:
                # Keine Ergebnisse -> nur Bestaetigung
                ok = self._confirm_or_password("Ueberschreiben bestaetigen",
                                               "Vorhandene Gruppenspiele (ohne Ergebnisse) werden ersetzt. Fortfahren?")
                if not ok:
                    return

        generate_group_round_robin(tid)
        QMessageBox.information(self, "OK", "Spielplan erzeugt.")
        self._load_groups_and_matches()

    def _clear_plan(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewaehlt.")
            return
        if not has_group_matches(tid):
            QMessageBox.information(self, "Hinweis", "Kein Spielplan vorhanden.")
            return

        if has_recorded_group_results(tid):
            # Mit Ergebnissen -> Passwort + Bestaetigung
            ok_pw = self._ask_password("Passwort erforderlich", "Plan loeschen – Passwort:")
            if not ok_pw:
                QMessageBox.critical(self, "Abbruch", "Falsches Passwort oder abgebrochen.")
                return
            ok = self._confirm_or_password("Loeschen bestaetigen",
                                           "Alle Gruppenspiele (mit Ergebnissen) werden geloescht. Fortfahren?")
            if not ok:
                return
        else:
            # Ohne Ergebnisse -> nur Bestaetigung
            ok = self._confirm_or_password("Loeschen bestaetigen",
                                           "Alle Gruppenspiele (ohne Ergebnisse) werden geloescht. Fortfahren?")
            if not ok:
                return

        clear_group_matches(tid)
        QMessageBox.information(self, "OK", "Spielplan geloescht.")
        self._load_groups_and_matches()

    def _save_results(self):
        if not self._matches:
            QMessageBox.information(self, "Hinweis", "Kein Spiel geladen.")
            return

        # Werte aus Tabelle uebernehmen
        changed = 0
        for r, (mid, _runde, _mno, _p1, _p2, _s1_old, _s2_old) in enumerate(self._matches):
            s1_txt = self.tbl_matches.item(r, 3).text() if self.tbl_matches.item(r, 3) else ""
            s2_txt = self.tbl_matches.item(r, 4).text() if self.tbl_matches.item(r, 4) else ""
            # Robust parsen
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
                                    f"Ungueltiger Wert in Zeile {r+1}. Nur ganze Zahlen oder leer.")
                return

            save_match_result(mid, s1, s2)
            changed += 1

        QMessageBox.information(self, "OK", f"{changed} Spiele gespeichert.")
        # Rangliste neu laden
        self._load_matches_only()
