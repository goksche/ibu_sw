# MVP Go-Live: Server B → Server A

Nach erfolgreichem MVP auf Server B (test.finalstage.ch) wird die Version auf Server A (finalstage.ch) live genommen.

**WICHTIG: Server B (95.111.238.180) wird ab Go-Live nicht mehr geändert.**

---

## Schritt 1: Backup auf Server B erstellen

Auf **Server B** per SSH:

```bash
ssh root@95.111.238.180
```

Skript ausführen (Inhalt von `scripts/backup_mvp_on_server_b.sh` einfügen oder Skript ausführen):

```bash
cd /root/ibu_sw
# Skript-Inhalt einfügen oder:
bash -s < /pfad/zu/backup_mvp_on_server_b.sh
```

Oder manuell:

```bash
TS=$(date +%Y%m%d_%H%M)
BACKUP_ROOT="/root/backup_mvp_${TS}"
mkdir -p "$BACKUP_ROOT"
cd /root/ibu_sw
tar --exclude='node_modules' --exclude='__pycache__' --exclude='.git' -C /root -cvf "$BACKUP_ROOT/ibu_sw_backup_${TS}.tar" ibu_sw
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ibu_admin ibu_turniere > "$BACKUP_ROOT/pg_dump_${TS}.sql"
echo "Backup: $BACKUP_ROOT"
ls -la "$BACKUP_ROOT"
```

---

## Schritt 2: Lokal mit Server B synchronisieren

Vom **lokalen Rechner** (Windows/PowerShell):

```powershell
# Option A: Mit rsync (falls installiert)
rsync -avz --exclude=node_modules --exclude=.git root@95.111.238.180:/root/ibu_sw/ c:\Cursor\ibu_sw\

# Option B: DB-Dump und wichtige Dateien
scp root@95.111.238.180:/root/backup_mvp_*/pg_dump_*.sql c:\Cursor\ibu_sw\scripts\
# Projekt-Archiv holen und entpacken
scp root@95.111.238.180:/root/backup_mvp_*/ibu_sw_backup_*.tar c:\Cursor\ibu_sw\
```

Oder Skript `scripts/sync_b_to_local.ps1` ausführen.

---

## Schritt 3: Server A mit Version von B live nehmen

Auf **Server A** per SSH:

```bash
ssh root@144.91.103.103
```

**Voraussetzung:** SSH-Key von A muss auf B in `/root/.ssh/authorized_keys` sein.

Skript `scripts/transfer_b_to_a.sh` auf A ausführen. Das Skript:

1. Holt das Backup von B (aus Schritt 1)
2. Sichert das alte Projekt auf A
3. Extrahiert das Projekt von B
4. Passt .env für finalstage.ch an
5. Stoppt Container, importiert DB, startet neu

```bash
# Skript von lokal auf A kopieren (einmalig) oder Inhalt einfügen
cd /root
# Dann:
bash transfer_b_to_a.sh
```

---

## Nach dem Transfer auf Server A prüfen

- **Nginx:** Die Config von B ist für test.finalstage.ch. Auf A muss `server_name` und SSL-Pfade für **finalstage.ch** bzw. **www.finalstage.ch** angepasst werden, falls A andere Domains nutzt.
- **SSL-Zertifikate:** Certbot für finalstage.ch auf A ausführen, falls nötig.
- **Frontend:** `docker compose restart nginx` nach Config-Änderung.

---

## Server B – Keine weiteren Änderungen

Nach dem Go-Live gilt:

- **Server B** (test.finalstage.ch) bleibt unverändert
- Keine Code-Änderungen, keine Patches, keine Updates auf B
- B dient als Referenz/Archiv des MVP-Stands
