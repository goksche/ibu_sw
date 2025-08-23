import sqlite3
import os
import random
from typing import List, Tuple, Dict, Optional

# Pfad zur Datenbank: <projektwurzel>/data/ibu.sqlite
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "ibu.sqlite")


# ---------------------------------------------------------------------
# Basis
# ---------------------------------------------------------------------
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

        # Spiele (Gruppenphase)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS spiele (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                turnier_id INTEGER NOT NULL,
                gruppe_id INTEGER NOT NULL,
                runde INTEGER NOT NULL,
                match_no INTEGER NOT NULL,
                p1_id INTEGER NOT NULL,
                p2_id INTEGER NOT NULL,
                s1 INTEGER,
                s2 INTEGER
            )
        """)

        conn.commit()


# ---------------------------------------------------------------------
# Turniere
# ---------------------------------------------------------------------
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
        # harte Löschung inkl. Zuordnungen/Gruppierungen/Spiele
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id=?)", (tid,))
        cur.execute("DELETE FROM spiele WHERE turnier_id = ?", (tid,))
        cur.execute("DELETE FROM gruppen WHERE turnier_id = ?", (tid,))
        cur.execute("DELETE FROM turnier_teilnehmer WHERE turnier_id = ?", (tid,))
        cur.execute("DELETE FROM turniere WHERE id = ?", (tid,))
        conn.commit()


# ---------------------------------------------------------------------
# Teilnehmer
# ---------------------------------------------------------------------
def insert_teilnehmer(name: str, spitzname: Optional[str]) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO teilnehmer (name, spitzname) VALUES (?, ?)", (name, spitzname))
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


def update_teilnehmer(tid: int, name: str, spitzname: Optional[str]) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE teilnehmer SET name = ?, spitzname = ? WHERE id = ?", (name, spitzname, tid))
        conn.commit()


def delete_teilnehmer(tid: int) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE teilnehmer_id = ?", (tid,))
        cur.execute("DELETE FROM spiele WHERE p1_id = ? OR p2_id = ?", (tid, tid))
        cur.execute("DELETE FROM turnier_teilnehmer WHERE teilnehmer_id = ?", (tid,))
        cur.execute("DELETE FROM teilnehmer WHERE id = ?", (tid,))
        conn.commit()


# ---------------------------------------------------------------------
# Meisterschaften
# ---------------------------------------------------------------------
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


# ---------------------------------------------------------------------
# Turnier-Teilnehmer-Zuordnung
# ---------------------------------------------------------------------
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


# ---------------------------------------------------------------------
# Gruppen / Gruppierung
# ---------------------------------------------------------------------
def has_grouping(turnier_id: int) -> bool:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM gruppen WHERE turnier_id = ? LIMIT 1", (turnier_id,))
        return cur.fetchone() is not None


def fetch_grouping(turnier_id: int) -> Dict[str, List[Tuple[int, str, str]]]:
    """Liefert {'A': [(id, name, spitzname), ...], ...}"""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM gruppen WHERE turnier_id = ? ORDER BY name ASC", (turnier_id,))
        groups = cur.fetchall()
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
    """groups = [('A', [ids...]), ...]"""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id = ?)", (turnier_id,))
        cur.execute("DELETE FROM gruppen WHERE turnier_id = ?", (turnier_id,))
        for gname, members in groups:
            cur.execute("INSERT INTO gruppen (turnier_id, name) VALUES (?, ?)", (turnier_id, gname))
            gid = cur.lastrowid
            cur.executemany(
                "INSERT OR IGNORE INTO gruppen_teilnehmer (gruppe_id, teilnehmer_id) VALUES (?, ?)",
                [(gid, mid) for mid in members]
            )
        conn.commit()


def fetch_groups(turnier_id: int) -> List[Tuple[int, str]]:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM gruppen WHERE turnier_id = ? ORDER BY name ASC", (turnier_id,))
        return cur.fetchall()


def fetch_group_members(gruppe_id: int) -> List[int]:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT teilnehmer_id FROM gruppen_teilnehmer WHERE gruppe_id = ? ORDER BY teilnehmer_id ASC", (gruppe_id,))
        return [r[0] for r in cur.fetchall()]


# ---------------------------------------------------------------------
# Spiele (Gruppenphase)
# ---------------------------------------------------------------------
def has_group_matches(turnier_id: int) -> bool:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM spiele WHERE turnier_id = ? LIMIT 1", (turnier_id,))
        return cur.fetchone() is not None


def has_recorded_group_results(turnier_id: int) -> bool:
    """True, wenn mind. ein Gruppenspiel bereits Ergebniswerte hat (s1 & s2 nicht NULL)."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT 1
            FROM spiele
            WHERE turnier_id = ? AND s1 IS NOT NULL AND s2 IS NOT NULL
            LIMIT 1
        """, (turnier_id,))
        return cur.fetchone() is not None


def clear_group_matches(turnier_id: int) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM spiele WHERE turnier_id = ?", (turnier_id,))
        conn.commit()


def _round_robin_pairs(ids: List[int]) -> List[List[Tuple[int, int]]]:
    """Circle-Methode. Liefert Liste von Runden, jede Runde: Liste von (a,b)."""
    players = ids[:]
    if len(players) < 2:
        return []
    bye = None
    if len(players) % 2 == 1:
        players.append(bye)
    n = len(players)
    rounds = n - 1
    out: List[List[Tuple[int, int]]] = []
    for r in range(rounds):
        pairs = []
        for i in range(n // 2):
            a = players[i]
            b = players[-1 - i]
            if a is not None and b is not None:
                pairs.append((a, b))
        out.append(pairs)
        # Rotation
        players = [players[0]] + [players[-1]] + players[1:-1]
    return out


def generate_group_round_robin(turnier_id: int) -> None:
    """Erzeugt für alle Gruppen Round-Robin-Spiele (überschreibt bestehende Spiele)."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM spiele WHERE turnier_id = ?", (turnier_id,))
        # Gruppen holen
        cur.execute("SELECT id, name FROM gruppen WHERE turnier_id = ? ORDER BY name ASC", (turnier_id,))
        groups = cur.fetchall()
        for gid, gname in groups:
            members = fetch_group_members(gid)
            if len(members) < 2:
                continue
            rr = _round_robin_pairs(members)
            for runde, matches in enumerate(rr, start=1):
                for idx, (a, b) in enumerate(matches, start=1):
                    cur.execute("""
                        INSERT INTO spiele (turnier_id, gruppe_id, runde, match_no, p1_id, p2_id, s1, s2)
                        VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
                    """, (turnier_id, gid, runde, idx, a, b))
        conn.commit()


def fetch_group_matches(turnier_id: int, gruppe_id: int):
    """Liefert [(id, runde, match_no, p1_name, p2_name, s1, s2)]"""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT s.id, s.runde, s.match_no,
                   p1.name || COALESCE(' ('||p1.spitzname||')',''),
                   p2.name || COALESCE(' ('||p2.spitzname||')',''),
                   s.s1, s.s2
            FROM spiele s
            JOIN teilnehmer p1 ON p1.id = s.p1_id
            JOIN teilnehmer p2 ON p2.id = s.p2_id
            WHERE s.turnier_id = ? AND s.gruppe_id = ?
            ORDER BY s.runde ASC, s.match_no ASC, s.id ASC
        """, (turnier_id, gruppe_id))
        return cur.fetchall()


def save_match_result(match_id: int, s1: Optional[int], s2: Optional[int]) -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE spiele SET s1 = ?, s2 = ? WHERE id = ?", (s1, s2, match_id))
        conn.commit()


def compute_group_table(turnier_id: int, gruppe_id: int):
    """
    Liefert Liste von Dicts mit Ranglistendaten.
    Punkte: Sieg = 3, Remis = 1, Niederlage = 0
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT t.id, t.name, COALESCE(t.spitzname,'')
            FROM gruppen_teilnehmer gt
            JOIN teilnehmer t ON t.id = gt.teilnehmer_id
            WHERE gt.gruppe_id = ?
        """, (gruppe_id,))
        members = cur.fetchall()  # [(id, name, nick)]
        stats: Dict[int, Dict[str, int | str]] = {}
        for mid, name, nick in members:
            label = name + (f" ({nick})" if nick else "")
            stats[mid] = {'spieler': label, 'spiele': 0, 'siege': 0, 'niederlagen': 0, 'remis': 0, 'lf': 0, 'la': 0, 'diff': 0, 'pkt': 0}

        cur.execute("""
            SELECT p1_id, p2_id, s1, s2
            FROM spiele
            WHERE turnier_id = ? AND gruppe_id = ? AND s1 IS NOT NULL AND s2 IS NOT NULL
        """, (turnier_id, gruppe_id))
        for p1, p2, s1, s2 in cur.fetchall():
            if p1 not in stats or p2 not in stats:
                continue
            stats[p1]['spiele'] += 1
            stats[p2]['spiele'] += 1
            stats[p1]['lf'] += s1
            stats[p1]['la'] += s2
            stats[p2]['lf'] += s2
            stats[p2]['la'] += s1
            if s1 > s2:
                stats[p1]['siege'] += 1
                stats[p2]['niederlagen'] += 1
                stats[p1]['pkt'] += 3
            elif s2 > s1:
                stats[p2]['siege'] += 1
                stats[p1]['niederlagen'] += 1
                stats[p2]['pkt'] += 3
            else:
                stats[p1]['remis'] += 1
                stats[p2]['remis'] += 1
                stats[p1]['pkt'] += 1
                stats[p2]['pkt'] += 1

        for mid in stats:
            stats[mid]['diff'] = stats[mid]['lf'] - stats[mid]['la']

        table = list(stats.values())
        table.sort(key=lambda r: (-r['pkt'], -r['diff'], -r['lf'], r['spieler'].lower()))
        return table
