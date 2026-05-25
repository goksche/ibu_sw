# 🚀 Schnell-Fix für Login-Problem

## Problem
Das Login schlägt fehl, weil die Caddy-Konfiguration die `/api/v1/*` Route nicht korrekt routet.

## Lösung (2 Minuten)

### Option 1: Script direkt auf Server ausführen

**Kopiere diesen Befehl komplett und führe ihn auf dem Server aus:**

```bash
cat > /root/fix_login.sh << 'ENDOFSCRIPT'
#!/bin/bash
set -e

echo "🔧 Platform Core - Login-Problem beheben"
echo "=========================================="
echo ""

# 1. Caddy-Konfiguration korrigieren
echo "📝 1. Korrigiere Caddy-Konfiguration..."
cp /opt/demo/Caddyfile /opt/demo/Caddyfile.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

cat > /opt/demo/Caddyfile << 'EOF'
gsmartsol.ch {
    handle /api/v1/* {
        reverse_proxy platform_backend:8000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

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
docker restart caddy 2>/dev/null || systemctl reload caddy 2>/dev/null || echo "   ⚠️  Caddy manuell neu starten"
sleep 5

# 3. Initialisiere Datenbank
echo ""
echo "📦 3. Initialisiere Datenbank und erstelle Admin-User..."
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
    existing = db.query(User).filter(User.username == 'admin').first()
    if existing:
        print('✅ Admin user already exists!')
    else:
        db.add(User(
            username='admin',
            email='admin@gsmartsol.ch',
            hashed_password=get_password_hash('admin123'),
            role=UserRole.ADMIN,
            is_active=True
        ))
        db.commit()
        print('✅ Admin user created!')
        print('   Username: admin')
        print('   Password: admin123')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
PYTHON

# 4. Backend neu starten
echo ""
echo "🔄 4. Starte Backend neu..."
docker compose restart backend
sleep 10

# 5. Teste Login
echo ""
echo "🧪 5. Teste Login..."
RESPONSE=$(curl -k -s -X POST https://gsmartsol.ch/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')

if echo "$RESPONSE" | grep -q "access_token"; then
    echo "   ✅ Login erfolgreich!"
else
    echo "   ⚠️  Login-Response: $RESPONSE"
fi

echo ""
echo "✅ Fix abgeschlossen!"
echo ""
echo "🌐 Zugriff: https://gsmartsol.ch"
echo "🔐 Login: admin / admin123"
ENDOFSCRIPT

chmod +x /root/fix_login.sh
bash /root/fix_login.sh
```

### Option 2: Einzelschritte manuell

Falls das Script nicht funktioniert, führe diese Befehle einzeln aus:

```bash
# 1. Caddy-Konfiguration
cat > /opt/demo/Caddyfile << 'EOF'
gsmartsol.ch {
    handle /api/v1/* {
        reverse_proxy platform_backend:8000
    }
    handle {
        reverse_proxy platform_frontend:80
    }
}
EOF

# 2. Caddy neu starten
docker restart caddy

# 3. Datenbank initialisieren
cd /root/platform-core
docker compose exec -T backend python -c "
from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

init_db()
db = SessionLocal()
try:
    if not db.query(User).filter(User.username == 'admin').first():
        db.add(User(
            username='admin',
            email='admin@gsmartsol.ch',
            hashed_password=get_password_hash('admin123'),
            role=UserRole.ADMIN,
            is_active=True
        ))
        db.commit()
        print('✅ Admin created!')
finally:
    db.close()
"

# 4. Backend neu starten
docker compose restart backend

# 5. Testen
curl -k -X POST https://gsmartsol.ch/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

## Nach dem Fix

1. Öffne https://gsmartsol.ch im Browser
2. Login mit:
   - Username: `admin`
   - Password: `admin123`
3. **WICHTIG:** Ändere das Passwort sofort nach dem ersten Login!

