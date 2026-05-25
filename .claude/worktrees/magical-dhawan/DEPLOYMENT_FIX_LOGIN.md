# Login-Problem beheben - Anleitung

## Problem
Das Login schlägt fehl, weil:
1. **Caddy-Konfiguration fehlt `/api/v1/*` Route** (Hauptproblem!)
2. Die Datenbank möglicherweise nicht initialisiert wurde
3. Der Admin-User noch nicht existiert
4. Das Backend möglicherweise nicht richtig startet (Volume-Mount Problem)

## ⚠️ WICHTIG: Caddy-Konfiguration korrigieren

Das Frontend ruft `/api/v1/auth/login` auf, aber Caddy routet das nicht korrekt!

**Führe auf dem Server aus:**

```bash
# 1. Backup der aktuellen Caddy-Konfiguration
cp /opt/demo/Caddyfile /opt/demo/Caddyfile.backup

# 2. Erstelle neue Caddy-Konfiguration
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

# 3. Caddy neu laden
docker restart caddy
# Oder falls Caddy als Service läuft:
# systemctl reload caddy
```

## Schnelllösung (Kopiere und führe auf dem Server aus)

```bash
cd /root/platform-core

# 1. Prüfe ob Backend läuft
docker compose ps backend

# 2. Initialisiere Datenbank und erstelle Admin-User
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

# 3. Backend neu starten
docker compose restart backend

# 4. Warte 10 Sekunden
sleep 10

# 5. Teste Login
curl -k -X POST https://gsmartsol.ch/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

## Lösung

### Option 1: Automatisches Script (Empfohlen)

Führe auf dem Server aus:

```bash
cd /root/platform-core

# Script erstellen
cat > init_db.sh << 'EOF'
#!/bin/bash
docker compose exec -T backend python << 'PYTHON'
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

# Initialize database
print('Creating database tables...')
init_db()

# Create admin user
db = SessionLocal()
try:
    username = 'admin'
    email = 'admin@gsmartsol.ch'
    password = 'admin123'
    
    # Check if admin already exists
    existing_admin = db.query(User).filter(User.username == username).first()
    if existing_admin:
        print(f'✅ Admin user "{username}" already exists!')
    else:
        # Create admin user
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
        db.refresh(admin_user)
        
        print(f'✅ Admin user "{username}" created successfully!')
        print(f'   Email: {email}')
        print(f'   Password: {password}')
        print('')
        print('⚠️  IMPORTANT: Change the password after first login!')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
PYTHON
EOF

chmod +x init_db.sh
./init_db.sh
```

### Option 2: Manuell im Container

```bash
cd /root/platform-core

# In den Backend-Container gehen
docker compose exec backend bash

# Dann im Container:
python -c "
from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

# Initialize database
init_db()

# Create admin user
db = SessionLocal()
try:
    username = 'admin'
    email = 'admin@gsmartsol.ch'
    password = 'admin123'
    
    existing_admin = db.query(User).filter(User.username == username).first()
    if existing_admin:
        print('Admin already exists!')
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
        print('Admin user created!')
except Exception as e:
    print(f'Error: {e}')
    db.rollback()
finally:
    db.close()
"
```

### Option 3: Über create_initial_admin.py Script

```bash
cd /root/platform-core
docker compose exec backend python scripts/create_initial_admin.py
```

## Nach der Initialisierung

1. **Caddy-Konfiguration prüfen**:
   ```bash
   cat /opt/demo/Caddyfile
   # Sollte `/api/v1/*` Route enthalten
   ```

2. **Backend neu starten** (falls nötig):
   ```bash
   cd /root/platform-core
   docker compose restart backend
   ```

3. **Login testen**:
   ```bash
   # Teste API direkt
   curl -k -X POST https://gsmartsol.ch/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"admin123"}'
   ```
   
   - URL: https://gsmartsol.ch
   - Username: `admin`
   - Password: `admin123`

4. **Backend-Logs prüfen** (falls Probleme):
   ```bash
   cd /root/platform-core
   docker compose logs backend --tail=50
   ```

5. **Caddy-Logs prüfen** (falls Routing-Probleme):
   ```bash
   docker logs caddy --tail=50
   # Oder falls als Service:
   # journalctl -u caddy -n 50
   ```

## Troubleshooting

### Backend startet nicht
```bash
# Prüfe Backend-Logs
docker compose logs backend --tail=50

# Prüfe ob Container läuft
docker compose ps

# Prüfe Datenbank-Verbindung
docker compose exec backend python -c "from app.core.database import engine; print(engine.connect())"
```

### "No module named 'app'" Fehler
Das bedeutet, dass das Volume-Mount nicht richtig funktioniert. Prüfe:
```bash
# Prüfe ob Backend-Dateien im Container sind
docker compose exec backend ls -la /app/app/

# Prüfe docker-compose.yml Volume-Mount
cat docker-compose.yml | grep -A2 "volumes:"
```

### Datenbank-Verbindungsfehler
```bash
# Prüfe ob PostgreSQL läuft
docker compose ps postgres

# Prüfe Datenbank-Verbindung
docker compose exec postgres psql -U platform_admin -d platform_db -c "SELECT 1;"
```

