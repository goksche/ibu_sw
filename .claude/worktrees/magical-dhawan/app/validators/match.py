# app/validators/match.py
"""
Match Validator für IBU Turniere v1.1.0-alpha.3

Validiert Spiel-spezifische Daten.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from app.core import ValidationError, get_logger
from .base import BaseValidator, is_non_negative_int, is_positive_int, sanitize_string

logger = get_logger("app.validators.match")


class MatchValidator(BaseValidator):
    """
    Validator für Spiel-Daten.
    
    Validiert:
    - Scores: nicht-negative Ganzzahlen
    - Teilnehmer: müssen existieren und unterschiedlich sein
    - Match-Nummer: positive Ganzzahl
    - Runde: nicht-negative Ganzzahl
    """
    
    def validate(self, data: Any) -> Dict[str, Any]:
        """
        Validiert Spiel-Daten.
        
        Args:
            data: Dictionary mit Spiel-Daten
            
        Returns:
            Dictionary mit validierten und bereinigten Daten
            
        Raises:
            ValidationError: Wenn die Validierung fehlschlägt
        """
        logger.debug("Validating match data", data_type=type(data).__name__)
        
        if not isinstance(data, dict):
            raise ValidationError("Match data must be a dictionary", field="match_data")
        
        validated_data = {}
        
        # Scores validieren
        validated_data["s1"] = self._validate_score(data.get("s1"), "score1")
        validated_data["s2"] = self._validate_score(data.get("s2"), "score2")
        
        # Teilnehmer validieren
        validated_data["p1_id"] = self._validate_participant_id(data.get("p1_id"), "participant1")
        validated_data["p2_id"] = self._validate_participant_id(data.get("p2_id"), "participant2")
        
        # Prüfe dass Teilnehmer unterschiedlich sind
        if validated_data["p1_id"] == validated_data["p2_id"]:
            raise ValidationError("Participants must be different", field="participants", 
                                value=f"p1_id={validated_data['p1_id']}, p2_id={validated_data['p2_id']}")
        
        # Match-Nummer validieren (optional)
        if "match_no" in data:
            validated_data["match_no"] = self._validate_match_number(data["match_no"])
        else:
            validated_data["match_no"] = None
        
        # Runde validieren (optional)
        if "runde" in data:
            validated_data["runde"] = self._validate_round(data["runde"])
        else:
            validated_data["runde"] = None
        
        logger.debug("Match data validated successfully", 
                    match_no=validated_data.get("match_no"),
                    p1_id=validated_data["p1_id"], 
                    p2_id=validated_data["p2_id"])
        
        return validated_data
    
    def _validate_score(self, score: Any, field_name: str) -> int:
        """Validiert einen Score."""
        if score is None:
            return 0
        
        return is_non_negative_int(score, field_name)
    
    def _validate_participant_id(self, participant_id: Any, field_name: str) -> int:
        """Validiert eine Teilnehmer-ID."""
        if participant_id is None:
            raise ValidationError(f"{field_name} ID is required", field=field_name)
        
        return is_positive_int(participant_id, field_name)
    
    def _validate_match_number(self, match_no: Any) -> int:
        """Validiert eine Match-Nummer."""
        if match_no is None:
            return None
        
        return is_positive_int(match_no, "match number")
    
    def _validate_round(self, runde: Any) -> int:
        """Validiert eine Runde."""
        if runde is None:
            return None
        
        return is_non_negative_int(runde, "round")


class GroupMatchValidator(MatchValidator):
    """
    Validator für Gruppenspiele.
    
    Erweitert MatchValidator um gruppenspezifische Validierung.
    """
    
    def validate(self, data: Any) -> Dict[str, Any]:
        """Validiert Gruppenspiel-Daten."""
        validated_data = super().validate(data)
        
        # Gruppe-ID validieren (erforderlich für Gruppenspiele)
        if "gruppe_id" in data:
            validated_data["gruppe_id"] = self._validate_group_id(data["gruppe_id"])
        else:
            raise ValidationError("Group ID is required for group matches", field="gruppe_id")
        
        return validated_data
    
    def _validate_group_id(self, group_id: Any) -> int:
        """Validiert eine Gruppen-ID."""
        if group_id is None:
            raise ValidationError("Group ID is required", field="gruppe_id")
        
        return is_positive_int(group_id, "group ID")


class KOMatchValidator(MatchValidator):
    """
    Validator für KO-Spiele.
    
    Erweitert MatchValidator um KO-spezifische Validierung.
    """
    
    def validate(self, data: Any) -> Dict[str, Any]:
        """Validiert KO-Spiel-Daten."""
        validated_data = super().validate(data)
        
        # Turnier-ID validieren (erforderlich für KO-Spiele)
        if "turnier_id" in data:
            validated_data["turnier_id"] = self._validate_tournament_id(data["turnier_id"])
        else:
            raise ValidationError("Tournament ID is required for KO matches", field="turnier_id")
        
        return validated_data
    
    def _validate_tournament_id(self, tournament_id: Any) -> int:
        """Validiert eine Turnier-ID."""
        if tournament_id is None:
            raise ValidationError("Tournament ID is required", field="turnier_id")
        
        return is_positive_int(tournament_id, "tournament ID")


def validate_match_scores(s1: Any, s2: Any) -> Tuple[int, int]:
    """
    Convenience-Funktion zum Validieren von Spiel-Scores.
    
    Args:
        s1: Score von Teilnehmer 1
        s2: Score von Teilnehmer 2
        
    Returns:
        Tuple mit validierten Scores
        
    Raises:
        ValidationError: Wenn die Scores ungültig sind
    """
    validator = MatchValidator()
    validated_s1 = validator._validate_score(s1, "score1")
    validated_s2 = validator._validate_score(s2, "score2")
    return validated_s1, validated_s2


def validate_group_match_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience-Funktion zum Validieren von Gruppenspiel-Daten.
    
    Args:
        data: Dictionary mit Gruppenspiel-Daten
        
    Returns:
        Dictionary mit validierten Daten
        
    Raises:
        ValidationError: Wenn die Validierung fehlschlägt
    """
    validator = GroupMatchValidator()
    return validator.validate(data)


def validate_ko_match_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience-Funktion zum Validieren von KO-Spiel-Daten.
    
    Args:
        data: Dictionary mit KO-Spiel-Daten
        
    Returns:
        Dictionary mit validierten Daten
        
    Raises:
        ValidationError: Wenn die Validierung fehlschlägt
    """
    validator = KOMatchValidator()
    return validator.validate(data)
