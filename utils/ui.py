# utils/ui.py
# v0.9.2 – Kleine UI-Helfer (PyQt6)

from __future__ import annotations
from PyQt6.QtWidgets import QMessageBox, QWidget

def show_info(parent: QWidget, title: str, text: str) -> None:
    QMessageBox.information(parent, title, text)

def show_error(parent: QWidget, title: str, text: str) -> None:
    QMessageBox.critical(parent, title, text)

def ask_yes_no(parent: QWidget, title: str, text: str) -> bool:
    ret = QMessageBox.question(parent, title, text, QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
    return ret == QMessageBox.StandardButton.Yes
