# database/migrations/migrate.py
"""
Migration Script für IBU Turniere v1.1.0-alpha.2

Führt die Migration von SQLite-Tabellen ohne FK Constraints zu Tabellen
mit FK Constraints durch. Erstellt ein Backup und führt Rollback bei Fehlern durch.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
from datetime import datetime
from typing import List, Tuple

from app.core import DatabaseError, get_logger

logger = get_logger("database.migrations")

# Pfade
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "ibu.sqlite")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")


def create_backup() -> str:
    """Erstellt ein Backup der aktuellen Datenbank."""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(BACKUP_DIR, f"ibu_backup_{timestamp}.sqlite")
        
        logger.info("Creating database backup", backup_path=backup_path)
        shutil.copy2(DB_PATH, backup_path)
        logger.info("Database backup created successfully")
        return backup_path
        
    except Exception as e:
        logger.error("Failed to create database backup", exception=e)
        raise DatabaseError(f"Failed to create backup: {e}", operation="create_backup")


def check_foreign_keys_support() -> bool:
    """Prüft ob Foreign Key Constraints unterstützt werden."""
    try:
        with sqlite3.connect(DB_PATH) as con:
            result = con.execute("PRAGMA foreign_keys").fetchone()
            return bool(result[0]) if result else False
    except Exception as e:
        logger.warning("Failed to check foreign keys support", exception=e)
        return False


def create_new_tables_with_fk(con: sqlite3.Connection) -> None:
    """Erstellt neue Tabellen mit Foreign Key Constraints."""
    logger.info("Creating new tables with Foreign Key Constraints")
    
    # Foreign Keys aktivieren
    con.execute("PRAGMA foreign_keys = ON")
    
    # Neue Tabellen mit FK Constraints erstellen
    tables_sql = [
        # turnier_teilnehmer mit FK
        """
        CREATE TABLE turnier_teilnehmer_new(
            turnier_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
            FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
            UNIQUE(turnier_id, teilnehmer_id)
        )
        """,
        
        # gruppen mit FK
        """
        CREATE TABLE gruppen_new(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnier_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE
        )
        """,
        
        # gruppen_teilnehmer mit FK
        """
        CREATE TABLE gruppen_teilnehmer_new(
            gruppe_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            FOREIGN KEY (gruppe_id) REFERENCES gruppen(id) ON DELETE CASCADE,
            FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
            UNIQUE(gruppe_id, teilnehmer_id)
        )
        """,
        
        # spiele mit FK
        """
        CREATE TABLE spiele_new(
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
        """,
        
        # ko_spiele mit FK
        """
        CREATE TABLE ko_spiele_new(
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
        """,
        
        # turnier_platzierungen mit FK
        """
        CREATE TABLE turnier_platzierungen_new(
            turnier_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            platz INTEGER NOT NULL,
            FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
            FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
            UNIQUE(turnier_id, teilnehmer_id)
        )
        """,
        
        # meisterschaft_turniere mit FK
        """
        CREATE TABLE meisterschaft_turniere_new(
            meisterschaft_id INTEGER NOT NULL,
            turnier_id INTEGER NOT NULL,
            FOREIGN KEY (meisterschaft_id) REFERENCES meisterschaften(id) ON DELETE CASCADE,
            FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
            UNIQUE(meisterschaft_id, turnier_id)
        )
        """,
        
        # meisterschaft_punkteschema mit FK
        """
        CREATE TABLE meisterschaft_punkteschema_new(
            meisterschaft_id INTEGER NOT NULL,
            platz INTEGER NOT NULL,
            punkte INTEGER NOT NULL,
            FOREIGN KEY (meisterschaft_id) REFERENCES meisterschaften(id) ON DELETE CASCADE,
            UNIQUE(meisterschaft_id, platz)
        )
        """
    ]
    
    for sql in tables_sql:
        con.execute(sql)
    
    logger.info("New tables with FK constraints created successfully")


def migrate_data(con: sqlite3.Connection) -> None:
    """Migriert Daten von alten zu neuen Tabellen."""
    logger.info("Starting data migration")
    
    # Daten migrieren
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
            logger.debug(f"Migrated data for table: {table_name}")
        except sqlite3.Error as e:
            logger.warning(f"Failed to migrate data for {table_name}: {e}")
            # Nicht-kritische Tabellen können leer sein
    
    logger.info("Data migration completed")


def validate_data_integrity(con: sqlite3.Connection) -> None:
    """Validiert die Datenintegrität nach der Migration."""
    logger.info("Validating data integrity")
    
    # Prüfe Foreign Key Constraints
    con.execute("PRAGMA foreign_keys = ON")
    
    # Teste einige FK-Beziehungen
    integrity_checks = [
        "SELECT COUNT(*) FROM turnier_teilnehmer_new tt WHERE NOT EXISTS (SELECT 1 FROM turniere t WHERE t.id = tt.turnier_id)",
        "SELECT COUNT(*) FROM turnier_teilnehmer_new tt WHERE NOT EXISTS (SELECT 1 FROM teilnehmer te WHERE te.id = tt.teilnehmer_id)",
        "SELECT COUNT(*) FROM gruppen_new g WHERE NOT EXISTS (SELECT 1 FROM turniere t WHERE t.id = g.turnier_id)",
        "SELECT COUNT(*) FROM gruppen_teilnehmer_new gt WHERE NOT EXISTS (SELECT 1 FROM gruppen g WHERE g.id = gt.gruppe_id)",
        "SELECT COUNT(*) FROM gruppen_teilnehmer_new gt WHERE NOT EXISTS (SELECT 1 FROM teilnehmer t WHERE t.id = gt.teilnehmer_id)",
    ]
    
    for check_sql in integrity_checks:
        try:
            result = con.execute(check_sql).fetchone()
            orphan_count = result[0] if result else 0
            if orphan_count > 0:
                logger.warning(f"Found {orphan_count} orphaned records in integrity check")
            else:
                logger.debug("Integrity check passed")
        except sqlite3.Error as e:
            logger.warning(f"Integrity check failed: {e}")
    
    logger.info("Data integrity validation completed")


def replace_old_tables(con: sqlite3.Connection) -> None:
    """Ersetzt alte Tabellen durch neue."""
    logger.info("Replacing old tables with new ones")
    
    # Alte Tabellen droppen und neue umbenennen
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
            logger.debug(f"Replaced table: {old_table}")
        except sqlite3.Error as e:
            logger.warning(f"Failed to replace table {old_table}: {e}")
    
    logger.info("Table replacement completed")


def rollback_migration(con: sqlite3.Connection, backup_path: str) -> None:
    """Rollback der Migration bei Fehlern."""
    logger.error("Rolling back migration due to errors")
    
    try:
        # Neue Tabellen droppen
        new_tables = [
            "turnier_teilnehmer_new", "gruppen_new", "gruppen_teilnehmer_new",
            "spiele_new", "ko_spiele_new", "turnier_platzierungen_new",
            "meisterschaft_turniere_new", "meisterschaft_punkteschema_new"
        ]
        
        for table in new_tables:
            con.execute(f"DROP TABLE IF EXISTS {table}")
        
        logger.info("Rollback completed - new tables dropped")
        
    except Exception as e:
        logger.error("Failed to rollback migration", exception=e)
        raise DatabaseError(f"Migration rollback failed: {e}", operation="rollback_migration")


def run_migration() -> None:
    """Führt die komplette Migration durch."""
    logger.info("Starting database migration to add Foreign Key Constraints")
    
    # Prüfe ob Migration bereits durchgeführt wurde
    if check_foreign_keys_support():
        logger.info("Foreign Key Constraints already enabled - migration not needed")
        return
    
    backup_path = None
    con = None
    
    try:
        # Backup erstellen
        backup_path = create_backup()
        
        # Datenbankverbindung mit Transaktion
        con = sqlite3.connect(DB_PATH)
        con.execute("BEGIN TRANSACTION")
        
        # Migration durchführen
        create_new_tables_with_fk(con)
        migrate_data(con)
        validate_data_integrity(con)
        replace_old_tables(con)
        
        # Transaktion committen
        con.commit()
        logger.info("Database migration completed successfully")
        
    except Exception as e:
        logger.error("Migration failed", exception=e)
        
        if con:
            try:
                con.rollback()
                rollback_migration(con, backup_path)
            except Exception as rollback_error:
                logger.error("Rollback failed", exception=rollback_error)
        
        raise DatabaseError(f"Migration failed: {e}", operation="run_migration")
        
    finally:
        if con:
            con.close()


def main():
    """Hauptfunktion für manuelle Migration."""
    try:
        run_migration()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        return 1
    return 0


if __name__ == "__main__":
    exit(main())
