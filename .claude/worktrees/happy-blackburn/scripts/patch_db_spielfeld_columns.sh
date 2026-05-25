#!/usr/bin/env bash
set -e

cat > /tmp/alter_spielfeld.sql <<'SQL'
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS spielfeld_assignment_mode VARCHAR(20);
UPDATE tournaments SET spielfeld_assignment_mode = 'random' WHERE spielfeld_assignment_mode IS NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS spielfeld_id INTEGER REFERENCES spielfelder(id) ON DELETE SET NULL;
SQL

docker exec -i ibu_postgres_prod psql -U ibu_admin -d ibu_turniere < /tmp/alter_spielfeld.sql
rm /tmp/alter_spielfeld.sql
