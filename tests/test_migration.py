# tests/test_migration.py
"""
Test-Script für Migration in v1.1.0-alpha.2

Testet die Migration von Tabellen ohne FK Constraints zu Tabellen mit FK Constraints.
"""

import sys
import os
import sqlite3
import tempfile
import shutil

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core import DatabaseError, get_logger
from database.migrations.migrate import (
    create_backup, check_foreign_keys_support, create_new_tables_with_fk,
    migrate_data, validate_data_integrity, replace_old_tables, run_migration
)

def create_test_database() -> str:
    """Erstellt eine Test-Datenbank mit Beispieldaten."""
    # Temporäre Datenbank erstellen
    temp_dir = tempfile.mkdtemp()
    test_db_path = os.path.join(temp_dir, "test_ibu.sqlite")
    
    print(f"Creating test database: {test_db_path}")
    
    with sqlite3.connect(test_db_path) as con:
        c = con.cursor()
        
        # Basis-Tabellen erstellen (ohne FK Constraints)
        c.execute("""
        CREATE TABLE turniere(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            datum TEXT,
            modus TEXT,
            meisterschaft INTEGER DEFAULT 0
        )""")
        
        c.execute("""
        CREATE TABLE teilnehmer(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            spitzname TEXT
        )""")
        
        c.execute("""
        CREATE TABLE turnier_teilnehmer(
            turnier_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            UNIQUE(turnier_id, teilnehmer_id)
        )""")
        
        c.execute("""
        CREATE TABLE gruppen(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnier_id INTEGER NOT NULL,
            name TEXT NOT NULL
        )""")
        
        c.execute("""
        CREATE TABLE gruppen_teilnehmer(
            gruppe_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            UNIQUE(gruppe_id, teilnehmer_id)
        )""")
        
        c.execute("""
        CREATE TABLE spiele(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnier_id INTEGER NOT NULL,
            gruppe_id INTEGER NOT NULL,
            spieltag INTEGER,
            runde INTEGER,
            match_no INTEGER,
            p1_id INTEGER,
            p2_id INTEGER,
            s1 INTEGER,
            s2 INTEGER
        )""")
        
        c.execute("""
        CREATE TABLE ko_spiele(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnier_id INTEGER NOT NULL,
            runde INTEGER,
            match_no INTEGER,
            p1_id INTEGER,
            p2_id INTEGER,
            s1 INTEGER,
            s2 INTEGER
        )""")
        
        c.execute("""
        CREATE TABLE turnier_platzierungen(
            turnier_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            platz INTEGER NOT NULL,
            UNIQUE(turnier_id, teilnehmer_id)
        )""")
        
        c.execute("""
        CREATE TABLE meisterschaften(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            saison TEXT,
            punkteschema TEXT
        )""")
        
        c.execute("""
        CREATE TABLE meisterschaft_turniere(
            meisterschaft_id INTEGER NOT NULL,
            turnier_id INTEGER NOT NULL,
            UNIQUE(meisterschaft_id, turnier_id)
        )""")
        
        c.execute("""
        CREATE TABLE meisterschaft_punkteschema(
            meisterschaft_id INTEGER NOT NULL,
            platz INTEGER NOT NULL,
            punkte INTEGER NOT NULL,
            UNIQUE(meisterschaft_id, platz)
        )""")
        
        # Beispieldaten einfügen
        c.execute("INSERT INTO turniere(name, datum, modus) VALUES (?, ?, ?)", 
                 ("Test Turnier 1", "2024-01-01", "Gruppenphase"))
        c.execute("INSERT INTO turniere(name, datum, modus) VALUES (?, ?, ?)", 
                 ("Test Turnier 2", "2024-01-02", "KO-Phase"))
        
        c.execute("INSERT INTO teilnehmer(name, spitzname) VALUES (?, ?)", 
                 ("Max Mustermann", "Max"))
        c.execute("INSERT INTO teilnehmer(name, spitzname) VALUES (?, ?)", 
                 ("Anna Schmidt", "Anna"))
        c.execute("INSERT INTO teilnehmer(name, spitzname) VALUES (?, ?)", 
                 ("Peter Mueller", "Peter"))
        
        c.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (1, 1))
        c.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (1, 2))
        c.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (2, 2))
        c.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (2, 3))
        
        c.execute("INSERT INTO gruppen(turnier_id, name) VALUES (?, ?)", (1, "Gruppe A"))
        c.execute("INSERT INTO gruppen(turnier_id, name) VALUES (?, ?)", (1, "Gruppe B"))
        
        c.execute("INSERT INTO gruppen_teilnehmer(gruppe_id, teilnehmer_id) VALUES (?, ?)", (1, 1))
        c.execute("INSERT INTO gruppen_teilnehmer(gruppe_id, teilnehmer_id) VALUES (?, ?)", (1, 2))
        
        c.execute("INSERT INTO spiele(turnier_id, gruppe_id, runde, match_no, p1_id, p2_id, s1, s2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                 (1, 1, 1, 1, 1, 2, 3, 1))
        
        c.execute("INSERT INTO meisterschaften(name, saison) VALUES (?, ?)", ("Test Meisterschaft", "2024"))
        c.execute("INSERT INTO meisterschaft_turniere(meisterschaft_id, turnier_id) VALUES (?, ?)", (1, 1))
        c.execute("INSERT INTO meisterschaft_punkteschema(meisterschaft_id, platz, punkte) VALUES (?, ?, ?)", (1, 1, 30))
        c.execute("INSERT INTO meisterschaft_punkteschema(meisterschaft_id, platz, punkte) VALUES (?, ?, ?)", (1, 2, 24))
        
        con.commit()
    
    print(f"Test database created with sample data")
    return test_db_path


def test_backup_creation():
    """Testet die Backup-Erstellung."""
    print("Testing backup creation...")
    
    try:
        # Temporäre Test-DB erstellen
        test_db = create_test_database()
        
        # Backup erstellen
        backup_path = create_backup()
        
        # Prüfen ob Backup existiert
        if os.path.exists(backup_path):
            print(f"[OK] Backup created successfully: {backup_path}")
        else:
            print("[FAIL] Backup file not found")
            
        # Cleanup
        os.unlink(test_db)
        if os.path.exists(backup_path):
            os.unlink(backup_path)
            
    except Exception as e:
        print(f"[FAIL] Backup creation failed: {e}")


def test_foreign_keys_check():
    """Testet die Foreign Key Support-Prüfung."""
    print("Testing foreign keys support check...")
    
    try:
        # Test ohne FK Support
        test_db = create_test_database()
        original_db_path = os.path.join(os.path.dirname(test_db), "..", "data", "ibu.sqlite")
        
        # Temporär die DB ersetzen
        if os.path.exists(original_db_path):
            shutil.move(original_db_path, original_db_path + ".backup")
        shutil.copy2(test_db, original_db_path)
        
        # FK Support prüfen
        has_fk = check_foreign_keys_support()
        print(f"[OK] Foreign keys support check: {has_fk}")
        
        # Cleanup
        os.unlink(test_db)
        if os.path.exists(original_db_path + ".backup"):
            shutil.move(original_db_path + ".backup", original_db_path)
        else:
            os.unlink(original_db_path)
            
    except Exception as e:
        print(f"[FAIL] Foreign keys check failed: {e}")


def test_migration_components():
    """Testet die einzelnen Migrations-Komponenten."""
    print("Testing migration components...")
    
    try:
        test_db = create_test_database()
        original_db_path = os.path.join(os.path.dirname(test_db), "..", "data", "ibu.sqlite")
        
        # Temporär die DB ersetzen
        if os.path.exists(original_db_path):
            shutil.move(original_db_path, original_db_path + ".backup")
        shutil.copy2(test_db, original_db_path)
        
        with sqlite3.connect(original_db_path) as con:
            # Test neue Tabellen erstellen
            create_new_tables_with_fk(con)
            print("[OK] New tables with FK constraints created")
            
            # Test Daten migrieren
            migrate_data(con)
            print("[OK] Data migration completed")
            
            # Test Datenintegrität validieren
            validate_data_integrity(con)
            print("[OK] Data integrity validation completed")
            
            # Test Tabellen ersetzen
            replace_old_tables(con)
            print("[OK] Table replacement completed")
        
        # Cleanup
        os.unlink(test_db)
        if os.path.exists(original_db_path + ".backup"):
            shutil.move(original_db_path + ".backup", original_db_path)
        else:
            os.unlink(original_db_path)
            
    except Exception as e:
        print(f"[FAIL] Migration components test failed: {e}")


def test_full_migration():
    """Testet die komplette Migration."""
    print("Testing full migration...")
    
    try:
        test_db = create_test_database()
        original_db_path = os.path.join(os.path.dirname(test_db), "..", "data", "ibu.sqlite")
        
        # Temporär die DB ersetzen
        if os.path.exists(original_db_path):
            shutil.move(original_db_path, original_db_path + ".backup")
        shutil.copy2(test_db, original_db_path)
        
        # Migration durchführen
        run_migration()
        print("[OK] Full migration completed successfully")
        
        # Prüfen ob FK Constraints aktiv sind
        with sqlite3.connect(original_db_path) as con:
            con.execute("PRAGMA foreign_keys = ON")
            
            # Test FK Constraint - sollte fehlschlagen
            try:
                con.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (999, 999))
                print("[FAIL] FK constraint not working - invalid data was inserted")
            except sqlite3.IntegrityError:
                print("[OK] FK constraints are working - invalid data rejected")
        
        # Cleanup
        os.unlink(test_db)
        if os.path.exists(original_db_path + ".backup"):
            shutil.move(original_db_path + ".backup", original_db_path)
        else:
            os.unlink(original_db_path)
            
    except Exception as e:
        print(f"[FAIL] Full migration test failed: {e}")


def main():
    """Hauptfunktion für alle Migration-Tests."""
    print("=" * 60)
    print("IBU Turniere v1.1.0-alpha.2 - Migration Tests")
    print("=" * 60)
    print()
    
    try:
        test_backup_creation()
        print()
        
        test_foreign_keys_check()
        print()
        
        test_migration_components()
        print()
        
        test_full_migration()
        print()
        
        print("=" * 60)
        print("All migration tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Migration test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
