# Test-Server B einrichten und Daten von Main (A) kopieren

**Server A (Main):** 144.91.103.103 – finalstage.ch, www.finalstage.ch – SSH Key  
**Server B (Test):** 95.111.238.180 – test.finalstage.ch, betabilic.finalstage.ch – root, PW: 12123434  

Ziel: Server B mit gleicher Anwendung wie auf A betreiben; Daten (DB + Code/Konfiguration) von A nach B übertragen.

---

## Übersicht

1. **SSH-Key von A nach B** (einmalig), damit A Daten zu B schicken kann.
2. **Auf Server B:** Basis installieren (Docker, Docker Compose, Verzeichnisse).
3. **Auf Server A:** Backup erstellen und zu B übertragen (Code/Config + DB-Dump).
4. **Auf Server B:** Daten entpacken, .env für test.finalstage.ch anpassen, Nginx/Certbot für test.finalstage.ch und betabilic.finalstage.ch, Container starten, DB importieren.

---

## Voraussetzungen

- DNS: **test.finalstage.ch** und **betabilic.finalstage.ch** zeigen per A-Record auf **95.111.238.180**.
- Du kannst dich per SSH auf A (Key) und auf B (Passwort) anmelden.

---

## Schritt 1: SSH-Key von A nach B (einmalig)

Damit Server A später per `scp` Daten zu B schicken kann, musst du den **öffentlichen Key von A** bei B hinterlegen.

**Option A – von deinem Rechner aus (empfohlen):**

```powershell
# Auf deinem Windows-Rechner: Key von A anzeigen (falls du ihn lokal hast),
# oder einmal per SSH auf A gehen und cat ausführen:
ssh root@144.91.103.103 "cat /root/.ssh/id_rsa.pub"
# Ausgabe kopieren (z.B. ssh-rsa AAAA... root@...)
```

Dann auf **Server B** einloggen und Key hinzufügen:

```bash
ssh root@95.111.238.180
# Passwort: 12123434

mkdir -p /root/.ssh
echo "HIER_DEN_KOMPLETTEN_KEY_VON_A_EINFÜGEN" >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
exit
```

**Option B – direkt auf A:** Wenn auf A bereits ein Key existiert (`/root/.ssh/id_rsa.pub`), von A aus:

```bash
ssh-copy-id -i /root/.ssh/id_rsa.pub root@95.111.238.180
# Passwort von B eingeben: 12123434
```

---

## Schritt 2: Server B – Basis einrichten (Docker, Verzeichnisse)

Auf **Server B** einloggen (Passwort: **12123434**):

```bash
ssh root@95.111.238.180
```

**Option A – Skript von deinem Rechner per Pipeline ausführen (Passwort einmal eingeben):**

Im Projektordner auf deinem Rechner (PowerShell):

```powershell
Get-Content c:\Cursor\ibu_sw\scripts\setup_server_b_install.sh | ssh root@95.111.238.180 "cat > /root/setup_b.sh && chmod +x /root/setup_b.sh && bash /root/setup_b.sh"
```

**Option B – Skript-Inhalt auf B einfügen und ausführen:**

1. Öffne `scripts/setup_server_b_install.sh` und kopiere den **gesamten Inhalt**.
2. Auf Server B (nach `ssh root@95.111.238.180`):

```bash
cat > /root/setup_b.sh << 'ENDOF'
```
3. **Einfügen** des kopierten Skript-Inhalts, dann abschließen mit:

```bash
ENDOF
chmod +x /root/setup_b.sh
bash /root/setup_b.sh
```

---

## Schritt 3: Auf Server A – Backup erstellen und zu B übertragen

Auf **Server A** einloggen:

```bash
ssh root@144.91.103.103
```

**Projektpfad auf A ermitteln** (entweder `/root/ibu_sw` oder `/root/platform-core`):

```bash
ls -la /root/ibu_sw/docker-compose*.yml 2>/dev/null && echo "USE_DIR=/root/ibu_sw"
ls -la /root/platform-core/docker-compose.yml 2>/dev/null && echo "USE_DIR=/root/platform-core"
```

Dann das Transfer-Skript ausführen (z.B. nach Kopieren des Skripts von deinem Rechner auf A oder Inhalt einfügen). Siehe **Skript: Transfer A → B** (`scripts/transfer_a_to_b.sh`).  

Das Skript wird:

- Auf A ein Tar-Archiv des Projektverzeichnisses erstellen (ohne `node_modules`, `__pycache__`, grosse Logs).
- Einen PostgreSQL-Dump der laufenden DB erstellen (aus dem laufenden Postgres-Container).
- Beides per `scp` nach B in ein Übergabeverzeichnis (z.B. `/root/transfer`) kopieren.

Wichtig: Vorher muss Schritt 1 (SSH-Key A→B) erledigt sein.

---

## Schritt 4: Auf Server B – Daten übernehmen und Anwendung starten

Auf **Server B**:

```bash
ssh root@95.111.238.180
cd /root
```

### 4.1 Übertragenes Archiv und DB-Dump verarbeiten

Es wird angenommen, dass auf B unter `/root/transfer/` liegen:

- `ibu_sw_backup_YYYYMMDD_HHMM.tar` (oder ähnlich)
- `pg_dump_YYYYMMDD.sql` (oder wie im Transfer-Skript benannt)

```bash
cd /root
mkdir -p ibu_sw
tar -xf /root/transfer/ibu_sw_backup_*.tar -C /root/
# ggf. kommt alles in ein Unterordner – dann verschieben:
# mv /root/ibu_sw/root/ibu_sw/* /root/ibu_sw/ 2>/dev/null || true
```

### 4.2 .env für Test-Server anpassen

```bash
cd /root/ibu_sw
cp .env .env.backup 2>/dev/null || true
# Falls kein .env existiert, aus .env.example anlegen (falls vorhanden)
test -f .env || cp .env.example .env 2>/dev/null || true

# Domain und API-URL auf test.finalstage.ch setzen
sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=https://test.finalstage.ch|' .env
sed -i 's|VITE_API_URL=.*|VITE_API_URL=https://test.finalstage.ch|' .env
sed -i 's|DOMAIN_NAME=.*|DOMAIN_NAME=test.finalstage.ch|' .env
# Optional: gleiche DB-Passwörter/Secret wie auf A übernehmen (aus dem mitkopierten .env)
```

### 4.3 Nginx-Konfiguration für test.finalstage.ch und betabilic.finalstage.ch

Im Repo gibt es die Vorlage `nginx/conf.d/test.finalstage.ch.conf.example`. Diese unterstützt bereits beide Domains (test.finalstage.ch und betabilic.finalstage.ch). Auf Server B:

- Entweder diese Datei nach `nginx/conf.d/default.conf` kopieren (überschreibt die Main-Config, was auf B gewollt ist), **oder**
- In `docker-compose.prod.yml` bei nginx ein zweites Volume eintragen, z. B.  
  `- ./nginx/conf.d:/etc/nginx/conf.d:ro`  
  und die Example-Datei als `test.finalstage.ch.conf` ablegen.

**Vor dem ersten SSL-Zertifikat:** In der Config temporär nur den HTTP-Server (Port 80) für beide Domains aktiv lassen, Certbot ausführen (siehe 4.6), danach den HTTPS-Block aktivieren und Nginx neu starten.

### 4.4 Container starten und Datenbank importieren

**Reihenfolge:** Zuerst nur Postgres starten, Dump importieren, danach Backend/Frontend/Nginx starten (sonst legt das Backend leere Tabellen an).

```bash
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml up -d postgres
# Warten, bis Postgres läuft (ca. 10 Sekunden)
sleep 15
# Dump importieren (Service-Name in compose ist "postgres")
cat /root/transfer/pg_dump_*.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere
# Falls Ihr auf A platform-core nutzt: -U platform_admin -d platform_db
# Jetzt restliche Container starten
docker compose -f docker-compose.prod.yml up -d backend frontend nginx
```

### 4.5 SSL für test.finalstage.ch und betabilic.finalstage.ch (Let's Encrypt) ✅

Einmalig (bereits ausgeführt für test.finalstage.ch):

```bash
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email goksche23@gmail.com \
  --agree-tos --no-eff-email \
  -d test.finalstage.ch -d betabilic.finalstage.ch
```

**Hinweis:** Beide Domains können in einem Zertifikat enthalten sein. Falls betabilic.finalstage.ch später hinzugefügt wurde, kann das Zertifikat erneuert werden mit:
```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email goksche23@gmail.com \
  --agree-tos --no-eff-email \
  -d test.finalstage.ch -d betabilic.finalstage.ch
```

Nginx verwendet danach die Config mit HTTPS-Block (inkl. Redirect HTTP→HTTPS). **Zertifikat erneuern:** Läuft am 26.04.2026 ab. Erneuerung z. B. per Cron auf B: `0 3 * * * cd /root/ibu_sw && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml restart nginx`

---

## Kurzreferenz – Reihenfolge

1. DNS: test.finalstage.ch → 95.111.238.180  
2. SSH-Key von A zu B (Schritt 1)  
3. Auf B: `scripts/setup_server_b_install.sh` (Schritt 2)  
4. Auf A: `scripts/transfer_a_to_b.sh` (Schritt 3)  
5. Auf B: Entpacken, .env/Nginx anpassen, starten, DB importieren, Certbot (Schritt 4)  

Bei Problemen: Logs prüfen mit  
`docker compose -f docker-compose.prod.yml logs -f backend` (bzw. `nginx`, `frontend`).
