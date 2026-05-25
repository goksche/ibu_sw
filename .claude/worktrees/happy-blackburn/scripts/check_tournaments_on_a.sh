#!/bin/bash
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere -c "SELECT id, name FROM tournaments ORDER BY id LIMIT 10;"
