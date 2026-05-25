#!/bin/bash
# Komplettes Fix-Script für Login-Problem
# Führe auf dem Server aus: bash fix_login.sh

set -e

echo "🔧 Platform Core - Login-Problem beheben"
echo "=========================================="
echo ""

# 1. Caddy-Konfiguration korrigieren
echo "📝 1. Korrigiere Caddy-Konfiguration..."
if [ -f "/opt/demo/Caddyfile" ]; then
    cp /opt/demo/Caddyfile /opt/demo/Caddyfile.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✅ Backup erstellt"
fi

cat > /opt/demo/Caddyfile << 'EOF'
gsmartsol.ch {
    # API Routes - Alle /api/v1/* Requests an Backend
    handle /api/v1/* {
        reverse_proxy platform_backend:8000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Frontend Routes - Alle anderen Requests an Frontend
    handle {
        reverse_proxy platform_frontend:80 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
EOF

echo "   ✅ Caddy-Konfiguration aktualisiert"

# 2. Caddy neu laden
echo ""
echo "🔄 2. Lade Caddy neu..."
if docker ps | grep -q caddy; then
    docker restart caddy
    echo "   ✅ Caddy Container neu gestartet"
elif systemctl is-active --quiet caddy; then
    systemctl reload caddy
    echo "   ✅ Caddy Service neu geladen"
else
    echo "   ⚠️  Caddy nicht gefunden - bitte manuell neu starten"
fi

# 3. Warte auf Caddy
echo ""
echo "⏳ 3. Warte 5 Sekunden..."
sleep 5

# 4. Initialisiere Datenbank und erstelle Admin-User
echo ""
echo "📦 4. Initialisiere Datenbank und erstelle Admin-User..."
cd /root/platform-core

docker compose exec -T backend python << 'PYTHON'
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

print('📦 Initializing database...')
init_db()
print('✅ Database initialized!')

db = SessionLocal()
try:
    username = 'admin'
    email = 'admin@gsmartsol.ch'
    password = 'admin123'
    
    existing_admin = db.query(User).filter(User.username == username).first()
    if existing_admin:
        print(f'✅ Admin user "{username}" already exists!')
    else:
        hashed_password = get_password_hash(password)
        admin_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f'✅ Admin user "{username}" created!')
        print(f'   Email: {email}')
        print(f'   Password: {password}')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
PYTHON

# 5. Backend neu starten
echo ""
echo "🔄 5. Starte Backend neu..."
docker compose restart backend
sleep 10

# 6. Teste Login
echo ""
echo "🧪 6. Teste Login..."
LOGIN_RESPONSE=$(curl -k -s -X POST https://gsmartsol.ch/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo "   ✅ Login erfolgreich!"
    echo "   Token erhalten"
else
    echo "   ❌ Login fehlgeschlagen!"
    echo "   Response: $LOGIN_RESPONSE"
fi

# 7. Zusammenfassung
echo ""
echo "✅ Fix abgeschlossen!"
echo ""
echo "📊 Status:"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'platform|caddy' || true
echo ""
echo "🌐 Zugriff:"
echo "   Platform: https://gsmartsol.ch"
echo "   API: https://gsmartsol.ch/api/v1"
echo ""
echo "🔐 Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 Nächste Schritte:"
echo "   1. Öffne https://gsmartsol.ch im Browser"
echo "   2. Melde dich mit admin/admin123 an"
echo "   3. Ändere das Passwort sofort!"

