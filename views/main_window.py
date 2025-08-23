from PyQt6.QtWidgets import QMainWindow, QWidget, QTabWidget, QVBoxLayout, QLabel
from views.turnier_view import TurnierView

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Dart Turnier Verwaltungs Tool")
        self.setMinimumSize(1000, 600)

        self.tabs = QTabWidget()
        self.tabs.addTab(TurnierView(), "Turniere")
        self.tabs.addTab(self._placeholder("Meisterschaften"), "Meisterschaften")
        self.tabs.addTab(self._placeholder("Teilnehmer"), "Teilnehmer")
        self.tabs.addTab(self._placeholder("Turnier starten"), "Turnier starten")

        central = QWidget()
        layout = QVBoxLayout()
        layout.addWidget(self.tabs)
        central.setLayout(layout)
        self.setCentralWidget(central)

    def _placeholder(self, name: str) -> QWidget:
        w = QWidget()
        lay = QVBoxLayout(w)
        lay.addWidget(QLabel(f"{name}-Modul noch nicht implementiert."))
        return w
