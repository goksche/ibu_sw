# database/scolia_support.py (v0.9.6)
from __future__ import annotations
import sqlite3
from typing import List, Tuple, Optional

# Wir nutzen die bestehenden DB-Helfer aus models.py
from .models import _connect, _col_exists


def ensure_scolia_schema() -> None:
    """Fügt die Spalte 'scolia_id' zu 'teilnehmer' hinzu (idempotent)."""
    with _connect() as con:
        if not _col_exists(con, "teilnehmer", "scolia_id"):
            con.execute("ALTER TABLE teilnehmer ADD COLUMN scolia_id TEXT")
            con.commit()


def fetch_teilnehmer_full() -> List[Tuple[int, str, str, str]]:
    """Alle Teilnehmer inkl. Scolia-ID (leere Strings wenn NULL)."""
    ensure_scolia_schema()
    with _connect() as con:
        rows = con.execute(
            "SELECT id, name, COALESCE(spitzname,''), COALESCE(scolia_id,'') "
            "FROM teilnehmer ORDER BY name ASC"
        ).fetchall()
        return [(int(r[0]), str(r[1]), str(r[2]), str(r[3])) for r in rows]


def set_scolia_id(teilnehmer_id: int, scolia_id: Optional[str]) -> None:
    """Setzt/aktualisiert die Scolia-ID für einen Teilnehmer."""
    ensure_scolia_schema()
    with _connect() as con:
        con.execute(
            "UPDATE teilnehmer SET scolia_id=? WHERE id=?",
            (None if (scolia_id or "").strip() == "" else scolia_id.strip(), int(teilnehmer_id))
        )
        con.commit()
