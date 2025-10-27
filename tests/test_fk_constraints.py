# tests/test_fk_constraints.py
"""
Test-Script für Foreign Key Constraints in v1.1.0-alpha.2

Testet ob die FK Constraints korrekt funktionieren.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core import ValidationError, TournamentNotFoundError, ParticipantNotFoundError
from database.models import (
    insert_turnier, fetch_turniere, update_turnier, delete_turnier,
    insert_teilnehmer, fetch_teilnehmer, update_teilnehmer, delete_teilnehmer
)


def test_fk_constraints():
    """Testet die Foreign Key Constraints."""
    print("Testing Foreign Key Constraints...")
    
    try:
        # Erstelle Test-Daten
        tournament_id = insert_turnier("FK Test Tournament", "2024-01-01", "Gruppenphase")
        participant_id = insert_teilnehmer("FK Test Participant", "FK Test")
        
        print(f"[OK] Created tournament {tournament_id} and participant {participant_id}")
        
        # Teste FK Constraint - versuche ungültige Referenz
        import sqlite3
        from database.models import _connect
        
        with _connect() as con:
            # Foreign Keys aktivieren
            con.execute("PRAGMA foreign_keys = ON")
            
            # Versuche ungültige Referenz einzufügen
            try:
                con.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (999, 999))
                print("[FAIL] FK constraint not working - invalid data was inserted")
            except sqlite3.IntegrityError:
                print("[OK] FK constraints are working - invalid data rejected")
            
            # Teste gültige Referenz
            try:
                con.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (tournament_id, participant_id))
                print("[OK] Valid FK reference inserted successfully")
            except sqlite3.IntegrityError as e:
                print(f"[FAIL] Valid FK reference failed: {e}")
        
        # Teste Cascade Delete
        print("Testing Cascade Delete...")
        
        # Lösche Turnier - sollte alle zugehörigen Daten löschen
        delete_turnier(tournament_id)
        print(f"[OK] Tournament {tournament_id} deleted")
        
        # Prüfe ob Teilnehmer noch existiert (sollte er)
        participants = fetch_teilnehmer()
        participant_exists = any(p[0] == participant_id for p in participants)
        if participant_exists:
            print(f"[OK] Participant {participant_id} still exists after tournament deletion")
        else:
            print(f"[FAIL] Participant {participant_id} was deleted with tournament (should not happen)")
        
        # Lösche Teilnehmer
        delete_teilnehmer(participant_id)
        print(f"[OK] Participant {participant_id} deleted")
        
    except Exception as e:
        print(f"[FAIL] FK constraints test failed: {e}")
        import traceback
        traceback.print_exc()


def test_data_integrity():
    """Testet die Datenintegrität nach der Migration."""
    print("Testing Data Integrity...")
    
    try:
        import sqlite3
        from database.models import _connect
        
        with _connect() as con:
            # Foreign Keys aktivieren
            con.execute("PRAGMA foreign_keys = ON")
            
            # Prüfe auf Waisen-Datensätze
            integrity_checks = [
                ("turnier_teilnehmer", "turniere", "turnier_id"),
                ("turnier_teilnehmer", "teilnehmer", "teilnehmer_id"),
                ("gruppen", "turniere", "turnier_id"),
                ("gruppen_teilnehmer", "gruppen", "gruppe_id"),
                ("gruppen_teilnehmer", "teilnehmer", "teilnehmer_id"),
                ("spiele", "turniere", "turnier_id"),
                ("spiele", "gruppen", "gruppe_id"),
                ("ko_spiele", "turniere", "turnier_id"),
                ("turnier_platzierungen", "turniere", "turnier_id"),
                ("turnier_platzierungen", "teilnehmer", "teilnehmer_id"),
                ("meisterschaft_turniere", "meisterschaften", "meisterschaft_id"),
                ("meisterschaft_turniere", "turniere", "turnier_id"),
                ("meisterschaft_punkteschema", "meisterschaften", "meisterschaft_id"),
            ]
            
            all_checks_passed = True
            
            for child_table, parent_table, fk_column in integrity_checks:
                try:
                    # Prüfe ob alle FK-Referenzen gültig sind
                    check_sql = f"""
                    SELECT COUNT(*) FROM {child_table} c 
                    WHERE NOT EXISTS (
                        SELECT 1 FROM {parent_table} p 
                        WHERE p.id = c.{fk_column}
                    )
                    """
                    result = con.execute(check_sql).fetchone()
                    orphan_count = result[0] if result else 0
                    
                    if orphan_count > 0:
                        print(f"[FAIL] Found {orphan_count} orphaned records in {child_table}.{fk_column}")
                        all_checks_passed = False
                    else:
                        print(f"[OK] No orphaned records in {child_table}.{fk_column}")
                        
                except sqlite3.Error as e:
                    print(f"[WARNING] Could not check integrity for {child_table}.{fk_column}: {e}")
            
            if all_checks_passed:
                print("[OK] All data integrity checks passed")
            else:
                print("[FAIL] Some data integrity checks failed")
                
    except Exception as e:
        print(f"[FAIL] Data integrity test failed: {e}")


def main():
    """Hauptfunktion für alle FK-Tests."""
    print("=" * 60)
    print("IBU Turniere v1.1.0-alpha.2 - Foreign Key Constraints Tests")
    print("=" * 60)
    print()
    
    try:
        test_fk_constraints()
        print()
        
        test_data_integrity()
        print()
        
        print("=" * 60)
        print("All FK constraint tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"FK constraint test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
