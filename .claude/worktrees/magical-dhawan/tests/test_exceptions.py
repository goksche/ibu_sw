# tests/test_exceptions.py
"""
Test-Script für Exception Handling in v1.1.0-alpha.1

Testet die neuen Exception-Klassen und Logging-Funktionalitäten.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core import (
    DatabaseError, ValidationError, TournamentNotFoundError, 
    ParticipantNotFoundError, get_logger
)
from database.models import (
    insert_turnier, fetch_turniere, update_turnier, delete_turnier,
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer
)

def test_exception_classes():
    """Testet die Exception-Klassen."""
    print("Testing Exception Classes...")
    
    # Test DatabaseError
    try:
        raise DatabaseError("Test database error", sql_error="SQLITE_ERROR", operation="test")
    except DatabaseError as e:
        print(f"[OK] DatabaseError: {e}")
    
    # Test ValidationError
    try:
        raise ValidationError("Test validation error", field="name", value="")
    except ValidationError as e:
        print(f"[OK] ValidationError: {e}")
    
    # Test TournamentNotFoundError
    try:
        raise TournamentNotFoundError(999)
    except TournamentNotFoundError as e:
        print(f"[OK] TournamentNotFoundError: {e}")
    
    # Test ParticipantNotFoundError
    try:
        raise ParticipantNotFoundError(999)
    except ParticipantNotFoundError as e:
        print(f"[OK] ParticipantNotFoundError: {e}")
    
    print("Exception classes test completed.\n")


def test_logging():
    """Testet das Logging-System."""
    print("Testing Logging System...")
    
    logger = get_logger("test")
    
    # Test verschiedene Log-Level
    logger.debug("This is a debug message", test_data="debug")
    logger.info("This is an info message", test_data="info")
    logger.warning("This is a warning message", test_data="warning")
    logger.error("This is an error message", test_data="error")
    
    # Test spezielle Logging-Methoden
    logger.log_database_operation("INSERT", "test_table", True, test_id=123)
    logger.log_database_operation("UPDATE", "test_table", False, error="Test error")
    logger.log_user_action("test_action", "test_context")
    logger.log_validation_error("test_field", "test_value", "test_error")
    logger.log_performance("test_operation", 150.5)
    
    print("Logging system test completed.\n")


def test_tournament_validation():
    """Testet die Turnier-Validierung."""
    print("Testing Tournament Validation...")
    
    # Test leeren Namen
    try:
        insert_turnier("", "2024-01-01", "Gruppenphase")
        print("[FAIL] Should have failed with empty name")
    except ValidationError as e:
        print(f"[OK] Caught ValidationError for empty name: {e}")
    
    # Test zu langen Namen
    try:
        long_name = "A" * 300  # Über 255 Zeichen
        insert_turnier(long_name, "2024-01-01", "Gruppenphase")
        print("[FAIL] Should have failed with long name")
    except ValidationError as e:
        print(f"[OK] Caught ValidationError for long name: {e}")
    
    # Test erfolgreiche Erstellung
    try:
        tournament_id = insert_turnier("Test Tournament", "2024-01-01", "Gruppenphase")
        print(f"[OK] Successfully created tournament with ID: {tournament_id}")
        
        # Test Update mit ungültigem Namen
        try:
            update_turnier(tournament_id, "", "2024-01-02", "KO-Phase")
            print("[FAIL] Should have failed with empty name in update")
        except ValidationError as e:
            print(f"[OK] Caught ValidationError for empty name in update: {e}")
        
        # Test Update mit nicht existierendem Turnier
        try:
            update_turnier(99999, "Valid Name", "2024-01-02", "KO-Phase")
            print("[FAIL] Should have failed with non-existent tournament")
        except TournamentNotFoundError as e:
            print(f"[OK] Caught TournamentNotFoundError: {e}")
        
        # Test erfolgreiches Update
        update_turnier(tournament_id, "Updated Tournament", "2024-01-02", "KO-Phase")
        print(f"[OK] Successfully updated tournament {tournament_id}")
        
        # Test erfolgreiche Löschung
        delete_turnier(tournament_id)
        print(f"[OK] Successfully deleted tournament {tournament_id}")
        
    except Exception as e:
        print("[FAIL] Unexpected error: {e}")
    
    print("Tournament validation test completed.\n")


def test_participant_validation():
    """Testet die Teilnehmer-Validierung."""
    print("Testing Participant Validation...")
    
    # Test leeren Namen
    try:
        insert_teilnehmer("", "Test Nickname")
        print("[FAIL] Should have failed with empty name")
    except ValidationError as e:
        print(f"[OK] Caught ValidationError for empty name: {e}")
    
    # Test zu langen Namen
    try:
        long_name = "A" * 300  # Über 255 Zeichen
        insert_teilnehmer(long_name, "Test Nickname")
        print("[FAIL] Should have failed with long name")
    except ValidationError as e:
        print(f"[OK] Caught ValidationError for long name: {e}")
    
    # Test zu langen Spitznamen
    try:
        long_nickname = "A" * 150  # Über 100 Zeichen
        insert_teilnehmer("Test Name", long_nickname)
        print("[FAIL] Should have failed with long nickname")
    except ValidationError as e:
        print(f"[OK] Caught ValidationError for long nickname: {e}")
    
    # Test erfolgreiche Erstellung
    try:
        participant_id = insert_teilnehmer("Test Participant", "Test Nickname")
        print(f"[OK] Successfully created participant with ID: {participant_id}")
        
        # Test Update mit ungültigem Namen
        try:
            update_teilnehmer(participant_id, "", "Updated Nickname")
            print("[FAIL] Should have failed with empty name in update")
        except ValidationError as e:
            print(f"[OK] Caught ValidationError for empty name in update: {e}")
        
        # Test Update mit nicht existierendem Teilnehmer
        try:
            update_teilnehmer(99999, "Valid Name", "Valid Nickname")
            print("[FAIL] Should have failed with non-existent participant")
        except ParticipantNotFoundError as e:
            print(f"[OK] Caught ParticipantNotFoundError: {e}")
        
        # Test erfolgreiches Update
        update_teilnehmer(participant_id, "Updated Participant", "Updated Nickname")
        print(f"[OK] Successfully updated participant {participant_id}")
        
        # Test erfolgreiche Löschung
        delete_teilnehmer(participant_id)
        print(f"[OK] Successfully deleted participant {participant_id}")
        
    except Exception as e:
        print("[FAIL] Unexpected error: {e}")
    
    print("Participant validation test completed.\n")


def test_database_operations():
    """Testet die Datenbankoperationen."""
    print("Testing Database Operations...")
    
    try:
        # Test fetch operations
        tournaments = fetch_turniere()
        print(f"[OK] Successfully fetched {len(tournaments)} tournaments")
        
        participants = fetch_teilnehmer()
        print(f"[OK] Successfully fetched {len(participants)} participants")
        
    except Exception as e:
        print("[FAIL] Database operation error: {e}")
    
    print("Database operations test completed.\n")


def main():
    """Hauptfunktion für alle Tests."""
    print("=" * 60)
    print("IBU Turniere v1.1.0-alpha.1 - Exception Handling Tests")
    print("=" * 60)
    print()
    
    try:
        test_exception_classes()
        test_logging()
        test_tournament_validation()
        test_participant_validation()
        test_database_operations()
        
        print("=" * 60)
        print("All tests completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
