#!/bin/bash
# Platform Core - Server Initialization Script
# This script initializes the database and creates the admin user

set -e

echo "🚀 Platform Core - Server Initialization"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "   Please run this script from the platform-core directory"
    exit 1
fi

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if backend container is running
if ! docker compose ps backend | grep -q "Up"; then
    echo "❌ Error: Backend container is not running!"
    echo "   Starting backend container..."
    docker compose up -d backend
    sleep 10
fi

# Initialize database and create admin user
echo "📦 Initializing database and creating admin user..."
docker compose exec -T backend python -c "
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
        print(f'✅ Admin user \"{username}\" already exists!')
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
        
        print(f'✅ Admin user \"{username}\" created successfully!')
        print(f'   Email: {email}')
        print(f'   Password: {password}')
        print('')
        print('⚠️  IMPORTANT: Change the password after first login!')
except Exception as e:
    print(f'❌ Error: {e}')
    db.rollback()
finally:
    db.close()
"

echo ""
echo "✅ Initialization complete!"
echo ""
echo "🔐 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🌐 Access:"
echo "   Platform: https://gsmartsol.ch"
echo "   API: https://gsmartsol.ch/api/v1"
echo ""

