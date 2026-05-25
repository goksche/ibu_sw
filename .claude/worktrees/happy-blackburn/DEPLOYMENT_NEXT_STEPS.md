# Nächste Schritte nach Upload der docker-compose.prod.yml

## Datei hochladen
1. Öffne WinSCP
2. Verbinde dich: `root@46.62.173.242`
3. Lade hoch: `C:\Cursor\ibu_sw\docker-compose.prod.yml` → `/root/ibu_sw/docker-compose.prod.yml`

## Nach dem Upload - Befehle ausführen

```bash
# 1. Alten IBU_SW Container stoppen (aus demo compose)
cd /opt/demo
docker compose stop IBU_SW

# 2. Neuen Container starten
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx

# 3. Prüfen ob Container läuft
docker ps | grep ibu_sw

# 4. Nginx Konfiguration testen
docker exec ibu_sw nginx -t

# 5. Caddy neu laden (falls nötig)
docker exec caddy caddy reload
```

## Status prüfen

```bash
# Container Status
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

# Nginx Logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs nginx

# Test ob Caddy den Container erreicht
docker exec caddy ping -c 1 ibu_sw
```

## Erwartetes Ergebnis

- ✅ Container `ibu_sw` läuft
- ✅ Container ist im `demo_web` Netzwerk
- ✅ Caddy kann `ibu_sw:80` erreichen
- ✅ Nginx leitet Traffic an Frontend/Backend weiter


