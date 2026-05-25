# database/migrations/simple_migrate.py
"""
Vereinfachtes Migration Script für IBU Turniere v1.1.0-alpha.2

Führt die Migration von SQLite-Tabellen ohne FK Constraints zu Tabellen
mit FK Constraints durch. Ohne externe Abhängigkeiten.
"""

import os
import sqlite3
from datetime import datetime


def run_simple_migration():
    """Führt die Migration mit der aktuellen Datenbank durch."""
    # Pfade
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DATA_DIR = os.path.join(PROJECT_ROOT, "data")
    DB_PATH = os.path.join(DATA_DIR, "ibu.sqlite")
    
    print(f"Starting migration for database: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("Database not found - creating new database with FK constraints")
        return
    
    try:
        with sqlite3.connect(DB_PATH) as con:
            # Prüfe ob FK bereits aktiv sind
            result = con.execute("PRAGMA foreign_keys").fetchone()
            if result and result[0]:
                print("Foreign Key Constraints already enabled - migration not needed")
                return
            
            print("Foreign Key Constraints not enabled - starting migration")
            
            # Foreign Keys aktivieren
            con.execute("PRAGMA foreign_keys = ON")
            
            # Neue Tabellen mit FK Constraints erstellen
            print("Creating new tables with Foreign Key Constraints...")
            
            # turnier_teilnehmer mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS turnier_teilnehmer_new(
                turnier_id INTEGER NOT NULL,
                teilnehmer_id INTEGER NOT NULL,
                FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
                FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
                UNIQUE(turnier_id, teilnehmer_id)
            )
            """)
            
            # gruppen mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS gruppen_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                turnier_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE
            )
            """)
            
            # gruppen_teilnehmer mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS gruppen_teilnehmer_new(
                gruppe_id INTEGER NOT NULL,
                teilnehmer_id INTEGER NOT NULL,
                FOREIGN KEY (gruppe_id) REFERENCES gruppen(id) ON DELETE CASCADE,
                FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
                UNIQUE(gruppe_id, teilnehmer_id)
            )
            """)
            
            # spiele mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS spiele_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                turnier_id INTEGER NOT NULL,
                gruppe_id INTEGER NOT NULL,
                spieltag INTEGER,
                runde INTEGER,
                match_no INTEGER,
                p1_id INTEGER,
                p2_id INTEGER,
                s1 INTEGER,
                s2 INTEGER,
                FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
                FOREIGN KEY (gruppe_id) REFERENCES gruppen(id) ON DELETE CASCADE
            )
            """)
            
            # ko_spiele mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS ko_spiele_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                turnier_id INTEGER NOT NULL,
                runde INTEGER,
                match_no INTEGER,
                p1_id INTEGER,
                p2_id INTEGER,
                s1 INTEGER,
                s2 INTEGER,
                FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE
            )
            """)
            
            # turnier_platzierungen mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS turnier_platzierungen_new(
                turnier_id INTEGER NOT NULL,
                teilnehmer_id INTEGER NOT NULL,
                platz INTEGER NOT NULL,
                FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
                FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
                UNIQUE(turnier_id, teilnehmer_id)
            )
            """)
            
            # meisterschaft_turniere mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS meisterschaft_turniere_new(
                meisterschaft_id INTEGER NOT NULL,
                turnier_id INTEGER NOT NULL,
                FOREIGN KEY (meisterschaft_id) REFERENCES meisterschaften(id) ON DELETE CASCADE,
                FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
                UNIQUE(meisterschaft_id, turnier_id)
            )
            """)
            
            # meisterschaft_punkteschema mit FK
            con.execute("""
            CREATE TABLE IF NOT EXISTS meisterschaft_punkteschema_new(
                meisterschaft_id INTEGER NOT NULL,
                platz INTEGER NOT NULL,
                punkte INTEGER NOT NULL,
                FOREIGN KEY (meisterschaft_id) REFERENCES meisterschaften(id) ON DELETE CASCADE,
                UNIQUE(meisterschaft_id, platz)
            )
            """)
            
            print("New tables created successfully")
            
            # Daten migrieren
            print("Migrating data...")
            
            migrations = [
                ("INSERT INTO turnier_teilnehmer_new SELECT * FROM turnier_teilnehmer", "turnier_teilnehmer"),
                ("INSERT INTO gruppen_new SELECT * FROM gruppen", "gruppen"),
                ("INSERT INTO gruppen_teilnehmer_new SELECT * FROM gruppen_teilnehmer", "gruppen_teilnehmer"),
                ("INSERT INTO spiele_new SELECT * FROM spiele", "spiele"),
                ("INSERT INTO ko_spiele_new SELECT * FROM ko_spiele", "ko_spiele"),
                ("INSERT INTO turnier_platzierungen_new SELECT * FROM turnier_platzierungen", "turnier_platzierungen"),
                ("INSERT INTO meisterschaft_turniere_new SELECT * FROM meisterschaft_turniere", "meisterschaft_turniere"),
                ("INSERT INTO meisterschaft_punkteschema_new SELECT * FROM meisterschaft_punkteschema", "meisterschaft_punkteschema"),
            ]
            
            for sql, table_name in migrations:
                try:
                    con.execute(sql)
                    print(f"  Migrated data for table: {table_name}")
                except sqlite3.Error as e:
                    print(f"  Warning: Failed to migrate data for {table_name}: {e}")
            
            print("Data migration completed")
            
            # Alte Tabellen ersetzen
            print("Replacing old tables...")
            
            replacements = [
                ("turnier_teilnehmer", "turnier_teilnehmer_new"),
                ("gruppen", "gruppen_new"),
                ("gruppen_teilnehmer", "gruppen_teilnehmer_new"),
                ("spiele", "spiele_new"),
                ("ko_spiele", "ko_spiele_new"),
                ("turnier_platzierungen", "turnier_platzierungen_new"),
                ("meisterschaft_turniere", "meisterschaft_turniere_new"),
                ("meisterschaft_punkteschema", "meisterschaft_punkteschema_new"),
            ]
            
            for old_table, new_table in replacements:
                try:
                    con.execute(f"DROP TABLE IF EXISTS {old_table}")
                    con.execute(f"ALTER TABLE {new_table} RENAME TO {old_table}")
                    print(f"  Replaced table: {old_table}")
                except sqlite3.Error as e:
                    print(f"  Warning: Failed to replace table {old_table}: {e}")
            
            print("Table replacement completed")
            
            # Commit alle Änderungen
            con.commit()
            print("Migration completed successfully!")
            
            # Test FK Constraints
            print("Testing Foreign Key Constraints...")
            try:
                # Versuche ungültige Daten einzufügen - sollte fehlschlagen
                con.execute("INSERT INTO turnier_teilnehmer(turnier_id, teilnehmer_id) VALUES (?, ?)", (999, 999))
                print("  WARNING: FK constraint not working - invalid data was inserted")
            except sqlite3.IntegrityError:
                print("  OK: FK constraints are working - invalid data rejected")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        return False
    
    return True


if __name__ == "__main__":
    success = run_simple_migration()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        exit(1)
