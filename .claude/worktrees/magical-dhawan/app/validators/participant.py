# app/validators/participant.py
"""
Participant Validator für IBU Turniere v1.1.0-alpha.3

Validiert Teilnehmer-spezifische Daten.
"""

from __future__ import annotations

from typing import Any, Dict

from app.core import ValidationError, get_logger
from .base import BaseValidator, is_not_empty, is_valid_length, sanitize_string, is_valid_email

logger = get_logger("app.validators.participant")


class ParticipantValidator(BaseValidator):
    """
    Validator für Teilnehmer-Daten.
    
    Validiert:
    - Name: nicht leer, max 255 Zeichen, keine gefährlichen Zeichen
    - Spitzname: optional, max 100 Zeichen, keine gefährlichen Zeichen
    - Scolia-ID: optional, max 50 Zeichen, alphanumerisch
    """
    
    def validate(self, data: Any) -> Dict[str, Any]:
        """
        Validiert Teilnehmer-Daten.
        
        Args:
            data: Dictionary mit Teilnehmer-Daten oder einzelne Werte
            
        Returns:
            Dictionary mit validierten und bereinigten Daten
            
        Raises:
            ValidationError: Wenn die Validierung fehlschlägt
        """
        logger.debug("Validating participant data", data_type=type(data).__name__)
        
        if isinstance(data, dict):
            return self._validate_dict(data)
        else:
            # Einzelne Werte validieren
            return self._validate_single_value(data)
    
    def _validate_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validiert ein Dictionary mit Teilnehmer-Daten."""
        validated_data = {}
        
        # Name validieren (erforderlich)
        if "name" in data:
            validated_data["name"] = self._validate_name(data["name"])
        else:
            raise ValidationError("Participant name is required", field="name")
        
        # Spitzname validieren (optional)
        if "spitzname" in data:
            validated_data["spitzname"] = self._validate_nickname(data["spitzname"])
        else:
            validated_data["spitzname"] = ""
        
        # Scolia-ID validieren (optional)
        if "scolia_id" in data:
            validated_data["scolia_id"] = self._validate_scolia_id(data["scolia_id"])
        else:
            validated_data["scolia_id"] = ""
        
        logger.debug("Participant data validated successfully", participant_name=validated_data["name"])
        return validated_data
    
    def _validate_single_value(self, data: Any) -> Dict[str, Any]:
        """Validiert einen einzelnen Wert als Teilnehmer-Namen."""
        return {
            "name": self._validate_name(data),
            "spitzname": "",
            "scolia_id": ""
        }
    
    def _validate_name(self, name: Any) -> str:
        """Validiert den Teilnehmer-Namen."""
        # Nicht leer
        cleaned_name = is_not_empty(name, "participant name")
        
        # Länge prüfen
        cleaned_name = is_valid_length(cleaned_name, min_length=1, max_length=255, field_name="participant name")
        
        # Gefährliche Zeichen entfernen
        cleaned_name = sanitize_string(cleaned_name, "participant name")
        
        return cleaned_name
    
    def _validate_nickname(self, nickname: Any) -> str:
        """Validiert den Spitznamen."""
        if nickname is None or (isinstance(nickname, str) and not nickname.strip()):
            return ""
        
        # Länge prüfen
        cleaned_nickname = is_valid_length(str(nickname), min_length=0, max_length=100, field_name="participant nickname")
        
        # Gefährliche Zeichen entfernen
        cleaned_nickname = sanitize_string(cleaned_nickname, "participant nickname")
        
        return cleaned_nickname
    
    def _validate_scolia_id(self, scolia_id: Any) -> str:
        """Validiert die Scolia-ID."""
        if scolia_id is None or (isinstance(scolia_id, str) and not scolia_id.strip()):
            return ""
        
        cleaned_id = str(scolia_id).strip()
        
        # Länge prüfen
        if len(cleaned_id) > 50:
            raise ValidationError("Scolia ID must be at most 50 characters long", field="scolia_id", value=cleaned_id)
        
        # Alphanumerische Zeichen prüfen
        if cleaned_id and not cleaned_id.replace("-", "").replace("_", "").isalnum():
            logger.log_validation_error("scolia_id", cleaned_id, "Contains invalid characters")
            raise ValidationError("Scolia ID must contain only alphanumeric characters, hyphens and underscores", 
                                field="scolia_id", value=cleaned_id)
        
        return cleaned_id


def validate_participant_name(name: Any) -> str:
    """
    Convenience-Funktion zum Validieren eines Teilnehmer-Namens.
    
    Args:
        name: Der zu validierende Name
        
    Returns:
        Der validierte Name
        
    Raises:
        ValidationError: Wenn der Name ungültig ist
    """
    validator = ParticipantValidator()
    return validator._validate_name(name)


def validate_participant_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience-Funktion zum Validieren von Teilnehmer-Daten.
    
    Args:
        data: Dictionary mit Teilnehmer-Daten
        
    Returns:
        Dictionary mit validierten Daten
        
    Raises:
        ValidationError: Wenn die Validierung fehlschlägt
    """
    validator = ParticipantValidator()
    return validator.validate(data)
