#!/usr/bin/env bash
set -euo pipefail
cd /opt/ibu_sw
SQL="${1:-/root/a_to_b_ibu_turniere_20260516_1926.sql}"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ibu_turniere' AND pid <> pg_backend_pid();" || true
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ibu_turniere;"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ibu_turniere OWNER ibu_admin;"
cat "$SQL" | docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere -v ON_ERROR_STOP=1
docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere -tAc "SELECT count(*) FROM tournaments;"
