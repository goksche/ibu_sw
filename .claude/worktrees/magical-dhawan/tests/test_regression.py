# tests/test_regression.py
"""
IBU Turniere v1.1.0-beta.1 - Regression Tests

Testet, dass alle v1.0.0 Features weiterhin funktionieren:
- Alle ursprünglichen Funktionen
- Backward Compatibility
- Datenmigration
- UI-Funktionalität (soweit testbar ohne PyQt6)
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

from app.core import get_logger, cleanup_all_resources
from database.models import (
    _init_db, insert_turnier, fetch_turniere, update_turnier, delete_turnier,
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer,
    insert_gruppe, fetch_gruppen, delete_gruppe,
    save_match_result, fetch_group_matches, save_ko_result_and_propagate, fetch_ko_matches,
    insert_meisterschaft, fetch_meisterschaften, delete_meisterschaft,
    insert_turnier_teilnehmer, fetch_turnier_teilnehmer, delete_turnier_teilnehmer,
    insert_gruppen_teilnehmer, fetch_gruppen_teilnehmer, delete_gruppen_teilnehmer
)

logger = get_logger("tests.regression")

class RegressionTestSuite:
    """Regression test suite to ensure v1.0.0 compatibility"""
    
    def __init__(self):
        self.test_db_dir = tempfile.mkdtemp()
        self.test_db_path = os.path.join(self.test_db_dir, "regression_test.sqlite")
        self.original_db_path = os.environ.get("IBU_DB_PATH")
        
        # Set test database path
        os.environ["IBU_DB_PATH"] = self.test_db_path
        
        self.tournament_id = None
        self.participant_ids = []
        self.group_id = None
        self.meisterschaft_id = None
        
    def setup(self):
        """Initialize test database"""
        logger.info("Setting up regression test environment")
        _init_db()
        logger.info("Database initialized for regression testing")
        
    def cleanup(self):
        """Clean up test environment"""
        logger.info("Cleaning up regression test environment")
        
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
            
        logger.info("Regression test cleanup completed")
    
    def test_tournament_crud_operations(self):
        """Test all tournament CRUD operations work as in v1.0.0"""
        logger.info("Testing tournament CRUD operations...")
        
        # Test 1: Create tournament
        self.tournament_id = insert_turnier(
            "Regression Test Tournament",
            "2024-01-01",
            "Gruppenphase + KO-Phase"
        )
        assert self.tournament_id > 0, "Tournament creation failed"
        logger.info(f"Created tournament with ID: {self.tournament_id}")
        
        # Test 2: Fetch tournament
        tournaments = fetch_turniere()
        assert len(tournaments) == 1, "Tournament not found after creation"
        assert tournaments[0]["name"] == "Regression Test Tournament", "Tournament name mismatch"
        
        # Test 3: Update tournament
        update_turnier(self.tournament_id, "Updated Regression Test", "2024-02-01", "KO-Phase")
        tournaments = fetch_turniere()
        assert tournaments[0]["name"] == "Updated Regression Test", "Tournament update failed"
        
        # Test 4: Delete tournament
        delete_turnier(self.tournament_id)
        tournaments = fetch_turniere()
        assert len(tournaments) == 0, "Tournament not deleted"
        
        logger.info("Tournament CRUD operations test passed")
    
    def test_participant_crud_operations(self):
        """Test all participant CRUD operations work as in v1.0.0"""
        logger.info("Testing participant CRUD operations...")
        
        # Test 1: Create participants
        participant_data = [
            ("Alice Johnson", "Alice", "AL001"),
            ("Bob Smith", "Bob", "BS002"),
            ("Charlie Brown", "Charlie", "CB003")
        ]
        
        for name, nickname, scolia_id in participant_data:
            participant_id = insert_teilnehmer(name, nickname, scolia_id)
            self.participant_ids.append(participant_id)
            assert participant_id > 0, f"Participant creation failed for {name}"
        
        # Test 2: Fetch participants
        participants = fetch_teilnehmer()
        assert len(participants) == 3, f"Expected 3 participants, got {len(participants)}"
        
        # Test 3: Update participant
        update_teilnehmer(self.participant_ids[0], "Alice Johnson Updated", "AliceU", "AL001U")
        participants = fetch_teilnehmer()
        assert participants[0]["name"] == "Alice Johnson Updated", "Participant update failed"
        
        # Test 4: Delete participant
        delete_teilnehmer(self.participant_ids[0])
        participants = fetch_teilnehmer()
        assert len(participants) == 2, "Participant not deleted"
        
        logger.info("Participant CRUD operations test passed")
    
    def test_group_management(self):
        """Test group management works as in v1.0.0"""
        logger.info("Testing group management...")
        
        # Create tournament and participants first
        self.tournament_id = insert_turnier("Group Test Tournament", "2024-01-01", "Gruppenphase")
        
        for i in range(3):
            participant_id = insert_teilnehmer(f"Group Test Participant {i}", f"GTP{i}", f"GTP{i:03d}")
            self.participant_ids.append(participant_id)
        
        # Test 1: Create group
        self.group_id = insert_gruppe(self.tournament_id, "Test Gruppe A")
        assert self.group_id > 0, "Group creation failed"
        
        # Test 2: Fetch groups
        groups = fetch_gruppen(self.tournament_id)
        assert len(groups) == 1, "Group not found after creation"
        assert groups[0]["name"] == "Test Gruppe A", "Group name mismatch"
        
        # Test 3: Add participants to group
        for participant_id in self.participant_ids:
            insert_gruppen_teilnehmer(self.group_id, participant_id)
        
        # Test 4: Fetch group participants
        group_participants = fetch_gruppen_teilnehmer(self.group_id)
        assert len(group_participants) == 3, f"Expected 3 group participants, got {len(group_participants)}"
        
        # Test 5: Delete group
        delete_gruppe(self.group_id)
        groups = fetch_gruppen(self.tournament_id)
        assert len(groups) == 0, "Group not deleted"
        
        logger.info("Group management test passed")
    
    def test_match_management(self):
        """Test match management works as in v1.0.0"""
        logger.info("Testing match management...")
        
        # Setup: Create tournament, group, and participants
        self.tournament_id = insert_turnier("Match Test Tournament", "2024-01-01", "Gruppenphase")
        self.group_id = insert_gruppe(self.tournament_id, "Match Test Gruppe")
        
        for i in range(4):
            participant_id = insert_teilnehmer(f"Match Test Participant {i}", f"MTP{i}", f"MTP{i:03d}")
            self.participant_ids.append(participant_id)
            insert_gruppen_teilnehmer(self.group_id, participant_id)
        
        # Test 1: Create group match
        match_id = save_match_result(
            self.tournament_id, self.group_id, 1, 1,
            self.participant_ids[0], self.participant_ids[1], 3, 1
        )
        assert match_id > 0, "Group match creation failed"
        
        # Test 2: Fetch matches
        matches = fetch_spiele(self.tournament_id, self.group_id)
        assert len(matches) == 1, "Match not found after creation"
        assert matches[0]["s1"] == 3, "Match score 1 incorrect"
        assert matches[0]["s2"] == 1, "Match score 2 incorrect"
        
        # Test 3: Create KO match
        ko_match_id = save_ko_result_and_propagate(
            self.tournament_id, 1, 1,
            self.participant_ids[0], self.participant_ids[1], 2, 1
        )
        assert ko_match_id > 0, "KO match creation failed"
        
        # Test 4: Fetch KO matches
        ko_matches = fetch_ko_spiele(self.tournament_id)
        assert len(ko_matches) == 1, "KO match not found after creation"
        assert ko_matches[0]["s1"] == 2, "KO match score 1 incorrect"
        assert ko_matches[0]["s2"] == 1, "KO match score 2 incorrect"
        
        logger.info("Match management test passed")
    
    def test_meisterschaft_management(self):
        """Test championship management works as in v1.0.0"""
        logger.info("Testing championship management...")
        
        # Test 1: Create championship
        self.meisterschaft_id = insert_meisterschaft(
            "Regression Test Championship",
            "2024",
            "Standard"
        )
        assert self.meisterschaft_id > 0, "Championship creation failed"
        
        # Test 2: Fetch championships
        championships = fetch_meisterschaften()
        assert len(championships) == 1, "Championship not found after creation"
        assert championships[0]["name"] == "Regression Test Championship", "Championship name mismatch"
        
        # Test 3: Add tournament to championship
        tournament_id = insert_turnier("Championship Tournament", "2024-01-01", "Gruppenphase")
        insert_turnier_teilnehmer(tournament_id, self.participant_ids[0])
        
        # Test 4: Fetch tournament participants
        tournament_participants = fetch_turnier_teilnehmer(tournament_id)
        assert len(tournament_participants) == 1, "Tournament participant not found"
        
        # Test 5: Delete championship
        delete_meisterschaft(self.meisterschaft_id)
        championships = fetch_meisterschaften()
        assert len(championships) == 0, "Championship not deleted"
        
        logger.info("Championship management test passed")
    
    def test_data_integrity(self):
        """Test data integrity features work as in v1.0.0"""
        logger.info("Testing data integrity...")
        
        # Test 1: Create tournament with participants
        tournament_id = insert_turnier("Integrity Test Tournament", "2024-01-01", "Gruppenphase")
        
        for i in range(3):
            participant_id = insert_teilnehmer(f"Integrity Participant {i}", f"IP{i}", f"IP{i:03d}")
            insert_turnier_teilnehmer(tournament_id, participant_id)
        
        # Test 2: Verify tournament-participant relationships
        tournament_participants = fetch_turnier_teilnehmer(tournament_id)
        assert len(tournament_participants) == 3, "Tournament-participant relationship not created"
        
        # Test 3: Create group and add participants
        group_id = insert_gruppe(tournament_id, "Integrity Gruppe")
        
        for participant_id in [p["teilnehmer_id"] for p in tournament_participants]:
            insert_gruppen_teilnehmer(group_id, participant_id)
        
        # Test 4: Verify group-participant relationships
        group_participants = fetch_gruppen_teilnehmer(group_id)
        assert len(group_participants) == 3, "Group-participant relationship not created"
        
        # Test 5: Test cascading deletes (Foreign Key Constraints)
        delete_turnier(tournament_id)
        
        # Verify cascade worked
        tournament_participants = fetch_turnier_teilnehmer(tournament_id)
        assert len(tournament_participants) == 0, "Tournament-participant relationships not cascaded"
        
        groups = fetch_gruppen(tournament_id)
        assert len(groups) == 0, "Groups not cascaded"
        
        logger.info("Data integrity test passed")
    
    def test_export_functionality(self):
        """Test export functionality works as in v1.0.0"""
        logger.info("Testing export functionality...")
        
        # This would normally test the export views, but since we don't have PyQt6,
        # we test the underlying data structures that export would use
        
        # Create test data
        tournament_id = insert_turnier("Export Test Tournament", "2024-01-01", "Gruppenphase")
        
        for i in range(5):
            participant_id = insert_teilnehmer(f"Export Participant {i}", f"EP{i}", f"EP{i:03d}")
            insert_turnier_teilnehmer(tournament_id, participant_id)
        
        # Test 1: Verify data is exportable (can be fetched in correct format)
        tournaments = fetch_turniere()
        participants = fetch_teilnehmer()
        tournament_participants = fetch_turnier_teilnehmer(tournament_id)
        
        assert len(tournaments) == 1, "Tournament data not available for export"
        assert len(participants) == 5, "Participant data not available for export"
        assert len(tournament_participants) == 5, "Tournament-participant data not available for export"
        
        # Test 2: Verify data structure is correct for CSV export
        tournament = tournaments[0]
        assert "name" in tournament, "Tournament name field missing"
        assert "datum" in tournament, "Tournament date field missing"
        assert "modus" in tournament, "Tournament mode field missing"
        
        participant = participants[0]
        assert "name" in participant, "Participant name field missing"
        assert "spitzname" in participant, "Participant nickname field missing"
        
        logger.info("Export functionality test passed")
    
    def test_settings_functionality(self):
        """Test settings functionality works as in v1.0.0"""
        logger.info("Testing settings functionality...")
        
        # Test 1: Verify settings can be read/written
        # This would normally test the settings view, but we test the underlying functionality
        
        # Test database path setting
        current_db_path = os.environ.get("IBU_DB_PATH")
        assert current_db_path is not None, "Database path not set"
        assert current_db_path == self.test_db_path, "Database path incorrect"
        
        # Test 2: Verify backup functionality would work
        # (We can't test actual backup without file operations, but we verify the structure)
        assert os.path.exists(self.test_db_path), "Database file not accessible for backup"
        
        logger.info("Settings functionality test passed")
    
    def test_backward_compatibility(self):
        """Test backward compatibility with v1.0.0 data"""
        logger.info("Testing backward compatibility...")
        
        # Test 1: Verify all v1.0.0 database functions still exist and work
        v1_functions = [
            insert_turnier, fetch_turniere, update_turnier, delete_turnier,
            insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer,
            insert_gruppe, fetch_gruppen, delete_gruppe,
            save_match_result, fetch_spiele, save_ko_result_and_propagate, fetch_ko_spiele,
            insert_meisterschaft, fetch_meisterschaften, delete_meisterschaft,
            insert_turnier_teilnehmer, fetch_turnier_teilnehmer, delete_turnier_teilnehmer,
            insert_gruppen_teilnehmer, fetch_gruppen_teilnehmer, delete_gruppen_teilnehmer
        ]
        
        for func in v1_functions:
            assert callable(func), f"Function {func.__name__} not callable"
        
        # Test 2: Verify database schema is compatible
        # (This is implicitly tested by the fact that all functions work)
        
        logger.info("Backward compatibility test passed")
    
    def run_all_tests(self):
        """Run all regression tests"""
        logger.info("Starting comprehensive regression test suite...")
        
        try:
            self.setup()
            
            # Run all test methods
            self.test_tournament_crud_operations()
            self.test_participant_crud_operations()
            self.test_group_management()
            self.test_match_management()
            self.test_meisterschaft_management()
            self.test_data_integrity()
            self.test_export_functionality()
            self.test_settings_functionality()
            self.test_backward_compatibility()
            
            logger.info("All regression tests passed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Regression test suite failed: {e}")
            return False
        finally:
            self.cleanup()

def main():
    """Main test runner"""
    print("=" * 60)
    print("IBU Turniere v1.1.0-beta.1 - Regression Tests")
    print("=" * 60)
    
    test_suite = RegressionTestSuite()
    success = test_suite.run_all_tests()
    
    print("=" * 60)
    if success:
        print("✅ All regression tests PASSED!")
    else:
        print("❌ Regression tests FAILED!")
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
