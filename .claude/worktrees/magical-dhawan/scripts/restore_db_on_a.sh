#!/bin/bash
# Auf Server A ausfuehren: DB mit neuestem Dump von B ueberschreiben
# Ausfuehrung: ssh root@144.91.103.103 'bash -s' < scripts/restore_db_on_a.sh

set -e
BACKUP_ROOT=$(ls -dt /root/backup_ibu_sw_* 2>/dev/null | head -1)
if [ -z "$BACKUP_ROOT" ]; then echo "Kein Backup auf A gefunden."; exit 1; fi
DUMP=$(ls "$BACKUP_ROOT"/pg_dump_*.sql 2>/dev/null | head -1)
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then echo "Kein pg_dump in $BACKUP_ROOT gefunden."; exit 1; fi
echo "Restore aus: $DUMP"
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ibu_turniere' AND pid<>pg_backend_pid();" 2>/dev/null || true
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "DROP DATABASE IF EXISTS ibu_turniere;"
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "CREATE DATABASE ibu_turniere;"
cat "$DUMP" | (cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere)
echo "Restore abgeschlossen."
