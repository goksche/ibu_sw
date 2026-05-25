# Deployment: KO Bye + Trostturnier

## Was wurde angepasst (lokal)

- **Bye-Matches**: Gewinner aus Runde 1 werden auch bei leerem Gegner in die nächste Runde übernommen.
- **Trostturnier**: Verlierer der ersten Runde werden ins Trostturnier (round -1) geschrieben.

Geänderte Dateien:
- `backend/app/api/v1/matches.py`
- `backend/app/services/ko_propagation.py`

## Server-Stand prüfen (per SSH)

Wenn du Zugriff hast (z. B. Passwort oder Key):

```powershell
# Verbindung (evtl. Passwort eingeben)
ssh root@144.91.103.103

# Auf dem Server: Projektpfad (je nach Setup)
cd /root/ibu_sw
# oder: cd /root/platform-core

# Prüfen, ob die Fixes vorhanden sind
grep -n "consolation_bracket\|_propagate_round_one_byes\|expire_all" backend/app/services/ko_propagation.py
grep -n "Bye-Matches\|update_data\['score1'\]" backend/app/api/v1/matches.py
```

Fehlen die Zeilen, die Fixes sind auf dem Server noch nicht aktiv.

## Deployment mit Skript (empfohlen)

Im Projektroot (wo sich `backend/` befindet):

```powershell
.\deploy_ko_bye_consolation.ps1
```

Standard: Server `root@144.91.103.103`, Pfad `/root/ibu_sw`.

Anderen Pfad (z. B. platform-core):

```powershell
.\deploy_ko_bye_consolation.ps1 -RemotePath "/root/platform-core"
```

Das Skript:
1. Prüft, ob die beiden Dateien lokal existieren
2. Lädt sie per SCP hoch
3. Startet auf dem Server den Backend-Container neu (`docker compose restart backend` bzw. `docker-compose restart backend`)

Falls dabei nach einem Passwort gefragt wird, eingeben und bestätigen.

## Manuelles Deployment (ohne Skript)

```powershell
$SERVER = "root@144.91.103.103"
$REMOTE = "/root/ibu_sw"

scp backend/app/api/v1/matches.py ${SERVER}:${REMOTE}/backend/app/api/v1/matches.py
scp backend/app/services/ko_propagation.py ${SERVER}:${REMOTE}/backend/app/services/ko_propagation.py

ssh $SERVER "cd $REMOTE && docker compose restart backend"
```

## Host-Key-Hinweis

Falls SSH meldet „REMOTE HOST IDENTIFICATION HAS CHANGED“, wurde der alte Host-Key für den Server bereits aus `~/.ssh/known_hosts` entfernt. Beim nächsten Verbindungsaufbau den neuen Key mit „yes“ akzeptieren.

Neuen Key nur akzeptieren, wenn du den Server-Wechsel (z. B. neu installiertes System) kennst.
