# Fix: 400 Bad Request beim Anpassen von Gruppenspiel-Ergebnissen (Server)

**Problem:** `PUT /api/v1/matches/groups/{id}` liefert 400, weil das Backend bei Gruppenspielen noch die KO-Prüfung `can_enter_ko_result` ausführt und das Ändern bestehender Ergebnisse blockiert.

**Lösung:** Auf dem Server die Datei `backend/app/api/v1/matches.py` anpassen (nur direkt auf dem Server, kein Upload).

---

## 1. Per SSH auf den Server

```bash
ssh root@95.111.238.180
```

(Falls du einen anderen User/Host nutzt, ersetze entsprechend.)

---

## 2. Ins Projektverzeichnis wechseln

```bash
cd /root/ibu_sw
```

(Falls das Projekt woanders liegt, z.B. `/root/platform-core`, dort `cd` hinein und bei allen folgenden Pfaden anpassen.)

---

## 3. Backend-Datei patchen (Python einzeilig)

**Option A – Patch per Python (empfohlen):** Einmal komplett einfügen und ausführen:

```bash
python3 << 'PYEOF'
path = "/root/ibu_sw/backend/app/api/v1/matches.py"
with open(path) as f:
    s = f.read()

old = """    # Update fields
    update_data = match_update.model_dump(exclude_unset=True)
    if "score1" in update_data or "score2" in update_data:
        setting_result = (
            update_data.get("score1") is not None or update_data.get("score2") is not None
        )
        if setting_result:
            if not can_enter_ko_result(db, db_match):
                if db_match.player1_id is None and db_match.player2_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Keine Paarung ??? bitte zuerst diese Runde auslosen (Button Runde auslosen)."
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ergebnis kann erst eingetragen werden, wenn die Vorrunde abgeschlossen ist."
                )
    for field, value in update_data.items():
        setattr(db_match, field, value)"""

new = """    # Update fields – Gruppenspiele: Ergebnisse jederzeit eintragen und anpassen erlauben
    update_data = match_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_match, field, value)"""

if old not in s:
    print("Hinweis: Block nicht gefunden (evtl. schon gepatcht oder anderes Format). Prüfe Datei mit: grep -n 'Update fields' " + path)
    exit(1)
s = s.replace(old, new, 1)
with open(path, "w") as f:
    f.write(s)
print("Erfolgreich gepatcht:", path)
PYEOF
```

Wenn „Erfolgreich gepatcht“ erscheint, ist der Fix drin. Wenn „Block nicht gefunden“, siehe Abschnitt **Fallback (manuell)** unten.

---

## 4. Backend-Container neu starten

```bash
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml restart backend
```

Falls ihr ohne `-f docker-compose.prod.yml` arbeitet:

```bash
docker compose restart backend
```

---

## 5. Kurz testen

- Im Browser: Gruppenspiel öffnen, Ergebnis ändern (z.B. 2:1 → 2:3), Speichern.
- Erwartung: Kein 400 mehr, Ergebnis wird gespeichert.

---

## Fallback: Manuell bearbeiten

Wenn der Python-Patch den Block nicht findet (z.B. anderes Einrückungsformat):

1. Datei öffnen:
   ```bash
   nano /root/ibu_sw/backend/app/api/v1/matches.py
   ```
2. Zur Funktion `update_group_match` springen (ca. Zeile 108).
3. Den Block von  
   `# Update fields`  
   bis  
   `setattr(db_match, field, value)`  
   (inkl. dem ganzen `if "score1" in update_data` … `raise HTTPException` …) **löschen**.
4. Durch genau diesen Block ersetzen (gleiche Einrückung wie die umgebenden Zeilen):

   ```python
    # Update fields – Gruppenspiele: Ergebnisse jederzeit eintragen und anpassen erlauben
    update_data = match_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_match, field, value)
   ```

5. Speichern (in nano: Strg+O, Enter, Strg+X).
6. Backend wie in Schritt 4 neu starten.

---

**Lokal:** Die gleiche Änderung ist im Repo bereits enthalten (`backend/app/api/v1/matches.py`), damit Stand lokal und Server übereinstimmen.
