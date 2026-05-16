# Migration & Sicherheit — Server B (v1.8.1)

Ziel: **Reproduzierbarer Backup-, Restore- und Rollback-Pfad** auf `test.finalstage.ch` (95.111.238.180), **ohne** stille DB-Änderungen im Alltag.

## Pfade

| Was | Pfad |
|-----|------|
| App | `/opt/ibu_sw` |
| Compose | `docker-compose.prod.yml` + `.env.prod` |
| Backups | `/root/backup_mvp_YYYYMMDD_HHMM/` |
| Baseline v1.8.0 | `/root/releases/BASELINE_v1.8.0.manifest.json` |
| QA-Logs | `/root/releases/qa_gate/qa_gate_latest.log` |

## 1) Backup erstellen (auf Server B)

```bash
cd /opt/ibu_sw
chmod +x scripts/backup_mvp_on_server_b.sh scripts/verify_backup_server_b.sh
./scripts/backup_mvp_on_server_b.sh
./scripts/verify_backup_server_b.sh
```

Enthält pro Lauf:

- `ibu_sw_backup_*.tar` (Projekt ohne `node_modules`/`.git`)
- `pg_dump_*.sql` (PostgreSQL)
- `env.copy` (Kopie von `.env.prod` oder `.env`)
- `manifest.json` (SHA256, Zeitstempel)

**A↔B vom PC:** weiterhin `scripts/backup_a_to_b.ps1` / `backup_b_to_a.ps1` — legen unter `/root/backup_ibu_sw_*` ab, **ohne** `/opt/ibu_sw` auf dem Ziel zu überschreiben.

## 2) Backup prüfen (read-only)

```bash
./scripts/verify_backup_server_b.sh
```

Optional im QA-Gate:

```bash
VERIFY_BACKUP=1 ./scripts/run_qa_gate_server_b.sh
```

## 3) Rollback / Wiederherstellung

**Dry-run** (zeigt Plan, ändert nichts):

```bash
./scripts/restore_server_b_from_mvp_backup.sh /root/backup_mvp_YYYYMMDD_HHMM
```

**Echte Wiederherstellung** (ersetzt Dateien unter `/opt/ibu_sw` und **komplette DB** — nur nach Absprache):

```bash
CONFIRM_RESTORE=yes ./scripts/restore_server_b_from_mvp_backup.sh /root/backup_mvp_YYYYMMDD_HHMM
```

Danach:

```bash
./scripts/run_qa_gate_server_b.sh
```

`.env.prod` und `nginx/conf.d` werden beim Restore **nicht** blind überschrieben (Zertifikate für `test.finalstage.ch`).

## 4) Deploy-Regeln (kein stilles DB-Risiko)

- Deploy: `docker compose -f docker-compose.prod.yml --env-file .env.prod …`
- **Nicht** den Dev-`docker-compose.yml` auf B für Produktion nutzen (falsche Ports/Container-Namen → 502).
- Schema-/Daten-Migrationen nur nach **expliziter Absprache**.
- Nach jedem Release-Todo: `./scripts/run_qa_gate_server_b.sh`.

## 5) Promotion Server A

Nur nach expliziter Freigabe und erfolgreichem Gate auf B. Vorher Backup auf A dokumentieren (siehe Plan «Manuelle Backups A↔B»).
