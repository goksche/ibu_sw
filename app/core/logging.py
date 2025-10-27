# app/core/logging.py
"""
Logging System für IBU Turniere v1.1.0

Strukturiertes Logging mit verschiedenen Log-Levels und automatischer
Log-Rotation für bessere Debugging-Möglichkeiten.
"""

from __future__ import annotations

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from typing import Optional


class IBULogger:
    """
    Zentrale Logger-Klasse für IBU Turniere.
    
    Bietet strukturiertes Logging mit verschiedenen Levels und
    automatischer Log-Rotation.
    """
    
    _instance: Optional[IBULogger] = None
    _logger: Optional[logging.Logger] = None
    
    def __new__(cls) -> IBULogger:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._logger is None:
            self._setup_logger()
    
    def _setup_logger(self) -> None:
        """Konfiguriert den Logger mit File- und Console-Handler."""
        self._logger = logging.getLogger("ibu_turniere")
        self._logger.setLevel(logging.DEBUG)
        
        # Verhindere doppelte Handler
        if self._logger.handlers:
            return
        
        # Log-Verzeichnis erstellen
        log_dir = os.path.join(os.environ.get("IBU_DATA_ROOT", "."), "data")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "ibu_turniere.log")
        
        # File Handler mit Rotation
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG)
        
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Handler hinzufügen
        self._logger.addHandler(file_handler)
        self._logger.addHandler(console_handler)
    
    def debug(self, message: str, module: str = "", **kwargs) -> None:
        """Debug-Level Logging."""
        self._log(logging.DEBUG, message, module, **kwargs)
    
    def info(self, message: str, module: str = "", **kwargs) -> None:
        """Info-Level Logging."""
        self._log(logging.INFO, message, module, **kwargs)
    
    def warning(self, message: str, module: str = "", **kwargs) -> None:
        """Warning-Level Logging."""
        self._log(logging.WARNING, message, module, **kwargs)
    
    def error(self, message: str, module: str = "", exception: Optional[Exception] = None, **kwargs) -> None:
        """Error-Level Logging."""
        self._log(logging.ERROR, message, module, exception=exception, **kwargs)
    
    def critical(self, message: str, module: str = "", exception: Optional[Exception] = None, **kwargs) -> None:
        """Critical-Level Logging."""
        self._log(logging.CRITICAL, message, module, exception=exception, **kwargs)
    
    def _log(self, level: int, message: str, module: str = "", exception: Optional[Exception] = None, **kwargs) -> None:
        """Interne Log-Methode mit strukturierten Daten."""
        if not self._logger:
            return
        
        # Strukturierte Nachricht erstellen
        structured_message = message
        if module:
            structured_message = f"[{module}] {message}"
        
        # Zusätzliche Informationen hinzufügen
        if kwargs:
            extra_info = " | ".join([f"{k}={v}" for k, v in kwargs.items()])
            structured_message += f" | {extra_info}"
        
        # Log-Eintrag erstellen
        if exception:
            self._logger.log(level, structured_message, exc_info=exception)
        else:
            self._logger.log(level, structured_message)
    
    def log_database_operation(self, operation: str, table: str = "", success: bool = True, **kwargs) -> None:
        """Spezielle Methode für Datenbankoperationen."""
        level = logging.INFO if success else logging.ERROR
        message = f"DB Operation: {operation}"
        if table:
            message += f" on table '{table}'"
        message += f" - {'SUCCESS' if success else 'FAILED'}"
        
        self._log(level, message, "database", **kwargs)
    
    def log_user_action(self, action: str, user_context: str = "", **kwargs) -> None:
        """Spezielle Methode für Benutzeraktionen."""
        message = f"User Action: {action}"
        if user_context:
            message += f" - {user_context}"
        
        self.info(message, "user", **kwargs)
    
    def log_validation_error(self, field: str, value: str, error_type: str, **kwargs) -> None:
        """Spezielle Methode für Validierungsfehler."""
        message = f"Validation Error: {error_type} for field '{field}' with value '{value}'"
        self.warning(message, "validation", **kwargs)
    
    def log_performance(self, operation: str, duration_ms: float, **kwargs) -> None:
        """Spezielle Methode für Performance-Logging."""
        message = f"Performance: {operation} took {duration_ms:.2f}ms"
        level = logging.WARNING if duration_ms > 1000 else logging.DEBUG
        self._log(level, message, "performance", **kwargs)


# Globale Logger-Instanz
logger = IBULogger()


def get_logger(module_name: str = "") -> IBULogger:
    """
    Gibt eine Logger-Instanz zurück.
    
    Args:
        module_name: Name des Moduls für bessere Nachverfolgung
    
    Returns:
        IBULogger-Instanz
    """
    return logger


# Convenience-Funktionen für einfache Verwendung
def debug(message: str, **kwargs) -> None:
    """Debug-Logging."""
    logger.debug(message, **kwargs)


def info(message: str, **kwargs) -> None:
    """Info-Logging."""
    logger.info(message, **kwargs)


def warning(message: str, **kwargs) -> None:
    """Warning-Logging."""
    logger.warning(message, **kwargs)


def error(message: str, exception: Optional[Exception] = None, **kwargs) -> None:
    """Error-Logging."""
    logger.error(message, exception=exception, **kwargs)


def critical(message: str, exception: Optional[Exception] = None, **kwargs) -> None:
    """Critical-Logging."""
    logger.critical(message, exception=exception, **kwargs)
