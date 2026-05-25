# Minitabelle-Fix auf dem Server umsetzen

Die Änderung bewirkt: Bei „Direktbegegnung“ in den Gleichstandsregeln wird die Gleichstandsgruppe für die Minitabelle nur nach Punkten gebildet – so erscheint z. B. in Gruppe B bei 3 Teams mit 9 Punkten eine Minitabelle.

**Betroffene Datei auf dem Server:** `backend/app/api/v1/tables.py`

---

## Option A: Einmal per SSH – Skript auf dem Server ausführen

1. Auf den Server verbinden (Main: `ssh root@144.91.103.103`, Test: `ssh root@95.111.238.180`).
2. In das Projektverzeichnis wechseln: `cd /root/ibu_sw`
3. Prüfen, ob die Datei noch den **alten** Inhalt hat (ohne „Minitabelle“-Logik):
   ```bash
   grep -n "use_direct_encounter_for_tie_group" backend/app/api/v1/tables.py || echo "Nicht gefunden – alte Version, Patch nötig"
   ```
4. Wenn „Nicht gefunden“ ausgegeben wird, das folgende Python-Skript **einzeilig** ausführen (alles in eine Zeile, Backslashes am Zeilenende lassen):

```bash
python3 << 'PYEOF'
path = 'backend/app/api/v1/tables.py'
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()

old_block = """    # Find tie groups (participants with same scoring value and optional wins/diff rules)
    def _build_tie_key(stats: Dict) -> Tuple:
        parts = [stats['scoring_value']]
        for r in (tie_breaking_rules or []):
            if r in ('direct_encounter', 'decision_match'):
                continue
            if r == 'wins':
                parts.append(stats.get('wins', 0))
            elif r == 'diff':
                parts.append(stats.get('diff', 0))
        return tuple(parts)

    tie_groups = {}
    for participant_id in group_participants:
        st = all_stats[participant_id]
        tie_key = _build_tie_key(st)
        if tie_key not in tie_groups:
            tie_groups[tie_key] = []
        tie_groups[tie_key].append(participant_id)"""

new_block = """    # Find tie groups for mini table: when direct_encounter is used, group only by scoring_value
    # (points), so that all with same points get one mini table (Direktbegegnung = Kriterium Nr. 1).
    # Otherwise group by scoring_value + wins/diff from rules before direct_encounter.
    use_direct_encounter_for_tie_group = 'direct_encounter' in (tie_breaking_rules or [])

    def _build_tie_key(stats: Dict) -> Tuple:
        parts = [stats['scoring_value']]
        for r in (tie_breaking_rules or []):
            if r in ('direct_encounter', 'decision_match'):
                continue
            if r == 'wins':
                parts.append(stats.get('wins', 0))
            elif r == 'diff':
                parts.append(stats.get('diff', 0))
        return tuple(parts)

    def _build_tie_group_key_for_mini_table(stats: Dict) -> Tuple:
        \"\"\"Key for grouping participants into one mini table. If direct_encounter is a rule,
        everyone with the same points (or diff) is in one group; else use full tie key.\"\"\"
        if use_direct_encounter_for_tie_group:
            return (stats['scoring_value'],)
        return _build_tie_key(stats)

    tie_groups = {}
    for participant_id in group_participants:
        st = all_stats[participant_id]
        tie_key = _build_tie_group_key_for_mini_table(st)
        if tie_key not in tie_groups:
            tie_groups[tie_key] = []
        tie_groups[tie_key].append(participant_id)"""

if old_block not in s:
    print("Alter Block nicht gefunden – ggf. schon gepatcht oder andere Version.")
    exit(1)
s = s.replace(old_block, new_block, 1)

old_loop = "        # Check if this participant is in a tie group with >2 participants\n        tie_key = _build_tie_key(stats)"
new_loop = "        # Check if this participant is in a tie group with >2 participants (same key as for mini table)\n        tie_key = _build_tie_group_key_for_mini_table(stats)"
if old_loop not in s:
    print("Loop-Ersetzung nicht gefunden – prüfe Datei.")
    exit(1)
s = s.replace(old_loop, new_loop, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(s)
print("tables.py erfolgreich angepasst.")
PYEOF
```

5. Backend-Container neu starten, damit die Änderung aktiv wird:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```
   (Falls ihr Compose-Projekt anders heißt, z. B. `docker compose restart ibu_backend_prod`.)

6. Kurz prüfen:
   ```bash
   grep -n "use_direct_encounter_for_tie_group\|_build_tie_group_key_for_mini_table" backend/app/api/v1/tables.py
   ```
   Es sollten mehrere Zeilen mit diesen Namen erscheinen.

---

## Option B: Manuell bearbeiten

Falls das Skript auf eurer Server-Umgebung nicht funktioniert:

1. `nano backend/app/api/v1/tables.py` (oder `vi`).
2. Die Stelle suchen mit: `# Find tie groups (participants with same scoring value...`
3. Den gesamten Block von dort bis einschließlich `tie_groups[tie_key].append(participant_id)` durch den **new_block** aus dem Skript oben ersetzen.
4. Die Zeile `tie_key = _build_tie_key(stats)` in der Schleife („Check if this participant is in a tie group…“) ersetzen durch:
   - Kommentar: `# Check if this participant is in a tie group with >2 participants (same key as for mini table)`
   - Zeile: `tie_key = _build_tie_group_key_for_mini_table(stats)`
5. Speichern, Backend-Container wie unter Option A neu starten.

---

**Hinweis:** Lokal ist die Änderung bereits in `backend/app/api/v1/tables.py` umgesetzt. Diese Anleitung dient nur der direkten Umsetzung auf dem Server (ohne Datei-Upload).
