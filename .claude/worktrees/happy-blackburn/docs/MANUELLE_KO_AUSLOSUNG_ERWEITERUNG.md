# Manuelle KO-Auslosung (erweitert)

Dokumentation der Erweiterung: manuelle KO-Auslosung für kombinierte Turniere, alle Runden befüllbar, Speichern pro Runde, Dropdown-Logik.

## API-Übersicht

| Endpoint | Zweck |
|----------|--------|
| `POST /tournaments/{id}/manual-ko-bracket` | Runde-1-Paare; erstellt Bracket (R1 gefüllt, Rest leer). Für rein KO und kombiniert (mit qualifizierten Teilnehmern). |
| `PUT /tournaments/{id}/ko-round/{round}/pairings` **(neu)** | Paarungen **einer** Runde (2, 3, …, 99) speichern. Nur Sieger der Vorrunde, pro Runde max. 1×. |
| `GET /tournaments/{id}/qualified-participants` **(neu)** | Liste qualifizierter Teilnehmer für KO (kombiniert) bzw. alle Teilnehmer (rein KO); für Runde-1-Dropdowns. |

## Vorgaben

- **Kombiniert:** Manuell erst nach Gruppenphase; Dropdowns nur qualifizierte Teilnehmer.
- **Speichern:** Ein Button pro Runde („Runde 1 speichern“, „Runde 2 speichern“, …).
- **Runde 1:** Alle qualifizierten Teilnehmer genau 1× (Rest Slots ggf. Bye).
- **Runde 2+:** In Dropdowns nur Sieger der jeweiligen Vorrunde; pro Runde jeder Sieger höchstens 1×.
- **Auslosungsart:** Änderbar; bei Wechsel neues Bracket generieren.

## Geänderte Dateien (Stand)

- **Backend:** `backend/app/api/v1/tournaments.py` (create_manual_ko_bracket für kombiniert, _get_qualified_participant_ids_for_ko, GET qualified-participants, PUT ko-round/{round}/pairings), `backend/app/services/ko_propagation.py` (get_winners_of_round, get_losers_of_round)
- **Frontend:** `frontend/src/pages/CreateTournament.tsx`, `frontend/src/pages/EditTournament.tsx` (Manuell-Option bei Kombiniert, Hinweise), `frontend/src/components/tournament/TournamentMatchesContent.tsx` (isManualKo für kombiniert, qualifizierte Teilnehmer, Runde 1 speichern, Runde 2+ und Bronze mit Buttons pro Runde), `frontend/src/services/tournamentService.ts` (getQualifiedParticipants, setKoRoundPairings)
- CHANGELOG.md

## Backup vor Änderungen auf dem Server

**Vor** dem Anwenden der KO-Manual-Änderungen auf dem Server: Backup in einen anderen Ordner auf demselben Server legen.

### Option A: Befehle direkt per SSH ausführen

Auf dem Server einloggen (`ssh root@144.91.103.103` bzw. Test-Server `ssh root@95.111.238.180`) und ausführen:

```bash
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backup_before_ko_manual_$TS"
PROJECT_DIR="/root/ibu_sw"   # oder /root/platform-core / wo Ihr Projekt liegt

mkdir -p "$BACKUP_DIR"
cp -a "$PROJECT_DIR/backend" "$BACKUP_DIR/"
cp -a "$PROJECT_DIR/frontend" "$BACKUP_DIR/"
echo "Backup erstellt: $BACKUP_DIR"
```

Wiederherstellung (falls nötig):

```bash
cp -a "$BACKUP_DIR/backend/"* "$PROJECT_DIR/backend/"
cp -a "$BACKUP_DIR/frontend/"* "$PROJECT_DIR/frontend/"
# Danach Container neu starten: docker compose -f ... restart backend frontend
```

### Option B: Skript aus dem Repo (wenn Projekt bereits auf dem Server liegt)

```bash
cd /root/ibu_sw   # oder Ihr Projektpfad
bash scripts/backup_before_ko_manual_server.sh
```

Das Skript sucht automatisch nach `backend/` und `frontend/` unter `/root/ibu_sw`, `/root/platform-core` oder `/opt/finalstage` und legt z. B. `/root/backup_before_ko_manual_20260126_143022` an.

---

*Stand: Umsetzung abgeschlossen.*
