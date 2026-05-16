# Observability / Debuggability — Kurzüberblick (v1.8.1)

## Frontend

- **`utils/apiErrors.ts`**: `formatApiErrorMessage` für **422** (Validierungsliste), **5xx** und Netzwerk.
- **`services/api.ts`**: Axios-Interceptor setzt `error.formattedApiMessage` auf jedem fehlgeschlagenen Request.
- **`services/infoService.ts`** + **Footer**: öffentlich **`GET /api/v1/info/diagnostics`** → Anzeige z. B. `API 1.8.1` (optional `deploy_label` aus `.env.prod`).

## Backend

- **`GET /api/v1/info/diagnostics`**: `version`, `name`, `debug`, `deploy_label` — keine Secrets.
- **`DEPLOY_LABEL`** optional in `.env` (z. B. Git-/Deploy-Kennzeichen), siehe `backend/app/core/config.py`.
- **Logging**: unbehandelte Exceptions im HTTP-Middleware-Pfad werden mit Logger **`ibu.api`** als Traceback geloggt (`backend/app/main.py`).

## Smoke

Skripte `scripts/smoke_server_b.sh` / `.ps1` prüfen u. a. **`/api/v1/info/diagnostics`**.
