# Backup vom Backup-Server holen und wiederherstellen

Backup-Server: **95.111.238.180**  
App-Server (Ziel): **144.91.103.103**  
Borg-Repo: `root@95.111.238.180:/backup/finalstage`

## Voraussetzungen auf dem App-Server

- Borg installiert
- `/root/borg_backup/` mit:
  - `.borg_passphrase` (Inhalt = Borg-Passphrase)
  - ggf. `restore.sh` (aus `scripts/borg_restore_auto.sh`)
- SSH-Zugang A→B: bestehender Key (z.B. `/root/.ssh/id_rsa` oder `id_ed25519`); optional `BORG_SSH_KEY=/pfad/zum/key` setzen

## Option A: All-in-One-Skript (empfohlen)

1. Skript auf den Server kopieren (einmalig, z.B. aus dem Repo):
   ```bash
   scp scripts/restore_from_backup_server.sh root@144.91.103.103:/root/borg_backup/
   ```

2. Per SSH auf den App-Server:
   ```bash
   ssh root@144.91.103.103
   cd /root/borg_backup
   chmod +x restore_from_backup_server.sh
   ```

3. Verfügbare Backups anzeigen:
   ```bash
   sudo ./restore_from_backup_server.sh
   ```

4. Neuestes Backup komplett wiederherstellen (mit Rückfrage):
   ```bash
   sudo ./restore_from_backup_server.sh latest
   ```

5. Bestimmtes Archiv wiederherstellen (ohne Rückfragen):
   ```bash
   sudo ./restore_from_backup_server.sh backup-20260126-003517 --yes
   ```

Das Skript macht:

- Holt das gewählte Archiv vom Backup-Server
- Extrahiert es nach `/tmp/borg_restore`
- Stellt die PostgreSQL-Datenbank im Container `ibu_postgres` wieder her
- Stellt Docker-Volumes wieder her
- Kopiert Config (nginx, docker-compose, .env.example) nach `/root/ibu_sw`

**Danach auf dem Server:**

```bash
cd /root/ibu_sw && docker compose down && docker compose up -d
# oder nur: docker compose restart
```

### Umgebungsvariablen (optional)

- `POSTGRES_CONTAINER` – PostgreSQL-Container (Default: `ibu_postgres`, Prod: `ibu_postgres_prod`)
- `TARGET_PROJECT` – Ziel für Config (Default: `/root/ibu_sw`)
- `RESTORE_ROOT` – temporäres Extraktionsverzeichnis (Default: `/tmp/borg_restore`)
- `BORG_BACKUP_DIR` – Verzeichnis mit `.borg_passphrase` (Default: `/root/borg_backup`)
- `BORG_SSH_KEY` – Pfad zum SSH-Key für Backup-Server (Default: `~/.ssh/id_rsa` bzw. `id_ed25519`)

Beispiel für Produktion:

```bash
POSTGRES_CONTAINER=ibu_postgres_prod ./restore_from_backup_server.sh latest --yes
```

## Option B: Mit vorhandenem Restore-Menü

Falls auf dem Server bereits `/root/borg_backup/restore.sh` (aus `borg_restore_auto.sh`) liegt:

```bash
ssh root@144.91.103.103
cd /root/borg_backup
sudo ./restore.sh
```

Im Menü:

1. **1** – Backups auflisten  
2. **3** – Vollständiges Backup wiederherstellen (Archivname + Ziel z.B. `/tmp/borg_restore`)  
3. **5** – PostgreSQL wiederherstellen (Archivname + Container `ibu_postgres`)  
4. **6** – Docker Volumes wiederherstellen  

Config von Hand nach `/root/ibu_sw` kopieren:

```bash
cp -r /tmp/borg_restore/config/nginx /root/ibu_sw/
cp /tmp/borg_restore/config/docker-compose*.yml /tmp/borg_restore/config/.env.example /root/ibu_sw/
cd /root/ibu_sw && docker compose restart
```

## Option C: Nur Kommandozeile (ohne interaktives Menü)

```bash
ssh root@144.91.103.103
cd /root/borg_backup
export BORG_PASSPHRASE=$(cat .borg_passphrase)
# Key A→B: z.B. /root/.ssh/id_rsa oder BORG_SSH_KEY setzen
export BORG_RSH="ssh -i ${BORG_SSH_KEY:-$HOME/.ssh/id_rsa} -o StrictHostKeyChecking=no"
REPO="root@95.111.238.180:/backup/finalstage"

# Backups anzeigen
borg list $REPO

# Vollständig extrahieren (ARCHIV durch Namen ersetzen)
borg extract --progress $REPO::ARCHIV --destination /tmp/borg_restore

# Anschließend Postgres/Volumes/Config wie in Option B manuell wiederherstellen.
```

---

**Hinweis:** Ich habe keinen SSH-Zugriff auf deine Server. Du musst die Befehle lokal bzw. in deiner Umgebung ausführen. Bei fehlendem Key oder Passphrase die Zugangsdaten auf 95.111.238.180 prüfen.
