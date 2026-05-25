#!/bin/bash
set -e
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ibu_turniere' AND pid<>pg_backend_pid();" 2>/dev/null || true
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "DROP DATABASE IF EXISTS ibu_turniere;"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "CREATE DATABASE ibu_turniere;"
sed '/^\\restrict/d' /root/pg_dump_from_b.sql > /tmp/dump_clean.sql
docker cp /tmp/dump_clean.sql ibu_postgres_prod:/tmp/dump.sql
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere -f /tmp/dump.sql -v ON_ERROR_STOP=0
echo Restore abgeschlossen.
