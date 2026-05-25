# utils/backup.py
# v0.9.2 – Backups/Restore für ./data/ibu.sqlite (nur Stdlib)

from __future__ import annotations
import os
import shutil
import sqlite3
from datetime import datetime
from typing import List, Tuple

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "ibu.sqlite")
BACKUP_DIR = os.path.join(PROJECT_ROOT, "backups")

REQUIRED_TABLES = (
    "turniere",
    "teilnehmer",
    "turnier_teilnehmer",
)

def _ensure_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

def _ts() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M")

def validate_sqlite_file(path: str) -> Tuple[bool, str]:
    """Prüft Minimalstruktur: Datei existiert, öffnet sich, Kern-Tabellen vorhanden."""
    if not os.path.exists(path):
        return False, "Datei existiert nicht."
    try:
        con = sqlite3.connect(path)
        try:
            cur = con.execute("SELECT name FROM sqlite_master WHERE type='table'")
            names = {r[0] for r in cur.fetchall()}
        finally:
            con.close()
    except Exception as e:
        return False, f"SQLite-Fehler: {e}"
    for t in REQUIRED_TABLES:
        if t not in names:
            return False, f"Tabelle '{t}' fehlt."
    return True, "OK"

def create_backup() -> str:
    """Kopiert die aktuelle DB nach ./backups/ibu__YYYYMMDD-HHMM.sqlite und gibt den Pfad zurück."""
    _ensure_dirs()
    if not os.path.exists(DB_PATH):
        # leere DB ist auch ok – wird einfach kopiert (oder Fehler werfen?)
        open(DB_PATH, "a").close()
    dst = os.path.join(BACKUP_DIR, f"ibu__{_ts()}.sqlite")
    shutil.copy2(DB_PATH, dst)
    return dst

def list_backups() -> List[Tuple[str, float]]:
    """Liste (pfad, mtime) absteigend nach Datum."""
    _ensure_dirs()
    items: List[Tuple[str, float]] = []
    for fn in os.listdir(BACKUP_DIR):
        if fn.lower().endswith(".sqlite"):
            p = os.path.join(BACKUP_DIR, fn)
            try:
                items.append((p, os.path.getmtime(p)))
            except Exception:
                pass
    items.sort(key=lambda t: t[1], reverse=True)
    return items

def restore_backup(backup_path: str) -> str:
    """Validiert Backup und stellt es als neue ./data/ibu.sqlite wieder her.
       Legt zuvor eine Sicherheitskopie der aktuellen DB ab.
       Gibt Pfad der Sicherheitskopie zurück.
    """
    _ensure_dirs()
    ok, msg = validate_sqlite_file(backup_path)
    if not ok:
        raise RuntimeError(f"Ungültiges Backup: {msg}")

    # Sicherheitskopie erstellen
    safety = os.path.join(BACKUP_DIR, f"ibu__pre-restore__{_ts()}.sqlite")
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, safety)
    else:
        # leere Datei, damit klar ist, dass vorher nichts da war
        open(safety, "a").close()

    # Wiederherstellung
    shutil.copy2(backup_path, DB_PATH)
    return safety
