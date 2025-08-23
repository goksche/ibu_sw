import sqlite3
import os

# Pfad zur Datenbank: <projektwurzel>/data/ibu.sqlite
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "ibu.sqlite")


def _connect():
    os.makedirs(DB_DIR, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db():
    """Erstellt alle nötigen Tabellen, falls nicht vorhanden."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS turniere (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                datum TEXT NOT NULL,
                modus TEXT NOT NULL,
                meisterschaft TEXT NOT NULL
            )
        """)
        conn.commit()


def insert_turnier(name: str, datum: str, modus: str, meisterschaft: str) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO turniere (name, datum, modus, meisterschaft) VALUES (?, ?, ?, ?)",
            (name, datum, modus, meisterschaft),
        )
        conn.commit()


def fetch_turniere():
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, datum, modus, meisterschaft
            FROM turniere
            ORDER BY datum DESC, id DESC
        """)
        return cur.fetchall()


def update_turnier(tid: int, name: str, datum: str, modus: str, meisterschaft: str) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE turniere
            SET name = ?, datum = ?, modus = ?, meisterschaft = ?
            WHERE id = ?
        """, (name, datum, modus, meisterschaft, tid))
        conn.commit()


def delete_turnier(tid: int) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM turniere WHERE id = ?", (tid,))
        conn.commit()
