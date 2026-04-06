#!/bin/bash
# Auf Server A ausfuehren: /tmp/ibu_fc.dump muss existieren (z. B. von B: pg_dump -Fc).
set -e
cd /root/ibu_sw
C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
$C exec -T postgres psql -U ibu_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ibu_turniere' AND pid <> pg_backend_pid();" 2>/dev/null || true
$C exec -T postgres psql -U ibu_admin -d postgres -c 'DROP DATABASE IF EXISTS ibu_turniere WITH (FORCE);' 2>/dev/null || $C exec -T postgres psql -U ibu_admin -d postgres -c 'DROP DATABASE IF EXISTS ibu_turniere;'
$C exec -T postgres psql -U ibu_admin -d postgres -c 'CREATE DATABASE ibu_turniere;'
cat /tmp/ibu_fc.dump | $C exec -T postgres pg_restore -U ibu_admin -d ibu_turniere --no-owner --no-acl
$C restart backend
rm -f /tmp/ibu_fc.dump
