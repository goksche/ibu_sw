# utils/dirty_guard.py
from __future__ import annotations
from typing import Optional, Dict, Callable, List

from PyQt6.QtCore import QObject, QEvent, QTimer
from PyQt6.QtWidgets import (
    QWidget, QMainWindow, QTabWidget, QPushButton, QComboBox,
    QLineEdit, QSpinBox, QDoubleSpinBox, QDateTimeEdit, QDateEdit, QTimeEdit,
    QPlainTextEdit, QTextEdit, QTableWidget
)

from utils.dirty import DirtyManager


# -------- Hilfsfunktionen -----------------------------------------------------

def _collect_timers(root: QWidget) -> List[QTimer]:
    timers: List[QTimer] = []
    for name in ("autoRefreshTimer", "refresh_timer", "timer", "list_timer"):
        t = getattr(root, name, None)
        if isinstance(t, QTimer):
            timers.append(t)
    for child in root.findChildren(QTimer):
        timers.append(child)
    # unique
    seen, uniq = set(), []
    for t in timers:
        if id(t) not in seen:
            uniq.append(t)
            seen.add(id(t))
    return uniq


def _safe_connect(widget: QWidget, signal_name: str, slot: Callable) -> None:
    """Verbinde nur, wenn das Signal existiert (verhindert AttributeError)."""
    sig = getattr(widget, signal_name, None)
    if sig is not None:
        try:
            sig.connect(slot)
        except Exception:
            pass


def _wire_common_input_signals(view_widget: QWidget, manager: DirtyManager) -> None:
    """
    Markiert 'dirty' NUR bei echten User-Edits (Fokus-Pruefung).
    """
    # QLineEdit – textEdited ist user-getrieben
    for w in view_widget.findChildren(QLineEdit):
        _safe_connect(w, "textEdited", lambda _t, vw=view_widget: manager.set_dirty(True, vw))

    # QTextEdit / QPlainTextEdit – nur wenn Fokus
    def _make_text_changed_handler(widget: QWidget):
        def _h():
            if widget.hasFocus():
                manager.set_dirty(True, view_widget)
        return _h
    for w in view_widget.findChildren(QTextEdit):
        _safe_connect(w, "textChanged", _make_text_changed_handler(w))
    for w in view_widget.findChildren(QPlainTextEdit):
        _safe_connect(w, "textChanged", _make_text_changed_handler(w))

    # SpinBoxen – nur wenn Fokus
    for w in view_widget.findChildren(QSpinBox):
        _safe_connect(w, "valueChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)
    for w in view_widget.findChildren(QDoubleSpinBox):
        _safe_connect(w, "valueChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)

    # Datum/Zeit – nur wenn Fokus
    for w in view_widget.findChildren(QDateEdit):
        _safe_connect(w, "dateChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)
    for w in view_widget.findChildren(QTimeEdit):
        _safe_connect(w, "timeChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)
    for w in view_widget.findChildren(QDateTimeEdit):
        _safe_connect(w, "dateTimeChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)
        _safe_connect(w, "dateChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)
        _safe_connect(w, "timeChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)

    # ComboBox – nur bei Benutzeraktion (Fokus)
    for w in view_widget.findChildren(QComboBox):
        def _on_changed(_idx, cb=w):
            if cb.hasFocus():
                manager.set_dirty(True, view_widget)
        _safe_connect(w, "currentIndexChanged", _on_changed)

    # TableWidget – nur wenn Tabelle Fokus hat (kein Dirty beim initialen Befüllen)
    for w in view_widget.findChildren(QTableWidget):
        _safe_connect(w, "itemChanged",
                      lambda *_a, vw=view_widget, ww=w: manager.set_dirty(True, vw) if ww.hasFocus() else None)


def _find_save_callable_in(view_widget: QWidget, manager: DirtyManager) -> Optional[Callable[[], bool]]:
    """
    Suche nach Speichern-Mechanik:
    1) Methode save_changes()
    2) Button-Click auf "Speichern" (Text/Objektname); setzt danach automatisch clean + Suppress.
    """
    # 1) Methode save_changes
    save_method = getattr(view_widget, "save_changes", None)
    if callable(save_method):
        def _call() -> bool:
            ok = False
            try:
                ok = bool(save_method())
            except Exception:
                ok = False
            if ok:
                manager.suppress_for_ms(600)
                manager.mark_clean(view_widget)
            return ok
        return _call

    # 2) Button
    for btn in view_widget.findChildren(QPushButton):
        text = (btn.text() or "").strip().lower()
        objn = (btn.objectName() or "").strip().lower()
        if text in ("speichern", "save") or objn in ("btnspeichern", "btn_save", "savebutton", "save"):
            def _click_and_clean(b=btn) -> bool:
                try:
                    b.click()
                    manager.suppress_for_ms(600)
                    manager.mark_clean(view_widget)
                    return True
                except Exception:
                    return False
            return _click_and_clean
    return None


def _trigger_refresh_on(widget: QWidget) -> None:
    """
    Löst im Ziel-Tab aktiv einen Reload aus.
    Unterstützt explizit deine View-Methoden:
    - KO:  reload_turniere_keep_selection
    - Gruppen: _reload_turniere_keep_selection
    Fällt zurück auf weitere übliche Namen und Timer.
    """
    candidates = [
        "reload_turniere_keep_selection",     # KO-Phase
        "_reload_turniere_keep_selection",    # Gruppenphase
        "_load_rounds_and_matches",           # KO intern
        "_load_groups_and_matches",           # Gruppen intern
        "refresh", "reload", "load_data", "load", "refresh_view", "update_view"
    ]
    for name in candidates:
        fn = getattr(widget, name, None)
        if callable(fn):
            try:
                fn()
                return
            except Exception:
                # nächsten Kandidaten probieren
                pass
    # Falls keine Methode: Timer anschubsen
    for t in _collect_timers(widget):
        try:
            if t.interval() > 0:
                t.start(t.interval())
            else:
                QTimer.singleShot(10, lambda tt=t: tt.start(max(250, tt.interval() or 250)))
        except Exception:
            pass


# -------- Guards --------------------------------------------------------------

class _TabChangeGuard(QObject):
    """
    Silent Save beim Registerwechsel:
    - Speichere NUR den Ursprungs-Tab (von dem weg gewechselt wird).
    - Danach Ziel-Tab aktiv REFRESHEN (richtige Methodenliste).
    - Kein Popup. Bei Fehlschlag Wechsel rückgängig, sonst zulassen.
    """
    def __init__(self, main: QMainWindow, tab: QTabWidget, managers: Dict[int, DirtyManager]):
        super().__init__(main)
        self.main = main
        self.tab = tab
        self.managers = managers
        self._last_index: Optional[int] = tab.currentIndex()
        tab.currentChanged.connect(self._on_current_changed)
        main.installEventFilter(self)

    def _on_current_changed(self, new_index: int):
        origin = self._last_index
        if origin is None or origin == new_index:
            self._last_index = new_index
            return

        # 1) Wenn Ursprungs-Tab dirty: still speichern
        manager = self.managers.get(origin)
        if manager and manager.is_dirty():
            view_widget = self.tab.widget(origin)
            try_save = _find_save_callable_in(view_widget, manager)

            ok = True  # Wenn keine Save-Mechanik gefunden wurde, nicht blockieren
            if try_save:
                try:
                    ok = bool(try_save())
                except Exception:
                    ok = False

            if not ok:
                # Speichern fehlgeschlagen -> Wechsel rückgängig (still)
                self.tab.blockSignals(True)
                try:
                    self.tab.setCurrentIndex(origin)
                finally:
                    self.tab.blockSignals(False)
                # _last_index bleibt origin
                return

        # 2) Wechsel akzeptieren und Ziel-Tab EXPLIZIT refreshen
        self._last_index = new_index
        target_widget = self.tab.widget(new_index)
        if target_widget is not None:
            _trigger_refresh_on(target_widget)

    def eventFilter(self, watched: QObject, event: QEvent) -> bool:
        # Still-save beim Schließen des Fensters
        if watched is self.main and event.type() == QEvent.Type.Close:
            # Versuche alle dirty Tabs automatisch zu speichern
            for idx, manager in self.managers.items():
                if not manager.is_dirty():
                    continue
                view_widget = self.tab.widget(idx)
                try_save = _find_save_callable_in(view_widget, manager)
                ok = True
                if try_save:
                    try:
                        ok = bool(try_save())
                    except Exception:
                        ok = False
                if not ok:
                    event.ignore()
                    return True
        return super().eventFilter(watched, event)


# -------- Haupteinstieg ------------------------------------------------------

def install_dirty_guard(main_window: QMainWindow) -> None:
    """
    Installiert Dirty-Handling für alle Tabs eines QTabWidget im MainWindow.
    - Pausiert Auto-Refresh-Timer bei Edits (via DirtyManager-Mechanik).
    - Markiert 'dirty' nur bei echten User-Edits (Fokus-Check).
    - Beim Registerwechsel wird OHNE Popup still gespeichert (nur Ursprungs-Tab)
      und der Ziel-Tab aktiv refreshed – inkl. KO/Gruppen-spezifischer Methoden.
    """
    tab: Optional[QTabWidget] = main_window.findChild(QTabWidget, "tabWidget")
    if tab is None:
        widgets = main_window.findChildren(QTabWidget)
        tab = widgets[0] if widgets else None
    if tab is None:
        return

    managers: Dict[int, DirtyManager] = {}
    for i in range(tab.count()):
        w = tab.widget(i)
        manager = DirtyManager(parent=w, tab_widget=tab)
        manager.attach_tab_index(w, i)
        # Timer einsammeln
        for t in _collect_timers(w):
            manager.register_timer(t)
        # Nur echte Edit-Signale verbinden (mit Fokus-Check)
        _wire_common_input_signals(w, manager)
        managers[i] = manager

    # Exponiere Manager für evtl. Auto-Save-Komponente
    setattr(main_window, "_dirty_managers", managers)

    _TabChangeGuard(main_window, tab, managers)
