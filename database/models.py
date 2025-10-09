# database/models.py
from __future__ import annotations
import os, math, sqlite3, random
from typing import Any, Dict, List, Optional, Sequence, Tuple

# ---------------------------------------------------------------------------
# Pfade / Datenbank
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "ibu.sqlite")

BRONZE_ROUND = 99  # internes Kennzeichen für „Kleines Finale“


# ---------------------------------------------------------------------------
# DB / Helpers
# ---------------------------------------------------------------------------
def _connect() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _to_int_bool(v: Any) -> int:
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return 1 if int(v) != 0 else 0
    s = str(v).strip().lower()
    if s in ("1", "true", "wahr", "ja", "yes", "y", "x"):
        return 1
    if s in ("0", "false", "falsch", "nein", "no", "n", ""):
        return 0
    try:
        return 1 if int(s) != 0 else 0
    except Exception:
        return 0


def _col_exists(con: sqlite3.Connection, table: str, col: str) -> bool:
    try:
        rows = con.execute(f"PRAGMA table_info({table})").fetchall()
        return any(str(r["name"]).lower() == col.lower() for r in rows)
    except Exception:
        return False


def _init_db():
    """
    Tabellen anlegen + Migration:
    - sorgt dafür, dass 'spiele.runde' existiert
    - übernimmt alte Werte aus 'spieltag' nach 'runde'
    """
    with _connect() as con:
        c = con.cursor()

        # Kern-Tabellen
        c.execute("""
        CREATE TABLE IF NOT EXISTS turniere(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            datum TEXT,
            modus TEXT,
            meisterschaft INTEGER DEFAULT 0
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS teilnehmer(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            spitzname TEXT
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS turnier_teilnehmer(
            turnier_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            UNIQUE(turnier_id, teilnehmer_id)
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS gruppen(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnier_id INTEGER NOT NULL,
            name TEXT NOT NULL
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS gruppen_teilnehmer(
            gruppe_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            UNIQUE(gruppe_id, teilnehmer_id)
        )""")

        # Spiele – CREATE deckt beide Spalten ab, ändert aber bestehende Tabellen nicht
        c.execute("""
        CREATE TABLE IF NOT EXISTS spiele(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnier_id INTEGER NOT NULL,
            gruppe_id INTEGER NOT NULL,
            spieltag INTEGER,            -- ältere DBs
            runde INTEGER,               -- neue Spalte (Migration s.u.)
            match_no INTEGER,
            p1_id INTEGER,
            p2_id INTEGER,
            s1 INTEGER,
            s2 INTEGER
        )""")

        c.execute("""
        CREATE TABLE IF NOT EXISTS ko_spiele(
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
        CREATE TABLE IF NOT EXISTS turnier_platzierungen(
            turnier_id INTEGER NOT NULL,
            teilnehmer_id INTEGER NOT NULL,
            platz INTEGER NOT NULL,
            UNIQUE(turnier_id, teilnehmer_id)
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS meisterschaften(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            saison TEXT,
            punkteschema TEXT
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS meisterschaft_turniere(
            meisterschaft_id INTEGER NOT NULL,
            turnier_id INTEGER NOT NULL,
            UNIQUE(meisterschaft_id, turnier_id)
        )""")
        c.execute("""
        CREATE TABLE IF NOT EXISTS meisterschaft_punkteschema(
            meisterschaft_id INTEGER NOT NULL,
            platz INTEGER NOT NULL,
            punkte INTEGER NOT NULL,
            UNIQUE(meisterschaft_id, platz)
        )""")
        con.commit()

        # --- Migration: 'runde' hinzufügen und aus 'spieltag' übernehmen -----
        if not _col_exists(con, "spiele", "runde"):
            c.execute("ALTER TABLE spiele ADD COLUMN runde INTEGER")
            try:
                c.execute("UPDATE spiele SET runde = spieltag WHERE runde IS NULL")
            except Exception:
                pass
            con.commit()


def init_db():
    _init_db()


_init_db()


def _display_name_by_id(con: sqlite3.Connection, pid: Optional[int]) -> str:
    if pid is None:
        return ""
    r = con.execute(
        "SELECT COALESCE(NULLIF(TRIM(spitzname),''), name) AS n FROM teilnehmer WHERE id=?",
        (pid,),
    ).fetchone()
    return "" if r is None else (r["n"] or "")


def _log2_int(x: int) -> int:
    return int(round(math.log2(x))) if x > 0 else 0


# ---------------------------------------------------------------------------
# Turniere CRUD
# ---------------------------------------------------------------------------
def insert_turnier(name: str, datum: str, modus: str, meisterschaft: int = 0) -> int:
    with _connect() as con:
        cur = con.execute(
            "INSERT INTO turniere(name,datum,modus,meisterschaft) VALUES(?,?,?,?)",
            (name, datum, modus, _to_int_bool(meisterschaft)),
        )
        con.commit()
        return int(cur.lastrowid)


def fetch_turniere() -> List[Tuple[int, str, str, str, int]]:
    with _connect() as con:
        rows = con.execute(
            "SELECT id,name,COALESCE(datum,''),COALESCE(modus,''), meisterschaft "
            "FROM turniere ORDER BY COALESCE(datum,'' ) DESC, id DESC"
        ).fetchall()
        return [
            (int(r[0]), str(r[1]), str(r[2]), str(r[3]), _to_int_bool(r[4]))
            for r in rows
        ]


def update_turnier(turnier_id: int, name: str, datum: str, modus: str, meisterschaft: int = 0) -> None:
    with _connect() as con:
        con.execute(
            "UPDATE turniere SET name=?, datum=?, modus=?, meisterschaft=? WHERE id=?",
            (name, datum, modus, _to_int_bool(meisterschaft), int(turnier_id)),
        )
        con.commit()


def delete_turnier(turnier_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM turnier_teilnehmer WHERE turnier_id=?", (turnier_id,))
        con.execute(
            "DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id=?)",
            (turnier_id,),
        )
        con.execute("DELETE FROM spiele WHERE turnier_id=?", (turnier_id,))
        con.execute("DELETE FROM gruppen WHERE turnier_id=?", (turnier_id,))
        con.execute("DELETE FROM ko_spiele WHERE turnier_id=?", (turnier_id,))
        con.execute("DELETE FROM turnier_platzierungen WHERE turnier_id=?", (turnier_id,))
        con.execute("DELETE FROM meisterschaft_turniere WHERE turnier_id=?", (turnier_id,))
        con.execute("DELETE FROM turniere WHERE id=?", (turnier_id,))
        con.commit()


# ---------------------------------------------------------------------------
# Teilnehmer & Zuweisungen
# ---------------------------------------------------------------------------
def insert_teilnehmer(name: str, spitzname: str = "") -> int:
    with _connect() as con:
        cur = con.execute("INSERT INTO teilnehmer(name, spitzname) VALUES(?,?)", (name, spitzname))
        con.commit()
        return int(cur.lastrowid)


def fetch_teilnehmer() -> List[Tuple[int, str, str]]:
    with _connect() as con:
        rows = con.execute("SELECT id,name,COALESCE(spitzname,'') FROM teilnehmer ORDER BY name ASC").fetchall()
        return [(int(r[0]), str(r[1]), str(r[2])) for r in rows]


def update_teilnehmer(teilnehmer_id: int, name: str, spitzname: str = "") -> None:
    with _connect() as con:
        con.execute("UPDATE teilnehmer SET name=?, spitzname=? WHERE id=?", (name, spitzname, int(teilnehmer_id)))
        con.commit()


def delete_teilnehmer(teilnehmer_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM turnier_teilnehmer WHERE teilnehmer_id=?", (teilnehmer_id,))
        con.execute("DELETE FROM gruppen_teilnehmer WHERE teilnehmer_id=?", (teilnehmer_id,))
        con.execute("DELETE FROM turnier_platzierungen WHERE teilnehmer_id=?", (teilnehmer_id,))
        con.execute("DELETE FROM teilnehmer WHERE id=?", (teilnehmer_id,))
        con.commit()


def add_turnier_teilnehmer(turnier_id: int, teilnehmer_id: int) -> None:
    with _connect() as con:
        con.execute(
            "INSERT OR IGNORE INTO turnier_teilnehmer(turnier_id,teilnehmer_id) VALUES(?,?)",
            (turnier_id, teilnehmer_id),
        )
        con.commit()


def remove_turnier_teilnehmer(turnier_id: int, teilnehmer_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM turnier_teilnehmer WHERE turnier_id=? AND teilnehmer_id=?", (turnier_id, teilnehmer_id))
        con.commit()


def set_turnier_teilnehmer(turnier_id: int, teilnehmer_ids: Sequence[int]) -> None:
    with _connect() as con:
        con.execute("DELETE FROM turnier_teilnehmer WHERE turnier_id=?", (turnier_id,))
        con.executemany(
            "INSERT INTO turnier_teilnehmer(turnier_id,teilnehmer_id) VALUES(?,?)",
            [(turnier_id, int(pid)) for pid in teilnehmer_ids],
        )
        con.commit()


def fetch_turnier_teilnehmer(turnier_id: int) -> List[Tuple[int, str]]:
    with _connect() as con:
        rows = con.execute(
            """
            SELECT te.id, COALESCE(NULLIF(TRIM(te.spitzname),''), te.name) AS n
            FROM turnier_teilnehmer tt JOIN teilnehmer te ON te.id=tt.teilnehmer_id
            WHERE tt.turnier_id=? ORDER BY n ASC
            """,
            (turnier_id,),
        ).fetchall()
        return [(int(r[0]), str(r[1])) for r in rows]


# ---------------------------------------------------------------------------
# Gruppenphase
# ---------------------------------------------------------------------------
def has_grouping(turnier_id: int) -> bool:
    with _connect() as con:
        return con.execute("SELECT 1 FROM gruppen WHERE turnier_id=? LIMIT 1", (turnier_id,)).fetchone() is not None


def has_group_results(turnier_id: int) -> bool:
    with _connect() as con:
        return (
            con.execute(
                "SELECT 1 FROM spiele WHERE turnier_id=? AND s1 IS NOT NULL AND s2 IS NOT NULL LIMIT 1",
                (turnier_id,),
            ).fetchone()
            is not None
        )


def has_group_matches(turnier_id: int) -> bool:
    with _connect() as con:
        return con.execute("SELECT 1 FROM spiele WHERE turnier_id=? LIMIT 1", (turnier_id,)).fetchone() is not None


def has_recorded_group_results(turnier_id: int) -> bool:
    return has_group_results(turnier_id)


def clear_group_matches(turnier_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM spiele WHERE turnier_id=?", (turnier_id,))
        con.commit()


def clear_grouping(turnier_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM spiele WHERE turnier_id=?", (turnier_id,))
        con.execute(
            "DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id=?)",
            (turnier_id,),
        )
        con.execute("DELETE FROM gruppen WHERE turnier_id=?", (turnier_id,))
        con.commit()


def save_grouping(turnier_id: int, groups: Sequence[Tuple[str, Sequence[int]]]) -> None:
    """Gruppen + Zuordnungen sauber überschreiben."""
    with _connect() as con:
        con.execute("DELETE FROM spiele WHERE turnier_id=?", (turnier_id,))
        con.execute(
            "DELETE FROM gruppen_teilnehmer WHERE gruppe_id IN (SELECT id FROM gruppen WHERE turnier_id=?)",
            (turnier_id,),
        )
        con.execute("DELETE FROM gruppen WHERE turnier_id=?", (turnier_id,))
        for gname, ids in groups:
            gname = (gname or "").strip()
            cur = con.execute("INSERT INTO gruppen(turnier_id, name) VALUES(?,?)", (turnier_id, gname))
            gid = int(cur.lastrowid)
            if ids:
                con.executemany(
                    "INSERT INTO gruppen_teilnehmer(gruppe_id, teilnehmer_id) VALUES(?,?)",
                    [(gid, int(pid)) for pid in ids],
                )
        con.commit()


def fetch_groups(turnier_id: int) -> List[Tuple[int, str]]:
    with _connect() as con:
        rows = con.execute("SELECT id,name FROM gruppen WHERE turnier_id=? ORDER BY name ASC", (turnier_id,)).fetchall()
        return [(int(r[0]), str(r[1])) for r in rows]


def fetch_grouping(turnier_id: int) -> Dict[str, List[Tuple[int, str, str]]]:
    with _connect() as con:
        out: Dict[str, List[Tuple[int, str, str]]] = {}
        rows = con.execute(
            """
            SELECT g.name AS gname, te.id, te.name, COALESCE(te.spitzname,'') AS nick
            FROM gruppen g
            LEFT JOIN gruppen_teilnehmer gt ON gt.gruppe_id=g.id
            LEFT JOIN teilnehmer te ON te.id=gt.teilnehmer_id
            WHERE g.turnier_id=?
            ORDER BY g.name ASC, COALESCE(NULLIF(TRIM(te.spitzname),''), te.name) ASC
            """,
            (turnier_id,),
        ).fetchall()
        for r in rows:
            g = str(r["gname"])
            out.setdefault(g, [])
            if r["id"] is not None:
                out[g].append((int(r["id"]), str(r["name"]), str(r["nick"])))
        return out


def _group_member_ids(con: sqlite3.Connection, gruppe_id: int) -> List[int]:
    rows = con.execute(
        "SELECT teilnehmer_id FROM gruppen_teilnehmer WHERE gruppe_id=? ORDER BY teilnehmer_id", (gruppe_id,)
    ).fetchall()
    return [int(r[0]) for r in rows]


def _round_robin_rounds(ids: List[int]) -> List[List[Tuple[int, int]]]:
    ids = ids[:]
    if len(ids) % 2 == 1:
        ids.append(None)
    n = len(ids)
    half = n // 2
    rounds = []
    for _ in range(n - 1):
        left = ids[:half]
        right = list(reversed(ids[half:]))
        pairs = []
        for a, b in zip(left, right):
            if a is None or b is None:
                continue
            pairs.append((a, b))
        rounds.append(pairs)
        ids = [ids[0]] + [ids[-1]] + ids[1:-1]
    return rounds


def generate_group_round_robin(turnier_id: int) -> None:
    """Erzeugt Round-Robin je Gruppe. Schreibt sowohl 'runde' als auch 'spieltag'."""
    with _connect() as con:
        con.execute("DELETE FROM spiele WHERE turnier_id=?", (turnier_id,))
        groups = con.execute("SELECT id FROM gruppen WHERE turnier_id=? ORDER BY name ASC", (turnier_id,)).fetchall()
        for g in groups:
            gid = int(g[0])
            ids = _group_member_ids(con, gid)
            rr = _round_robin_rounds(ids)
            match_no = 1
            for r_idx, pairs in enumerate(rr, start=1):
                for p1, p2 in pairs:
                    con.execute(
                        "INSERT INTO spiele(turnier_id,gruppe_id,spieltag,runde,match_no,p1_id,p2_id,s1,s2) "
                        "VALUES(?,?,?,?,?,?,?,NULL,NULL)",
                        (turnier_id, gid, r_idx, r_idx, match_no, p1, p2),
                    )
                    match_no += 1
        con.commit()


def fetch_group_matches(
    turnier_id: int, gruppe_id: int
) -> List[Tuple[int, int, int, str, str, Optional[int], Optional[int]]]:
    """Runde wird kompatibel gelesen: COALESCE(runde, spieltag)."""
    with _connect() as con:
        rows = con.execute(
            """
            SELECT sp.id,
                   COALESCE(sp.runde, sp.spieltag) AS runde,
                   COALESCE(sp.match_no, 1)        AS match_no,
                   COALESCE(NULLIF(TRIM(t1.spitzname),''), t1.name) AS n1,
                   COALESCE(NULLIF(TRIM(t2.spitzname),''), t2.name) AS n2,
                   sp.s1, sp.s2
            FROM spiele sp
            LEFT JOIN teilnehmer t1 ON t1.id=sp.p1_id
            LEFT JOIN teilnehmer t2 ON t2.id=sp.p2_id
            WHERE sp.turnier_id=? AND sp.gruppe_id=?
            ORDER BY runde ASC, match_no ASC, sp.id ASC
            """,
            (turnier_id, gruppe_id),
        ).fetchall()
        return [(int(r[0]), int(r[1]), int(r[2]), str(r[3] or ""), str(r[4] or ""), r[5], r[6]) for r in rows]


def save_match_result(match_id: int, s1: Optional[int], s2: Optional[int]) -> None:
    with _connect() as con:
        con.execute("UPDATE spiele SET s1=?, s2=? WHERE id=?", (s1, s2, match_id))
        con.commit()


# --------- Ranglisten-Helpers (Head-to-Head / Mini-Tabelle) -----------------
def _head_to_head_winner(con: sqlite3.Connection, turnier_id: int, gruppe_id: int, a: int, b: int) -> Optional[int]:
    """Gibt die Spieler-ID des Gewinners im direkten Duell zurück (falls eindeutig), sonst None."""
    row = con.execute(
        """
        SELECT p1_id, p2_id, s1, s2
        FROM spiele
        WHERE turnier_id=? AND gruppe_id=? AND
              ((p1_id=? AND p2_id=?) OR (p1_id=? AND p2_id=?))
        """,
        (turnier_id, gruppe_id, a, b, b, a),
    ).fetchone()
    if not row or row["s1"] is None or row["s2"] is None or row["s1"] == row["s2"]:
        return None
    p1, p2, s1, s2 = int(row["p1_id"]), int(row["p2_id"]), int(row["s1"]), int(row["s2"])
    if s1 == s2:
        return None
    return p1 if s1 > s2 else p2


def _mini_table_diff(con: sqlite3.Connection, turnier_id: int, gruppe_id: int, ids: List[int]) -> Dict[int, int]:
    """
    Liefert für jeden Spieler die Differenz NUR aus Direktbegegnungen innerhalb 'ids'.
    """
    if not ids:
        return {}
    placeholders = ",".join(["?"] * len(ids))
    params = [turnier_id, gruppe_id] + ids + ids
    rows = con.execute(
        f"""
        SELECT p1_id, p2_id, s1, s2
        FROM spiele
        WHERE turnier_id=? AND gruppe_id=?
          AND p1_id IN ({placeholders})
          AND p2_id IN ({placeholders})
        """,
        params,
    ).fetchall()
    diff: Dict[int, int] = {pid: 0 for pid in ids}
    for r in rows:
        p1, p2, s1, s2 = int(r["p1_id"]), int(r["p2_id"]), r["s1"], r["s2"]
        if s1 is None or s2 is None or s1 == s2:
            continue
        diff[p1] += int(s1) - int(s2)
        diff[p2] += int(s2) - int(s1)
    return diff


def compute_group_table(turnier_id: int, gruppe_id: int) -> List[Dict[str, Any]]:
    """
    Rangliste NUR nach Differenz.
    Ties:
      - genau 2 Spieler -> Direktduell entscheidet
      - >=3 Spieler -> Mini-Tabelle (Differenz nur aus Direktbegegnungen)
      - bleibt absolute Gleichheit -> Gleichstand beibehalten
    """
    with _connect() as con:
        mem = con.execute(
            """
            SELECT te.id, COALESCE(NULLIF(TRIM(te.spitzname),''), te.name) AS n
            FROM gruppen_teilnehmer gt JOIN teilnehmer te ON te.id=gt.teilnehmer_id
            WHERE gt.gruppe_id=?
            """,
            (gruppe_id,),
        ).fetchall()
        ids = [int(r["id"]) for r in mem]
        name_of = {int(r["id"]): str(r["n"]) for r in mem}
        tab = {
            pid: {
                "teilnehmer_id": pid,
                "spieler": name_of.get(pid, f"#{pid}"),
                "spiele": 0,
                "siege": 0,
                "niederlagen": 0,
                "lf": 0,
                "la": 0,
                "diff": 0,   # einziges Primärkriterium
                "pkt": 0,    # nicht mehr relevant, bleibt für Abwärtskompatibilität erhalten
            }
            for pid in ids
        }
        matches = con.execute(
            "SELECT p1_id,p2_id,s1,s2 FROM spiele WHERE turnier_id=? AND gruppe_id=?",
            (turnier_id, gruppe_id),
        ).fetchall()
        for m in matches:
            p1 = m["p1_id"]; p2 = m["p2_id"]; s1 = m["s1"]; s2 = m["s2"]
            if p1 is None or p2 is None or s1 is None or s2 is None or s1 == s2:
                continue
            p1 = int(p1); p2 = int(p2); s1 = int(s1); s2 = int(s2)
            if p1 in tab and p2 in tab:
                tab[p1]["spiele"] += 1; tab[p2]["spiele"] += 1
                tab[p1]["lf"] += s1; tab[p1]["la"] += s2
                tab[p2]["lf"] += s2; tab[p2]["la"] += s1
                if s1 > s2:
                    tab[p1]["siege"] += 1; tab[p2]["niederlagen"] += 1
                    tab[p1]["pkt"] += 2
                else:
                    tab[p2]["siege"] += 1; tab[p1]["niederlagen"] += 1
                    tab[p2]["pkt"] += 2
        for pid in tab:
            tab[pid]["diff"] = int(tab[pid]["lf"]) - int(tab[pid]["la"])

        # 1) Diff-Buckets
        buckets: Dict[int, List[int]] = {}
        for pid, row in tab.items():
            buckets.setdefault(int(row["diff"]), []).append(pid)
        diffs_sorted = sorted(buckets.keys(), reverse=True)

        result_ids: List[int] = []
        for d in diffs_sorted:
            group_ids = buckets[d]
            if len(group_ids) == 1:
                result_ids.extend(group_ids)
                continue

            # 2) Ties
            if len(group_ids) == 2:
                a, b = group_ids[0], group_ids[1]
                winner = _head_to_head_winner(con, turnier_id, gruppe_id, a, b)
                if winner == a:
                    ordered = [a, b]
                elif winner == b:
                    ordered = [b, a]
                else:
                    ordered = sorted(group_ids, key=lambda pid: tab[pid]["spieler"].lower())
                result_ids.extend(ordered)
            else:
                mt_diff = _mini_table_diff(con, turnier_id, gruppe_id, group_ids)
                ordered = sorted(group_ids, key=lambda pid: (-mt_diff.get(pid, 0), tab[pid]["spieler"].lower()))
                result_ids.extend(ordered)

        rows = [tab[pid] for pid in result_ids]
        return rows


def compute_group_ranking_ids(turnier_id: int, gruppe_id: int) -> List[int]:
    return [int(r["teilnehmer_id"]) for r in compute_group_table(turnier_id, gruppe_id)]


# ---------------------------------------------------------------------------
# KO-Phase (+ Bronze)
# ---------------------------------------------------------------------------
def has_ko_matches(turnier_id: int) -> bool:
    with _connect() as con:
        return con.execute("SELECT 1 FROM ko_spiele WHERE turnier_id=? LIMIT 1", (turnier_id,)).fetchone() is not None


def has_recorded_ko_results(turnier_id: int) -> bool:
    with _connect() as con:
        return (
            con.execute(
                "SELECT 1 FROM ko_spiele WHERE turnier_id=? AND s1 IS NOT NULL AND s2 IS NOT NULL LIMIT 1",
                (turnier_id,),
            ).fetchone()
            is not None
        )


def clear_ko_matches(turnier_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM ko_spiele WHERE turnier_id=?", (turnier_id,))
        con.commit()


def fetch_ko_rounds(turnier_id: int) -> List[int]:
    with _connect() as con:
        rows = con.execute(
            "SELECT DISTINCT runde FROM ko_spiele WHERE turnier_id=? ORDER BY runde ASC", (turnier_id,)
        ).fetchall()
        out: List[int] = []
        for r in rows:
            try:
                out.append(int(r[0]))
            except Exception:
                pass
        return out


def fetch_ko_matches(turnier_id: int, runde: int) -> List[Tuple[int, int, str, str, Optional[int], Optional[int]]]:
    with _connect() as con:
        rows = con.execute(
            """
            SELECT k.id, k.match_no,
                   COALESCE(NULLIF(TRIM(t1.spitzname),''), t1.name) AS n1,
                   COALESCE(NULLIF(TRIM(t2.spitzname),''), t2.name) AS n2,
                   k.s1, k.s2
            FROM ko_spiele k
            LEFT JOIN teilnehmer t1 ON t1.id=k.p1_id
            LEFT JOIN teilnehmer t2 ON t2.id=k.p2_id
            WHERE k.turnier_id=? AND k.runde=?
            ORDER BY k.match_no ASC
            """,
            (turnier_id, runde),
        ).fetchall()
        return [(int(r[0]), int(r[1]), str(r[2] or ""), str(r[3] or ""), r[4], r[5]) for r in rows]


def _next_round_slot_for(match_no: int) -> Tuple[int, int]:
    target = (match_no + 1) // 2
    slot = 1 if (match_no % 2 == 1) else 2
    return target, slot


def generate_ko_bracket_total(turnier_id: int, total_qualifiers: int) -> None:
    if total_qualifiers <= 1 or (total_qualifiers & (total_qualifiers - 1)) != 0:
        raise ValueError("Gesamt-Qualifikanten muss 2er-Potenz sein (2,4,8,16,...).")

    groups = fetch_groups(turnier_id)
    if not groups:
        raise ValueError("Keine Gruppen vorhanden.")
    if len(groups) % 2 != 0:
        raise ValueError("Anzahl Gruppen muss gerade sein.")
    per_group = total_qualifiers // len(groups)
    if per_group == 0:
        raise ValueError("Qualifikantenzahl kleiner als Anzahl Gruppen.")
    for gid, _ in groups:
        if len(compute_group_ranking_ids(turnier_id, gid)) < per_group:
            raise ValueError("Nicht jede Gruppe hat genug Qualifikanten.")

    with _connect() as con:
        con.execute("DELETE FROM ko_spiele WHERE turnier_id=?", (turnier_id,))
        gnames = [g for (_gid, g) in groups]
        gid_by_name = {g: gid for (gid, g) in groups}
        pairs: List[Tuple[str, str]] = []
        for i in range(0, len(gnames), 2):
            if i + 1 < len(gnames):
                pairs.append((gnames[i], gnames[i + 1]))

        runde = 1
        match_no = 1
        for (ga, gb) in pairs:
            gida = gid_by_name[ga]; gidb = gid_by_name[gb]
            top_a = compute_group_ranking_ids(turnier_id, gida)[:per_group]
            top_b = compute_group_ranking_ids(turnier_id, gidb)[:per_group]
            for i in range(per_group):
                p1 = top_a[i]
                p2 = top_b[per_group - i - 1]
                con.execute(
                    "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?,?,?,?,?,NULL,NULL)",
                    (turnier_id, runde, match_no, p1, p2),
                )
                match_no += 1

        rounds_total = _log2_int(total_qualifiers)
        for r in range(2, rounds_total + 1):
            mcount = max(1, total_qualifiers // (2 ** r))
            for m in range(1, mcount + 1):
                con.execute(
                    "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?, ?, ?, NULL, NULL, NULL, NULL)",
                    (turnier_id, r, m),
                )
        con.commit()


def save_ko_result_and_propagate(
    match_id: int, s1: Optional[int], s2: Optional[int], turnier_id: Optional[int] = None
) -> None:
    with _connect() as con:
        if turnier_id is None:
            rtid = con.execute("SELECT turnier_id FROM ko_spiele WHERE id=?", (match_id,)).fetchone()
            if not rtid:
                return
            turnier_id = int(rtid["turnier_id"])
        row = con.execute("SELECT runde, match_no, p1_id, p2_id FROM ko_spiele WHERE id=?", (match_id,)).fetchone()
        if not row:
            return
        runde = int(row["runde"]) if row["runde"] is not None else None
        match_no = int(row["match_no"]) if row["match_no"] is not None else None
        con.execute("UPDATE ko_spiele SET s1=?, s2=? WHERE id=?", (s1, s2, match_id))
        con.commit()
        if runde is None or match_no is None or s1 is None or s2 is None or s1 == s2:
            return

        # Finale nicht propagieren, Bronze ebenfalls nicht
        r_max = con.execute(
            "SELECT MAX(runde) AS r FROM ko_spiele WHERE turnier_id=? AND runde<>?", (turnier_id, BRONZE_ROUND)
        ).fetchone()
        if r_max and runde == int(r_max["r"]):
            return

        p1_id = int(row["p1_id"]) if row["p1_id"] is not None else None
        p2_id = int(row["p2_id"]) if row["p2_id"] is not None else None
        if p1_id is None or p2_id is None:
            return
        winner_id = p1_id if int(s1) > int(s2) else p2_id
        target_m, slot = _next_round_slot_for(match_no)
        con.execute(
            f"UPDATE ko_spiele SET {'p1_id' if slot == 1 else 'p2_id'}=? WHERE turnier_id=? AND runde=? AND match_no=?",
            (winner_id, turnier_id, runde + 1, target_m),
        )
        con.commit()


def ensure_bronze_from_semis(turnier_id: int) -> bool:
    """Lege/aktualisiere Bronze (runde=99), sobald beide Halbfinals entschieden sind."""
    with _connect() as con:
        r = con.execute(
            "SELECT MAX(runde) AS r FROM ko_spiele WHERE turnier_id=? AND runde<>?", (turnier_id, BRONZE_ROUND)
        ).fetchone()
        if not r or r["r"] is None:
            return False
        final_r = int(r["r"])
        if final_r < 2:
            return False
        semi_r = final_r - 1
        rows = con.execute(
            "SELECT p1_id,p2_id,s1,s2 FROM ko_spiele WHERE turnier_id=? AND runde=? ORDER BY match_no",
            (turnier_id, semi_r),
        ).fetchall()
        if len(rows) < 2:
            return False
        losers: List[int] = []
        for m in rows[:2]:
            if m["s1"] is None or m["s2"] is None or m["s1"] == m["s2"]:
                return False
            p1 = int(m["p1_id"]); p2 = int(m["p2_id"])
            s1 = int(m["s1"]); s2 = int(m["s2"])
            loser = p2 if s1 > s2 else p1
            losers.append(loser)

        bron = con.execute(
            "SELECT id FROM ko_spiele WHERE turnier_id=? AND runde=? LIMIT 1", (turnier_id, BRONZE_ROUND)
        ).fetchone()
        if bron is None:
            con.execute(
                "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?,?,?,?,?,NULL,NULL)",
                (turnier_id, BRONZE_ROUND, 1, losers[0], losers[1]),
            )
        else:
            con.execute("UPDATE ko_spiele SET p1_id=?, p2_id=? WHERE id=?", (losers[0], losers[1], int(bron["id"])))
        con.commit()
        return True


def fetch_ko_champion(turnier_id: int) -> Optional[Tuple[int, str]]:
    """Sieger ausschließlich aus dem Finalspiel (Bronze ignoriert)."""
    with _connect() as con:
        r = con.execute(
            "SELECT MAX(runde) AS r FROM ko_spiele WHERE turnier_id=? AND runde<>?", (turnier_id, BRONZE_ROUND)
        ).fetchone()
        if not r or r["r"] is None:
            return None
        final_r = int(r["r"])
        m = con.execute(
            "SELECT p1_id,p2_id,s1,s2 FROM ko_spiele WHERE turnier_id=? AND runde=? LIMIT 1", (turnier_id, final_r)
        ).fetchone()
        if not m or m["s1"] is None or m["s2"] is None or m["s1"] == m["s2"]:
            return None
        p1 = int(m["p1_id"]); p2 = int(m["p2_id"])
        s1 = int(m["s1"]);  s2 = int(m["s2"])
        winner = p1 if s1 > s2 else p2
        return winner, _display_name_by_id(con, winner)


# --------------------- Einfache Auto-KO (bestehend) --------------------
def _all_group_matches_completed(turnier_id: int) -> Tuple[bool, str]:
    """Prüft, ob ALLE Gruppenspiele Ergebnisse haben."""
    with _connect() as con:
        row = con.execute(
            """
            SELECT COUNT(*) AS open_cnt
            FROM spiele
            WHERE turnier_id=? AND (s1 IS NULL OR s2 IS NULL)
            """,
            (turnier_id,),
        ).fetchone()
        open_cnt = int(row["open_cnt"]) if row and row["open_cnt"] is not None else 0
        if open_cnt > 0:
            return False, f"{open_cnt} Gruppenspiele ohne Ergebnis."
        return True, ""


def _insert_ko_match(con: sqlite3.Connection, tid: int, runde: int, match_no: int,
                     p1_id: Optional[int], p2_id: Optional[int]) -> None:
    con.execute(
        "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?,?,?,?,?,NULL,NULL)",
        (tid, runde, match_no, p1_id, p2_id),
    )


def generate_ko_from_groups(turnier_id: int) -> Tuple[bool, str]:
    """
    Einfache Auto-Erzeugung (2/4 Gruppen).
    """
    if has_ko_matches(turnier_id):
        return False, "KO existiert bereits."
    ok, reason = _all_group_matches_completed(turnier_id)
    if not ok:
        return False, f"Gruppenphase unvollständig: {reason}"
    groups = fetch_groups(turnier_id)
    if not groups:
        return False, "Keine Gruppen vorhanden."
    ordered = sorted(groups, key=lambda x: x[1])
    gcount = len(ordered)

    with _connect() as con:
        if gcount == 2:
            (ga, _), (gb, _) = ordered
            A = int(ga); B = int(gb)
            A1, A2 = compute_group_ranking_ids(turnier_id, A)[:2]
            B1, B2 = compute_group_ranking_ids(turnier_id, B)[:2]
            _insert_ko_match(con, turnier_id, 1, 1, A1, B2)
            _insert_ko_match(con, turnier_id, 1, 2, B1, A2)
            _insert_ko_match(con, turnier_id, 2, 1, None, None)
            con.commit()
            return True, "KO (Halbfinale+Finale) aus 2 Gruppen erzeugt."
        if gcount == 4:
            gids = [int(gid) for gid, _ in ordered]
            A, B, C, D = gids
            A1, A2 = compute_group_ranking_ids(turnier_id, A)[:2]
            B1, B2 = compute_group_ranking_ids(turnier_id, B)[:2]
            C1, C2 = compute_group_ranking_ids(turnier_id, C)[:2]
            D1, D2 = compute_group_ranking_ids(turnier_id, D)[:2]
            _insert_ko_match(con, turnier_id, 1, 1, A1, D2)
            _insert_ko_match(con, turnier_id, 1, 2, B1, C2)
            _insert_ko_match(con, turnier_id, 1, 3, C1, B2)
            _insert_ko_match(con, turnier_id, 1, 4, D1, A2)
            _insert_ko_match(con, turnier_id, 2, 1, None, None)
            _insert_ko_match(con, turnier_id, 2, 2, None, None)
            _insert_ko_match(con, turnier_id, 3, 1, None, None)
            con.commit()
            return True, "KO (Viertel->Halb->Finale) aus 4 Gruppen erzeugt."
        total_q = gcount * 2
        if total_q and (total_q & (total_q - 1)) == 0:
            generate_ko_bracket_total(turnier_id, total_q)
            return True, f"KO mit {total_q} Qualifikanten generisch erzeugt."
        return False, f"Nicht unterstützte Gruppenzahl ({gcount})."


# --------------------- Fortgeschrittene KO-Erzeugung (angepasst) -------------------------
def _auto_advance_byes(con: sqlite3.Connection, turnier_id: int) -> None:
    """Sofortiges Weiterstellen bei BYEs (wenn p1_id XOR p2_id gesetzt ist)."""
    rounds = con.execute(
        "SELECT DISTINCT runde FROM ko_spiele WHERE turnier_id=? AND runde<>? ORDER BY runde ASC",
        (turnier_id, BRONZE_ROUND),
    ).fetchall()
    for rr in [int(r[0]) for r in rounds]:
        matches = con.execute(
            "SELECT id,match_no,p1_id,p2_id FROM ko_spiele WHERE turnier_id=? AND runde=? ORDER BY match_no",
            (turnier_id, rr),
        ).fetchall()
        for m in matches:
            mid = int(m["id"]); p1 = m["p1_id"]; p2 = m["p2_id"]
            if (p1 is None) ^ (p2 is None):
                winner = p1 if p2 is None else p2
                target_m, slot = _next_round_slot_for(int(m["match_no"]))
                con.execute(
                    f"UPDATE ko_spiele SET {'p1_id' if slot == 1 else 'p2_id'}=? WHERE turnier_id=? AND runde=? AND match_no=?",
                    (winner, turnier_id, rr + 1, target_m),
                )
                con.execute("UPDATE ko_spiele SET s1=?, s2=? WHERE id=?", (1 if p1 else 0, 0 if p1 else 1, mid))
    con.commit()


def generate_ko_from_groups_advanced(
    turnier_id: int,
    qualifiers_per_group: int,     # erwartete Werte abhängig von TopGesamt & Gruppenzahl
    first_round_size: int,         # 4 / 8 / 16
    mode: str,                     # 'cross' oder 'draw'
    rematch_block: bool = True,
    rng_seed: Optional[int] = None,
) -> Tuple[bool, str]:
    """
    Exakte Setzlogik gemäß Skizze:
      Cross:
        - 2 Gruppen:
            Top4: A1–B2, B1–A2
            Top8: A1–B4, A2–B3, A3–B2, A4–B1
        - 4 Gruppen (Paarfamilien A↔D und B↔C):
            Top4:  A1–D1, B1–C1
            Top8:  A1–D2, B1–C2, C1–B2, D1–A2
            Top16: A1–D4, B1–C4, A2–D3, B2–C3, A3–D2, B3–C2, A4–D1, B4–C1
        - 8 Gruppen:
            Top8:  (A–H, B–G, C–F, D–E) jeweils 1. vs 1.
            Top16: je Paar 1. vs 2. (gespiegelt)
      Auslosung: zufällig.
    """
    if first_round_size not in (4, 8, 16):
        return False, "Ungültige Größe für erste KO-Runde (erlaubt: 4/8/16)."

    groups = fetch_groups(turnier_id)
    if not groups:
        return False, "Keine Gruppen vorhanden."
    ordered = sorted(groups, key=lambda x: x[1])  # Namen A,B,C,D,E,F,G,H …
    gcount = len(ordered)

    # --- Erwartetes K je Gruppe abhängig von Fall ---
    expected_k = None
    if mode == "cross":
        if gcount == 2 and first_round_size == 4:
            expected_k = 2
        elif gcount == 2 and first_round_size == 8:
            expected_k = 4
        elif gcount == 4 and first_round_size == 4:
            expected_k = 1
        elif gcount == 4 and first_round_size == 8:
            expected_k = 2
        elif gcount == 4 and first_round_size == 16:
            expected_k = 4
        elif gcount == 8 and first_round_size == 8:
            expected_k = 1
        elif gcount == 8 and first_round_size == 16:
            expected_k = 2
        else:
            return False, f"Cross Top {first_round_size}: nicht unterstützte Kombination bei {gcount} Gruppen."
    else:  # draw
        if first_round_size in (4, 8, 16) and gcount in (2, 4, 8):
            if first_round_size % gcount != 0:
                return False, "Top-Gesamt nicht durch Anzahl Gruppen teilbar."
            expected_k = first_round_size // gcount
        else:
            return False, f"Auslosung Top {first_round_size}: nicht unterstützte Gruppenzahl ({gcount})."

    if qualifiers_per_group != expected_k:
        return False, f"Erwartet: {expected_k} Qualifikanten pro Gruppe (erhalten: {qualifiers_per_group})."

    # Top-Listen je Gruppe holen
    tops_map: Dict[int, List[int]] = {}
    for gid, _name in ordered:
        tops = compute_group_ranking_ids(turnier_id, gid)[:expected_k]
        if len(tops) < expected_k:
            return False, "Nicht jede Gruppe hat genügend Qualifikanten."
        tops_map[int(gid)] = tops

    with _connect() as con:
        con.execute("DELETE FROM ko_spiele WHERE turnier_id=?", (turnier_id,))

        if mode == "cross":
            def add(match_no: int, p1: Optional[int], p2: Optional[int]) -> None:
                con.execute(
                    "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?,?,?,?,?,NULL,NULL)",
                    (turnier_id, 1, match_no, p1, p2),
                )

            # 2 Gruppen
            if gcount == 2 and first_round_size == 4:
                (gidA, _), (gidB, _) = ordered
                A = tops_map[gidA]; B = tops_map[gidB]
                add(1, A[0], B[1])
                add(2, B[0], A[1])

            elif gcount == 2 and first_round_size == 8:
                (gidA, _), (gidB, _) = ordered
                A = tops_map[gidA]; B = tops_map[gidB]
                add(1, A[0], B[3])
                add(2, A[1], B[2])
                add(3, A[2], B[1])
                add(4, A[3], B[0])

            # 4 Gruppen (Paare A–D und B–C)
            elif gcount == 4 and first_round_size == 4:
                (gidA, _), (gidB, _), (gidC, _), (gidD, _) = ordered
                A = tops_map[gidA]; B = tops_map[gidB]; C = tops_map[gidC]; D = tops_map[gidD]
                add(1,  A[0], D[0])  # A1–D1
                add(2,  B[0], C[0])  # B1–C1

            elif gcount == 4 and first_round_size == 8:
                (gidA, _), (gidB, _), (gidC, _), (gidD, _) = ordered
                A = tops_map[gidA]; B = tops_map[gidB]; C = tops_map[gidC]; D = tops_map[gidD]
                add(1,  A[0], D[1])  # A1–D2
                add(2,  B[0], C[1])  # B1–C2
                add(3,  C[0], B[1])  # C1–B2
                add(4,  D[0], A[1])  # D1–A2

            elif gcount == 4 and first_round_size == 16:
                (gidA, _), (gidB, _), (gidC, _), (gidD, _) = ordered
                A = tops_map[gidA]; B = tops_map[gidB]; C = tops_map[gidC]; D = tops_map[gidD]
                add(1,  A[0], D[3])  # A1–D4
                add(2,  B[0], C[3])  # B1–C4
                add(3,  A[1], D[2])  # A2–D3
                add(4,  B[1], C[2])  # B2–C3
                add(5,  A[2], D[1])  # A3–D2
                add(6,  B[2], C[1])  # B3–C2
                add(7,  A[3], D[0])  # A4–D1
                add(8,  B[3], C[0])  # B4–C1

            # 8 Gruppen (Paare A–H, B–G, C–F, D–E)
            elif gcount == 8 and first_round_size == 8:
                gids = [gid for gid, _ in ordered]  # A..H
                pairs = [(gids[0], gids[7]), (gids[1], gids[6]), (gids[2], gids[5]), (gids[3], gids[4])]
                m = 1
                for g1, g2 in pairs:
                    L1 = tops_map[g1]  # [1.]
                    L2 = tops_map[g2]  # [1.]
                    add(m, L1[0], L2[0]); m += 1

            elif gcount == 8 and first_round_size == 16:
                gids = [gid for gid, _ in ordered]  # A..H
                pairs = [(gids[0], gids[7]), (gids[1], gids[6]), (gids[2], gids[5]), (gids[3], gids[4])]
                m = 1
                for g1, g2 in pairs:
                    L1 = tops_map[g1]  # [1.,2.]
                    L2 = tops_map[g2]  # [1.,2.]
                    # 1 vs 2
                    add(m, L1[0], L2[1]); m += 1
                    # gespiegelt
                    add(m, L2[0], L1[1]); m += 1

            else:
                return False, "Kombination nicht unterstützt."

        else:
            # Auslosung: alle Top-K je Gruppe in Pool, mischen, paaren
            pool: List[int] = []
            for gid, _ in ordered:
                pool.extend(tops_map[gid])
            if rng_seed is not None:
                random.seed(int(rng_seed))
            random.shuffle(pool)
            match_no = 1
            for i in range(0, min(len(pool), first_round_size), 2):
                p1 = pool[i]
                p2 = pool[i + 1] if i + 1 < first_round_size else None
                con.execute(
                    "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?,?,?,?,?,NULL,NULL)",
                    (turnier_id, 1, match_no, p1, p2),
                )
                match_no += 1

        # Folge-Runden anlegen
        rounds_total = _log2_int(first_round_size)
        for r in range(2, rounds_total + 1):
            mcount = max(1, first_round_size // (2 ** r))
            for m in range(1, mcount + 1):
                con.execute(
                    "INSERT INTO ko_spiele(turnier_id,runde,match_no,p1_id,p2_id,s1,s2) VALUES(?, ?, ?, NULL, NULL, NULL, NULL)",
                    (turnier_id, r, m),
                )

        _auto_advance_byes(con, turnier_id)
        con.commit()

    return True, "KO nach Einstellungen erzeugt."


# ---------------------------------------------------------------------------
# Meisterschaften & Rangliste (Gesamt)
# ---------------------------------------------------------------------------
def insert_meisterschaft(name: str, saison: str) -> int:
    with _connect() as con:
        cur = con.execute("INSERT INTO meisterschaften(name,saison) VALUES(?,?)", (name, saison))
        con.commit()
        return int(cur.lastrowid)


def fetch_meisterschaften() -> List[Tuple[int, str, str, Optional[str]]]:
    with _connect() as con:
        rows = con.execute("SELECT id,name,COALESCE(saison,''),punkteschema FROM meisterschaften ORDER BY name ASC").fetchall()
        return [(int(r[0]), str(r[1]), str(r[2]), r[3]) for r in rows]


def update_meisterschaft(ms_id: int, name: str, saison: str) -> None:
    with _connect() as con:
        con.execute("UPDATE meisterschaften SET name=?, saison=? WHERE id=?", (name, saison, int(ms_id)))
        con.commit()


def delete_meisterschaft(ms_id: int) -> None:
    with _connect() as con:
        con.execute("DELETE FROM meisterschaft_punkteschema WHERE meisterschaft_id=?", (ms_id,))
        con.execute("DELETE FROM meisterschaft_turniere WHERE meisterschaft_id=?", (ms_id,))
        con.execute("DELETE FROM meisterschaften WHERE id=?", (ms_id,))
        con.commit()


def set_meisterschaft_turniere(ms_id: int, turnier_ids: Sequence[int]) -> None:
    with _connect() as con:
        con.execute("DELETE FROM meisterschaft_turniere WHERE meisterschaft_id=?", (ms_id,))
        con.executemany(
            "INSERT INTO meisterschaft_turniere(meisterschaft_id,turnier_id) VALUES(?,?)",
            [(ms_id, int(tid)) for tid in turnier_ids],
        )
        con.commit()


def fetch_meisterschaft_turnier_ids(ms_id: int) -> List[int]:
    with _connect() as con:
        rows = con.execute(
            "SELECT turnier_id FROM meisterschaft_turniere WHERE meisterschaft_id=? ORDER BY turnier_id ASC", (ms_id,)
        ).fetchall()
        return [int(r[0]) for r in rows]


def save_punkteschema(ms_id: int, entries: Sequence[Tuple[int, int]]) -> None:
    with _connect() as con:
        con.execute("DELETE FROM meisterschaft_punkteschema WHERE meisterschaft_id=?", (ms_id,))
        con.executemany(
            "INSERT INTO meisterschaft_punkteschema(meisterschaft_id,platz,punkte) VALUES(?,?,?)",
            [(ms_id, int(platz), int(punkte)) for (platz, punkte) in entries],
        )
        con.commit()


def fetch_punkteschema(ms_id: int) -> List[Tuple[int, int]]:
    with _connect() as con:
        rows = con.execute(
            "SELECT platz,punkte FROM meisterschaft_punkteschema WHERE meisterschaft_id=? ORDER BY platz ASC", (ms_id,)
        ).fetchall()
        return [(int(r[0]), int(r[1])) for r in rows]


def standard_punkteschema_basic(ms_id: int) -> None:
    save_punkteschema(ms_id, [(1, 30), (2, 24), (3, 18), (4, 15), (5, 5)])


def _ms_fetch_turniere(ms_id: int) -> List[sqlite3.Row]:
    with _connect() as con:
        return con.execute(
            """
            SELECT t.id, t.name, COALESCE(t.datum,'') AS datum
            FROM meisterschaft_turniere mt JOIN turniere t ON t.id=mt.turnier_id
            WHERE mt.meisterschaft_id=? ORDER BY COALESCE(t.datum,''), t.id
            """,
            (ms_id,),
        ).fetchall()


def _ms_fetch_schema_map(ms_id: int) -> Dict[int, int]:
    mapping: Dict[int, int] = {}
    for platz, punkte in fetch_punkteschema(ms_id):
        mapping[int(platz)] = int(punkte)
    for p in range(5, 256):
        mapping.setdefault(p, 5)  # Default 5 Punkte ab Platz 5
    return mapping


def _ensure_turnier_platzierungen_from_ko(turnier_id: int) -> None:
    with _connect() as con:
        r = con.execute(
            "SELECT MAX(runde) AS r_final FROM ko_spiele WHERE turnier_id=? AND runde<>?", (turnier_id, BRONZE_ROUND)
        ).fetchone()
    if not r or r["r_final"] is None:
        return
    final_r = int(r["r_final"])
    with _connect() as con:
        fm = con.execute(
            "SELECT p1_id,p2_id,s1,s2 FROM ko_spiele WHERE turnier_id=? AND runde=? LIMIT 1", (turnier_id, final_r)
        ).fetchone()
        if not fm or fm["s1"] is None or fm["s2"] is None or fm["s1"] == fm["s2"]:
            return
        p1 = int(fm["p1_id"]); p2 = int(fm["p2_id"]); s1 = int(fm["s1"]); s2 = int(fm["s2"])
        champion = p1 if s1 > s2 else p2
        runnerup = p2 if s1 > s2 else p1

        bron = con.execute(
            "SELECT p1_id,p2_id,s1,s2 FROM ko_spiele WHERE turnier_id=? AND runde=? LIMIT 1", (turnier_id, BRONZE_ROUND)
        ).fetchone()
        bronze_winner = None; bronze_loser = None
        if bron and bron["s1"] is not None and bron["s2"] is not None and bron["s1"] != bron["s2"]:
            bp1 = int(bron["p1_id"]); bp2 = int(bron["p2_id"])
            bs1 = int(bron["s1"]);   bs2 = int(bron["s2"])
            bronze_winner = bp1 if bs1 > bs2 else bp2
            bronze_loser  = bp2 if bs1 > bs2 else bp1

        con.execute("DELETE FROM turnier_platzierungen WHERE turnier_id=?", (turnier_id,))
        con.executemany(
            "INSERT INTO turnier_platzierungen(turnier_id,teilnehmer_id,platz) VALUES(?,?,?)",
            [(turnier_id, champion, 1), (turnier_id, runnerup, 2)],
        )
        if bronze_winner is not None and bronze_loser is not None:
            con.executemany(
                "INSERT INTO turnier_platzierungen(turnier_id,teilnehmer_id,platz) VALUES(?,?,?)",
                [(turnier_id, bronze_winner, 3), (turnier_id, bronze_loser, 4)],
            )
        con.commit()


def rebuild_rangliste_for_turnier(turnier_id: int) -> None:
    _ensure_turnier_platzierungen_from_ko(turnier_id)


def compute_meisterschaft_rangliste(ms_id: int) -> List[Dict[str, Any]]:
    trows = _ms_fetch_turniere(ms_id)
    if not trows:
        return []
    schema = _ms_fetch_schema_map(ms_id)
    acc: Dict[int, Dict[str, Any]] = {}

    with _connect() as con:
        for t in trows:
            tid = int(t["id"])
            tdatum = (t["datum"] or "").strip()

            _ensure_turnier_platzierungen_from_ko(tid)

            pl_rows = con.execute("SELECT teilnehmer_id, platz FROM turnier_platzierungen WHERE turnier_id=?", (tid,)).fetchall()
            platz_map = {int(r["teilnehmer_id"]): int(r["platz"]) for r in pl_rows}

            teil_rows = con.execute(
                """
                SELECT tt.teilnehmer_id, COALESCE(NULLIF(TRIM(te.spitzname),''), te.name) AS n
                FROM turnier_teilnehmer tt JOIN teilnehmer te ON te.id=tt.teilnehmer_id
                WHERE tt.turnier_id=?
                """,
                (tid,),
            ).fetchall()

            for r in teil_rows:
                pid = int(r["teilnehmer_id"])
                name = (r["n"] or "").strip()
                if pid not in acc:
                    acc[pid] = {"teilnehmer_id": pid, "name": name, "punkte": 0, "turniere": 0,
                                "beste_platzierung": None, "letztes_datum": ""}
                acc[pid]["turniere"] += 1
                if tdatum and (acc[pid]["letztes_datum"] == "" or tdatum > acc[pid]["letztes_datum"]):
                    acc[pid]["letztes_datum"] = tdatum

                platz = platz_map.get(pid)
                if platz is not None:
                    acc[pid]["punkte"] += schema.get(platz, 5 if platz >= 5 else 0)
                    if acc[pid]["beste_platzierung"] is None or platz < acc[pid]["beste_platzierung"]:
                        acc[pid]["beste_platzierung"] = platz
                else:
                    acc[pid]["punkte"] += schema.get(5, 5)

    rows = list(acc.values())

    def sort_key(d: Dict[str, Any]):
        best = d["beste_platzierung"] if d["beste_platzierung"] is not None else 10**9
        return (-int(d["punkte"]), int(best), (d["letztes_datum"] or "")[::-1], d["name"].lower())

    rows.sort(key=sort_key)

    rank = 0
    last = None
    for i, d in enumerate(rows, start=1):
        if last is None or int(d["punkte"]) != int(last):
            rank = i
            last = int(d["punkte"])
        d["rank"] = rank

    return rows
