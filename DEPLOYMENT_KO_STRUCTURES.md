# Deployment: KO-Strukturen (Double/Triple/Aggregate Elimination)

## Übersicht

Dieses Dokument beschreibt, wie die neuen KO-Strukturen auf den Server deployed werden.

## Geänderte Dateien

Die folgenden Dateien wurden geändert und müssen auf den Server hochgeladen werden:

1. `backend/app/services/ko_bracket.py` - Neue Funktionen für Double/Triple/Aggregate Elimination
2. `backend/app/api/v1/tournaments.py` - API-Endpunkte erweitert
3. `backend/app/services/ko_propagation.py` - Propagation-Logik erweitert

## Server-Informationen

- **Server:** `root@144.91.103.103`
- **Remote-Pfad:** `/root/ibu_sw`
- **Passwort:** `Fcb@fcb@9959`

## Deployment-Methoden

### Option 1: WinSCP (Empfohlen)

1. Öffne WinSCP
2. Verbinde dich mit:
   - Host: `144.91.103.103`
   - Username: `root`
   - Password: `Fcb@fcb@9959`
   - Protocol: `SFTP`

3. Navigiere zu `/root/ibu_sw/backend/app/services/`
4. Lade `ko_bracket.py` und `ko_propagation.py` hoch (überschreibe vorhandene Dateien)

5. Navigiere zu `/root/ibu_sw/backend/app/api/v1/`
6. Lade `tournaments.py` hoch (überschreibe vorhandene Datei)

### Option 2: SCP (Command Line)

```powershell
# Stelle sicher, dass du im Projekt-Root-Verzeichnis bist
cd c:\Cursor\ibu_sw

# Lade die Dateien hoch
scp backend/app/services/ko_bracket.py root@144.91.103.103:/root/ibu_sw/backend/app/services/ko_bracket.py
scp backend/app/services/ko_propagation.py root@144.91.103.103:/root/ibu_sw/backend/app/services/ko_propagation.py
scp backend/app/api/v1/tournaments.py root@144.91.103.103:/root/ibu_sw/backend/app/api/v1/tournaments.py
```

### Option 3: SSH + Manueller Upload

1. Verbinde dich per SSH:
   ```powershell
   ssh root@144.91.103.103
   # Passwort: Fcb@fcb@9959
   ```

2. Navigiere zum Projekt-Verzeichnis:
   ```bash
   cd /root/ibu_sw
   ```

3. Erstelle Backup der alten Dateien:
   ```bash
   cp backend/app/services/ko_bracket.py backend/app/services/ko_bracket.py.backup
   cp backend/app/services/ko_propagation.py backend/app/services/ko_propagation.py.backup
   cp backend/app/api/v1/tournaments.py backend/app/api/v1/tournaments.py.backup
   ```

4. Kopiere die neuen Dateien manuell (z.B. mit `nano` oder `vi`)

## Nach dem Upload: Container neu starten

Nach dem Hochladen der Dateien muss der Backend-Container neu gestartet werden:

```bash
# SSH zum Server
ssh root@46.62.173.242

# Navigiere zum Projekt
cd /root/ibu_sw

# Prüfe laufende Container
docker compose ps

# Starte Backend-Container neu
docker compose restart backend

# Oder falls docker-compose verwendet wird:
docker-compose restart backend

# Prüfe Logs
docker compose logs backend --tail=50
```

## Verifikation

Nach dem Neustart des Backend-Containers:

1. Prüfe Backend-Logs auf Fehler:
   ```bash
   docker compose logs backend --tail=100
   ```

2. Teste API-Endpunkt:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

3. Prüfe, ob die neuen KO-Strukturen verfügbar sind:
   - Erstelle ein neues Turnier
   - Prüfe, ob `double_elimination`, `triple_elimination` und `aggregate_ko` in der KO-Struktur-Auswahl verfügbar sind

## Rollback (falls Probleme auftreten)

Falls Probleme auftreten, können die alten Dateien wiederhergestellt werden:

```bash
# SSH zum Server
ssh root@46.62.173.242

# Navigiere zum Projekt
cd /root/ibu_sw

# Stelle Backup-Dateien wieder her
cp backend/app/services/ko_bracket.py.backup backend/app/services/ko_bracket.py
cp backend/app/services/ko_propagation.py.backup backend/app/services/ko_propagation.py
cp backend/app/api/v1/tournaments.py.backup backend/app/api/v1/tournaments.py

# Starte Backend-Container neu
docker compose restart backend
```

## Wichtige Hinweise

- **Backup erstellen:** Erstelle immer ein Backup der alten Dateien vor dem Deployment
- **Container-Neustart:** Der Backend-Container muss nach dem Upload neu gestartet werden
- **Logs prüfen:** Prüfe die Backend-Logs nach dem Neustart auf Fehler
- **Testen:** Teste die neuen Funktionen nach dem Deployment

## Implementierte Features

### Double Elimination
- Winners Bracket (Runden 1, 2, 3, ...)
- Losers Bracket (Runden -1001, -1002, ...)
- Grand Final (Runde 2000)
- Zweites Grand Final (Runde 2001, falls nötig)

### Triple Elimination
- Winners Bracket (Runden 1, 2, 3, ...)
- First Losers Bracket (Runden -2001, -2002, ...)
- Second Losers Bracket (Runden -3001, -3002, ...)
- Grand Final (Runde 4000)

### Aggregate KO
- Jede Paarung hat zwei Matches (Leg 1 und Leg 2)
- Home/Away wird automatisch getauscht
- Aggregate Score Berechnung

## Support

Bei Problemen:
1. Prüfe Backend-Logs: `docker compose logs backend`
2. Prüfe Container-Status: `docker compose ps`
3. Prüfe Datenbank-Verbindung: `docker compose exec backend python -c "from app.core.database import engine; print(engine)"`
