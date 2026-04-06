#!/bin/bash
set -e
cd /root/ibu_sw
set -a
# shellcheck source=/dev/null
source .env.prod
set +a
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${CERTBOT_EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d finalstage.ch \
  -d www.finalstage.ch
