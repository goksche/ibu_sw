# tests/test_performance.py
"""
IBU Turniere v1.1.0-beta.1 - Performance Tests

Testet Performance und Skalierbarkeit der Anwendung:
- Große Datensätze (100+ Turniere, 1000+ Teilnehmer)
- Memory Usage unter Last
- Response Times
- Database Performance
"""

import sys
import os
import time
import tempfile
import shutil
import tracemalloc
import gc
from datetime import datetime, timedelta

# Add project root to sys.path
SCRIPT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, PROJECT_ROOT)

from app.core import get_logger, cleanup_all_resources
from database.models import (
    _init_db, insert_turnier, fetch_turniere, delete_turnier,
    insert_teilnehmer, fetch_teilnehmer, delete_teilnehmer,
    insert_gruppe, fetch_gruppen, delete_gruppe,
    save_match_result, fetch_group_matches, save_ko_result_and_propagate, fetch_ko_matches
)

logger = get_logger("tests.performance")

class PerformanceTestSuite:
    """Performance and scalability test suite"""
    
    def __init__(self):
        self.test_db_dir = tempfile.mkdtemp()
        self.test_db_path = os.path.join(self.test_db_dir, "performance_test.sqlite")
        self.original_db_path = os.environ.get("IBU_DB_PATH")
        
        # Set test database path
        os.environ["IBU_DB_PATH"] = self.test_db_path
        
        self.tournament_ids = []
        self.participant_ids = []
        self.group_ids = []
        self.match_ids = []
        
    def setup(self):
        """Initialize test database"""
        logger.info("Setting up performance test environment")
        _init_db()
        logger.info("Database initialized for performance testing")
        
    def cleanup(self):
        """Clean up test environment"""
        logger.info("Cleaning up performance test environment")
        
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
            
        logger.info("Performance test cleanup completed")
    
    def test_large_dataset_creation(self):
        """Test creating large datasets"""
        logger.info("Testing large dataset creation...")
        
        # Test 1: Create 100 tournaments
        start_time = time.time()
        start_memory = tracemalloc.get_traced_memory()[0] if tracemalloc.is_tracing() else 0
        
        for i in range(100):
            tournament_id = insert_turnier(
                f"Performance Tournament {i:03d}",
                f"2024-{(i % 12) + 1:02d}-01",
                "Gruppenphase + KO-Phase"
            )
            self.tournament_ids.append(tournament_id)
        
        creation_time = time.time() - start_time
        end_memory = tracemalloc.get_traced_memory()[0] if tracemalloc.is_tracing() else 0
        memory_used = end_memory - start_memory
        
        logger.info(f"Created 100 tournaments in {creation_time:.2f}s")
        logger.info(f"Memory used: {memory_used / 1024:.2f} KB")
        
        # Performance criteria: Should complete in reasonable time
        assert creation_time < 10.0, f"Tournament creation too slow: {creation_time:.2f}s"
        assert memory_used < 10 * 1024 * 1024, f"Memory usage too high: {memory_used / 1024 / 1024:.2f} MB"
        
        # Test 2: Create 1000 participants
        start_time = time.time()
        
        for i in range(1000):
            participant_id = insert_teilnehmer(
                f"Performance Participant {i:04d}",
                f"P{i:04d}",
                f"PERF{i:04d}"
            )
            self.participant_ids.append(participant_id)
        
        creation_time = time.time() - start_time
        logger.info(f"Created 1000 participants in {creation_time:.2f}s")
        
        # Performance criteria
        assert creation_time < 15.0, f"Participant creation too slow: {creation_time:.2f}s"
        
        # Test 3: Create groups for tournaments
        start_time = time.time()
        
        for i, tournament_id in enumerate(self.tournament_ids[:50]):  # First 50 tournaments
            for j in range(4):  # 4 groups per tournament
                group_id = insert_gruppe(tournament_id, f"Gruppe {chr(65 + j)}")
                self.group_ids.append(group_id)
        
        creation_time = time.time() - start_time
        logger.info(f"Created 200 groups in {creation_time:.2f}s")
        
        assert creation_time < 5.0, f"Group creation too slow: {creation_time:.2f}s"
    
    def test_large_dataset_queries(self):
        """Test querying large datasets"""
        logger.info("Testing large dataset queries...")
        
        # Test 1: Fetch all tournaments
        start_time = time.time()
        tournaments = fetch_turniere()
        query_time = time.time() - start_time
        
        logger.info(f"Fetched {len(tournaments)} tournaments in {query_time:.4f}s")
        assert len(tournaments) == 100, f"Expected 100 tournaments, got {len(tournaments)}"
        assert query_time < 1.0, f"Tournament query too slow: {query_time:.4f}s"
        
        # Test 2: Fetch all participants
        start_time = time.time()
        participants = fetch_teilnehmer()
        query_time = time.time() - start_time
        
        logger.info(f"Fetched {len(participants)} participants in {query_time:.4f}s")
        assert len(participants) == 1000, f"Expected 1000 participants, got {len(participants)}"
        assert query_time < 2.0, f"Participant query too slow: {query_time:.4f}s"
        
        # Test 3: Fetch groups for specific tournament
        start_time = time.time()
        groups = fetch_gruppen(self.tournament_ids[0])
        query_time = time.time() - start_time
        
        logger.info(f"Fetched groups for tournament in {query_time:.4f}s")
        assert query_time < 0.1, f"Group query too slow: {query_time:.4f}s"
    
    def test_match_creation_performance(self):
        """Test match creation performance"""
        logger.info("Testing match creation performance...")
        
        # Test 1: Create matches for first tournament
        tournament_id = self.tournament_ids[0]
        group_id = self.group_ids[0]
        
        start_time = time.time()
        
        # Create 20 matches
        for i in range(20):
            p1_idx = i % len(self.participant_ids)
            p2_idx = (i + 1) % len(self.participant_ids)
            
            match_id = save_match_result(
                tournament_id, group_id, 1, i + 1,
                self.participant_ids[p1_idx], self.participant_ids[p2_idx],
                i % 5, (i + 1) % 5
            )
            self.match_ids.append(match_id)
        
        creation_time = time.time() - start_time
        logger.info(f"Created 20 matches in {creation_time:.4f}s")
        
        assert creation_time < 2.0, f"Match creation too slow: {creation_time:.4f}s"
        
        # Test 2: Fetch matches
        start_time = time.time()
        matches = fetch_group_matches(tournament_id, group_id)
        query_time = time.time() - start_time
        
        logger.info(f"Fetched {len(matches)} matches in {query_time:.4f}s")
        assert len(matches) == 20, f"Expected 20 matches, got {len(matches)}"
        assert query_time < 0.5, f"Match query too slow: {query_time:.4f}s"
    
    def test_memory_usage_under_load(self):
        """Test memory usage under sustained load"""
        logger.info("Testing memory usage under load...")
        
        # Start memory tracing
        tracemalloc.start()
        initial_memory = tracemalloc.get_traced_memory()[0]
        
        # Simulate sustained load: create, query, delete cycles
        for cycle in range(10):
            logger.info(f"Memory test cycle {cycle + 1}/10")
            
            # Create data
            temp_tournament_ids = []
            for i in range(10):
                t_id = insert_turnier(f"Load Test Tournament {cycle}-{i}", "2024-01-01", "Gruppenphase")
                temp_tournament_ids.append(t_id)
            
            # Query data
            tournaments = fetch_turniere()
            
            # Delete data
            for t_id in temp_tournament_ids:
                delete_turnier(t_id)
            
            # Force garbage collection
            gc.collect()
            
            # Check memory usage
            current_memory = tracemalloc.get_traced_memory()[0]
            memory_growth = current_memory - initial_memory
            
            logger.info(f"Cycle {cycle + 1}: Memory growth: {memory_growth / 1024:.2f} KB")
            
            # Memory should not grow excessively
            assert memory_growth < 50 * 1024 * 1024, f"Excessive memory growth: {memory_growth / 1024 / 1024:.2f} MB"
        
        tracemalloc.stop()
        logger.info("Memory load test completed successfully")
    
    def test_concurrent_operations(self):
        """Test concurrent-like operations"""
        logger.info("Testing concurrent operations...")
        
        # Simulate concurrent operations by rapid sequential operations
        start_time = time.time()
        
        # Rapid create/update/delete operations
        operations = []
        for i in range(50):
            # Create
            t_id = insert_turnier(f"Concurrent Test {i}", "2024-01-01", "Gruppenphase")
            operations.append(('create', t_id))
            
            # Update
            update_turnier(t_id, f"Updated Concurrent Test {i}", "2024-02-01", "KO-Phase")
            operations.append(('update', t_id))
            
            # Query
            tournaments = fetch_turniere()
            operations.append(('query', len(tournaments)))
        
        # Clean up
        for op_type, t_id in operations:
            if op_type == 'create' or op_type == 'update':
                delete_turnier(t_id)
        
        total_time = time.time() - start_time
        logger.info(f"Completed 150 concurrent operations in {total_time:.2f}s")
        
        # Performance criteria
        assert total_time < 30.0, f"Concurrent operations too slow: {total_time:.2f}s"
    
    def test_database_cleanup_performance(self):
        """Test database cleanup performance"""
        logger.info("Testing database cleanup performance...")
        
        # Test cascading delete performance
        start_time = time.time()
        
        # Delete all tournaments (should cascade to groups and matches)
        for tournament_id in self.tournament_ids:
            delete_turnier(tournament_id)
        
        cleanup_time = time.time() - start_time
        logger.info(f"Deleted all tournaments with cascade in {cleanup_time:.2f}s")
        
        # Verify cleanup
        tournaments = fetch_turniere()
        assert len(tournaments) == 0, "Not all tournaments deleted"
        
        # Performance criteria
        assert cleanup_time < 10.0, f"Cleanup too slow: {cleanup_time:.2f}s"
    
    def test_resource_cleanup_performance(self):
        """Test resource cleanup performance"""
        logger.info("Testing resource cleanup performance...")
        
        start_time = time.time()
        
        # Clean up all resources
        cleanup_all_resources()
        
        cleanup_time = time.time() - start_time
        logger.info(f"Resource cleanup completed in {cleanup_time:.4f}s")
        
        # Performance criteria
        assert cleanup_time < 1.0, f"Resource cleanup too slow: {cleanup_time:.4f}s"
    
    def run_all_tests(self):
        """Run all performance tests"""
        logger.info("Starting comprehensive performance test suite...")
        
        try:
            self.setup()
            
            # Start memory tracing
            tracemalloc.start()
            
            # Run all test methods
            self.test_large_dataset_creation()
            self.test_large_dataset_queries()
            self.test_match_creation_performance()
            self.test_memory_usage_under_load()
            self.test_concurrent_operations()
            self.test_database_cleanup_performance()
            self.test_resource_cleanup_performance()
            
            tracemalloc.stop()
            
            logger.info("All performance tests passed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Performance test suite failed: {e}")
            return False
        finally:
            self.cleanup()

def main():
    """Main test runner"""
    print("=" * 60)
    print("IBU Turniere v1.1.0-beta.1 - Performance Tests")
    print("=" * 60)
    
    test_suite = PerformanceTestSuite()
    success = test_suite.run_all_tests()
    
    print("=" * 60)
    if success:
        print("✅ All performance tests PASSED!")
    else:
        print("❌ Performance tests FAILED!")
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
