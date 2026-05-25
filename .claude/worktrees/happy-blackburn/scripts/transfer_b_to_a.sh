#!/bin/bash
# Transfer von Server B (Test) nach Server A (Live)
# AUSFUEHRUNG AUF SERVER A: ssh root@144.91.103.103, dann dieses Skript ausfuehren
# Voraussetzung: SSH-Key von A muss auf B in /root/.ssh/authorized_keys sein
# WICHTIG: Server B wird NICHT geaendert - A holt Daten von B ab.

set -e

B_HOST="${B_HOST:-95.111.238.180}"
B_USER="${B_USER:-root}"
TARGET_DIR="${TARGET_DIR:-/root/ibu_sw}"
TRANSFER_DIR="/root/transfer"
TS=$(date +%Y%m%d_%H%M)

echo "=== Transfer B (Test) -> A (Live) ==="
echo "Quelle: $B_USER@$B_HOST"
echo "Ziel:   $TARGET_DIR"
echo ""

if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$B_USER@$B_HOST" "exit" 2>/dev/null; then
    echo "Fehler: SSH zu $B_HOST nicht moeglich. Pruefe SSH-Key."
    exit 1
fi

B_BACKUP_DIR=$(ssh "$B_USER@$B_HOST" "ls -dt /root/backup_mvp_* 2>/dev/null | head -1")
if [ -z "$B_BACKUP_DIR" ]; then
    echo "Fehler: Kein MVP-Backup auf B gefunden."
    exit 1
fi
echo "Nutze Backup: $B_BACKUP_DIR"
B_BACKUP=$(ssh "$B_USER@$B_HOST" "ls $B_BACKUP_DIR/ibu_sw_backup_*.tar 2>/dev/null | head -1")
B_DUMP=$(ssh "$B_USER@$B_HOST" "ls $B_BACKUP_DIR/pg_dump_*.sql 2>/dev/null | head -1")

if [ -z "$B_BACKUP" ] || [ -z "$B_DUMP" ]; then
    echo "Fehler: Kein Backup gefunden."
    exit 1
fi

echo "Hole von B..."
mkdir -p "$TRANSFER_DIR"
scp "$B_USER@$B_HOST:$B_BACKUP" "$TRANSFER_DIR/"
scp "$B_USER@$B_HOST:$B_DUMP" "$TRANSFER_DIR/"

echo "Sichere altes Projekt..."
mv "$TARGET_DIR" "${TARGET_DIR}_backup_${TS}" 2>/dev/null || true
mkdir -p "$TARGET_DIR"
cd /root
tar -xf "$TRANSFER_DIR/$(basename $B_BACKUP)" -C /root

cd "$TARGET_DIR"
[ -f .env ] && cp .env .env.bak_$TS
test -f .env || cp .env.example .env 2>/dev/null || true
sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=https://finalstage.ch,https://www.finalstage.ch|' .env 2>/dev/null || true
sed -i 's|VITE_API_URL=.*|VITE_API_URL=https://finalstage.ch|' .env 2>/dev/null || true
sed -i 's|DOMAIN_NAME=.*|DOMAIN_NAME=finalstage.ch|' .env 2>/dev/null || true

echo "Stoppe Container..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "Starte Postgres..."
docker compose -f docker-compose.prod.yml up -d postgres
sleep 15

echo "Importiere Datenbank..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ibu_turniere' AND pid<>pg_backend_pid();" 2>/dev/null || true
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "DROP DATABASE IF EXISTS ibu_turniere;" 2>/dev/null || true
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "CREATE DATABASE ibu_turniere;"
cat "$TRANSFER_DIR/$(basename $B_DUMP)" | docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere

echo "Starte alle Container..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== Transfer B->A abgeschlossen ==="
echo "Live: https://finalstage.ch"
