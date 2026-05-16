# Release v1.8.1 — Server B

| Todo | Inhalt | Status |
|------|--------|--------|
| migration-safety | Backup/Restore/Rollback: `docs/MIGRATION_SAFETY_SERVER_B.md`, `backup_mvp_on_server_b.sh`, `restore_server_b_from_mvp_backup.sh`, `verify_backup_server_b.sh` | **abgenommen** (Server B, 16.05.2026) |
| observability-debuggability | `/api/v1/info/diagnostics`, `DEPLOY_LABEL`, Axios-Fehler, Footer, Logger `ibu.api` | **abgenommen** (Server B, 16.05.2026) |

**Abnahme auf B (erledigt):**

- `./scripts/run_qa_gate_server_b.sh` → **QA Gate v1.8.1 OK**
- Log: `/root/releases/qa_gate/qa_gate_latest.log`
- API: `https://test.finalstage.ch/api/v1/info/diagnostics` → 200, Version **1.8.1**

Optional: frisches Backup nach Deploy — `./scripts/backup_mvp_on_server_b.sh` dann `VERIFY_BACKUP=1 ./scripts/run_qa_gate_server_b.sh`

Git-Tag (Repo): `v1.8.1` nach Push
