#!/bin/bash
# .env auf Server A für finalstage.ch anpassen
cd /root/ibu_sw || exit 1
test -f .env || cp .env.example .env
cp .env .env.bak_finalstage 2>/dev/null
sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=https://finalstage.ch,https://www.finalstage.ch|' .env
sed -i 's|VITE_API_URL=.*|VITE_API_URL=https://finalstage.ch|' .env
sed -i 's|DOMAIN_NAME=.*|DOMAIN_NAME=finalstage.ch|' .env
grep -E 'CORS_ORIGINS|VITE_API_URL|DOMAIN_NAME' .env
