# tests/test_integration.py
"""
IBU Turniere v1.1.0-beta.1 - Integration Tests

Testet alle implementierten Features zusammen:
- Exception Handling
- Foreign Key Constraints  
- Input Validation
- Memory Management
- Resource Cleanup
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
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer,
    insert_gruppe, fetch_gruppen, delete_gruppe,
    save_match_result, fetch_group_matches, save_ko_result_and_propagate, fetch_ko_matches
)
from app.validators import validate_tournament_data, validate_participant_data

logger = get_logger("tests.integration")

class IntegrationTestSuite:
    """Comprehensive integration test suite for v1.1.0-beta.1"""
    
    def __init__(self):
        self.test_db_dir = tempfile.mkdtemp()
        self.test_db_path = os.path.join(self.test_db_dir, "integration_test.sqlite")
        self.original_db_path = os.environ.get("IBU_DB_PATH")
        
        # Set test database path
        os.environ["IBU_DB_PATH"] = self.test_db_path
        
        self.tournament_id = None
        self.participant_ids = []
        self.group_id = None
        self.match_id = None
        self.ko_match_id = None
        
    def setup(self):
        """Initialize test database and environment"""
        logger.info("Setting up integration test environment")
        
        # Initialize database with all features
        _init_db()
        logger.info("Database initialized with Foreign Key Constraints")
        
    def cleanup(self):
        """Clean up test environment"""
        logger.info("Cleaning up integration test environment")
        
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
            
        logger.info("Integration test cleanup completed")
    
    def test_tournament_lifecycle(self):
        """Test complete tournament lifecycle with validation and error handling"""
        logger.info("Testing tournament lifecycle...")
        
        # Test 1: Create tournament with validation
        try:
            # Valid tournament
            self.tournament_id = insert_turnier(
                "Integration Test Tournament", 
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
        assert len(tournaments) == 1, f"Expected 1 tournament, got {len(tournaments)}"
        assert tournaments[0]["name"] == "Integration Test Tournament", "Tournament name mismatch"
        
        # Test 3: Update tournament with validation
        try:
            update_turnier(self.tournament_id, "Updated Integration Test", "2024-02-01", "KO-Phase")
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
    
    def test_participant_lifecycle(self):
        """Test complete participant lifecycle with validation"""
        logger.info("Testing participant lifecycle...")
        
        # Test 1: Create participants
        participants_data = [
            ("Alice Johnson", "Alice", "AL001"),
            ("Bob Smith", "Bob", "BS002"),
            ("Charlie Brown", "Charlie", "CB003"),
            ("Diana Prince", "Diana", "DP004")
        ]
        
        for name, nickname, scolia_id in participants_data:
            try:
                participant_id = insert_teilnehmer(name, nickname, scolia_id)
                self.participant_ids.append(participant_id)
                logger.info(f"Created participant {name} with ID: {participant_id}")
            except Exception as e:
                logger.error(f"Failed to create participant {name}: {e}")
                raise
        
        # Test 2: Fetch participants
        participants = fetch_teilnehmer()
        assert len(participants) == 4, f"Expected 4 participants, got {len(participants)}"
        
        # Test 3: Validation error handling
        try:
            insert_teilnehmer("", "Test", "TEST")  # Empty name
            assert False, "Should have raised ValidationError"
        except ValidationError as e:
            logger.info(f"Correctly caught ValidationError: {e}")
        
        # Test 4: Non-existent participant error
        try:
            update_teilnehmer(99999, "Test", "Test", "TEST")
            assert False, "Should have raised ParticipantNotFoundError"
        except ParticipantNotFoundError as e:
            logger.info(f"Correctly caught ParticipantNotFoundError: {e}")
    
    def test_group_management(self):
        """Test group management with Foreign Key Constraints"""
        logger.info("Testing group management...")
        
        # Test 1: Create group
        try:
            self.group_id = insert_gruppe(self.tournament_id, "Gruppe A")
            logger.info(f"Created group with ID: {self.group_id}")
        except Exception as e:
            logger.error(f"Failed to create group: {e}")
            raise
        
        # Test 2: Fetch groups
        groups = fetch_gruppen(self.tournament_id)
        assert len(groups) == 1, f"Expected 1 group, got {len(groups)}"
        assert groups[0]["name"] == "Gruppe A", "Group name mismatch"
        
        # Test 3: Foreign Key Constraint test
        try:
            insert_gruppe(99999, "Invalid Group")  # Non-existent tournament
            assert False, "Should have raised DatabaseError due to FK constraint"
        except DatabaseError as e:
            logger.info(f"Correctly caught DatabaseError due to FK constraint: {e}")
        except Exception as e:
            logger.error(f"Unexpected error type: {e}")
            raise
    
    def test_match_management(self):
        """Test match management with validation and Foreign Key Constraints"""
        logger.info("Testing match management...")
        
        # Test 1: Create group match
        try:
            self.match_id = save_match_result(
                self.tournament_id, self.group_id, 1, 1,
                self.participant_ids[0], self.participant_ids[1], 3, 1
            )
            logger.info(f"Created group match with ID: {self.match_id}")
        except Exception as e:
            logger.error(f"Failed to create group match: {e}")
            raise
        
        # Test 2: Fetch matches
        matches = fetch_group_matches(self.tournament_id, self.group_id)
        assert len(matches) == 1, f"Expected 1 match, got {len(matches)}"
        assert matches[0]["s1"] == 3, "Score 1 mismatch"
        assert matches[0]["s2"] == 1, "Score 2 mismatch"
        
        # Test 3: Validation error - negative score
        try:
            save_match_result(
                self.tournament_id, self.group_id, 1, 1,
                self.participant_ids[0], self.participant_ids[1], -1, 1
            )
            assert False, "Should have raised ValidationError for negative score"
        except ValidationError as e:
            logger.info(f"Correctly caught ValidationError: {e}")
        
        # Test 4: Validation error - same participants
        try:
            save_match_result(
                self.tournament_id, self.group_id, 1, 1,
                self.participant_ids[0], self.participant_ids[0], 1, 1
            )
            assert False, "Should have raised ValidationError for same participants"
        except ValidationError as e:
            logger.info(f"Correctly caught ValidationError: {e}")
    
    def test_ko_phase_management(self):
        """Test KO phase management with validation"""
        logger.info("Testing KO phase management...")
        
        # Test 1: Create KO match
        try:
            self.ko_match_id = save_ko_result_and_propagate(
                self.tournament_id, 1, 1,
                self.participant_ids[0], self.participant_ids[1], 2, 1
            )
            logger.info(f"Created KO match with ID: {self.ko_match_id}")
        except Exception as e:
            logger.error(f"Failed to create KO match: {e}")
            raise
        
        # Test 2: Fetch KO matches
        ko_matches = fetch_ko_matches(self.tournament_id, 1)
        assert len(ko_matches) == 1, f"Expected 1 KO match, got {len(ko_matches)}"
        assert ko_matches[0]["s1"] == 2, "KO Score 1 mismatch"
        assert ko_matches[0]["s2"] == 1, "KO Score 2 mismatch"
    
    def test_cascading_deletes(self):
        """Test Foreign Key CASCADE behavior"""
        logger.info("Testing cascading deletes...")
        
        # Test 1: Delete tournament should cascade to all related data
        try:
            delete_turnier(self.tournament_id)
            logger.info("Successfully deleted tournament with cascade")
            
            # Verify cascade worked
            tournaments = fetch_turniere()
            assert len(tournaments) == 0, "Tournament should be deleted"
            
            groups = fetch_gruppen(self.tournament_id)
            assert len(groups) == 0, "Groups should be deleted by cascade"
            
            matches = fetch_group_matches(self.tournament_id, self.group_id)
            assert len(matches) == 0, "Matches should be deleted by cascade"
            
            ko_matches = fetch_ko_matches(self.tournament_id, 1)
            assert len(ko_matches) == 0, "KO matches should be deleted by cascade"
            
        except Exception as e:
            logger.error(f"Failed cascading delete test: {e}")
            raise
    
    def test_memory_management(self):
        """Test memory management and resource cleanup"""
        logger.info("Testing memory management...")
        
        # Test 1: Create and delete multiple tournaments
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
        assert len(tournaments) == 5, f"Expected 5 tournaments after cleanup, got {len(tournaments)}"
    
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
                assert False, "Should have failed with invalid DB path"
            except DatabaseError as e:
                logger.info(f"Correctly handled database connection error: {e}")
            
            # Restore original path
            if original_path:
                os.environ["IBU_DB_PATH"] = original_path
            else:
                del os.environ["IBU_DB_PATH"]
                
        except Exception as e:
            logger.error(f"Error recovery test failed: {e}")
            raise
    
    def run_all_tests(self):
        """Run all integration tests"""
        logger.info("Starting comprehensive integration test suite...")
        
        try:
            self.setup()
            
            # Run all test methods
            self.test_tournament_lifecycle()
            self.test_participant_lifecycle()
            self.test_group_management()
            self.test_match_management()
            self.test_ko_phase_management()
            self.test_cascading_deletes()
            self.test_memory_management()
            self.test_error_recovery()
            
            logger.info("All integration tests passed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Integration test suite failed: {e}")
            return False
        finally:
            self.cleanup()

def main():
    """Main test runner"""
    print("=" * 60)
    print("IBU Turniere v1.1.0-beta.1 - Integration Tests")
    print("=" * 60)
    
    test_suite = IntegrationTestSuite()
    success = test_suite.run_all_tests()
    
    print("=" * 60)
    if success:
        print("✅ All integration tests PASSED!")
    else:
        print("❌ Integration tests FAILED!")
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
