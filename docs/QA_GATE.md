# Qualitätssicherung — Smoke Gate (Server B)

Ziel: Vor jedem weiteren Todo und nach abgeschlossenen Änderungen auf **Server B** (`test.finalstage.ch`) müssen die definierten Basis-Checks **grün** sein. Kein verpflichtender lokaler Compose-Lauf; optional kann parallel lokal geprüft werden.

## Release-Kandidat (Definition)

Ein Stand ist ein **Release-Kandidat auf Server B**, wenn:

- die **Server-B-Smoke-Suite** (Skript unten) **ohne Fehler** durchläuft
- keine offenen **#high** Bugs für den aktuellen Scope bekannt sind
- DB/Migrationen: keine unkontrollierten Änderungen — siehe Projektregeln (Änderungen nur nach Absprache)

## Smoke-Suite (Server B)

Minimale, reproduzierbare Prüfungen gegen den öffentlichen Host:

### 1) Erreichbarkeit & öffentliche API

- **Startseite**: `GET /` → HTTP **200** (Landing oder SPA je nach Nginx).
- **Version/Info** (ohne Login): `GET /api/v1/info/version` → HTTP **200** (JSON mit `version` / `name`).
- **Diagnose** (ohne Login): `GET /api/v1/info/diagnostics` → HTTP **200** (JSON: `version`, `database`, optional `deploy_label`).

### 2) Regression (manuell / Checkliste)

Nach Bedarf ergänzen (nicht automatisiert im Minimal-Skript):

- Login funktioniert (manuell).
- Turnier anlegen (Wizard Kurztest).
- KO-Auslosung Kurztest.

Details und Scope: Plandatei `finalstage-v2.0` und `docs/turniermodus-matrix.md`.

## Scripts

| Umgebung | Datei | Hinweis |
|----------|--------|---------|
| Linux / Server B / CI mit `bash` | `scripts/smoke_server_b.sh` | Minimal-Smoke (HTTPS) |
| Linux / Server B | `scripts/run_qa_gate_server_b.sh` | **v1.8.1 Gate:** Smoke + Docker/nginx + Version + Diagnostics + Postgres (read-only) |
| Linux / Server B | `VERIFY_BACKUP=1 ./scripts/run_qa_gate_server_b.sh` | Zusätzlich letztes `/root/backup_mvp_*` prüfen |
| Windows (Dev-Rechner) | `scripts/smoke_server_b.ps1` | Gleiche Checks per PowerShell |

### Bash (Server B oder Linux)

```bash
chmod +x scripts/smoke_server_b.sh scripts/run_qa_gate_server_b.sh
./scripts/run_qa_gate_server_b.sh
# nur Minimal-Smoke:
./scripts/smoke_server_b.sh
# anderer Host auf demselben Server-Setup:
BASE_URL=https://betabilic.finalstage.ch ./scripts/run_qa_gate_server_b.sh
```

### PowerShell (lokal gegen test.finalstage.ch)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_server_b.ps1
```

## Hinweise

- **`/api/v1/settings/global`** ist für Smoke **nicht** geeignet (benötigt Authentifizierung → typisch **401**).
- **`/health`** am Backend ist unter Nginx oft **nicht** unter derselben URL wie direkt am Container erreichbar; das Minimal-Gate nutzt `/api/v1/info/version`.
- Legacy: `scripts/smoke_local.ps1` bleibt für **lokales** Docker-Compose nutzbar; Gate für den aktuellen Plan ist **Server B**.

## Modi-Matrix (manuell)

Ausführbare Checkliste Liga/KO/Kombi auf Server B: [`MODES_TEST_MATRIX_SERVER_B.md`](MODES_TEST_MATRIX_SERVER_B.md) · Referenz [`turniermodus-matrix.md`](turniermodus-matrix.md).

KO-Auslosungsarten & Randfälle: [`DRAW_METHODS_TEST_MATRIX_SERVER_B.md`](DRAW_METHODS_TEST_MATRIX_SERVER_B.md).
