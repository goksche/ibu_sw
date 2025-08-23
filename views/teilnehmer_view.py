# Teilnehmerverwaltung 
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel

class TeilnehmerView(QWidget):
    def __init__(self):
        super().__init__()
        lay = QVBoxLayout(self)
        lay.addWidget(QLabel("Teilnehmer – noch nicht implementiert."))
