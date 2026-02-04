# Spielplan nicht generierbar – Prüfung auf dem Server

## Schnellprüfung (auf dem Server ausführen)

SSH auf den Server (z. B. 144.91.103.103), in das Projektverzeichnis wechseln (z. B. `cd /root/ibu_sw` oder wo das Repo liegt), dann:

```bash
chmod +x scripts/check_tournament_spielplan_server.sh
./scripts/check_tournament_spielplan_server.sh "Vereinsturnier Test Final"
```

Falls der Postgres-Container anders heißt (z. B. `ibu_sw-postgres-1`):

```bash
DB_CONTAINER=ibu_sw-postgres-1 ./scripts/check_tournament_spielplan_server.sh "Vereinsturnier Test Final"
```

---

## Manuelle Prüfung per Datenbank

Container-Namen anzeigen:

```bash
docker ps --format '{{.Names}}'
```

Dann (Postgres-Container-Name einsetzen, z. B. `ibu_postgres` oder `ibu_sw-postgres-1`):

```bash
docker exec -it ibu_postgres psql -U ibu_admin -d ibu_turniere -c "
SELECT t.id, t.name, t.groups_count, t.has_group_phase,
       (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) AS turnierteilnehmer
FROM tournaments t
WHERE t.name = 'Vereinsturnier Test Final';
"
```

Gruppen und Teilnehmer pro Gruppe:

```bash
docker exec -it ibu_postgres psql -U ibu_admin -d ibu_turniere -c "
SELECT g.id, g.name,
       (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_id = g.id) AS teilnehmer
FROM groups g
JOIN tournaments t ON t.id = g.tournament_id
WHERE t.name = 'Vereinsturnier Test Final';
"
```

---

## Mögliche Ursachen

| Symptom | Ursache | Lösung |
|--------|---------|--------|
| **„Keine Gruppen vorhanden. Bitte zuerst Gruppen erstellen.“** | Es gibt keine Gruppen für dieses Turnier. | Im UI **„Gruppen generieren“** klicken (dafür müssen Turnierteilnehmer eingetragen sein). |
| **„Keine Teilnehmer für dieses Turnier registriert.“** | Beim **Gruppen generieren**: Keine Teilnehmer im Turnier. | Im Turnier **Teilnehmer hinzufügen**, danach **Gruppen generieren**. |
| **„Zu wenige Teilnehmer (X) für Y Gruppen“** | Weniger Turnierteilnehmer als Gruppen. | Entweder weniger Gruppen (Turnier bearbeiten) oder mehr Teilnehmer hinzufügen. |
| Spielplan wird „erfolgreich“ generiert, aber **0 Spiele** | Alle Gruppen haben weniger als 2 Teilnehmer (Round Robin braucht mind. 2 pro Gruppe). | Gruppen mit mind. 2 Teilnehmern füllen oder **Gruppen generieren** erneut ausführen. |

---

## API-Fehler direkt prüfen (optional)

Mit gültigem Token (nach Login im Frontend aus DevTools/Application oder Network entnehmen):

```bash
TOKEN="..."
TOURNAMENT_ID=123   # aus obiger SQL-Abfrage (t.id)

curl -s -X POST "http://localhost:8000/api/v1/tournaments/${TOURNAMENT_ID}/generate-round-robin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

So siehst du die genaue Fehlermeldung des Backends (z. B. `detail: "Keine Gruppen vorhanden..."`).
