# tests/test_validators.py
"""
Test-Script für Validators in v1.1.0-alpha.3

Testet alle Validierungs-Klassen und Funktionen.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core import ValidationError
from app.validators import (
    TournamentValidator, ParticipantValidator, MatchValidator,
    GroupMatchValidator, KOMatchValidator,
    validate_tournament_name, validate_participant_name, validate_match_scores,
    is_not_empty, is_positive_int, is_non_negative_int, is_valid_date,
    is_valid_length, sanitize_string
)


def test_base_validators():
    """Testet die Basis-Validierungsfunktionen."""
    print("Testing Base Validators...")
    
    # Test is_not_empty
    try:
        result = is_not_empty("  Test  ", "test_field")
        print(f"[OK] is_not_empty: '{result}'")
    except ValidationError as e:
        print(f"[FAIL] is_not_empty failed: {e}")
    
    try:
        is_not_empty("", "test_field")
        print("[FAIL] is_not_empty should have failed with empty string")
    except ValidationError as e:
        print(f"[OK] is_not_empty correctly rejected empty string: {e}")
    
    # Test is_positive_int
    try:
        result = is_positive_int("5", "test_field")
        print(f"[OK] is_positive_int: {result}")
    except ValidationError as e:
        print(f"[FAIL] is_positive_int failed: {e}")
    
    try:
        is_positive_int("-1", "test_field")
        print("[FAIL] is_positive_int should have failed with negative number")
    except ValidationError as e:
        print(f"[OK] is_positive_int correctly rejected negative number: {e}")
    
    # Test is_non_negative_int
    try:
        result = is_non_negative_int("0", "test_field")
        print(f"[OK] is_non_negative_int: {result}")
    except ValidationError as e:
        print(f"[FAIL] is_non_negative_int failed: {e}")
    
    # Test is_valid_date
    try:
        result = is_valid_date("2024-01-01", "test_field")
        print(f"[OK] is_valid_date: '{result}'")
    except ValidationError as e:
        print(f"[FAIL] is_valid_date failed: {e}")
    
    try:
        is_valid_date("invalid-date", "test_field")
        print("[FAIL] is_valid_date should have failed with invalid date")
    except ValidationError as e:
        print(f"[OK] is_valid_date correctly rejected invalid date: {e}")
    
    # Test is_valid_length
    try:
        result = is_valid_length("Test", min_length=1, max_length=10, field_name="test_field")
        print(f"[OK] is_valid_length: '{result}'")
    except ValidationError as e:
        print(f"[FAIL] is_valid_length failed: {e}")
    
    try:
        is_valid_length("A" * 300, min_length=1, max_length=10, field_name="test_field")
        print("[FAIL] is_valid_length should have failed with long string")
    except ValidationError as e:
        print(f"[OK] is_valid_length correctly rejected long string: {e}")
    
    # Test sanitize_string
    try:
        result = sanitize_string("Normal Text", "test_field")
        print(f"[OK] sanitize_string: '{result}'")
    except ValidationError as e:
        print(f"[FAIL] sanitize_string failed: {e}")
    
    try:
        sanitize_string("Text with <script>", "test_field")
        print("[FAIL] sanitize_string should have failed with dangerous characters")
    except ValidationError as e:
        print(f"[OK] sanitize_string correctly rejected dangerous characters: {e}")


def test_tournament_validator():
    """Testet den Tournament Validator."""
    print("Testing Tournament Validator...")
    
    validator = TournamentValidator()
    
    # Test gültige Turnier-Daten
    try:
        valid_data = {
            "name": "Test Tournament",
            "datum": "2024-01-01",
            "modus": "Gruppenphase",
            "meisterschaft": 1
        }
        result = validator.validate(valid_data)
        print(f"[OK] Tournament validation: {result}")
    except ValidationError as e:
        print(f"[FAIL] Tournament validation failed: {e}")
    
    # Test ungültiger Name
    try:
        invalid_data = {"name": "", "datum": "2024-01-01"}
        validator.validate(invalid_data)
        print("[FAIL] Tournament validation should have failed with empty name")
    except ValidationError as e:
        print(f"[OK] Tournament validation correctly rejected empty name: {e}")
    
    # Test zu langer Name
    try:
        invalid_data = {"name": "A" * 300, "datum": "2024-01-01"}
        validator.validate(invalid_data)
        print("[FAIL] Tournament validation should have failed with long name")
    except ValidationError as e:
        print(f"[OK] Tournament validation correctly rejected long name: {e}")
    
    # Test ungültiger Modus
    try:
        invalid_data = {"name": "Test", "modus": "Invalid Mode"}
        validator.validate(invalid_data)
        print("[FAIL] Tournament validation should have failed with invalid mode")
    except ValidationError as e:
        print(f"[OK] Tournament validation correctly rejected invalid mode: {e}")
    
    # Test Convenience-Funktion
    try:
        result = validate_tournament_name("Test Tournament Name")
        print(f"[OK] validate_tournament_name: '{result}'")
    except ValidationError as e:
        print(f"[FAIL] validate_tournament_name failed: {e}")


def test_participant_validator():
    """Testet den Participant Validator."""
    print("Testing Participant Validator...")
    
    validator = ParticipantValidator()
    
    # Test gültige Teilnehmer-Daten
    try:
        valid_data = {
            "name": "Max Mustermann",
            "spitzname": "Max",
            "scolia_id": "MM001"
        }
        result = validator.validate(valid_data)
        print(f"[OK] Participant validation: {result}")
    except ValidationError as e:
        print(f"[FAIL] Participant validation failed: {e}")
    
    # Test ungültiger Name
    try:
        invalid_data = {"name": "", "spitzname": "Max"}
        validator.validate(invalid_data)
        print("[FAIL] Participant validation should have failed with empty name")
    except ValidationError as e:
        print(f"[OK] Participant validation correctly rejected empty name: {e}")
    
    # Test zu langer Spitzname
    try:
        invalid_data = {"name": "Max Mustermann", "spitzname": "A" * 150}
        validator.validate(invalid_data)
        print("[FAIL] Participant validation should have failed with long nickname")
    except ValidationError as e:
        print(f"[OK] Participant validation correctly rejected long nickname: {e}")
    
    # Test ungültige Scolia-ID
    try:
        invalid_data = {"name": "Max Mustermann", "scolia_id": "MM@001"}
        validator.validate(invalid_data)
        print("[FAIL] Participant validation should have failed with invalid Scolia ID")
    except ValidationError as e:
        print(f"[OK] Participant validation correctly rejected invalid Scolia ID: {e}")
    
    # Test Convenience-Funktion
    try:
        result = validate_participant_name("Anna Schmidt")
        print(f"[OK] validate_participant_name: '{result}'")
    except ValidationError as e:
        print(f"[FAIL] validate_participant_name failed: {e}")


def test_match_validator():
    """Testet den Match Validator."""
    print("Testing Match Validator...")
    
    validator = MatchValidator()
    
    # Test gültige Spiel-Daten
    try:
        valid_data = {
            "s1": 3,
            "s2": 1,
            "p1_id": 1,
            "p2_id": 2,
            "match_no": 1,
            "runde": 1
        }
        result = validator.validate(valid_data)
        print(f"[OK] Match validation: {result}")
    except ValidationError as e:
        print(f"[FAIL] Match validation failed: {e}")
    
    # Test negative Scores
    try:
        invalid_data = {"s1": -1, "s2": 1, "p1_id": 1, "p2_id": 2}
        validator.validate(invalid_data)
        print("[FAIL] Match validation should have failed with negative score")
    except ValidationError as e:
        print(f"[OK] Match validation correctly rejected negative score: {e}")
    
    # Test gleiche Teilnehmer
    try:
        invalid_data = {"s1": 3, "s2": 1, "p1_id": 1, "p2_id": 1}
        validator.validate(invalid_data)
        print("[FAIL] Match validation should have failed with same participants")
    except ValidationError as e:
        print(f"[OK] Match validation correctly rejected same participants: {e}")
    
    # Test Convenience-Funktion
    try:
        result = validate_match_scores(3, 1)
        print(f"[OK] validate_match_scores: {result}")
    except ValidationError as e:
        print(f"[FAIL] validate_match_scores failed: {e}")


def test_group_match_validator():
    """Testet den Group Match Validator."""
    print("Testing Group Match Validator...")
    
    validator = GroupMatchValidator()
    
    # Test gültige Gruppenspiel-Daten
    try:
        valid_data = {
            "s1": 3,
            "s2": 1,
            "p1_id": 1,
            "p2_id": 2,
            "gruppe_id": 1,
            "match_no": 1
        }
        result = validator.validate(valid_data)
        print(f"[OK] Group match validation: {result}")
    except ValidationError as e:
        print(f"[FAIL] Group match validation failed: {e}")
    
    # Test fehlende Gruppen-ID
    try:
        invalid_data = {"s1": 3, "s2": 1, "p1_id": 1, "p2_id": 2}
        validator.validate(invalid_data)
        print("[FAIL] Group match validation should have failed without group ID")
    except ValidationError as e:
        print(f"[OK] Group match validation correctly rejected missing group ID: {e}")


def test_ko_match_validator():
    """Testet den KO Match Validator."""
    print("Testing KO Match Validator...")
    
    validator = KOMatchValidator()
    
    # Test gültige KO-Spiel-Daten
    try:
        valid_data = {
            "s1": 3,
            "s2": 1,
            "p1_id": 1,
            "p2_id": 2,
            "turnier_id": 1,
            "runde": 1
        }
        result = validator.validate(valid_data)
        print(f"[OK] KO match validation: {result}")
    except ValidationError as e:
        print(f"[FAIL] KO match validation failed: {e}")
    
    # Test fehlende Turnier-ID
    try:
        invalid_data = {"s1": 3, "s2": 1, "p1_id": 1, "p2_id": 2}
        validator.validate(invalid_data)
        print("[FAIL] KO match validation should have failed without tournament ID")
    except ValidationError as e:
        print(f"[OK] KO match validation correctly rejected missing tournament ID: {e}")


def main():
    """Hauptfunktion für alle Validator-Tests."""
    print("=" * 60)
    print("IBU Turniere v1.1.0-alpha.3 - Validator Tests")
    print("=" * 60)
    print()
    
    try:
        test_base_validators()
        print()
        
        test_tournament_validator()
        print()
        
        test_participant_validator()
        print()
        
        test_match_validator()
        print()
        
        test_group_match_validator()
        print()
        
        test_ko_match_validator()
        print()
        
        print("=" * 60)
        print("All validator tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Validator test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
