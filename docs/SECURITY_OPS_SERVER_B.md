# Sicherheit & Betrieb — Server B (v1.8.2)

## Rollen / Feedback (`backend/app/api/v1/platform/feedback.py`)

- **Liste & Detail**: Normale Nutzer nur eigenes Feedback; **Admin / Power Admin** sehen alles (`is_platform_admin`).
- **Update**: Nur `require_admin` (Admin + Power Admin).
- **Kommentare**: Nur **Besitzer** oder Platform-Admin.
- **Neues Feedback**: Rate-Limits (`app/services/feedback_rate_limit.py`), Umgebungsvariablen in `config.py`:

  | Variable | Bedeutung (Default) |
  |----------|---------------------|
  | `FEEDBACK_RATE_WINDOW_SEC` | Gleitendes Zeitfenster in Sekunden (`3600`) |
  | `FEEDBACK_RATE_MAX_PER_WINDOW` | Max. neue Einträge pro Nutzer im Fenster (`30`) |
  | `FEEDBACK_RATE_MIN_INTERVAL_SEC` | Mindestabstand zwischen zwei Einträgen (`45`) |

Bei Überschreitung: **HTTP 429** mit deutscher Kurzmeldung.

## Env-Drift (read-only)

```bash
cd /opt/ibu_sw && ./scripts/check_env_drift_server_b.sh
# im QA-Gate:
CHECK_ENV_DRIFT=1 ./scripts/run_qa_gate_server_b.sh
```

Prüft Pflichtkeys in `.env.prod` ohne Werte zu loggen.

## Secrets / Compose

- **`docker compose`** immer mit **`--env-file .env.prod`** (unter `/opt/ibu_sw` liegt typischerweise `.env.prod`, nicht `.env`).
- **`SECRET_KEY`**, **`POSTGRES_PASSWORD`**, SMTP-Zugänge nur in der Env-Datei auf dem Server — nicht ins Repo committen.
- Nach Änderungen an Variablen: betroffene Container neu erstellen (`up -d --force-recreate backend` o. Ä.).

## Login / Auth

Keine Änderungen an Login-Flows ohne ausdrücklichen Auftrag (Projektregel).
