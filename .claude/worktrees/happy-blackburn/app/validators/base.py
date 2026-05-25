# app/validators/base.py
"""
Base Validation Framework für IBU Turniere v1.1.0-alpha.3

Bietet grundlegende Validierungsfunktionen und ein Base Validator Interface.
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, List, Optional, Union

from app.core import ValidationError, get_logger

logger = get_logger("app.validators")


class BaseValidator(ABC):
    """
    Basis-Validator Interface.
    
    Alle Domain-Validators erben von dieser Klasse und implementieren
    die validate() Methode.
    """
    
    @abstractmethod
    def validate(self, data: Any) -> None:
        """
        Validiert die übergebenen Daten.
        
        Args:
            data: Die zu validierenden Daten
            
        Raises:
            ValidationError: Wenn die Validierung fehlschlägt
        """
        pass


def is_not_empty(value: Any, field_name: str = "field") -> str:
    """
    Prüft ob ein Wert nicht leer ist.
    
    Args:
        value: Der zu prüfende Wert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Den bereinigten Wert (str.strip())
        
    Raises:
        ValidationError: Wenn der Wert leer ist
    """
    if value is None:
        raise ValidationError(f"{field_name} cannot be None", field=field_name)
    
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            raise ValidationError(f"{field_name} cannot be empty", field=field_name, value=value)
        return cleaned
    
    if isinstance(value, (int, float)):
        return str(value)
    
    return str(value).strip()


def is_positive_int(value: Any, field_name: str = "field") -> int:
    """
    Prüft ob ein Wert eine positive Ganzzahl ist.
    
    Args:
        value: Der zu prüfende Wert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Die positive Ganzzahl
        
    Raises:
        ValidationError: Wenn der Wert keine positive Ganzzahl ist
    """
    if value is None:
        raise ValidationError(f"{field_name} cannot be None", field=field_name)
    
    try:
        int_value = int(value)
        if int_value < 0:
            raise ValidationError(f"{field_name} must be positive", field=field_name, value=value)
        return int_value
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid integer", field=field_name, value=value, expected_type="integer")


def is_non_negative_int(value: Any, field_name: str = "field") -> int:
    """
    Prüft ob ein Wert eine nicht-negative Ganzzahl ist.
    
    Args:
        value: Der zu prüfende Wert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Die nicht-negative Ganzzahl
        
    Raises:
        ValidationError: Wenn der Wert keine nicht-negative Ganzzahl ist
    """
    if value is None:
        raise ValidationError(f"{field_name} cannot be None", field=field_name)
    
    try:
        int_value = int(value)
        if int_value < 0:
            raise ValidationError(f"{field_name} must be non-negative", field=field_name, value=value)
        return int_value
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid integer", field=field_name, value=value, expected_type="integer")


def is_valid_date(value: Any, field_name: str = "field") -> str:
    """
    Prüft ob ein Wert ein gültiges Datum ist.
    
    Args:
        value: Der zu prüfende Wert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Das Datum als String
        
    Raises:
        ValidationError: Wenn der Wert kein gültiges Datum ist
    """
    if value is None:
        return ""
    
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return ""
        
        # Prüfe verschiedene Datumsformate
        date_formats = [
            "%Y-%m-%d",      # 2024-01-01
            "%d.%m.%Y",      # 01.01.2024
            "%d/%m/%Y",      # 01/01/2024
            "%Y-%m-%d %H:%M:%S",  # 2024-01-01 12:00:00
        ]
        
        for fmt in date_formats:
            try:
                datetime.strptime(cleaned, fmt)
                return cleaned
            except ValueError:
                continue
        
        raise ValidationError(f"{field_name} must be a valid date (YYYY-MM-DD)", field=field_name, value=value)
    
    raise ValidationError(f"{field_name} must be a valid date", field=field_name, value=value, expected_type="date")


def is_in_range(value: Any, min_val: Union[int, float], max_val: Union[int, float], field_name: str = "field") -> Union[int, float]:
    """
    Prüft ob ein Wert innerhalb eines Bereichs liegt.
    
    Args:
        value: Der zu prüfende Wert
        min_val: Mindestwert
        max_val: Maximalwert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Der Wert
        
    Raises:
        ValidationError: Wenn der Wert außerhalb des Bereichs liegt
    """
    if value is None:
        raise ValidationError(f"{field_name} cannot be None", field=field_name)
    
    try:
        num_value = float(value)
        if num_value < min_val or num_value > max_val:
            raise ValidationError(f"{field_name} must be between {min_val} and {max_val}", field=field_name, value=value)
        return num_value
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid number", field=field_name, value=value, expected_type="number")


def is_valid_length(value: str, min_length: int = 0, max_length: int = 255, field_name: str = "field") -> str:
    """
    Prüft ob ein String eine gültige Länge hat.
    
    Args:
        value: Der zu prüfende String
        min_length: Mindestlänge
        max_length: Maximallänge
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Der bereinigte String
        
    Raises:
        ValidationError: Wenn der String nicht die richtige Länge hat
    """
    if value is None:
        if min_length > 0:
            raise ValidationError(f"{field_name} cannot be None", field=field_name)
        return ""
    
    cleaned = str(value).strip()
    
    if len(cleaned) < min_length:
        raise ValidationError(f"{field_name} must be at least {min_length} characters long", field=field_name, value=value)
    
    if len(cleaned) > max_length:
        raise ValidationError(f"{field_name} must be at most {max_length} characters long", field=field_name, value=value)
    
    return cleaned


def is_valid_email(value: str, field_name: str = "field") -> str:
    """
    Prüft ob ein Wert eine gültige E-Mail-Adresse ist.
    
    Args:
        value: Der zu prüfende Wert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Die E-Mail-Adresse
        
    Raises:
        ValidationError: Wenn der Wert keine gültige E-Mail-Adresse ist
    """
    if not value or not value.strip():
        return ""
    
    cleaned = value.strip()
    
    # Einfache E-Mail-Validierung
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, cleaned):
        raise ValidationError(f"{field_name} must be a valid email address", field=field_name, value=value)
    
    return cleaned


def is_one_of(value: Any, allowed_values: List[Any], field_name: str = "field") -> Any:
    """
    Prüft ob ein Wert einer Liste von erlaubten Werten entspricht.
    
    Args:
        value: Der zu prüfende Wert
        allowed_values: Liste der erlaubten Werte
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Der Wert
        
    Raises:
        ValidationError: Wenn der Wert nicht in der Liste der erlaubten Werte steht
    """
    if value is None:
        raise ValidationError(f"{field_name} cannot be None", field=field_name)
    
    if value not in allowed_values:
        raise ValidationError(f"{field_name} must be one of: {', '.join(map(str, allowed_values))}", field=field_name, value=value)
    
    return value


def sanitize_string(value: Any, field_name: str = "field") -> str:
    """
    Bereinigt einen String von potentiell gefährlichen Zeichen.
    
    Args:
        value: Der zu bereinigende Wert
        field_name: Name des Feldes für Fehlermeldungen
        
    Returns:
        Der bereinigte String
        
    Raises:
        ValidationError: Wenn der String gefährliche Zeichen enthält
    """
    if value is None:
        return ""
    
    cleaned = str(value).strip()
    
    # Entferne potentiell gefährliche Zeichen
    dangerous_chars = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '`', '$']
    for char in dangerous_chars:
        if char in cleaned:
            logger.log_validation_error(field_name, cleaned, f"Contains dangerous character: {char}")
            raise ValidationError(f"{field_name} contains invalid characters", field=field_name, value=value)
    
    return cleaned


def validate_required_fields(data: dict, required_fields: List[str]) -> None:
    """
    Validiert dass alle erforderlichen Felder vorhanden sind.
    
    Args:
        data: Dictionary mit den Daten
        required_fields: Liste der erforderlichen Felder
        
    Raises:
        ValidationError: Wenn ein erforderliches Feld fehlt
    """
    for field in required_fields:
        if field not in data or data[field] is None:
            raise ValidationError(f"Required field '{field}' is missing", field=field)
        
        if isinstance(data[field], str) and not data[field].strip():
            raise ValidationError(f"Required field '{field}' cannot be empty", field=field)


def validate_optional_fields(data: dict, optional_fields: List[str]) -> None:
    """
    Validiert optionale Felder falls sie vorhanden sind.
    
    Args:
        data: Dictionary mit den Daten
        optional_fields: Liste der optionalen Felder
    """
    for field in optional_fields:
        if field in data and data[field] is not None:
            if isinstance(data[field], str) and not data[field].strip():
                data[field] = ""  # Leere Strings zu leeren Strings normalisieren
