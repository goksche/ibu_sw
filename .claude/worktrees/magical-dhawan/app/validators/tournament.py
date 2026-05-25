# app/validators/tournament.py
"""
Tournament Validator für IBU Turniere v1.1.0-alpha.3

Validiert Turnier-spezifische Daten.
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.core import ValidationError, get_logger
from .base import BaseValidator, is_not_empty, is_valid_length, is_valid_date, is_one_of, sanitize_string

logger = get_logger("app.validators.tournament")

# Erlaubte Turnier-Modi
ALLOWED_TOURNAMENT_MODES = [
    "Gruppenphase",
    "KO-Phase", 
    "Gruppenphase + KO-Phase",
    "Liga",
    "Freies Turnier"
]

# Erlaubte Datumsformate
ALLOWED_DATE_FORMATS = [
    "%Y-%m-%d",      # 2024-01-01
    "%d.%m.%Y",      # 01.01.2024
    "%d/%m/%Y",      # 01/01/2024
]


class TournamentValidator(BaseValidator):
    """
    Validator für Turnier-Daten.
    
    Validiert:
    - Name: nicht leer, max 255 Zeichen, keine gefährlichen Zeichen
    - Datum: gültiges Datum oder leer
    - Modus: einer der erlaubten Modi oder leer
    - Meisterschaft: 0 oder 1
    """
    
    def validate(self, data: Any) -> Dict[str, Any]:
        """
        Validiert Turnier-Daten.
        
        Args:
            data: Dictionary mit Turnier-Daten oder einzelne Werte
            
        Returns:
            Dictionary mit validierten und bereinigten Daten
            
        Raises:
            ValidationError: Wenn die Validierung fehlschlägt
        """
        logger.debug("Validating tournament data", data_type=type(data).__name__)
        
        if isinstance(data, dict):
            return self._validate_dict(data)
        else:
            # Einzelne Werte validieren
            return self._validate_single_value(data)
    
    def _validate_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validiert ein Dictionary mit Turnier-Daten."""
        validated_data = {}
        
        # Name validieren (erforderlich)
        if "name" in data:
            validated_data["name"] = self._validate_name(data["name"])
        else:
            raise ValidationError("Tournament name is required", field="name")
        
        # Datum validieren (optional)
        if "datum" in data:
            validated_data["datum"] = self._validate_date(data["datum"])
        else:
            validated_data["datum"] = ""
        
        # Modus validieren (optional)
        if "modus" in data:
            validated_data["modus"] = self._validate_mode(data["modus"])
        else:
            validated_data["modus"] = ""
        
        # Meisterschaft validieren (optional)
        if "meisterschaft" in data:
            validated_data["meisterschaft"] = self._validate_championship(data["meisterschaft"])
        else:
            validated_data["meisterschaft"] = 0
        
        logger.debug("Tournament data validated successfully", tournament_name=validated_data["name"])
        return validated_data
    
    def _validate_single_value(self, data: Any) -> Dict[str, Any]:
        """Validiert einen einzelnen Wert als Turnier-Name."""
        return {
            "name": self._validate_name(data),
            "datum": "",
            "modus": "",
            "meisterschaft": 0
        }
    
    def _validate_name(self, name: Any) -> str:
        """Validiert den Turnier-Namen."""
        # Nicht leer
        cleaned_name = is_not_empty(name, "tournament name")
        
        # Länge prüfen
        cleaned_name = is_valid_length(cleaned_name, min_length=1, max_length=255, field_name="tournament name")
        
        # Gefährliche Zeichen entfernen
        cleaned_name = sanitize_string(cleaned_name, "tournament name")
        
        return cleaned_name
    
    def _validate_date(self, date: Any) -> str:
        """Validiert das Turnier-Datum."""
        if date is None or (isinstance(date, str) and not date.strip()):
            return ""
        
        return is_valid_date(date, "tournament date")
    
    def _validate_mode(self, mode: Any) -> str:
        """Validiert den Turnier-Modus."""
        if mode is None or (isinstance(mode, str) and not mode.strip()):
            return ""
        
        cleaned_mode = str(mode).strip()
        
        # Prüfe ob Modus in erlaubten Werten steht
        if cleaned_mode and cleaned_mode not in ALLOWED_TOURNAMENT_MODES:
            logger.log_validation_error("tournament mode", cleaned_mode, "Invalid tournament mode")
            raise ValidationError(f"Tournament mode must be one of: {', '.join(ALLOWED_TOURNAMENT_MODES)}", 
                                field="tournament mode", value=cleaned_mode)
        
        return cleaned_mode
    
    def _validate_championship(self, championship: Any) -> int:
        """Validiert ob das Turnier meisterschaftsrelevant ist."""
        if championship is None:
            return 0
        
        if isinstance(championship, bool):
            return 1 if championship else 0
        
        if isinstance(championship, (int, float)):
            return 1 if int(championship) != 0 else 0
        
        if isinstance(championship, str):
            cleaned = championship.strip().lower()
            if cleaned in ("1", "true", "wahr", "ja", "yes", "y", "x"):
                return 1
            elif cleaned in ("0", "false", "falsch", "nein", "no", "n", ""):
                return 0
        
        try:
            return 1 if int(championship) != 0 else 0
        except (ValueError, TypeError):
            raise ValidationError("Championship flag must be 0 or 1", field="championship", value=championship)


def validate_tournament_name(name: Any) -> str:
    """
    Convenience-Funktion zum Validieren eines Turnier-Namens.
    
    Args:
        name: Der zu validierende Name
        
    Returns:
        Der validierte Name
        
    Raises:
        ValidationError: Wenn der Name ungültig ist
    """
    validator = TournamentValidator()
    return validator._validate_name(name)


def validate_tournament_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience-Funktion zum Validieren von Turnier-Daten.
    
    Args:
        data: Dictionary mit Turnier-Daten
        
    Returns:
        Dictionary mit validierten Daten
        
    Raises:
        ValidationError: Wenn die Validierung fehlschlägt
    """
    validator = TournamentValidator()
    return validator.validate(data)
