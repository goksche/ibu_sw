# app/core/exceptions.py
"""
Exception Framework für IBU Turniere v1.1.0

Definiert spezifische Exception-Klassen für verschiedene Fehlertypen
in der Anwendung.
"""

from __future__ import annotations


class IBUTurniereException(Exception):
    """
    Basis-Exception für alle IBU Turniere-spezifischen Fehler.
    
    Alle anderen Exceptions erben von dieser Klasse, um eine
    einheitliche Fehlerbehandlung zu ermöglichen.
    """
    
    def __init__(self, message: str, details: str = ""):
        super().__init__(message)
        self.message = message
        self.details = details
    
    def __str__(self) -> str:
        if self.details:
            return f"{self.message} - Details: {self.details}"
        return self.message


class DatabaseError(IBUTurniereException):
    """
    Fehler bei Datenbankoperationen.
    
    Wird ausgelöst bei:
    - Verbindungsfehlern
    - SQL-Fehlern
    - Schema-Problemen
    - Transaktionsfehlern
    """
    
    def __init__(self, message: str, sql_error: str = "", operation: str = ""):
        details = f"Operation: {operation}" if operation else ""
        if sql_error:
            details += f" | SQL Error: {sql_error}" if details else f"SQL Error: {sql_error}"
        super().__init__(f"Database Error: {message}", details)


class ValidationError(IBUTurniereException):
    """
    Fehler bei der Eingabevalidierung.
    
    Wird ausgelöst bei:
    - Ungültigen Eingabewerten
    - Verletzung von Geschäftsregeln
    - Formatfehlern
    """
    
    def __init__(self, message: str, field: str = "", value: str = ""):
        details = f"Field: {field}" if field else ""
        if value:
            details += f" | Value: {value}" if details else f"Value: {value}"
        super().__init__(f"Validation Error: {message}", details)


class TournamentNotFoundError(IBUTurniereException):
    """
    Fehler wenn ein Turnier nicht gefunden wird.
    """
    
    def __init__(self, tournament_id: int):
        super().__init__(f"Tournament with ID {tournament_id} not found")


class ParticipantNotFoundError(IBUTurniereException):
    """
    Fehler wenn ein Teilnehmer nicht gefunden wird.
    """
    
    def __init__(self, participant_id: int):
        super().__init__(f"Participant with ID {participant_id} not found")


class GroupNotFoundError(IBUTurniereException):
    """
    Fehler wenn eine Gruppe nicht gefunden wird.
    """
    
    def __init__(self, group_id: int):
        super().__init__(f"Group with ID {group_id} not found")


class MatchNotFoundError(IBUTurniereException):
    """
    Fehler wenn ein Spiel nicht gefunden wird.
    """
    
    def __init__(self, match_id: int):
        super().__init__(f"Match with ID {match_id} not found")


class InvalidInputError(IBUTurniereException):
    """
    Fehler bei ungültigen Eingaben.
    
    Wird ausgelöst bei:
    - Leeren Pflichtfeldern
    - Ungültigen Datentypen
    - Werte außerhalb erlaubter Bereiche
    """
    
    def __init__(self, message: str, field: str = "", expected_type: str = ""):
        details = f"Field: {field}" if field else ""
        if expected_type:
            details += f" | Expected: {expected_type}" if details else f"Expected: {expected_type}"
        super().__init__(f"Invalid Input: {message}", details)


class ConfigurationError(IBUTurniereException):
    """
    Fehler bei der Konfiguration.
    
    Wird ausgelöst bei:
    - Fehlenden Konfigurationsdateien
    - Ungültigen Konfigurationswerten
    - Berechtigungsproblemen
    """
    
    def __init__(self, message: str, config_file: str = ""):
        details = f"Config File: {config_file}" if config_file else ""
        super().__init__(f"Configuration Error: {message}", details)


class ExportError(IBUTurniereException):
    """
    Fehler beim Export von Daten.
    
    Wird ausgelöst bei:
    - Dateisystem-Fehlern
    - Berechtigungsproblemen
    - Formatierungsfehlern
    """
    
    def __init__(self, message: str, export_type: str = "", file_path: str = ""):
        details = f"Export Type: {export_type}" if export_type else ""
        if file_path:
            details += f" | File: {file_path}" if details else f"File: {file_path}"
        super().__init__(f"Export Error: {message}", details)


class BackupError(IBUTurniereException):
    """
    Fehler beim Backup/Restore von Daten.
    
    Wird ausgelöst bei:
    - Backup-Fehlern
    - Restore-Fehlern
    - Dateisystem-Problemen
    """
    
    def __init__(self, message: str, operation: str = "", file_path: str = ""):
        details = f"Operation: {operation}" if operation else ""
        if file_path:
            details += f" | File: {file_path}" if details else f"File: {file_path}"
        super().__init__(f"Backup Error: {message}", details)
