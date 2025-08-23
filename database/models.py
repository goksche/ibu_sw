import sqlite3
import os
from typing import List, Tuple, Dict

# Pfad zur Datenbank: <projektwurzel>/data/ibu.sqlite
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "ibu.sqlite")


def _connect():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    return conn


def init_db():
    """Erstellt alle nötigen Tabellen, falls nicht vorhanden."""
    with _connect() as conn:
        cur = conn.cursor()

        # Turniere
        cur.execute("""
            CREATE TABLE IF NOT EXISTS turniere (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                datum TEXT NOT NULL,
                modus TEXT NOT NULL,
                meisterschaft TEXT NOT NULL
            )
        """)

        # Teilnehmer
        cur.execute("""
            CREATE TABLE IF NOT EXISTS teilnehmer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                spitzname TEXT
            )
        """)

        # Meisterschaften
        cur.execute("""
            CREATE TABLE IF NOT EXISTS meisterschaften (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                saison TEXT NOT NULL,
                punkteschema TEXT NOT NULL DEFAULT ''
            )
        """)

        # Zuordnung: Teilnehmer ⟷ Turnier
        cur.execute("""
            CREATE TABLE IF NOT EXISTS turnier_teilnehmer (
                turnier_id INTEGER NOT NULL,
                teilnehmer_id INTEGER NOT NULL,
                PRIMARY KEY (turnier_id, teilnehmer_id)
            )
        """)

        # Gruppen je Turnier
        cur.execute("""
            CREATE TABLE IF NOT EXISTS gruppen (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                turnier_id INTEGER NOT NULL,
                name TEXT NOT NULL
            )
        """)

        # Teilnehmer in Gruppen
        cur.execute("""
            CREATE TABLE IF NOT EXISTS gruppen_teilnehmer (
                gruppe_id INTEGER NOT NULL,
                teilnehmer_id INTEGER NOT NULL,
                PRIMARY KEY (gruppe_id, teilnehmer_id)
            )
        """)

        conn.commit()


# ---------------------------
# Turniere
# ---------------------------
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
        # harte Löschung inkl. Zuordnungen/Gruppierungen
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id=?)", (tid,))
        cur.execute("DELETE FROM gruppen WHERE turnier_id = ?", (tid,))
        cur.execute("DELETE FROM turnier_teilnehmer WHERE turnier_id = ?", (tid,))
        cur.execute("DELETE FROM turniere WHERE id = ?", (tid,))
        conn.commit()


# ---------------------------
# Teilnehmer
# ---------------------------
def insert_teilnehmer(name: str, spitzname: str | None) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO teilnehmer (name, spitzname) VALUES (?, ?)",
            (name, spitzname or None),
        )
        conn.commit()


def fetch_teilnehmer():
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, COALESCE(spitzname, '')
            FROM teilnehmer
            ORDER BY name COLLATE NOCASE ASC, id DESC
        """)
        return cur.fetchall()


def update_teilnehmer(tid: int, name: str, spitzname: str | None) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE teilnehmer
            SET name = ?, spitzname = ?
            WHERE id = ?
        """, (name, spitzname or None, tid))
        conn.commit()


def delete_teilnehmer(tid: int) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        # Entferne ggf. aus Gruppierungen / Turnierlisten
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE teilnehmer_id = ?", (tid,))
        cur.execute("DELETE FROM turnier_teilnehmer WHERE teilnehmer_id = ?", (tid,))
        cur.execute("DELETE FROM teilnehmer WHERE id = ?", (tid,))
        conn.commit()


# ---------------------------
# Meisterschaften
# ---------------------------
def insert_meisterschaft(name: str, saison: str, punkteschema: str) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO meisterschaften (name, saison, punkteschema) VALUES (?, ?, ?)",
            (name, saison, punkteschema),
        )
        conn.commit()


def fetch_meisterschaften():
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, saison, punkteschema
            FROM meisterschaften
            ORDER BY saison DESC, name COLLATE NOCASE ASC, id DESC
        """)
        return cur.fetchall()


def update_meisterschaft(mid: int, name: str, saison: str, punkteschema: str) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE meisterschaften
            SET name = ?, saison = ?, punkteschema = ?
            WHERE id = ?
        """, (name, saison, punkteschema, mid))
        conn.commit()


def delete_meisterschaft(mid: int) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM meisterschaften WHERE id = ?", (mid,))
        conn.commit()


# ---------------------------
# Turnier-Teilnehmer-Zuordnung
# ---------------------------
def fetch_turnier_teilnehmer(turnier_id: int):
    """Liefert [(id, name, spitzname)] der dem Turnier zugewiesenen Teilnehmer."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT t.id, t.name, COALESCE(t.spitzname, '')
            FROM teilnehmer t
            JOIN turnier_teilnehmer tt ON tt.teilnehmer_id = t.id
            WHERE tt.turnier_id = ?
            ORDER BY t.name COLLATE NOCASE ASC, t.id DESC
        """, (turnier_id,))
        return cur.fetchall()


def set_turnier_teilnehmer(turnier_id: int, teilnehmer_ids: List[int]) -> None:
    """Ersetzt die gesamte Teilnehmerliste eines Turniers."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM turnier_teilnehmer WHERE turnier_id = ?", (turnier_id,))
        cur.executemany(
            "INSERT OR IGNORE INTO turnier_teilnehmer (turnier_id, teilnehmer_id) VALUES (?, ?)",
            [(turnier_id, tid) for tid in teilnehmer_ids]
        )
        conn.commit()


# ---------------------------
# Gruppierung
# ---------------------------
def has_grouping(turnier_id: int) -> bool:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM gruppen WHERE turnier_id = ? LIMIT 1", (turnier_id,))
        return cur.fetchone() is not None


def fetch_grouping(turnier_id: int) -> Dict[str, List[Tuple[int, str, str]]]:
    """
    Liefert {'A': [(id, name, spitzname), ...], 'B': [...], ...}
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM gruppen WHERE turnier_id = ? ORDER BY name ASC", (turnier_id,))
        groups = cur.fetchall()  # (gruppe_id, name)
        result: Dict[str, List[Tuple[int, str, str]]] = {}
        for gid, gname in groups:
            cur.execute("""
                SELECT t.id, t.name, COALESCE(t.spitzname, '')
                FROM gruppen_teilnehmer gt
                JOIN teilnehmer t ON t.id = gt.teilnehmer_id
                WHERE gt.gruppe_id = ?
                ORDER BY t.name COLLATE NOCASE ASC, t.id DESC
            """, (gid,))
            result[gname] = cur.fetchall()
        return result


def clear_grouping(turnier_id: int) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id = ?)", (turnier_id,))
        cur.execute("DELETE FROM gruppen WHERE turnier_id = ?", (turnier_id,))
        conn.commit()


def save_grouping(turnier_id: int, groups: List[Tuple[str, List[int]]]) -> None:
    """
    Speichert Gruppierung neu.
    groups = [('A', [teilnehmer_ids...]), ('B', [...]), ...]
    """
    with _connect() as conn:
        cur = conn.cursor()
        # alte Gruppierung entfernen
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id = ?)", (turnier_id,))
        cur.execute("DELETE FROM gruppen WHERE turnier_id = ?", (turnier_id,))
        # neu anlegen
        for gname, members in groups:
            cur.execute("INSERT INTO gruppen (turnier_id, name) VALUES (?, ?)", (turnier_id, gname))
            gid = cur.lastrowid
            cur.executemany(
                "INSERT OR IGNORE INTO gruppen_teilnehmer (gruppe_id, teilnehmer_id) VALUES (?, ?)",
                [(gid, mid) for mid in members]
            )
        conn.commit()
