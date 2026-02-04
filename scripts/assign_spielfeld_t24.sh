#!/usr/bin/env bash
set -e

cat > /tmp/assign_spielfeld_t24.sql <<'SQL'
WITH fields AS (
  SELECT id,
         row_number() OVER (ORDER BY sort_order, id) AS idx,
         count(*) OVER () AS total
  FROM spielfelder
  WHERE location_id = (SELECT location_id FROM tournaments WHERE id = 24)
),
matches AS (
  SELECT id,
         row_number() OVER (ORDER BY round, match_no, group_id) AS rn
  FROM group_matches
  WHERE tournament_id = 24
)
UPDATE group_matches gm
SET spielfeld_id = f.id
FROM matches m
JOIN fields f ON ((m.rn - 1) % f.total) + 1 = f.idx
WHERE gm.id = m.id
  AND gm.spielfeld_id IS NULL;
SQL

docker exec -i ibu_postgres_prod psql -U ibu_admin -d ibu_turniere < /tmp/assign_spielfeld_t24.sql
rm /tmp/assign_spielfeld_t24.sql
