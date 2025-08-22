from PyQt6.QtWidgets import QMainWindow, QWidget, QTabWidget, QVBoxLayout, QLabel

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Dart Turnier Verwaltungs Tool")
        self.setMinimumSize(1000, 600)

        self.tabs = QTabWidget()
        self.tabs.addTab(self._dummy_tab("Turniere"), "Turniere")
        self.tabs.addTab(self._dummy_tab("Meisterschaften"), "Meisterschaften")
        self.tabs.addTab(self._dummy_tab("Teilnehmer"), "Teilnehmer")
        self.tabs.addTab(self._dummy_tab("Turnier starten"), "Turnier starten")

        central = QWidget()
        layout = QVBoxLayout()
        layout.addWidget(self.tabs)
        central.setLayout(layout)
        self.setCentralWidget(central)

    def _dummy_tab(self, name: str) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout()
        layout.addWidget(QLabel(f"{name}-Modul noch nicht implementiert."))
        tab.setLayout(layout)
        return tab
