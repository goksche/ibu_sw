from PyQt6.QtWidgets import QMainWindow, QWidget, QTabWidget, QVBoxLayout
from views.turnier_view import TurnierView
from views.meisterschaft_view import MeisterschaftView
from views.teilnehmer_view import TeilnehmerView
from views.turnier_start_view import TurnierStartView
from views.gruppenphase_view import GruppenphaseView
from views.ko_phase_view import KOPhaseView


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Dart Turnier Verwaltungs Tool")
        self.setMinimumSize(1200, 800)

        tabs = QTabWidget()
        tabs.addTab(TurnierView(), "Turniere")
        tabs.addTab(MeisterschaftView(), "Meisterschaften")
        tabs.addTab(TeilnehmerView(), "Teilnehmer")
        tabs.addTab(TurnierStartView(), "Turnier starten")
        tabs.addTab(GruppenphaseView(), "Gruppenphase")
        tabs.addTab(KOPhaseView(), "KO-Phase")

        central = QWidget()
        lay = QVBoxLayout(central)
        lay.addWidget(tabs)
        self.setCentralWidget(central)
