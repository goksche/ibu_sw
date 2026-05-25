# app/core/resource_manager.py
"""
Resource Manager für IBU Turniere v1.1.0-alpha.4

Verwaltet alle Ressourcen (Timer, Widgets, Connections) zentral
und stellt sicher, dass sie ordnungsgemäß freigegeben werden.

Hinweis: PyQt6-Abhängigkeiten sind optional für bessere Kompatibilität.
"""

from __future__ import annotations

import weakref
from typing import Dict, List, Optional, Set, Any, Union

from app.core import get_logger

logger = get_logger("app.core.resource_manager")

# Optional PyQt6 imports
try:
    from PyQt6.QtCore import QTimer, QObject
    from PyQt6.QtWidgets import QWidget
    PYQT6_AVAILABLE = True
except ImportError:
    PYQT6_AVAILABLE = False
    # Dummy classes für Fallback
    class QTimer:
        def __init__(self): pass
        def isActive(self): return False
        def stop(self): pass
    class QObject:
        def __init__(self): pass
        def disconnect(self, signal): pass
    class QWidget:
        def __init__(self): pass
        def parent(self): return None
        def deleteLater(self): pass

logger = get_logger("app.core.resource_manager")


class ResourceManager:
    """
    Singleton Resource Manager für zentrale Ressourcenverwaltung.
    
    Trackt alle aktiven Timer, Widgets und Connections und stellt
    sicher, dass sie ordnungsgemäß freigegeben werden.
    """
    
    _instance: Optional[ResourceManager] = None
    
    def __new__(cls) -> ResourceManager:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._timers: Set[QTimer] = set()
        self._widgets: Set[QWidget] = set()
        self._connections: List[tuple] = []
        self._cleanup_callbacks: List[callable] = []
        
        logger.info("Resource Manager initialized")
        self._initialized = True
    
    def register_timer(self, timer: QTimer, name: str = "") -> None:
        """
        Registriert einen Timer für Tracking.
        
        Args:
            timer: Der zu registrierende Timer
            name: Optionaler Name für besseres Debugging
        """
        if timer not in self._timers:
            self._timers.add(timer)
            logger.debug(f"Timer registered: {name or id(timer)}")
    
    def unregister_timer(self, timer: QTimer, name: str = "") -> None:
        """
        Deregistriert einen Timer.
        
        Args:
            timer: Der zu deregistrierende Timer
            name: Optionaler Name für besseres Debugging
        """
        if timer in self._timers:
            self._timers.discard(timer)
            logger.debug(f"Timer unregistered: {name or id(timer)}")
    
    def register_widget(self, widget: QWidget, name: str = "") -> None:
        """
        Registriert ein Widget für Tracking.
        
        Args:
            widget: Das zu registrierende Widget
            name: Optionaler Name für besseres Debugging
        """
        if widget not in self._widgets:
            self._widgets.add(widget)
            logger.debug(f"Widget registered: {name or widget.__class__.__name__}")
    
    def unregister_widget(self, widget: QWidget, name: str = "") -> None:
        """
        Deregistriert ein Widget.
        
        Args:
            widget: Das zu deregistrierende Widget
            name: Optionaler Name für besseres Debugging
        """
        if widget in self._widgets:
            self._widgets.discard(widget)
            logger.debug(f"Widget unregistered: {name or widget.__class__.__name__}")
    
    def register_connection(self, sender: QObject, signal: str, receiver: callable) -> None:
        """
        Registriert eine Signal-Slot-Verbindung.
        
        Args:
            sender: Das sendende Objekt
            signal: Das Signal
            receiver: Der Empfänger (Slot)
        """
        connection = (weakref.ref(sender), signal, weakref.ref(receiver))
        self._connections.append(connection)
        logger.debug(f"Connection registered: {sender.__class__.__name__}.{signal}")
    
    def register_cleanup_callback(self, callback: callable) -> None:
        """
        Registriert einen Cleanup-Callback.
        
        Args:
            callback: Funktion die beim Cleanup aufgerufen werden soll
        """
        self._cleanup_callbacks.append(callback)
        logger.debug(f"Cleanup callback registered: {callback.__name__}")
    
    def stop_all_timers(self) -> None:
        """Stoppt alle registrierten Timer."""
        logger.info("Stopping all registered timers")
        
        active_timers = list(self._timers)
        for timer in active_timers:
            try:
                if timer.isActive():
                    timer.stop()
                    logger.debug(f"Timer stopped: {id(timer)}")
            except RuntimeError:
                # Timer wurde bereits gelöscht
                pass
        
        self._timers.clear()
        logger.info(f"Stopped {len(active_timers)} timers")
    
    def cleanup_widgets(self) -> None:
        """Bereinigt alle registrierten Widgets."""
        logger.info("Cleaning up registered widgets")
        
        active_widgets = list(self._widgets)
        for widget in active_widgets:
            try:
                if hasattr(widget, 'deleteLater'):
                    widget.deleteLater()
                logger.debug(f"Widget cleaned up: {widget.__class__.__name__}")
            except RuntimeError:
                # Widget wurde bereits gelöscht
                pass
        
        self._widgets.clear()
        logger.info(f"Cleaned up {len(active_widgets)} widgets")
    
    def disconnect_all_connections(self) -> None:
        """Trennt alle registrierten Verbindungen."""
        logger.info("Disconnecting all registered connections")
        
        active_connections = list(self._connections)
        for sender_ref, signal, receiver_ref in active_connections:
            try:
                sender = sender_ref()
                receiver = receiver_ref()
                
                if sender and receiver:
                    sender.disconnect(signal)
                    logger.debug(f"Connection disconnected: {sender.__class__.__name__}.{signal}")
            except (RuntimeError, AttributeError):
                # Objekt wurde bereits gelöscht
                pass
        
        self._connections.clear()
        logger.info(f"Disconnected {len(active_connections)} connections")
    
    def run_cleanup_callbacks(self) -> None:
        """Führt alle registrierten Cleanup-Callbacks aus."""
        logger.info("Running cleanup callbacks")
        
        active_callbacks = list(self._cleanup_callbacks)
        for callback in active_callbacks:
            try:
                callback()
                logger.debug(f"Cleanup callback executed: {callback.__name__}")
            except Exception as e:
                logger.error(f"Cleanup callback failed: {callback.__name__}", exception=e)
        
        self._cleanup_callbacks.clear()
        logger.info(f"Executed {len(active_callbacks)} cleanup callbacks")
    
    def cleanup_all(self) -> None:
        """Führt ein vollständiges Cleanup aller Ressourcen durch."""
        logger.info("Starting complete resource cleanup")
        
        self.stop_all_timers()
        self.disconnect_all_connections()
        self.run_cleanup_callbacks()
        self.cleanup_widgets()
        
        logger.info("Complete resource cleanup finished")
    
    def get_stats(self) -> Dict[str, int]:
        """
        Gibt Statistiken über registrierte Ressourcen zurück.
        
        Returns:
            Dictionary mit Ressourcen-Statistiken
        """
        active_timers = len([t for t in self._timers if t.isActive()])
        active_widgets = len([w for w in self._widgets if w.parent() is not None])
        active_connections = len([c for c in self._connections if c[0]() and c[2]()])
        
        return {
            "total_timers": len(self._timers),
            "active_timers": active_timers,
            "total_widgets": len(self._widgets),
            "active_widgets": active_widgets,
            "total_connections": len(self._connections),
            "active_connections": active_connections,
            "cleanup_callbacks": len(self._cleanup_callbacks)
        }
    
    def log_stats(self) -> None:
        """Loggt aktuelle Ressourcen-Statistiken."""
        stats = self.get_stats()
        logger.info("Resource Manager Statistics", **stats)


# Globale Resource Manager Instanz
resource_manager = ResourceManager()


def get_resource_manager() -> ResourceManager:
    """
    Gibt die globale Resource Manager Instanz zurück.
    
    Returns:
        ResourceManager-Instanz
    """
    return resource_manager


def cleanup_all_resources() -> None:
    """
    Convenience-Funktion für vollständiges Resource Cleanup.
    """
    resource_manager.cleanup_all()


def register_timer(timer: QTimer, name: str = "") -> None:
    """
    Convenience-Funktion zum Registrieren eines Timers.
    
    Args:
        timer: Der zu registrierende Timer
        name: Optionaler Name
    """
    resource_manager.register_timer(timer, name)


def register_widget(widget: QWidget, name: str = "") -> None:
    """
    Convenience-Funktion zum Registrieren eines Widgets.
    
    Args:
        widget: Das zu registrierende Widget
        name: Optionaler Name
    """
    resource_manager.register_widget(widget, name)


def register_connection(sender: QObject, signal: str, receiver: callable) -> None:
    """
    Convenience-Funktion zum Registrieren einer Verbindung.
    
    Args:
        sender: Das sendende Objekt
        signal: Das Signal
        receiver: Der Empfänger
    """
    resource_manager.register_connection(sender, signal, receiver)
