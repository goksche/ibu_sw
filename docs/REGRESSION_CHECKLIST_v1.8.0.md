# Regression-Checkliste v1.8.0 (manuell, Server B)

**Vor jedem Release ab v1.8.1** und nach groesseren Aenderungen auf `test.finalstage.ch`.

Automatisches Gate zuerst:

```bash
cd /opt/ibu_sw
./scripts/run_qa_gate_server_b.sh
```

## Automatisch (Skript)

- [ ] `run_qa_gate_server_b.sh` endet mit **QA Gate v1.8.0 OK**
- [ ] Log unter `/root/releases/qa_gate/qa_gate_latest.log` ohne FAIL-Zeilen

## Manuell (Browser)

- [ ] **Login** mit bestehendem Test-User (kein Auth-Code aendern)
- [ ] **Dashboard** laedt ohne Fehler; Turnierliste sichtbar
- [ ] **Turnier oeffnen:** Spielplan + Tabelle/KO sichtbar
- [ ] **Wizard Kurztest:** neues Turnier anlegen (Schritt 1–3 reicht fuer Gate)
- [ ] Optional: **eine KO-Auslosung** ausloesen (kurzer Smoke)
- [ ] **Keine 500er** in Backend-Logs waehrend des Tests:
  `docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend --tail 80`

## Referenz (spaetere Meilensteine, nicht v1.8.0)

- Modi-Matrix: `docs/MODES_TEST_MATRIX_SERVER_B.md`
- KO-Auslosung: `docs/DRAW_METHODS_TEST_MATRIX_SERVER_B.md`
