#!/bin/bash
set -e

DB_CONTAINER="ibu_postgres_prod"
DB_USER="ibu_admin"
DB_NAME="ibu_turniere"
MIGRATIONS_DIR="/root/ibu_sw/backend/migrations"

echo "=== V1.7 Migrationen starten ==="

MIGRATIONS=(
  "add_power_admin_role.sql"
  "add_registration_requests.sql"
  "add_user_settings.sql"
  "add_user_profiles.sql"
  "add_participant_user_id.sql"
  "add_visibility_fields.sql"
  "add_sharing_tables.sql"
  "add_comments_tables.sql"
)

for MIG in "${MIGRATIONS[@]}"; do
  FILE="${MIGRATIONS_DIR}/${MIG}"
  if [ -f "$FILE" ]; then
    echo "--- Running: $MIG ---"
    docker cp "$FILE" "${DB_CONTAINER}:/tmp/${MIG}"
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -f "/tmp/${MIG}" 2>&1
    echo "--- Done: $MIG ---"
  else
    echo "--- SKIP (not found): $MIG ---"
  fi
done

echo ""
echo "=== Enum-Werte pruefen ==="
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT enum_range(NULL::userrole);" 2>&1

echo ""
echo "=== Neue Tabellen pruefen ==="
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt registration_requests" 2>&1
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt user_settings" 2>&1
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt user_profiles" 2>&1
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt tournament_shares" 2>&1
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt league_shares" 2>&1
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt comments" 2>&1
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\dt comment_reactions" 2>&1

echo ""
echo "=== ALLE MIGRATIONEN ABGESCHLOSSEN ==="
