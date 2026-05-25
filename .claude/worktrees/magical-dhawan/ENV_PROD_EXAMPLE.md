# Beispiel: `.env.prod` (Server)

Kopiere diese Werte auf dem Server nach `.env.prod` (im Projekt-Root neben `docker-compose.prod.yml`) und passe sie an.

```bash
# Domain / TLS (Let's Encrypt)
DOMAIN_NAME=gsmartsol.ch
CERTBOT_EMAIL=admin@gsmartsol.ch

# Backend
POSTGRES_DB=ibu_turniere
POSTGRES_USER=ibu_admin
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
SECRET_KEY=CHANGE_ME_LONG_RANDOM_SECRET

# CORS (beide Hosts erlauben)
CORS_ORIGINS=https://gsmartsol.ch,https://www.gsmartsol.ch

# Frontend Build-Time API Base (WICHTIG: ohne /api und ohne /api/v1)
VITE_API_URL=https://gsmartsol.ch
```

