# Anleitung: KO-Validierung direkt auf dem Server umsetzen

**Regel:** Keine Dateien vom lokalen Rechner auf den Server kopieren. Alle Änderungen direkt auf dem Server vornehmen (z. B. per SSH + Editor).

---

## 1. Mit dem Server verbinden

```bash
ssh root@144.91.103.103
```

Wechsle in das Projektverzeichnis (Pfad anpassen, falls bei dir anders):

```bash
cd /pfad/zum/projekt   # z.B. /opt/ibu_sw oder wo backend/frontend liegen
```

---

## 2. Backend: `backend/app/services/ko_propagation.py`

### 2a) Funktion `can_enter_ko_result` einfügen

**Nach der Zeile** `BRONZE_ROUND = 99` **eine Leerzeile lassen und dann folgende Funktion einfügen:**

```python
def can_enter_ko_result(db: Session, match: KnockoutMatch) -> bool:
    """
    Prüft, ob für dieses KO-Match ein Ergebnis eingetragen werden darf.
    Nur erlaubt wenn: Runde 1, oder (Runde > 1 und beide Vorgänger-Matches der Vorrunde abgeschlossen sind).
    Gilt nur für Hauptbracket (positive Runden, nicht Bronze).
    """
    if match.round is None or match.match_no is None:
        return False
    # Nur Hauptbracket (positive Runden, nicht Bronze)
    if match.round < 1 or match.round == BRONZE_ROUND or match.round >= 2000:
        return True  # Bronze/Spezialrunden: keine Vorrunden-Prüfung hier
    if match.round == 1:
        return True
    # Vorgänger: Runde (round-1), Match (2*match_no-1) und (2*match_no)
    pred_no1 = 2 * match.match_no - 1
    pred_no2 = 2 * match.match_no
    pred1 = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round == match.round - 1,
        KnockoutMatch.match_no == pred_no1
    ).first()
    pred2 = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round == match.round - 1,
        KnockoutMatch.match_no == pred_no2
    ).first()
    if not pred1 or not pred2:
        return False

    def _match_complete(m: KnockoutMatch) -> bool:
        if m.player1_id is None or m.player2_id is None:
            return True  # Bye zählt als abgeschlossen
        if m.score1 is None or m.score2 is None or m.score1 == m.score2:
            return False
        return True

    return _match_complete(pred1) and _match_complete(pred2)
```

### 2b) `get_draw_status`: Auslosung auch bei bestehenden Paarungen erlauben

**Suche den Block** (in `get_draw_status`):

```python
        # Prüfe ob nächste Runde bereits Spieler hat
        if round_num < max_round:
            next_round_matches = [m for m in all_matches if m.round == round_num + 1]
            has_players = any(m.player1_id is not None or m.player2_id is not None for m in next_round_matches)
            has_scores = any(m.score1 is not None or m.score2 is not None for m in next_round_matches)
            
            if not has_players and not has_scores:
                # Nächste Runde hat keine Spieler - Auslosung möglich!
                return {
```

**Ersetze ihn durch:**

```python
        # Prüfe ob nächste Runde ausgelost werden kann (keine Ergebnisse in nächster Runde)
        if round_num < max_round:
            next_round_matches = [m for m in all_matches if m.round == round_num + 1]
            has_scores = any(m.score1 is not None or m.score2 is not None for m in next_round_matches)
            
            if not has_scores:
                # Nächste Runde hat keine Ergebnisse - Auslosung möglich (auch Re-Auslosung nach Korrektur)
                return {
```

(Der Rest des `return { ... }` bleibt unverändert.)

---

## 3. Backend: `backend/app/api/v1/matches.py`

### 3a) Import erweitern

**Zeile mit:**

```python
from app.services.ko_propagation import save_ko_result_and_propagate, ensure_bronze_from_semis
```

**ändern zu:**

```python
from app.services.ko_propagation import save_ko_result_and_propagate, ensure_bronze_from_semis, can_enter_ko_result
```

### 3b) Validierung vor Ergebnis-Update

**Direkt nach** `update_data = match_update.model_dump(exclude_unset=True)` **folgende Zeilen einfügen** (vor dem `for field, value in update_data.items():`):

```python
    # Ergebnis nur erlauben, wenn Vorrunde abgeschlossen ist
    if "score1" in update_data or "score2" in update_data:
        if not can_enter_ko_result(db, db_match):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ergebnis kann erst eingetragen werden, wenn die Vorrunde abgeschlossen ist."
            )
```

---

## 4. Frontend: `frontend/src/components/tournament/KOBracket.tsx`

### 4a) Hilfsfunktion `canEnterResult` einfügen

**Nach** `getMatchResult` (vor dem Kommentar `// Render a single match box`) **einfügen:**

```ts
  /** Nur erlauben, wenn Runde 1 oder beide Vorgänger-Matches der Vorrunde abgeschlossen sind. */
  const canEnterResult = (m: KnockoutMatch): boolean => {
    if (m.round === 99 || m.round < 1) return true;
    if (m.round === 1) return true;
    const pred1 = matches.find((x) => x.round === m.round - 1 && x.match_no === 2 * m.match_no - 1);
    const pred2 = matches.find((x) => x.round === m.round - 1 && x.match_no === 2 * m.match_no);
    if (!pred1 || !pred2) return false;
    const complete = (p: KnockoutMatch) => {
      if (p.player1_id == null || p.player2_id == null) return true;
      return p.score1 != null && p.score2 != null && p.score1 !== p.score2;
    };
    return complete(pred1) && complete(pred2);
  };
```

### 4b) In `renderMatchBox`

- **Gleich nach** `const hasResult = ...` **eine Zeile hinzufügen:**  
  `const allowEdit = canEnterResult(match);`
- **Edit-Button-Bereich:**  
  Statt nur `{onMatchEdit && (`  
  **`{onMatchEdit && allowEdit && (`**  
  und **nach** dem `</Button>` (innerhalb des gleichen Blocks) **einfügen:**

```tsx
          {onMatchEdit && !allowEdit && round > 1 && round !== 99 && (
            <div style={{ marginTop: '0.375rem', fontSize: '0.7rem', color: theme.colors.text.secondary, textAlign: 'center' }}>
              Vorrunde noch nicht abgeschlossen
            </div>
          )}
```

Optional: Kommentar beim Button von `{/* Edit Button */}` zu `{/* Edit Button – nur wenn Vorrunde abgeschlossen */}`.

---

## 5. Nach den Änderungen

- **Backend:** Container/Prozess neu starten (z. B. `docker compose restart backend` oder wie bei euch üblich).
- **Frontend:** Neu bauen und ausliefern (z. B. `npm run build` im Frontend-Verzeichnis und ggf. Nginx/Container neu laden).

---

## Kurzfassung

| Datei | Änderung |
|-------|----------|
| `backend/app/services/ko_propagation.py` | `can_enter_ko_result` einfügen; in `get_draw_status` nur noch `has_scores` prüfen (Re-Auslosung erlauben). |
| `backend/app/api/v1/matches.py` | `can_enter_ko_result` importieren; vor KO-Ergebnis-Update prüfen und bei offener Vorrunde 400 zurückgeben. |
| `frontend/src/components/tournament/KOBracket.tsx` | `canEnterResult` + `allowEdit`; Button nur bei `allowEdit`; Hinweis „Vorrunde noch nicht abgeschlossen“. |

Lokal sind diese Änderungen bereits im Repository; mit dieser Anleitung bleiben Server und Repo synchron.
