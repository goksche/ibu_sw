import random
from typing import List, Dict

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton, QHBoxLayout,
    QListWidget, QListWidgetItem, QGroupBox, QSpinBox, QMessageBox,
    QInputDialog, QLineEdit
)

from database.models import (
    fetch_turniere, fetch_teilnehmer, fetch_turnier_teilnehmer, set_turnier_teilnehmer,
    has_grouping, fetch_grouping, save_grouping, clear_grouping
)

GROUP_MIN = 2
GROUP_MAX = 8
DELETE_PASSWORD = "6460"  # weiter für Überschreiben nötig, nicht für Löschen


class TurnierStartView(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("TurnierStartView")

        self._turnier_map: Dict[str, int] = {}          # Anzeige -> id
        self._staged_groups: List[List[int]] = []       # temporär erzeugte Gruppen (IDs)
        self._staged_group_names: List[str] = []

        root = QVBoxLayout(self)

        title = QLabel("Turnier starten – Teilnehmer zuweisen & Gruppen erstellen")
        title.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        root.addWidget(title)

        # --- Turnierauswahl ---
        row_sel = QHBoxLayout()
        row_sel.addWidget(QLabel("Turnier:"))
        self.cbo_turnier = QComboBox()
        row_sel.addWidget(self.cbo_turnier, 1)
        self.btn_reload = QPushButton("Neu laden")
        self.btn_reload.clicked.connect(self._load_turniere)
        row_sel.addWidget(self.btn_reload)
        root.addLayout(row_sel)

        # --- Teilnehmer Listen (links: verfügbar / rechts: im Turnier) ---
        lists = QHBoxLayout()

        left_box = QVBoxLayout()
        left_box.addWidget(QLabel("Verfügbare Teilnehmer"))
        self.lst_available = QListWidget()
        self.lst_available.setSelectionMode(self.lst_available.SelectionMode.ExtendedSelection)
        left_box.addWidget(self.lst_available)
        lists.addLayout(left_box, 1)

        mid_btns = QVBoxLayout()
        self.btn_add = QPushButton("→ Hinzufügen")
        self.btn_add.clicked.connect(self._add_selected)
        mid_btns.addWidget(self.btn_add)

        self.btn_remove = QPushButton("← Entfernen")
        self.btn_remove.clicked.connect(self._remove_selected)
        mid_btns.addWidget(self.btn_remove)

        self.btn_add_all = QPushButton("≫ Alle hinzufügen")
        self.btn_add_all.clicked.connect(self._add_all)
        mid_btns.addWidget(self.btn_add_all)

        self.btn_remove_all = QPushButton("≪ Alle entfernen")
        self.btn_remove_all.clicked.connect(self._remove_all)
        mid_btns.addWidget(self.btn_remove_all)

        mid_btns.addStretch()
        lists.addLayout(mid_btns)

        right_box = QVBoxLayout()
        right_box.addWidget(QLabel("Teilnehmer im Turnier"))
        self.lst_in_tournament = QListWidget()
        self.lst_in_tournament.setSelectionMode(self.lst_in_tournament.SelectionMode.ExtendedSelection)
        right_box.addWidget(self.lst_in_tournament)
        lists.addLayout(right_box, 1)

        root.addLayout(lists)

        # --- Speichern der Teilnehmerliste ---
        row_save_tn = QHBoxLayout()
        self.btn_save_tn = QPushButton("Teilnehmerliste speichern")
        self.btn_save_tn.clicked.connect(self._save_tn_list)
        row_save_tn.addWidget(self.btn_save_tn)
        row_save_tn.addStretch()
        root.addLayout(row_save_tn)

        # --- Gruppensteuerung ---
        grp_box = QGroupBox("Gruppen")
        grp_lay = QVBoxLayout(grp_box)

        row_groups = QHBoxLayout()
        row_groups.addWidget(QLabel("Anzahl Gruppen:"))
        self.spn_groups = QSpinBox()
        self.spn_groups.setRange(GROUP_MIN, GROUP_MAX)
        self.spn_groups.setValue(2)
        row_groups.addWidget(self.spn_groups)
        self.btn_autosplit = QPushButton("Auto verteilen")
        self.btn_autosplit.clicked.connect(self._auto_split)
        row_groups.addWidget(self.btn_autosplit)
        self.btn_save_groups = QPushButton("Gruppierung speichern")
        self.btn_save_groups.clicked.connect(self._save_groups)
        row_groups.addWidget(self.btn_save_groups)
        self.btn_clear_groups = QPushButton("Gruppierung löschen")
        self.btn_clear_groups.clicked.connect(self._clear_groups)
        row_groups.addWidget(self.btn_clear_groups)
        row_groups.addStretch()
        grp_lay.addLayout(row_groups)

        self.grp_preview = QGroupBox("Vorschau")
        self.grp_preview_lay = QVBoxLayout(self.grp_preview)
        grp_lay.addWidget(self.grp_preview)

        root.addWidget(grp_box)

        # Initial
        self._load_turniere()

    # ------------------------
    # Laden / UI
    # ------------------------
    def _load_turniere(self):
        self.cbo_turnier.blockSignals(True)
        self.cbo_turnier.clear()
        self._turnier_map.clear()
        for tid, name, datum, modus, meisterschaft in fetch_turniere():
            label = f"{datum} – {name} ({modus})"
            self._turnier_map[label] = tid
            self.cbo_turnier.addItem(label)
        self.cbo_turnier.blockSignals(False)

        self._load_participants_lists()
        self._load_group_preview()

    def _current_turnier_id(self) -> int | None:
        txt = self.cbo_turnier.currentText()
        return self._turnier_map.get(txt)

    def _load_participants_lists(self):
        tid = self._current_turnier_id()
        self.lst_available.clear()
        self.lst_in_tournament.clear()
        if not tid:
            return

        all_tn = fetch_teilnehmer()      # [(id, name, nick)]
        in_tn = fetch_turnier_teilnehmer(tid)
        in_ids = {r[0] for r in in_tn}

        for tid_, name, nick in all_tn:
            text = f"{name}" + (f" ({nick})" if nick else "")
            item = QListWidgetItem(text)
            item.setData(Qt.ItemDataRole.UserRole, int(tid_))
            if tid_ in in_ids:
                self.lst_in_tournament.addItem(item)
            else:
                self.lst_available.addItem(item)

    def _load_group_preview(self):
        # Container leeren
        for i in reversed(range(self.grp_preview_lay.count())):
            w = self.grp_preview_lay.itemAt(i).widget()
            if w:
                w.setParent(None)

        tid = self._current_turnier_id()
        if not tid:
            return

        grouping = fetch_grouping(tid)
        if grouping:
            for gname, members in grouping.items():
                lbl = QLabel(
                    f"Gruppe {gname}: " +
                    (", ".join([m[1] + (f' ({m[2]})' if m[2] else '') for m in members]) if members else "–")
                )
                self.grp_preview_lay.addWidget(lbl)
        elif self._staged_groups:
            id2name = {}
            for lw in (self.lst_available, self.lst_in_tournament):
                for i in range(lw.count()):
                    it = lw.item(i)
                    id2name[int(it.data(Qt.ItemDataRole.UserRole))] = it.text()
            for gname, members in zip(self._staged_group_names, self._staged_groups):
                names = [id2name.get(mid, f"#{mid}") for mid in members]
                lbl = QLabel(f"Gruppe {gname}: " + (", ".join(names) if names else "–"))
                self.grp_preview_lay.addWidget(lbl)
        else:
            self.grp_preview_lay.addWidget(QLabel("Keine Gruppierung vorhanden."))

    # ------------------------
    # Teilnehmerlisten-Buttons
    # ------------------------
    def _move_items(self, src: QListWidget, dst: QListWidget):
        items = src.selectedItems()
        for it in items:
            src.takeItem(src.row(it))
            dst.addItem(it)

    def _add_selected(self):
        self._move_items(self.lst_available, self.lst_in_tournament)
        self._staged_groups = []
        self._staged_group_names = []
        self._load_group_preview()

    def _remove_selected(self):
        self._move_items(self.lst_in_tournament, self.lst_available)
        self._staged_groups = []
        self._staged_group_names = []
        self._load_group_preview()

    def _add_all(self):
        self.lst_available.selectAll()
        self._add_selected()

    def _remove_all(self):
        self.lst_in_tournament.selectAll()
        self._remove_selected()

    def _save_tn_list(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt.")
            return
        ids = []
        for i in range(self.lst_in_tournament.count()):
            it = self.lst_in_tournament.item(i)
            ids.append(int(it.data(Qt.ItemDataRole.UserRole)))
        set_turnier_teilnehmer(tid, ids)
        QMessageBox.information(self, "OK", "Teilnehmerliste gespeichert.")

    # ------------------------
    # Gruppenlogik
    # ------------------------
    @staticmethod
    def _group_names(n: int) -> List[str]:
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        return [alphabet[i] for i in range(n)]

    def _auto_split(self):
        n_groups = int(self.spn_groups.value())
        ids = []
        for i in range(self.lst_in_tournament.count()):
            it = self.lst_in_tournament.item(i)
            ids.append(int(it.data(Qt.ItemDataRole.UserRole)))

        if len(ids) < n_groups:
            QMessageBox.warning(self, "Hinweis", "Weniger Teilnehmer als Gruppen.")
            return

        random.shuffle(ids)
        buckets: List[List[int]] = [[] for _ in range(n_groups)]
        for idx, mid in enumerate(ids):
            buckets[idx % n_groups].append(mid)

        self._staged_groups = buckets
        self._staged_group_names = self._group_names(n_groups)
        self._load_group_preview()
        QMessageBox.information(self, "Vorschau erstellt",
                                "Teilnehmer wurden vorläufig auf Gruppen verteilt.\n"
                                "Bitte „Gruppierung speichern“, um zu übernehmen.")

    def _save_groups(self):
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt.")
            return
        if not self._staged_groups or not self._staged_group_names:
            QMessageBox.warning(self, "Fehler",
                                "Keine Gruppierung in der Vorschau. Bitte zuerst „Auto verteilen“.")
            return

        # Falls bereits eine Gruppierung existiert -> Passwort & Bestätigung
        if has_grouping(tid):
            pw, ok = QInputDialog.getText(
                self,
                "Passwort erforderlich",
                "Gruppierung überschreiben – Passwort eingeben:",
                QLineEdit.EchoMode.Password  # <- KORREKT in PyQt6
            )
            if not ok:
                return
            if (pw or "").strip() != DELETE_PASSWORD:
                QMessageBox.critical(self, "Fehler", "Falsches Passwort. Vorgang abgebrochen.")
                return
            ret = QMessageBox.question(
                self, "Überschreiben bestätigen",
                "Bestehende Gruppierung wird gelöscht und neu gespeichert. Fortfahren?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No
            )
            if ret != QMessageBox.StandardButton.Yes:
                return

        # Speichern
        payload = list(zip(self._staged_group_names, self._staged_groups))
        save_grouping(tid, payload)
        QMessageBox.information(self, "OK", "Gruppierung gespeichert.")
        self._staged_groups = []
        self._staged_group_names = []
        self._load_group_preview()

    def _clear_groups(self):
        """Gespeicherte Gruppierung löschen – OHNE Passwort, nur Bestätigung."""
        tid = self._current_turnier_id()
        if not tid:
            QMessageBox.warning(self, "Fehler", "Kein Turnier ausgewählt.")
            return
        if not has_grouping(tid):
            QMessageBox.information(self, "Hinweis", "Keine gespeicherte Gruppierung vorhanden.")
            return

        ret = QMessageBox.question(
            self, "Löschen bestätigen",
            "Gespeicherte Gruppierung wirklich löschen?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        if ret != QMessageBox.StandardButton.Yes:
            return

        clear_grouping(tid)
        QMessageBox.information(self, "OK", "Gruppierung gelöscht.")
        self._staged_groups = []
        self._staged_group_names = []
        self._load_group_preview()
