# views/export_view.py
# v0.9 – eigener Tab „Exporte“
from __future__ import annotations

import os
import sys
from typing import Optional

from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QDesktopServices
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QGroupBox, QGridLayout, QLabel, QComboBox,
    QPushButton, QHBoxLayout, QCheckBox, QMessageBox
)

from database.models import fetch_meisterschaften, fetch_turniere
from utils.exporter import (
    ensure_exports_dir,
    export_meisterschaft_rangliste_csv,
    export_meisterschaft_rangliste_pdf,
    export_turnier_teilnehmer_csv,
    export_turnier_teilnehmer_pdf,
    export_gruppen_spielplan_csv,
    export_gruppen_spielplan_pdf,
    export_gruppen_tabellen_csv,
    export_gruppen_tabellen_pdf,
    export_ko_csv,
    export_ko_pdf,
    export_turnier_uebersicht_csv,
    export_turnier_uebersicht_pdf,
)


class ExportView(QWidget):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setObjectName("ExportView")
        self._build_ui()
        self._load_data()

    # ------------------------------------------
    # UI
    # ------------------------------------------
    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(8, 8, 8, 8)
        root.setSpacing(10)

        # --- Meisterschaft ---
        gb_ms = QGroupBox("Meisterschafts-Exporte")
        grid_ms = QGridLayout(gb_ms)

        grid_ms.addWidget(QLabel("Meisterschaft:"), 0, 0)
        self.cmb_ms = QComboBox()
        grid_ms.addWidget(self.cmb_ms, 0, 1, 1, 3)

        self.btn_ms_csv = QPushButton("Rangliste (CSV)")
        self.btn_ms_pdf = QPushButton("Rangliste (PDF)")
        grid_ms.addWidget(self.btn_ms_csv, 1, 1)
        grid_ms.addWidget(self.btn_ms_pdf, 1, 2)

        self.btn_ms_csv.clicked.connect(self._on_ms_csv)
        self.btn_ms_pdf.clicked.connect(self._on_ms_pdf)

        # --- Turnier ---
        gb_tn = QGroupBox("Turnier-Exporte")
        grid_tn = QGridLayout(gb_tn)

        grid_tn.addWidget(QLabel("Turnier:"), 0, 0)
        self.cmb_tn = QComboBox()
        grid_tn.addWidget(self.cmb_tn, 0, 1, 1, 3)

        self.chk_spielplan = QCheckBox("Gruppen – Spielplan")
        self.chk_tabellen = QCheckBox("Gruppen – Tabellen")
        self.chk_ko = QCheckBox("KO – Übersicht")
        self.chk_gesamt = QCheckBox("Gesamt – Ergebnis-Übersicht")
        self.chk_spieler = QCheckBox("Teilnehmerliste")

        grid_tn.addWidget(self.chk_spielplan, 1, 1)
        grid_tn.addWidget(self.chk_tabellen, 1, 2)
        grid_tn.addWidget(self.chk_ko, 2, 1)
        grid_tn.addWidget(self.chk_gesamt, 2, 2)
        grid_tn.addWidget(self.chk_spieler, 3, 1)

        self.btn_tn_csv = QPushButton("Ausgewählte (CSV)")
        self.btn_tn_pdf = QPushButton("Ausgewählte (PDF)")
        grid_tn.addWidget(self.btn_tn_csv, 4, 1)
        grid_tn.addWidget(self.btn_tn_pdf, 4, 2)

        self.btn_tn_csv.clicked.connect(self._on_tn_csv)
        self.btn_tn_pdf.clicked.connect(self._on_tn_pdf)

        # --- Ausgabe / Ordner ---
        gb_out = QGroupBox("Ausgabe")
        lay_out = QHBoxLayout(gb_out)
        self.lbl_dir = QLabel(ensure_exports_dir())
        self.lbl_dir.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        self.btn_open = QPushButton("Ordner öffnen")
        self.btn_open.clicked.connect(self._open_dir)
        lay_out.addWidget(QLabel("Zielordner:"))
        lay_out.addWidget(self.lbl_dir, 1)
        lay_out.addWidget(self.btn_open)

        # add to root
        root.addWidget(gb_ms)
        root.addWidget(gb_tn)
        root.addWidget(gb_out)
        root.addStretch(1)

    # ------------------------------------------
    # Daten laden
    # ------------------------------------------
    def _load_data(self) -> None:
        self.cmb_ms.clear()
        for mid, name, saison, _schema in fetch_meisterschaften():
            label = f"{name}" + (f" – {saison}" if saison else "")
            self.cmb_ms.addItem(label, int(mid))

        self.cmb_tn.clear()
        for tid, name, datum, _modus, _ms in fetch_turniere():
            label = f"{name}" + (f" – {datum}" if datum else "")
            self.cmb_tn.addItem(label, int(tid))

    # ------------------------------------------
    # Actions
    # ------------------------------------------
    def _current_ms_id(self) -> Optional[int]:
        idx = self.cmb_ms.currentIndex()
        return None if idx < 0 else int(self.cmb_ms.currentData())

    def _current_tn_id(self) -> Optional[int]:
        idx = self.cmb_tn.currentIndex()
        return None if idx < 0 else int(self.cmb_tn.currentData())

    def _notify_ok(self, path: str) -> None:
        QMessageBox.information(self, "Export", f"Erfolgreich exportiert:\n{path}")

    def _notify_fail(self, err: Exception) -> None:
        QMessageBox.critical(self, "Fehler beim Export", f"{type(err).__name__}: {err}")

    def _open_dir(self) -> None:
        directory = ensure_exports_dir()
        # Windows: os.startfile, sonst DesktopServices
        try:
            if sys.platform.startswith("win"):
                os.startfile(directory)  # type: ignore[attr-defined]
            else:
                QDesktopServices.openUrl(QUrl.fromLocalFile(directory))
        except Exception as e:
            self._notify_fail(e)

    # --- Buttons: Meisterschaft ---
    def _on_ms_csv(self) -> None:
        ms_id = self._current_ms_id()
        if ms_id is None:
            QMessageBox.warning(self, "Hinweis", "Bitte eine Meisterschaft auswählen.")
            return
        try:
            path = export_meisterschaft_rangliste_csv(ms_id)
            self._notify_ok(path)
        except Exception as e:
            self._notify_fail(e)

    def _on_ms_pdf(self) -> None:
        ms_id = self._current_ms_id()
        if ms_id is None:
            QMessageBox.warning(self, "Hinweis", "Bitte eine Meisterschaft auswählen.")
            return
        try:
            path = export_meisterschaft_rangliste_pdf(ms_id)
            self._notify_ok(path)
        except Exception as e:
            self._notify_fail(e)

    # --- Buttons: Turnier ---
    def _on_tn_csv(self) -> None:
        tid = self._current_tn_id()
        if tid is None:
            QMessageBox.warning(self, "Hinweis", "Bitte ein Turnier auswählen.")
            return
        if not any(cb.isChecked() for cb in (self.chk_spielplan, self.chk_tabellen, self.chk_ko, self.chk_gesamt, self.chk_spieler)):
            QMessageBox.information(self, "Hinweis", "Bitte mindestens einen Export-Typ auswählen.")
            return
        try:
            paths = []
            if self.chk_spielplan.isChecked():
                paths.append(export_gruppen_spielplan_csv(tid))
            if self.chk_tabellen.isChecked():
                paths.append(export_gruppen_tabellen_csv(tid))
            if self.chk_ko.isChecked():
                paths.append(export_ko_csv(tid))
            if self.chk_gesamt.isChecked():
                paths.append(export_turnier_uebersicht_csv(tid))
            if self.chk_spieler.isChecked():
                paths.append(export_turnier_teilnehmer_csv(tid))
            QMessageBox.information(self, "Export", "Erfolgreich exportiert:\n" + "\n".join(paths))
        except Exception as e:
            self._notify_fail(e)

    def _on_tn_pdf(self) -> None:
        tid = self._current_tn_id()
        if tid is None:
            QMessageBox.warning(self, "Hinweis", "Bitte ein Turnier auswählen.")
            return
        if not any(cb.isChecked() for cb in (self.chk_spielplan, self.chk_tabellen, self.chk_ko, self.chk_gesamt, self.chk_spieler)):
            QMessageBox.information(self, "Hinweis", "Bitte mindestens einen Export-Typ auswählen.")
            return
        try:
            paths = []
            if self.chk_spielplan.isChecked():
                paths.append(export_gruppen_spielplan_pdf(tid))
            if self.chk_tabellen.isChecked():
                paths.append(export_gruppen_tabellen_pdf(tid))
            if self.chk_ko.isChecked():
                paths.append(export_ko_pdf(tid))
            if self.chk_gesamt.isChecked():
                paths.append(export_turnier_uebersicht_pdf(tid))
            if self.chk_spieler.isChecked():
                paths.append(export_turnier_teilnehmer_pdf(tid))
            QMessageBox.information(self, "Export", "Erfolgreich exportiert:\n" + "\n".join(paths))
        except Exception as e:
            self._notify_fail(e)
