# views/main_window.py
# Hauptfenster – Tabs + neuer Tab „Exporte“ (v0.9)
from __future__ import annotations

import importlib
import inspect
from typing import Optional, Type

from PyQt6.QtWidgets import QMainWindow, QWidget, QTabWidget

# Bestehende Views
from views.turnier_view import TurnierView
from views.meisterschaft_view import MeisterschaftView
from views.teilnehmer_view import TeilnehmerView
from views.turnier_start_view import TurnierStartView
from views.gruppenphase_view import GruppenphaseView

# Neuer Export-Tab (v0.9)
from views.export_view import ExportView


def _resolve_ko_view_class() -> Type[QWidget]:
    """
    Robust: Versucht zuerst den direkten Klassenimport (KoPhaseView).
    Falls der Name abweicht, wird das Modul geladen und eine QWidget-Unterklasse
    aus dem Modul als View-Klasse bestimmt.
    """
    try:
        from views.ko_phase_view import KoPhaseView  # type: ignore
        return KoPhaseView  # type: ignore[name-defined]
    except Exception:
        pass

    mod = importlib.import_module("views.ko_phase_view")
    candidates = []
    for _name, obj in inspect.getmembers(mod, inspect.isclass):
        if issubclass(obj, QWidget) and obj.__module__ == mod.__name__:
            candidates.append(obj)

    for cls in candidates:
        if cls.__name__.lower().endswith("kophaseview"):
            return cls
    if candidates:
        return candidates[0]

    raise ImportError(
        "Konnte keine QWidget-View aus 'views.ko_phase_view' bestimmen. "
        "Bitte sicherstellen, dass dort eine Klasse für die KO-Phase definiert ist."
    )


def _safe_instantiate(view_cls: Type[QWidget], parent: Optional[QWidget]) -> QWidget:
    """
    Instanziiert eine View robust:
    - zuerst mit parent (falls __init__(self, parent) vorhanden),
    - sonst ohne Argumente.
    """
    try:
        return view_cls(parent)  # type: ignore[misc]
    except TypeError:
        return view_cls()       # type: ignore[call-arg]


class MainWindow(QMainWindow):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Dart Turnier Verwaltungs Tool")
        self.resize(1200, 800)
        self._build_ui()

    def _build_ui(self) -> None:
        self.tabs = QTabWidget()
        self.tabs.setTabPosition(QTabWidget.TabPosition.North)
        self.tabs.setMovable(False)
        self.tabs.setDocumentMode(True)

        # vorhandene Tabs – jeweils robust instanziieren
        self.tab_turniere = _safe_instantiate(TurnierView, self)
        self.tabs.addTab(self.tab_turniere, "Turniere")

        self.tab_meisterschaften = _safe_instantiate(MeisterschaftView, self)
        self.tabs.addTab(self.tab_meisterschaften, "Meisterschaften")

        self.tab_teilnehmer = _safe_instantiate(TeilnehmerView, self)
        self.tabs.addTab(self.tab_teilnehmer, "Teilnehmer")

        self.tab_start = _safe_instantiate(TurnierStartView, self)
        self.tabs.addTab(self.tab_start, "Turnier starten")

        self.tab_gruppen = _safe_instantiate(GruppenphaseView, self)
        self.tabs.addTab(self.tab_gruppen, "Gruppenphase")

        # KO-Phase (robuster Import + robuste Instanziierung)
        KoViewClass = _resolve_ko_view_class()
        self.tab_ko = _safe_instantiate(KoViewClass, self)
        self.tabs.addTab(self.tab_ko, "KO-Phase")

        # neuer Tab: Exporte (v0.9)
        self.tab_export = _safe_instantiate(ExportView, self)
        self.tabs.addTab(self.tab_export, "Exporte")

        self.setCentralWidget(self.tabs)
