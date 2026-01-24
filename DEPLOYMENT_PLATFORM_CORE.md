# Platform Core Deployment Anleitung
# Multi-App Platform

## Übersicht

Die Platform Core wird auf dem Server `root@46.62.173.242` deployed. Die Dateien werden lokal vorbereitet und dann via SSH/SCP auf den Server hochgeladen.

## Voraussetzungen

### Lokal (Windows)
- PowerShell
- SSH Client (OpenSSH)
- WinSCP (optional, aber empfohlen)

### Auf dem Server
- Docker installiert
- Docker Compose installiert
- Port 80/443 verfügbar (oder Caddy konfiguriert)
- Domain `gsmartsol.ch` zeigt auf Server

## Deployment-Schritte

### 1. Lokale Vorbereitung

```powershell
# Führe das Deployment-Script aus
.\scripts\deploy_platform_to_server.ps1
```

Das Script erstellt ein Deployment-Paket in `deploy-temp/` mit allen notwendigen Dateien.

### 2. Dateien auf Server hochladen

**Option A: Mit WinSCP (empfohlen)**
1. Öffne WinSCP
2. Verbinde dich mit: `root@46.62.173.242`
3. Erstelle Verzeichnis: `/root/platform-core`
4. Lade den Inhalt von `deploy-temp/` nach `/root/platform-core/` hoch
5. Stelle sicher, dass `deploy.sh` ausführbar ist

**Option B: Mit SCP (Command Line)**
```powershell
scp -r deploy-temp/* root@46.62.173.242:/root/platform-core/
```

**Option C: Mit rsync (für Updates)**
```powershell
rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' deploy-temp/ root@46.62.173.242:/root/platform-core/
```

### 3. Auf dem Server: Environment konfigurieren

```bash
# SSH zum Server
ssh root@46.62.173.242

# Navigiere zum Projekt
cd /root/platform-core

# Erstelle .env Datei
cp .env.example .env

# Bearbeite .env mit wichtigen Werten
nano .env
```

**Wichtige .env Werte:**
```env
POSTGRES_DB=platform_db
POSTGRES_USER=platform_admin
POSTGRES_PASSWORD=<starkes-passwort>
SECRET_KEY=<generiere-mit-openssl-rand-hex-32>
DOMAIN_NAME=gsmartsol.ch
CERTBOT_EMAIL=admin@gsmartsol.ch
CORS_ORIGINS=https://gsmartsol.ch,https://www.gsmartsol.ch
VITE_API_URL=https://gsmartsol.ch/api/v1
```

**SECRET_KEY generieren:**
```bash
openssl rand -hex 32
```

### 4. Auf dem Server: Deployment ausführen

```bash
cd /root/platform-core
bash deploy.sh
```

Das Script:
- Stoppt bestehende Container
- Baut und startet neue Container
- Initialisiert die Datenbank
- Erstellt den Initial Admin User

### 5. SSL/TLS einrichten

**Mit Let's Encrypt:**
```bash
# Installiere Certbot (falls nicht vorhanden)
apt-get update
apt-get install certbot

# Erstelle Zertifikat
certbot certonly --standalone -d gsmartsol.ch -d www.gsmartsol.ch

# Zertifikate sind dann in: /etc/letsencrypt/live/gsmartsol.ch/
```

**Oder mit Caddy (falls bereits installiert):**
- Caddy kann automatisch SSL-Zertifikate verwalten
- Konfiguriere Caddy für `gsmartsol.ch` → `platform_backend:8000`

### 6. Nginx/Caddy konfigurieren

**Falls Caddy verwendet wird:**
```bash
# Caddy Config anpassen
nano /etc/caddy/Caddyfile
```

Füge hinzu:
```
gsmartsol.ch {
    reverse_proxy platform_backend:8000
}
```

**Falls Nginx direkt verwendet wird:**
- Die Nginx-Config ist bereits in `nginx/conf.d/platform.conf`
- Container muss im richtigen Netzwerk sein

### 7. Platform testen

```bash
# Container Status prüfen
docker ps

# Logs ansehen
cd /root/platform-core
docker-compose logs -f

# Backend Health Check
docker exec platform_backend curl http://localhost:8000/health

# Frontend testen
curl http://localhost:3000
```

### 8. Erster Login

1. Öffne Browser: `https://gsmartsol.ch`
2. Login mit:
   - Username: `admin`
   - Password: `admin123`
3. **WICHTIG:** Ändere das Passwort sofort!

## Wartung

### Container neu starten
```bash
cd /root/platform-core
docker-compose restart
```

### Logs ansehen
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Backup erstellen
```bash
bash scripts/backup_containers.sh
```

### Updates deployen
1. Lokal: `.\scripts\deploy_platform_to_server.ps1`
2. Upload neue Dateien
3. Auf Server: `bash deploy.sh`

## Troubleshooting

### Container startet nicht
```bash
# Logs prüfen
docker-compose logs

# Container neu bauen
docker-compose build --no-cache
docker-compose up -d
```

### Datenbank-Verbindungsfehler
- Prüfe `.env` Datei
- Prüfe ob PostgreSQL Container läuft: `docker ps | grep postgres`
- Prüfe Netzwerk: `docker network ls`

### Port-Konflikte
- Prüfe welche Ports belegt sind: `netstat -tulpn | grep LISTEN`
- Stoppe konkurrierende Services
- Oder ändere Ports in `docker-compose.yml`

### SSL-Zertifikat-Probleme
- Prüfe Zertifikat: `certbot certificates`
- Erneuere Zertifikat: `certbot renew`
- Prüfe Nginx-Config: `nginx -t`

## Wichtige Dateien auf Server

- `/root/platform-core/` - Hauptverzeichnis
- `/root/platform-core/.env` - Environment Variablen
- `/root/platform-core/docker-compose.yml` - Container Config
- `/root/platform-core/deploy.sh` - Deployment Script
- `/etc/letsencrypt/live/gsmartsol.ch/` - SSL Zertifikate

## Support

Bei Problemen:
1. Prüfe Logs: `docker-compose logs`
2. Prüfe Container Status: `docker ps`
3. Prüfe Netzwerk: `docker network inspect platform_network`
4. Prüfe Datenbank: `docker exec platform_postgres psql -U platform_admin -d platform_db`


