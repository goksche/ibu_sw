# 502 Bad Gateway beheben – Ursache und Lösung

## Grundursache: Port-Verwechslung (80 vs 3000)

Es gibt **zwei verschiedene Setups** – je nachdem welches Compose verwendet wird:

| Setup | Compose-Datei | Frontend | Nginx upstream |
|-------|---------------|----------|----------------|
| **Entwicklung** | `docker-compose.yml` | Vite Dev-Server auf Port 3000 | `frontend:3000` |
| **Production** | `docker-compose.prod.yml` | Nginx mit statischem Build auf Port 80 | `frontend:80` |

**Wenn Nginx auf den falschen Port zeigt → 502 Bad Gateway.**

## Warum kommt der Fehler immer wieder?

1. **`frontend:3000`** landet in der Config (alte Doku, Backup-Restore, manueller Fehler)
2. **`nginx -s reload` reicht nicht** – Bind-Mount-Änderungen werden vom laufenden Container oft nicht übernommen; es braucht einen **vollständigen Container-Neustart** (`docker compose restart nginx`).

---

## Welches Setup nutzt der Server?

- **test.finalstage.ch (95.111.238.180)**: Production → `frontend:80` erforderlich
- **144.91.103.103** (falls Dev): `frontend:3000` erforderlich

---

## Schnellprüfung auf dem Server

```bash
ssh root@<SERVER>
cd /root/ibu_sw

# 1. Welches Compose wird genutzt?
docker compose -f docker-compose.prod.yml ps 2>/dev/null && echo "→ PROD" || echo "→ DEV"

# 2. Welchen Port nutzt der Frontend-Container?
docker port ibu_frontend_prod 2>/dev/null || docker port ibu_frontend 2>/dev/null

# 3. Was steht in der Nginx-Config?
grep "upstream frontend" nginx/conf.d/default.conf
# Muss sein: server frontend:80 bei PROD, server frontend:3000 bei DEV
```

---

## Behebung für Production (test.finalstage.ch)

```bash
cd /root/ibu_sw

# Nginx-Config prüfen und ggf. korrigieren
sed -i 's/server frontend:3000/server frontend:80/' nginx/conf.d/default.conf
grep "upstream frontend" nginx/conf.d/default.conf
# Erwartung: upstream frontend { server frontend:80; }

# WICHTIG: nginx -s reload reicht NICHT – Bind-Mount-Änderungen werden oft nicht übernommen!
# Stets den gesamten nginx-Container neu starten:
docker compose -f docker-compose.prod.yml restart nginx

# Frontend mit Prod-Compose neu starten (falls nötig)
docker compose -f docker-compose.prod.yml up -d frontend
```

---

## Behebung für Entwicklung (Vite Dev-Server)

Nur wenn du `docker-compose.yml` (ohne .prod) nutzt:

```bash
cd /root/ibu_sw

# Nginx muss auf Port 3000 zeigen
sed -i 's/server frontend:80/server frontend:3000/' nginx/conf.d/default.conf
docker exec ibu_sw nginx -s reload

docker compose up -d frontend
```

---

## Wichtige Regel

**Nie die falsche Kombination nutzen:**
- `docker-compose.prod.yml` + `frontend:3000` → **502**
- `docker-compose.yml` (Dev) + `frontend:80` → **502**

Die Nginx-Config im Repo (`nginx/conf.d/default.conf`) ist für **Production** vorkonfiguriert (`frontend:80`).
