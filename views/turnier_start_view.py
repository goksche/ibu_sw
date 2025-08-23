from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel

class TurnierStartView(QWidget):
    def __init__(self):
        super().__init__()
        lay = QVBoxLayout(self)
        lay.addWidget(QLabel("Turnier starten – noch nicht implementiert."))
