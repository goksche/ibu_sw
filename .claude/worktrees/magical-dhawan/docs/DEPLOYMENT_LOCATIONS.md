# Deployment: Locations & Spielfelder

## Auf dem Server (144.91.103.103)

### 1. Code ist bereits per SCP/rsync deployt (backend + frontend)

### 2. Migration ausführen (PostgreSQL)

```bash
cd /root/ibu_sw
cat backend/migrations/add_locations_spielfelder.sql | docker compose exec -T postgres psql -U ibu_admin -d ibu_turniere
```

(Falls Container-Name `ibu_postgres` abweicht, z.B. `docker compose exec -T ibu_postgres psql -U ibu_admin -d ibu_turniere`)

### 3. Backend und Frontend neu starten

```bash
docker compose restart backend frontend
```

Optional neu bauen (falls Images geändert):

```bash
docker compose build backend frontend --no-cache
docker compose up -d backend frontend
```

---

## Schnell-Befehle (alles in einem)

```bash
cd /root/ibu_sw
cat backend/migrations/add_locations_spielfelder.sql | docker compose exec -T postgres psql -U ibu_admin -d ibu_turniere
docker compose restart backend frontend
```
