from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton,
    QSpinBox, QTableWidget, QTableWidgetItem, QMessageBox, QHeaderView, QInputDialog
)
from PyQt6.QtCore import Qt

from database.models import (
    fetch_turniere, generate_ko_bracket_total, fetch_ko_rounds, fetch_ko_matches,
    save_ko_result_and_propagate, clear_ko_matches, fetch_ko_champion,
    rebuild_rangliste_for_turnier
)

# Optional: Bronze-Autoanlage (nur wenn im models vorhanden)
try:
    from database.models import ensure_bronze_from_semis
    _HAS_ENSURE_BRONZE = True
except Exception:
    _HAS_ENSURE_BRONZE = False

BRONZE_LABEL = "Bronze"


class KOPhaseView(QWidget):
    def __init__(self):
        super().__init__()
        self.current_tid = None
        self.round_map = []  # [(anzeige, runde_int)]
        self._build_ui()
        self._load_turniere()

    # ------------------------------------------------------------------
    # UI
    # ------------------------------------------------------------------
    def _build_ui(self):
        root = QVBoxLayout(self)

        title = QLabel("KO-Phase – Bracket & Ergebnisse")
        title.setStyleSheet("font-size:18px; font-weight:600;")
        root.addWidget(title)

        # Top Row
        top = QHBoxLayout()
        root.addLayout(top)

        top.addWidget(QLabel("Turnier:"))
        self.cb_turnier = QComboBox()
        self.cb_turnier.currentIndexChanged.connect(self._on_turnier_changed)
        top.addWidget(self.cb_turnier, 1)

        top.addWidget(QLabel("Gesamt-Qualifikanten (2,4,8,16,...):"))
        self.sb_total = QSpinBox()
        self.sb_total.setRange(2, 128)
        self.sb_total.setSingleStep(2)
        self.sb_total.setValue(8)
        top.addWidget(self.sb_total)

        self.btn_build = QPushButton("KO-Plan erstellen/überschreiben")
        self.btn_build.clicked.connect(self._on_build_clicked)
        top.addWidget(self.btn_build)

        self.btn_clear = QPushButton("KO-Plan löschen")
        self.btn_clear.clicked.connect(self._on_clear_clicked)
        top.addWidget(self.btn_clear)

        self.btn_reload = QPushButton("Neu laden")
        self.btn_reload.clicked.connect(self._reload_matches)
        top.addWidget(self.btn_reload)

        # Runde + Sieger
        mid = QHBoxLayout()
        root.addLayout(mid)

        mid.addWidget(QLabel("Runde:"))
        self.cb_round = QComboBox()
        self.cb_round.currentIndexChanged.connect(self._on_round_changed)
        mid.addWidget(self.cb_round)

        self.lbl_champion = QLabel("🏆 Sieger: –")
        mid.addWidget(self.lbl_champion, 1)

        # Tabelle
        self.tbl = QTableWidget(0, 5)
        self.tbl.setHorizontalHeaderLabels(["Match", "Spieler 1", "Spieler 2", "S1", "S2"])
        self.tbl.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.tbl.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.tbl.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.tbl.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.tbl.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        root.addWidget(self.tbl)

        # Save
        bottom = QHBoxLayout()
        root.addLayout(bottom)
        bottom.addStretch(1)
        self.btn_save = QPushButton("Ergebnisse speichern")
        self.btn_save.clicked.connect(self._save_results)
        bottom.addWidget(self.btn_save)

    # ------------------------------------------------------------------
    # Laden
    # ------------------------------------------------------------------
    def _load_turniere(self):
        self.cb_turnier.blockSignals(True)
        self.cb_turnier.clear()
        items = fetch_turniere()
        for tid, name, datum, modus, _ms in items:
            label = f"{datum} – {name} ({modus})".strip()
            self.cb_turnier.addItem(label, tid)
        self.cb_turnier.blockSignals(False)
        if items:
            self.cb_turnier.setCurrentIndex(0)
            self._on_turnier_changed()

    def _on_turnier_changed(self):
        self.current_tid = self.cb_turnier.currentData()
        self._reload_rounds()
        self._reload_matches()
        self._update_champion()

    def _reload_rounds(self):
        self.cb_round.blockSignals(True)
        self.cb_round.clear()
        self.round_map = []
        if not self.current_tid:
            self.cb_round.blockSignals(False)
            return

        rounds = fetch_ko_rounds(self.current_tid)
        bronze_present = 99 in rounds
        rounds = [r for r in rounds if r != 99]  # 99 nicht als Zahl anzeigen

        for r in rounds:
            text = {1: "Viertel", 2: "Halb", 3: "Finale"}.get(r, f"Runde {r}")
            self.cb_round.addItem(text, r)
            self.round_map.append((text, r))

        if bronze_present:
            self.cb_round.addItem(BRONZE_LABEL, 99)
            self.round_map.append((BRONZE_LABEL, 99))

        self.cb_round.blockSignals(False)
        if self.cb_round.count() > 0:
            self.cb_round.setCurrentIndex(0)

    def _reload_matches(self):
        tid = self.current_tid
        if not tid:
            return

        # Bronze automatisch anlegen/aktualisieren (wenn Funktion vorhanden)
        if _HAS_ENSURE_BRONZE:
            try:
                ensure_bronze_from_semis(tid)
            except Exception:
                pass

        rsel = self.cb_round.currentData()
        if rsel is None:
            self._reload_rounds()
            rsel = self.cb_round.currentData()

        matches = []
        if rsel is not None:
            matches = fetch_ko_matches(tid, int(rsel))

        self.tbl.setRowCount(0)
        for mid, match_no, n1, n2, s1, s2 in matches:
            row = self.tbl.rowCount()
            self.tbl.insertRow(row)
            self.tbl.setItem(row, 0, QTableWidgetItem(str(match_no)))
            self.tbl.item(row, 0).setData(Qt.ItemDataRole.UserRole, mid)
            self.tbl.setItem(row, 1, QTableWidgetItem(n1))
            self.tbl.setItem(row, 2, QTableWidgetItem(n2))
            self.tbl.setItem(row, 3, QTableWidgetItem("" if s1 is None else str(s1)))
            self.tbl.setItem(row, 4, QTableWidgetItem("" if s2 is None else str(s2)))

        self._update_champion()

    def _on_round_changed(self):
        self._reload_matches()

    def _update_champion(self):
        tid = self.current_tid
        if not tid:
            self.lbl_champion.setText("🏆 Sieger: –")
            return
        champ = fetch_ko_champion(tid)
        if champ:
            self.lbl_champion.setText(f"🏆 Sieger: {champ[1]}")
        else:
            self.lbl_champion.setText("🏆 Sieger: –")

    # ------------------------------------------------------------------
    # Aktionen
    # ------------------------------------------------------------------
    def _on_build_clicked(self):
        tid = self.current_tid
        if not tid:
            return
        total = self.sb_total.value()
        try:
            generate_ko_bracket_total(tid, total)
            QMessageBox.information(self, "KO-Plan", "KO-Plan wurde erstellt/überschrieben.")
            self._reload_rounds()
            self._reload_matches()
        except Exception as e:
            QMessageBox.critical(self, "Fehler", str(e))

    def _on_clear_clicked(self):
        tid = self.current_tid
        if not tid:
            return
        pw, ok = QInputDialog.getText(self, "KO-Plan löschen", "Passwort:")
        if not ok:
            return
        if pw.strip() != "6460":
            QMessageBox.warning(self, "Abbruch", "Falsches Passwort.")
            return
        clear_ko_matches(tid)
        self._reload_rounds()
        self._reload_matches()
        QMessageBox.information(self, "KO-Plan", "KO-Plan wurde gelöscht.")

    def _save_results(self):
        tid = self.current_tid
        if not tid:
            return

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
            try:
                save_ko_result_and_propagate(mid, s1, s2, tid)
            except TypeError:
                # Rückwärtskompatibel (alte Signatur ohne turnier_id)
                save_ko_result_and_propagate(mid, s1, s2)
            except Exception as e:
                QMessageBox.critical(self, "Fehler beim Speichern", f"Match {mid}: {e}")
                return

        # Bronze evtl. anlegen/aktualisieren + Rangliste neu schreiben
        if _HAS_ENSURE_BRONZE:
            try:
                ensure_bronze_from_semis(tid)
            except Exception:
                pass
        try:
            rebuild_rangliste_for_turnier(tid)
        except Exception:
            pass

        QMessageBox.information(self, "Gespeichert", "Ergebnisse gespeichert.")
        self._reload_rounds()
        self._reload_matches()
