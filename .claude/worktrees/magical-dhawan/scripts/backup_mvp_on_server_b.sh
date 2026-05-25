#!/bin/bash
# Backup auf Server B (95.111.238.180) erstellen - MVP-Abschluss
# AUSFÜHRUNG NUR AUF SERVER B: ssh root@95.111.238.180, dann dieses Skript ausführen
# Erstellt ein lokales Backup unter /root/backup_mvp_YYYYMMDD_HHMM/
# WICHTIG: Server B wird hierbei NICHT geändert - es wird nur eine Kopie erstellt.

set -e

SOURCE_DIR="${SOURCE_DIR:-/root/ibu_sw}"
TS=$(date +%Y%m%d_%H%M)
BACKUP_ROOT="/root/backup_mvp_${TS}"
BACKUP_NAME="ibu_sw_backup_${TS}.tar"
PG_DUMP_NAME="pg_dump_${TS}.sql"

echo "=== MVP-Backup auf Server B ==="
echo "Quelle: $SOURCE_DIR"
echo "Ziel:   $BACKUP_ROOT/"
echo ""

mkdir -p "$BACKUP_ROOT"
cd "$SOURCE_DIR"

# 1) Tar-Archiv des Projekts (ohne node_modules, __pycache__, .git)
echo "Erstelle Projekt-Archiv..."
tar --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' \
    --exclude='.git' --exclude='*.log' --exclude='backend/logs' \
    -C /root -cvf "$BACKUP_ROOT/$BACKUP_NAME" ibu_sw

# 2) PostgreSQL-Dump
echo "Erstelle DB-Dump..."
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ibu_admin ibu_turniere > "$BACKUP_ROOT/$PG_DUMP_NAME" 2>/dev/null \
    || docker compose -f docker-compose.prod.yml exec -T ibu_postgres_prod pg_dump -U ibu_admin ibu_turniere > "$BACKUP_ROOT/$PG_DUMP_NAME"

# 3) .env kopieren (ohne sensible Daten zu verlieren)
cp -a .env "$BACKUP_ROOT/.env" 2>/dev/null || cp -a .env.prod "$BACKUP_ROOT/.env" 2>/dev/null || true

echo ""
echo "=== Backup fertig: $BACKUP_ROOT ==="
ls -la "$BACKUP_ROOT"
