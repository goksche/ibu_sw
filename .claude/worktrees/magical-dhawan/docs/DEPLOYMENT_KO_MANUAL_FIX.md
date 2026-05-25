# KO-Bracket: Manuelle Auslosung – Korrektur auf dem Server

**Problem:** Beim erneuten Generieren des KO-Brackets (z. B. Turnier 17) wird die erste KO-Runde trotz Einstellung „manuelle Auslosung“ automatisch befüllt.

**Ursache:** Die Auslosungsmethode muss als „manual“ erkannt werden (inkl. Enum `KODrawMethod.MANUAL`). Zusätzlich muss der Code so stehen, dass der Block „nur leeres Bracket anlegen“ nur bei manueller Auslosung läuft und der Block „Bracket befüllen“ nur bei nicht-manueller Auslosung.

**Lokal:** Die Anpassungen sind bereits im Repo (Enum-Vergleich, `is_manual_draw`).

---

## Änderungen direkt auf dem Server vornehmen

Auf dem Server (z. B. 144.91.103.103 oder 95.111.238.180) per SSH einloggen und **nur dort** die folgenden Schritte ausführen. Keine Dateien vom lokalen Rechner hochladen.

### 1. Verzeichnis und Backup

```bash
cd /root/ibu_sw
# oder dorthin, wo das Backend liegt (z. B. deploy-temp/backend)
cp backend/app/api/v1/tournaments.py backend/app/api/v1/tournaments.py.bak
```

### 2. Aktuellen Code prüfen

```bash
sed -n '14,17p' backend/app/api/v1/tournaments.py
sed -n '743,755p' backend/app/api/v1/tournaments.py
```

- In Zeile 15 sollte der Import `Tournament, TournamentMode, LeagueScoringSystem` stehen (evtl. schon mit `KODrawMethod`).
- Ab Zeile 749 sollte entweder `if draw_method == 'manual':` oder `if is_manual_draw:` stehen; der zugehörige `else:` (Bracket befüllen) muss **mit 8 Leerzeichen** eingerückt sein (gehört zum `if` „manual“, nicht zum äußeren `if tournament.mode == KNOCKOUT`).

### 3. Import anpassen

Falls `KODrawMethod` noch nicht importiert ist, die Zeile mit dem Tournament-Import anpassen:

**Von:**
```python
from app.models.tournament import Tournament, TournamentMode, LeagueScoringSystem
```

**Nach:**
```python
from app.models.tournament import Tournament, TournamentMode, LeagueScoringSystem, KODrawMethod
```

Beispiel mit `sed` (nur wenn die Zeile exakt so vorkommt):

```bash
sed -i 's/from app.models.tournament import Tournament, TournamentMode, LeagueScoringSystem$/from app.models.tournament import Tournament, TournamentMode, LeagueScoringSystem, KODrawMethod/' backend/app/api/v1/tournaments.py
```

### 4. Draw-Method-Block anpassen

Der Block, der die Auslosungsmethode liest und den „manual“-Zweig steuert, soll so aussehen (ca. Zeilen 745–753):

**Ersetzen:**

```python
        # Get draw method (default to full_random for knockout mode)
        draw_method = tournament.ko_draw_method or 'full_random'
        if draw_method not in ('full_random', 'pot_system', 'overall_seeding', 'manual'):
            draw_method = 'full_random'

        # For manual mode: create bracket structure only (round 1 empty – user enters pairings manually)
        if draw_method == 'manual':
```

**Durch:**

```python
        # Get draw method (default to full_random for knockout mode)
        raw_draw = tournament.ko_draw_method
        draw_method = getattr(raw_draw, 'value', raw_draw) if raw_draw is not None else 'full_random'
        if draw_method not in ('full_random', 'pot_system', 'overall_seeding', 'manual'):
            draw_method = 'full_random'
        is_manual_draw = (draw_method == 'manual' or raw_draw == KODrawMethod.MANUAL)

        # For manual mode: create bracket structure only (round 1 empty – user enters pairings manually)
        if is_manual_draw:
```

Falls Sie mit einem Editor arbeiten (z. B. `nano backend/app/api/v1/tournaments.py`): Die Zeile mit `if draw_method == 'manual':` in `if is_manual_draw:` ändern und die neuen Zeilen für `raw_draw`, `draw_method` und `is_manual_draw` wie oben einfügen.

**Wichtig:** Der `else:`-Block, der `_apply_seeded_order` und `generate_ko_bracket_from_participants` enthält, muss **mit 8 Leerzeichen** eingerückt bleiben (Zugehörigkeit zum `if is_manual_draw` / `if draw_method == 'manual'`). Er darf nicht auf 4 Leerzeichen stehen, sonst gehört er zum äußeren `if tournament.mode == KNOCKOUT` und die Logik ist falsch.

### 5. Backend neu starten

```bash
docker compose restart backend
# oder: docker-compose restart backend
```

### 6. Test

- Turnier 17 öffnen, KO-Bracket neu generieren.
- Einstellung „manuelle Auslosung“ muss aktiv sein.
- Erwartung: Erste KO-Runde ist **leer** (keine automatischen Paarungen). Paarungen werden erst über die manuelle Paarungs-UI gesetzt.

---

Wenn Sie mir den genauen Pfad zum Backend auf dem Server und die Ausgabe von Schritt 2 nennen, kann ich die Befehle bzw. Zeilennummern darauf zuschneiden.
