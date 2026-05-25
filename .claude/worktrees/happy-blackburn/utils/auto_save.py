# utils/auto_save.py
from __future__ import annotations
from typing import Dict, Callable, Optional

from PyQt6.QtCore import QTimer
from PyQt6.QtWidgets import QWidget, QTabWidget, QMainWindow, QPushButton

from utils.dirty import DirtyManager


def _find_save_callable(view_widget: QWidget, manager: DirtyManager) -> Optional[Callable[[], bool]]:
    # 1) save_changes()
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

    # 2) Speichern-Button
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


def install_auto_save(main_window: QMainWindow, debounce_ms: int = 1500) -> None:
    """
    Aktiviert Auto-Save mit Debounce fuer alle Tabs, die Dirty-Manager haben.
    - Speichert automatisch nach 'debounce_ms' ohne weitere Aenderung.
    - Nur wenn ein Save-Callable gefunden wird.
    - Setzt Tab auf clean bei Erfolg.
    """
    managers: Dict[int, DirtyManager] = getattr(main_window, "_dirty_managers", {})
    if not managers:
        return

    tab_widget: QTabWidget | None = main_window.findChild(QTabWidget, "tabWidget")
    if tab_widget is None:
        widgets = main_window.findChildren(QTabWidget)
        tab_widget = widgets[0] if widgets else None
    if tab_widget is None:
        return

    timers: Dict[int, QTimer] = {}

    def _arm_timer(idx: int):
        t = timers.get(idx)
        if t is None:
            t = QTimer(main_window)
            t.setSingleShot(True)
            timers[idx] = t

            def _timeout(i=idx):
                manager = managers.get(i)
                if not manager or not manager.is_dirty():
                    return
                w = tab_widget.widget(i)
                if not w:
                    return
                save = _find_save_callable(w, manager)
                if save:
                    ok = False
                    try:
                        ok = bool(save())
                    except Exception:
                        ok = False
                    if not ok:
                        # Bei Fehler: dirty bleibt bestehen; kein Crash
                        pass

            t.timeout.connect(_timeout)

        # Timer neu starten
        t.start(max(250, debounce_ms))

    # Reagiere auf Dirty-Aenderungen
    for idx, manager in managers.items():
        manager.dirtyChanged.connect(lambda is_dirty, i=idx: _arm_timer(i) if is_dirty else None)
