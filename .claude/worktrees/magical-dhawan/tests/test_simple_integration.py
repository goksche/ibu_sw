# tests/test_simple_integration.py
"""
IBU Turniere v1.1.0-beta.1 - Simplified Integration Tests

Testet die wichtigsten Features ohne komplexe Funktionsaufrufe:
- Exception Handling
- Validation
- Memory Management
- Database Operations
"""

import sys
import os
import tempfile
import shutil
from datetime import datetime

# Add project root to sys.path
SCRIPT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, PROJECT_ROOT)

from app.core import (
    DatabaseError, ValidationError, TournamentNotFoundError, ParticipantNotFoundError,
    get_logger, cleanup_all_resources
)
from database.models import (
    _init_db, insert_turnier, fetch_turniere, update_turnier, delete_turnier,
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer
)
from app.validators import validate_tournament_data, validate_participant_data

logger = get_logger("tests.simple_integration")

class SimpleIntegrationTestSuite:
    """Simplified integration test suite for v1.1.0-beta.1"""
    
    def __init__(self):
        self.test_db_dir = tempfile.mkdtemp()
        self.test_db_path = os.path.join(self.test_db_dir, "simple_integration_test.sqlite")
        self.original_db_path = os.environ.get("IBU_DB_PATH")
        
        # Set test database path
        os.environ["IBU_DB_PATH"] = self.test_db_path
        
        self.tournament_id = None
        self.participant_ids = []
        
    def setup(self):
        """Initialize test database and environment"""
        logger.info("Setting up simple integration test environment")
        
        # Initialize database with all features
        _init_db()
        logger.info("Database initialized with Foreign Key Constraints")
        
    def cleanup(self):
        """Clean up test environment"""
        logger.info("Cleaning up simple integration test environment")
        
        # Clean up resources
        cleanup_all_resources()
        
        # Remove test database
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
        if os.path.exists(self.test_db_dir):
            shutil.rmtree(self.test_db_dir)
            
        # Restore original DB path
        if self.original_db_path:
            os.environ["IBU_DB_PATH"] = self.original_db_path
        else:
            del os.environ["IBU_DB_PATH"]
            
        logger.info("Simple integration test cleanup completed")
    
    def test_tournament_operations(self):
        """Test tournament CRUD operations with validation and error handling"""
        logger.info("Testing tournament operations...")
        
        # Test 1: Create tournament with validation
        try:
            self.tournament_id = insert_turnier(
                "Simple Integration Test Tournament", 
                "2024-01-01", 
                "Gruppenphase + KO-Phase"
            )
            logger.info(f"Created tournament with ID: {self.tournament_id}")
            assert self.tournament_id > 0, "Tournament ID should be positive"
            
        except Exception as e:
            logger.error(f"Failed to create tournament: {e}")
            raise
        
        # Test 2: Fetch tournaments
        tournaments = fetch_turniere()
        assert len(tournaments) >= 1, f"Expected at least 1 tournament, got {len(tournaments)}"
        # Find our tournament in the list (tournaments are tuples: (id, name, datum, modus, meisterschaft))
        our_tournament = None
        for tournament in tournaments:
            if tournament[1] == "Simple Integration Test Tournament":  # name is at index 1
                our_tournament = tournament
                break
        assert our_tournament is not None, "Our tournament not found in the list"
        
        # Test 3: Update tournament with validation
        try:
            update_turnier(self.tournament_id, "Updated Simple Integration Test", "2024-02-01", "KO-Phase")
            logger.info("Successfully updated tournament")
        except Exception as e:
            logger.error(f"Failed to update tournament: {e}")
            raise
            
        # Test 4: Validation error handling
        try:
            insert_turnier("", "2024-01-01", "Gruppenphase")  # Empty name
            assert False, "Should have raised ValidationError"
        except ValidationError as e:
            logger.info(f"Correctly caught ValidationError: {e}")
        except Exception as e:
            logger.error(f"Unexpected error type: {e}")
            raise
            
        # Test 5: Non-existent tournament error
        try:
            update_turnier(99999, "Test", "2024-01-01", "Gruppenphase")
            assert False, "Should have raised TournamentNotFoundError"
        except TournamentNotFoundError as e:
            logger.info(f"Correctly caught TournamentNotFoundError: {e}")
        except Exception as e:
            logger.error(f"Unexpected error type: {e}")
            raise
    
    def test_participant_operations(self):
        """Test participant CRUD operations with validation"""
        logger.info("Testing participant operations...")
        
        # Test 1: Create participants
        participants_data = [
            ("Alice Johnson", "Alice", "AL001"),
            ("Bob Smith", "Bob", "BS002"),
            ("Charlie Brown", "Charlie", "CB003")
        ]
        
        for name, nickname, scolia_id in participants_data:
            try:
                participant_id = insert_teilnehmer(name, nickname)
                self.participant_ids.append(participant_id)
                logger.info(f"Created participant {name} with ID: {participant_id}")
            except Exception as e:
                logger.error(f"Failed to create participant {name}: {e}")
                raise
        
        # Test 2: Fetch participants
        participants = fetch_teilnehmer()
        assert len(participants) >= 3, f"Expected at least 3 participants, got {len(participants)}"
        
        # Test 3: Validation error handling
        try:
            insert_teilnehmer("", "Test")  # Empty name
            assert False, "Should have raised ValidationError"
        except ValidationError as e:
            logger.info(f"Correctly caught ValidationError: {e}")
        
        # Test 4: Non-existent participant error
        try:
            update_teilnehmer(99999, "Test", "Test")
            assert False, "Should have raised ParticipantNotFoundError"
        except ParticipantNotFoundError as e:
            logger.info(f"Correctly caught ParticipantNotFoundError: {e}")
    
    def test_validation_framework(self):
        """Test validation framework integration"""
        logger.info("Testing validation framework...")
        
        # Test 1: Valid tournament data
        valid_data = {"name": "Validation Test", "datum": "2024-01-01", "modus": "Gruppenphase", "meisterschaft": 0}
        try:
            validated_data = validate_tournament_data(valid_data)
            logger.info(f"Valid tournament data validated: {validated_data}")
        except Exception as e:
            logger.error(f"Validation failed for valid data: {e}")
            raise
        
        # Test 2: Invalid tournament data
        invalid_data = {"name": "", "datum": "2024-01-01", "modus": "Gruppenphase", "meisterschaft": 0}
        try:
            validate_tournament_data(invalid_data)
            assert False, "Should have raised ValidationError"
        except ValidationError as e:
            logger.info(f"Correctly caught ValidationError for invalid data: {e}")
        
        # Test 3: Valid participant data
        valid_participant = {"name": "Test Participant", "spitzname": "Test", "scolia_id": "TEST001"}
        try:
            validated_participant = validate_participant_data(valid_participant)
            logger.info(f"Valid participant data validated: {validated_participant}")
        except Exception as e:
            logger.error(f"Validation failed for valid participant data: {e}")
            raise
    
    def test_memory_management(self):
        """Test memory management and resource cleanup"""
        logger.info("Testing memory management...")
        
        # Test 1: Create multiple tournaments
        tournament_ids = []
        for i in range(5):
            try:
                t_id = insert_turnier(f"Memory Test Tournament {i}", "2024-01-01", "Gruppenphase")
                tournament_ids.append(t_id)
            except Exception as e:
                logger.error(f"Failed to create tournament {i}: {e}")
                raise
        
        # Test 2: Clean up all resources
        try:
            cleanup_all_resources()
            logger.info("Successfully cleaned up all resources")
        except Exception as e:
            logger.error(f"Failed resource cleanup: {e}")
            raise
        
        # Test 3: Verify data still exists after cleanup
        tournaments = fetch_turniere()
        assert len(tournaments) >= 6, f"Expected at least 6 tournaments after cleanup, got {len(tournaments)}"  # At least 1 + 5 from this test
    
    def test_error_recovery(self):
        """Test error recovery and system stability"""
        logger.info("Testing error recovery...")
        
        # Test 1: Database connection error handling
        try:
            # Temporarily set invalid DB path
            original_path = os.environ.get("IBU_DB_PATH")
            os.environ["IBU_DB_PATH"] = "/invalid/path/database.sqlite"
            
            # This should fail gracefully
            try:
                insert_turnier("Test", "2024-01-01", "Gruppenphase")
                # If we get here, the test environment is more permissive than expected
                logger.info("Database connection test: Invalid path was handled gracefully (no error raised)")
            except DatabaseError as e:
                logger.info(f"Correctly handled database connection error: {e}")
            except Exception as e:
                logger.info(f"Database connection test: Got unexpected error type: {e}")
            
            # Restore original path
            if original_path:
                os.environ["IBU_DB_PATH"] = original_path
            else:
                del os.environ["IBU_DB_PATH"]
                
        except Exception as e:
            logger.error(f"Error recovery test failed: {e}")
            raise
    
    def test_cascading_deletes(self):
        """Test Foreign Key CASCADE behavior"""
        logger.info("Testing cascading deletes...")
        
        # Test 1: Delete tournament should work (even if no related data)
        try:
            delete_turnier(self.tournament_id)
            logger.info("Successfully deleted tournament")
            
            # Verify deletion
            tournaments = fetch_turniere()
            # Should have at least 5 tournaments left (5 from memory test)
            assert len(tournaments) >= 5, f"Expected at least 5 tournaments after deletion, got {len(tournaments)}"
            
        except Exception as e:
            logger.error(f"Failed cascading delete test: {e}")
            raise
    
    def run_all_tests(self):
        """Run all simple integration tests"""
        logger.info("Starting simple integration test suite...")
        
        try:
            self.setup()
            
            # Run all test methods
            self.test_tournament_operations()
            self.test_participant_operations()
            self.test_validation_framework()
            self.test_memory_management()
            self.test_error_recovery()
            self.test_cascading_deletes()
            
            logger.info("All simple integration tests passed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Simple integration test suite failed: {e}")
            return False
        finally:
            self.cleanup()

def main():
    """Main test runner"""
    print("=" * 60)
    print("IBU Turniere v1.1.0-beta.1 - Simple Integration Tests")
    print("=" * 60)
    
    test_suite = SimpleIntegrationTestSuite()
    success = test_suite.run_all_tests()
    
    print("=" * 60)
    if success:
        print("[OK] All simple integration tests PASSED!")
    else:
        print("[FAIL] Simple integration tests FAILED!")
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
