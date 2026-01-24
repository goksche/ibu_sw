# Deployment Status - IBU Turniere

## Aktueller Status

✅ **Dateien erfolgreich auf Server hochgeladen**
✅ **PostgreSQL läuft** (ibu_postgres_prod)
❌ **Backend hat Problem** - config.py muss aktualisiert werden
❌ **Frontend** - TypeScript-Fehler verhindern Build
⚠️ **Port 80 Konflikt** - Caddy läuft bereits

## Server-Verbindung

- **Server**: root@46.62.173.242
- **Projekt-Pfad**: `/root/ibu_sw`
- **Backend-Pfad**: `/root/ibu_sw/backend/app/core/config.py`

## Nächste Schritte

### 1. Backend config.py aktualisieren (WinSCP)

1. Öffne WinSCP
2. Verbinde dich mit: `root@46.62.173.242`
3. Navigiere zu: `/root/ibu_sw/backend/app/core/`
4. Lade die Datei `config.py` von deinem lokalen Rechner hoch:
   - Lokaler Pfad: `C:\Cursor\ibu_sw\backend\app\core\config.py`
   - Server-Pfad: `/root/ibu_sw/backend/app/core/config.py`
5. Überschreibe die vorhandene Datei

### 2. Backend neu bauen (SSH)

Nach dem Hochladen der Datei, führe auf dem Server aus:

```bash
ssh root@46.62.173.242
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache backend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend
```

### 3. Prüfen ob Backend läuft

```bash
docker exec ibu_backend_prod curl -f http://localhost:8000/health
```

Erwartete Ausgabe:
```json
{"status":"healthy","service":"backend","version":"1.4.0"}
```

## Bekannte Probleme

1. **Frontend TypeScript-Fehler**: EditTournament.tsx, TournamentGroups.tsx, TournamentMatches.tsx
2. **Port 80**: Caddy läuft bereits - Nginx muss auf anderem Port oder Caddy muss konfiguriert werden
3. **SECRET_KEY**: Wird noch generiert (momentan "change-me-please-generate-secure-key")

## Dateien auf Server

- ✅ `docker-compose.prod.yml`
- ✅ `frontend/Dockerfile.prod`
- ✅ `frontend/nginx.conf`
- ✅ `nginx/nginx.conf`
- ✅ `nginx/conf.d/default.conf`
- ✅ `backend/app/` (alle Dateien außer config.py aktualisiert)
- ❌ `backend/app/core/config.py` - muss mit WinSCP hochgeladen werden


