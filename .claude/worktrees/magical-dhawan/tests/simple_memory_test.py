# tests/simple_memory_test.py
"""
Vereinfachter Memory Test für IBU Turniere v1.1.0-alpha.4

Testet Memory Usage ohne PyQt6-Abhängigkeiten.
"""

import sys
import os
import tracemalloc
import gc
import time
from typing import Dict, List, Any

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.models import (
    insert_turnier, fetch_turniere, update_turnier, delete_turnier,
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer
)


class SimpleMemoryProfiler:
    """Vereinfachter Memory Profiler."""
    
    def __init__(self):
        self.snapshots: List[tracemalloc.Snapshot] = []
    
    def start_tracing(self) -> None:
        """Startet Memory Tracing."""
        tracemalloc.start()
        print("Memory tracing started")
    
    def stop_tracing(self) -> None:
        """Stoppt Memory Tracing."""
        tracemalloc.stop()
        print("Memory tracing stopped")
    
    def take_snapshot(self, name: str = "") -> None:
        """Erstellt einen Memory Snapshot."""
        snapshot = tracemalloc.take_snapshot()
        self.snapshots.append(snapshot)
        print(f"Memory snapshot taken: {name or len(self.snapshots)}")
    
    def compare_snapshots(self, index1: int, index2: int) -> None:
        """Vergleicht zwei Memory Snapshots."""
        if index1 >= len(self.snapshots) or index2 >= len(self.snapshots):
            print("Invalid snapshot indices")
            return
        
        snapshot1 = self.snapshots[index1]
        snapshot2 = self.snapshots[index2]
        
        top_stats = snapshot2.compare_to(snapshot1, 'lineno')
        
        print(f"\nTop 5 memory differences:")
        for stat in top_stats[:5]:
            print(stat)
    
    def get_current_memory_usage(self) -> Dict[str, Any]:
        """Gibt aktuelle Speichernutzung zurück."""
        if not tracemalloc.is_tracing():
            return {"error": "Tracing not active"}
        
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')
        
        total_size = sum(stat.size for stat in top_stats)
        total_count = sum(stat.count for stat in top_stats)
        
        return {
            "total_size": total_size,
            "total_count": total_count,
            "top_allocations": [
                {
                    "size": stat.size,
                    "count": stat.count,
                    "traceback": str(stat.traceback)
                }
                for stat in top_stats[:3]
            ]
        }
    
    def force_garbage_collection(self) -> None:
        """Erzwingt Garbage Collection."""
        collected = gc.collect()
        print(f"Garbage collection: {collected} objects collected")


def test_database_operations_memory():
    """Testet Memory Usage bei Datenbankoperationen."""
    print("Testing Database Operations Memory Usage...")
    
    profiler = SimpleMemoryProfiler()
    profiler.start_tracing()
    
    try:
        # Snapshot vor Operationen
        profiler.take_snapshot("Before operations")
        
        # Erstelle viele Turniere und Teilnehmer
        tournament_ids = []
        participant_ids = []
        
        for i in range(10):
            tournament_id = insert_turnier(f"Memory Test Tournament {i}", "2024-01-01", "Gruppenphase")
            tournament_ids.append(tournament_id)
            
            participant_id = insert_teilnehmer(f"Memory Test Participant {i}", f"Test{i}")
            participant_ids.append(participant_id)
        
        # Snapshot nach Erstellung
        profiler.take_snapshot("After creation")
        
        # Führe viele Abfragen durch
        for _ in range(5):
            tournaments = fetch_turniere()
            participants = fetch_teilnehmer()
        
        # Snapshot nach Abfragen
        profiler.take_snapshot("After queries")
        
        # Lösche alle Daten
        for tournament_id in tournament_ids:
            delete_turnier(tournament_id)
        
        for participant_id in participant_ids:
            delete_teilnehmer(participant_id)
        
        # Snapshot nach Löschung
        profiler.take_snapshot("After deletion")
        
        # Vergleiche Snapshots
        print("\nMemory comparison: Before vs After creation")
        profiler.compare_snapshots(0, 1)
        
        print("\nMemory comparison: After creation vs After queries")
        profiler.compare_snapshots(1, 2)
        
        print("\nMemory comparison: After queries vs After deletion")
        profiler.compare_snapshots(2, 3)
        
        # Aktuelle Speichernutzung
        memory_usage = profiler.get_current_memory_usage()
        print(f"\nCurrent memory usage: {memory_usage['total_size'] / 1024:.2f} KB")
        
    finally:
        profiler.stop_tracing()


def test_memory_leak_detection():
    """Testet Memory Leak Detection."""
    print("Testing Memory Leak Detection...")
    
    profiler = SimpleMemoryProfiler()
    profiler.start_tracing()
    
    try:
        # Snapshot am Anfang
        profiler.take_snapshot("Initial")
        
        # Simuliere typische Anwendungsnutzung
        for cycle in range(3):
            print(f"\nCycle {cycle + 1}")
            
            # Erstelle Daten
            tournament_id = insert_turnier(f"Leak Test Tournament {cycle}", "2024-01-01", "Gruppenphase")
            participant_id = insert_teilnehmer(f"Leak Test Participant {cycle}", f"Test{cycle}")
            
            # Führe Operationen durch
            tournaments = fetch_turniere()
            participants = fetch_teilnehmer()
            
            # Lösche Daten
            delete_turnier(tournament_id)
            delete_teilnehmer(participant_id)
            
            # Snapshot nach jedem Zyklus
            profiler.take_snapshot(f"After cycle {cycle + 1}")
            
            # Garbage Collection
            profiler.force_garbage_collection()
        
        # Vergleiche alle Snapshots
        print("\nMemory comparison: Initial vs After cycle 1")
        profiler.compare_snapshots(0, 1)
        
        print("\nMemory comparison: After cycle 1 vs After cycle 2")
        profiler.compare_snapshots(1, 2)
        
        print("\nMemory comparison: After cycle 2 vs After cycle 3")
        profiler.compare_snapshots(2, 3)
        
        # Prüfe auf Memory Leaks
        initial_memory = profiler.snapshots[0].statistics('lineno')
        final_memory = profiler.snapshots[-1].statistics('lineno')
        
        initial_size = sum(stat.size for stat in initial_memory)
        final_size = sum(stat.size for stat in final_memory)
        
        size_diff = final_size - initial_size
        
        print(f"\nMemory Leak Analysis:")
        print(f"Initial memory: {initial_size / 1024:.2f} KB")
        print(f"Final memory: {final_size / 1024:.2f} KB")
        print(f"Difference: {size_diff / 1024:.2f} KB")
        
        if size_diff > 1024 * 1024:  # Mehr als 1MB Unterschied
            print("[WARNING] Potential memory leak detected!")
        else:
            print("[OK] No significant memory leak detected")
        
    finally:
        profiler.stop_tracing()


def test_performance_benchmark():
    """Testet Performance und Memory Usage."""
    print("Testing Performance Benchmark...")
    
    profiler = SimpleMemoryProfiler()
    profiler.start_tracing()
    
    try:
        # Snapshot vor Benchmark
        profiler.take_snapshot("Before benchmark")
        
        # Benchmark: Große Datenmenge
        start_time = time.time()
        
        tournament_ids = []
        participant_ids = []
        
        # Erstelle 50 Turniere und Teilnehmer
        for i in range(50):
            tournament_id = insert_turnier(f"Benchmark Tournament {i}", "2024-01-01", "Gruppenphase")
            tournament_ids.append(tournament_id)
            
            participant_id = insert_teilnehmer(f"Benchmark Participant {i}", f"Bench{i}")
            participant_ids.append(participant_id)
        
        creation_time = time.time() - start_time
        
        # Snapshot nach Erstellung
        profiler.take_snapshot("After creation")
        
        # Benchmark: Viele Abfragen
        start_time = time.time()
        
        for _ in range(5):
            tournaments = fetch_turniere()
            participants = fetch_teilnehmer()
        
        query_time = time.time() - start_time
        
        # Snapshot nach Abfragen
        profiler.take_snapshot("After queries")
        
        # Benchmark: Löschung
        start_time = time.time()
        
        for tournament_id in tournament_ids:
            delete_turnier(tournament_id)
        
        for participant_id in participant_ids:
            delete_teilnehmer(participant_id)
        
        deletion_time = time.time() - start_time
        
        # Snapshot nach Löschung
        profiler.take_snapshot("After deletion")
        
        # Performance Statistiken
        print(f"\nPerformance Benchmark Results:")
        print(f"Creation time: {creation_time:.3f} seconds")
        print(f"Query time: {query_time:.3f} seconds")
        print(f"Deletion time: {deletion_time:.3f} seconds")
        print(f"Total time: {creation_time + query_time + deletion_time:.3f} seconds")
        
        # Memory Statistiken
        memory_usage = profiler.get_current_memory_usage()
        print(f"\nMemory usage: {memory_usage['total_size'] / 1024:.2f} KB")
        
        # Vergleiche Snapshots
        print("\nMemory comparison: Before vs After creation")
        profiler.compare_snapshots(0, 1)
        
        print("\nMemory comparison: After creation vs After queries")
        profiler.compare_snapshots(1, 2)
        
        print("\nMemory comparison: After queries vs After deletion")
        profiler.compare_snapshots(2, 3)
        
    finally:
        profiler.stop_tracing()


def main():
    """Hauptfunktion für alle Memory Profiling Tests."""
    print("=" * 60)
    print("IBU Turniere v1.1.0-alpha.4 - Simple Memory Profiling Tests")
    print("=" * 60)
    print()
    
    try:
        test_database_operations_memory()
        print()
        
        test_memory_leak_detection()
        print()
        
        test_performance_benchmark()
        print()
        
        print("=" * 60)
        print("All memory profiling tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Memory profiling test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
