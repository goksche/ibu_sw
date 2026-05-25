# utils/dirty.py
from __future__ import annotations
from typing import Callable, Optional, Set, Dict
from contextlib import contextmanager

from PyQt6.QtCore import QObject, pyqtSignal, QTimer
from PyQt6.QtWidgets import QWidget, QMessageBox, QTabWidget


class DirtyManager(QObject):
    """
    Zentrale Verwaltung des 'dirty'-Zustands fuer eine View/Tab.
    - Merkt, ob ungespeicherte Aenderungen vorliegen.
    - Pausiert/Resumed bekannte Auto-Refresh-Timer.
    - Aktualisiert Tab-Title-Badge.
    - Unterdrueckt fuer kurze Zeit programmgenerierte Events nach Speichern/Refresh.
    """
    dirtyChanged = pyqtSignal(bool)

    def __init__(self, parent: Optional[QWidget] = None, tab_widget: Optional[QTabWidget] = None):
        super().__init__(parent)
        self._is_dirty: bool = False
        self._timers: Set[QTimer] = set()
        self._paused: bool = False
        self._tab_widget = tab_widget
        self._tab_index_by_widget: Dict[QWidget, int] = {}
        self._suppress_events: bool = False
        self._suppress_timer: Optional[QTimer] = None

    # ---- Oeffentliche API ----------------------------------------------------

    def attach_tab_index(self, widget: QWidget, index: int) -> None:
        self._tab_index_by_widget[widget] = index

    def register_timer(self, timer: QTimer) -> None:
        if isinstance(timer, QTimer):
            self._timers.add(timer)

    def set_dirty(self, dirty: bool, view_widget: Optional[QWidget] = None) -> None:
        """
        Setzt den Dirty-Status. Waerend suppress-Phase werden Dirty-True-Events ignoriert.
        """
        if dirty and self._suppress_events:
            return
        if self._is_dirty == dirty:
            return
        self._is_dirty = dirty
        if dirty:
            self._pause_timers()
        else:
            self._resume_timers()
        self._update_tab_badge(view_widget)
        self.dirtyChanged.emit(dirty)

    def is_dirty(self) -> bool:
        return self._is_dirty

    def mark_clean(self, view_widget: Optional[QWidget] = None) -> None:
        """Explizit auf 'clean' setzen (z. B. nach erfolgreichem Speichern)."""
        self.set_dirty(False, view_widget)

    def suppress_for_ms(self, ms: int = 600) -> None:
        """
        Unterdrueckt Dirty-True-Events fuer kurze Zeit (nach Save/Refresh).
        """
        self._suppress_events = True
        if self._suppress_timer is None:
            self._suppress_timer = QTimer(self)
            self._suppress_timer.setSingleShot(True)
            self._suppress_timer.timeout.connect(self._end_suppress)
        self._suppress_timer.start(max(1, ms))

    @contextmanager
    def ignore_changes(self, ms_after: int = 0):
        """
        Kontextmanager: waehrenddessen keine Dirty-Markierung zulassen.
        Optional danach nochmal ms_after unterdruecken (z. B. nach Massenupdate).
        """
        prev = self._suppress_events
        self._suppress_events = True
        try:
            yield
        finally:
            self._suppress_events = prev
            if ms_after > 0:
                self.suppress_for_ms(ms_after)

    # ---- Timer Handling ------------------------------------------------------

    def _pause_timers(self) -> None:
        if self._paused:
            return
        for t in list(self._timers):
            try:
                t.stop()
            except Exception:
                pass
        self._paused = True

    def _resume_timers(self) -> None:
        if not self._paused:
            return
        for t in list(self._timers):
            try:
                if t.interval() > 0:
                    t.start(t.interval())
            except Exception:
                pass
        self._paused = False

    # ---- Tab Badge -----------------------------------------------------------

    def _update_tab_badge(self, view_widget: Optional[QWidget]) -> None:
        if not self._tab_widget or view_widget is None:
            return
        idx = self._tab_index_by_widget.get(view_widget, -1)
        if idx < 0 or idx >= self._tab_widget.count():
            return
        original = self._tab_widget.tabText(idx)
        if self._is_dirty:
            if "●" not in original:
                self._tab_widget.setTabText(idx, f"● {original}")
        else:
            if original.startswith("● "):
                self._tab_widget.setTabText(idx, original[2:])

    # ---- Dialog --------------------------------------------------------------

    def confirm_discard_or_save(
        self,
        parent: QWidget,
        try_save: Optional[Callable[[], bool]] = None,
        title: str = "Ungespeicherte Aenderungen",
        text: str = "Du hast ungespeicherte Aenderungen. Moechtest du speichern?"
    ) -> str:
        """
        Dialog: Speichern / Verwerfen / Abbrechen
        Rueckgabe: 'save' | 'discard' | 'cancel'
        """
        box = QMessageBox(parent)
        box.setWindowTitle(title)
        box.setText(text)
        btn_save = box.addButton("Speichern", QMessageBox.ButtonRole.AcceptRole)
        btn_discard = box.addButton("Verwerfen", QMessageBox.ButtonRole.DestructiveRole)
        btn_cancel = box.addButton("Abbrechen", QMessageBox.ButtonRole.RejectRole)
        box.setIcon(QMessageBox.Icon.Warning)
        box.exec()

        clicked = box.clickedButton()
        if clicked == btn_save:
            ok = True
            if try_save:
                ok = False
                try:
                    ok = bool(try_save())
                except Exception:
                    ok = False
            if ok:
                # Nach erfolgreichem Speichern: kurz Events unterdruecken und clean setzen
                self.suppress_for_ms(600)
                self.set_dirty(False)
                return "save"
            return "cancel"
        elif clicked == btn_discard:
            self.set_dirty(False)
            return "discard"
        return "cancel"

    # ---- intern --------------------------------------------------------------

    def _end_suppress(self):
        self._suppress_events = False
